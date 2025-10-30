// ==Cloudstream==
// @name ThuvienHD Source
// @version 1.0
// @description Crawl ThuvienHD - phim chất lượng cao, trending, backup links.
// @language vi
// @author TNB88
// ==/Cloudstream==

const TVHD_BASE = "https://www.thuvienhd.com"; // adjust as needed

function tHttpGet(url) {
  if (typeof GET === "function") return GET(url);
  throw new Error("HTTP GET not available");
}

function parseItems(html) {
  const items = [];
  const regex = /<a[^>]*href="([^"]+)"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    let href = m[1]; if (href.indexOf("http") !== 0) href = TVHD_BASE + href;
    items.push({ name: m[3].trim(), url: href, poster: m[2] });
  }
  return items;
}

function getHomePage() {
  try {
    const html = tHttpGet(TVHD_BASE);
    const items = parseItems(html).slice(0, 12);
    return [{ name: "ThuvienHD - Mới cập nhật", list: items }];
  } catch (e) {
    log("[ThuvienHD] home error: " + e);
    return [];
  }
}

function getSearchResults(query) {
  try {
    const html = tHttpGet(TVHD_BASE + "/?s=" + encodeURIComponent(query));
    return parseItems(html);
  } catch (e) {
    log("[ThuvienHD] search error: " + e);
    return [];
  }
}

function load(url) {
  try {
    const html = tHttpGet(url);
    // direct link
    const reg = /(https?:\/\/[^\s"']+\.(?:mp4|m3u8)[^\s"']*)/gi;
    let m = reg.exec(html);
    if (m && m[1]) return { name: "ThuvienHD Stream", type: "movie", streams: [{ url: m[1], quality: "HD", lang: "vi" }] };
    // iframe fallback
    const iframe = /<iframe[^>]*src="([^"]+)"[^>]*>/i.exec(html);
    if (iframe && iframe[1]) {
      let src = iframe[1]; if (src.indexOf("//") === 0) src = "https:" + src;
      return { name: "ThuvienHD Embed", type: "movie", streams: [{ url: src, quality: "HD", lang: "vi", embed: true }] };
    }
    return null;
  } catch (e) {
    log("[ThuvienHD] load error: " + e);
    return null;
  }
}
