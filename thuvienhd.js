// ==Cloudstream==
// @name ThuvienHD Source
// @version 1.1
// @description Crawl ThuvienHD - phim chất lượng cao, trending, backup links.
// @language vi
// @author TNB88
// ==/Cloudstream==

const TVHD_BASE = "https://www.thuvienhd.com"; // chỉnh lại nếu domain đổi

function logInfo(msg) {
  if (typeof log === "function") log(msg);
  else if (typeof console !== "undefined") console.log("[ThuvienHD] " + msg);
}

function tHttpGet(url) {
  if (typeof GET === "function") return GET(url);
  throw new Error("HTTP GET not available in this runtime.");
}

function parseItems(html) {
  const items = [];
  // Regex tìm các thẻ <a><img alt="Tên phim">
  const regex =
    /<a[^>]*href="([^"]+)"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    let href = m[1];
    if (href.indexOf("http") !== 0) href = TVHD_BASE + href;
    items.push({
      name: m[3].trim(),
      url: href,
      poster: m[2],
    });
  }
  return items;
}

function getHomePage() {
  try {
    const html = tHttpGet(TVHD_BASE);
    const items = parseItems(html).slice(0, 12);
    return [{ name: "ThuvienHD - Mới cập nhật", list: items }];
  } catch (e) {
    logInfo("Home error: " + e);
    return [];
  }
}

function getSearchResults(query) {
  try {
    const html = tHttpGet(TVHD_BASE + "/?s=" + encodeURIComponent(query));
    return parseItems(html);
  } catch (e) {
    logInfo("
