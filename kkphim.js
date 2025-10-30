// ==Cloudstream==
// @name KKPhim Source
// @version 1.0
// @description Crawl KKPhim (search, categories, episodes).
// @language vi
// @author TNB88
// ==/Cloudstream==

const KK_BASE = "https://kkphim.to"; // adjust if site differs

function httpGet(url) {
  if (typeof GET === "function") return GET(url);
  throw new Error("HTTP GET not available");
}

function parseListFromHtml(html) {
  // Very generic parser - looks for article blocks with link + title + img
  const items = [];
  const regex = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*(?:film|movie|item)[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    let href = m[1];
    if (href && href.indexOf("http") !== 0) href = KK_BASE + href;
    items.push({ name: m[3].trim(), url: href, poster: m[2] });
  }
  // fallback simpler pattern
  if (items.length === 0) {
    const r2 = /<a[^>]*href="([^"]+)"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/gi;
    while ((m = r2.exec(html)) !== null) {
      let href = m[1]; if (href.indexOf("http") !== 0) href = KK_BASE + href;
      items.push({ name: m[3].trim(), url: href, poster: m[2] });
    }
  }
  return items;
}

function getHomePage() {
  try {
    const html = httpGet(KK_BASE);
    const lists = parseListFromHtml(html).slice(0, 12); // top items
    return [
      { name: "KKPhim - Nổi bật", list: lists }
    ];
  } catch (e) {
    log("[KKPhim] Home error: " + e);
    return [];
  }
}

function getCategories() {
  try {
    const html = httpGet(KK_BASE);
    const cats = [];
    const regex = /<a[^>]*href="([^"]+)"[^>]*class="[^"]*category[^"]*"[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = regex.exec(html)) !== null) {
      let href = m[1]; if (href.indexOf("http") !== 0) href = KK_BASE + href;
      cats.push({ name: m[2].trim(), url: href });
    }
    // fallback: return some known categories if parsing fails
    if (cats.length === 0) {
      cats.push({ name: "Phim lẻ", url: KK_BASE + "/phim-le/" });
      cats.push({ name: "Phim bộ", url: KK_BASE + "/phim-bo/" });
    }
    return cats;
  } catch (e) {
    log("[KKPhim] categories error: " + e);
    return [];
  }
}

function getSearchResults(query) {
  try {
    const html = httpGet(KK_BASE + "/?s=" + encodeURIComponent(query));
    return parseListFromHtml(html);
  } catch (e) {
    log("[KKPhim] search error: " + e);
    return [];
  }
}

// Parse streams/embeds from a movie page
function load(url) {
  try {
    const html = httpGet(url);
    // try to find direct mp4 or m3u8
    const regStream = /(https?:\/\/[^\s"']+\.(?:mp4|m3u8)[^\s"']*)/gi;
    let m = regStream.exec(html);
    if (m && m[1]) {
      return { name: "KKPhim Stream", type: "movie", streams: [{ url: m[1], quality: "HD", lang: "vi" }] };
    }
    // else try to find iframe embed src
    const regIframe = /<iframe[^>]*src="([^"]+)"[^>]*>/i;
    m = regIframe.exec(html);
    if (m && m[1]) {
      let embed = m[1];
      if (embed.indexOf("//") === 0) embed = "https:" + embed;
      return { name: "KKPhim Embed", type: "movie", streams: [{ url: embed, quality: "HD", lang: "vi", embed: true }] };
    }
    return null;
  } catch (e) {
    log("[KKPhim] load error: " + e);
    return null;
  }
}
