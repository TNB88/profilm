// ==Cloudstream==
// @name Fshare Cloudstream (Pro)
// @version 3.1
// @description Phát video từ Fshare.vn — login tự động, lưu token, lấy direct link.
// @language vi
// @author TNB88
// ==/Cloudstream==

const BASE_URL = "https://www.fshare.vn";
const API_URL = "https://api.fshare.vn/api";
const FS_USER_AGENT = "okhttp/4.9.0";

// in-memory fallback cache
let _cfg = { fshare_email: "", fshare_token: "" };

/* -------------------------
   Storage helpers (multi fallback)
   Replace or extend if Cloudstream runtime exposes specific pref API.
   ------------------------- */
function saveConfig(key, value) {
  try {
    if (typeof setPref === "function") { setPref(key, value); return true; }
    if (typeof prefs !== "undefined" && typeof prefs.set === "function") { prefs.set(key, value); return true; }
    if (typeof plugin !== "undefined" && typeof plugin.setPreference === "function") { plugin.setPreference(key, value); return true; }
  } catch (e) { /* ignore */ }
  _cfg[key] = value;
  log("[Fshare] Saved config via fallback (in-memory).");
  return true;
}
function loadConfig(key) {
  try {
    if (typeof getPref === "function") return getPref(key);
    if (typeof prefs !== "undefined" && typeof prefs.get === "function") return prefs.get(key);
    if (typeof plugin !== "undefined" && typeof plugin.getPreference === "function") return plugin.getPreference(key);
  } catch (e) { /* ignore */ }
  return _cfg[key] || null;
}

function setEmail(email) { saveConfig("fshare_email", email || ""); _cfg["fshare_email"] = email || ""; }
function getEmail() { return loadConfig("fshare_email") || _cfg["fshare_email"] || ""; }
function setToken(token) { saveConfig("fshare_token", token || ""); _cfg["fshare_token"] = token || ""; }
function getToken() { return loadConfig("fshare_token") || _cfg["fshare_token"] || ""; }

/* -------------------------
   HTTP helpers - adapt to Cloudstream runtime if needed
   ------------------------- */
function HTTP_GET(url, headers) {
  if (typeof GET === "function") {
    if (headers) return GET(url, headers);
    return GET(url);
  }
  throw new Error("HTTP GET not available in this runtime. Please adapt HTTP_GET.");
}
function HTTP_POST(url, body, headers) {
  if (typeof POST === "function") {
    return POST(url, { body: body, headers: headers || {} });
  }
  throw new Error("HTTP POST not available in this runtime. Please adapt HTTP_POST.");
}

/* -------------------------
   Login + token handling
   ------------------------- */
function login(email, password) {
  if (!email || !password) return { success: false, message: "Thiếu email hoặc password" };
  try {
    const payload = JSON.stringify({
      user_email: email,
      password: password,
      app_key: "AHJc2L9dN83tF8xk"
    });
    const res = HTTP_POST(API_URL + "/user/login", payload, {
      "Content-Type": "application/json",
      "User-Agent": FS_USER_AGENT
    });
    let data = null;
    try { data = JSON.parse(res); } catch (e) { data = null; }
    if (data && data.token) {
      setEmail(email); setToken(data.token);
      log("[Fshare] Đăng nhập thành công, token đã lưu.");
      return { success: true, token: data.token };
    } else {
      const msg = data && data.error ? JSON.stringify(data.error) : "Không nhận token từ API";
      log("[Fshare] Đăng nhập thất bại: " + msg);
      return { success: false, message: msg };
    }
  } catch (err) {
    log("[Fshare] Exception login: " + err);
    return { success: false, message: String(err) };
  }
}

/* optional refresh flow (placeholder) */
function refreshTokenIfNeeded() {
  // Fshare token expiry behaviour can vary. If you detect 401 on requests, re-login needed.
  return true;
}

/* -------------------------
   Get direct link from share URL
   ------------------------- */
function getDirectLink(shareUrl) {
  const token = getToken();
  if (!token) {
    log("[Fshare] Không có token. Vui lòng login trước.");
    return null;
  }
  const m = String(shareUrl).match(/\/file\/([A-Za-z0-9_.-]+)/);
  if (!m) {
    log("[Fshare] URL không hợp lệ: " + shareUrl);
    return null;
  }
  const fileId = m[1];

  try {
    // Try session download endpoint
    const payload = JSON.stringify({ url: `${BASE_URL}/file/${fileId}` });
    const res = HTTP_POST(API_URL + "/session/download", payload, {
      "Content-Type": "application/json",
      "User-Agent": FS_USER_AGENT,
      "Authorization": "Bearer " + token
    });
    let data = null;
    try { data = JSON.parse(res); } catch (e) { data = null; }

    // common shapes
    if (data) {
      if (data.location) return data.location;
      if (data.url) return data.url;
      if (data.direct_link) return data.direct_link;
      if (data.data && (data.data.location || data.data.url)) return data.data.location || data.data.url;
    }
    // If API doesn't give direct link, try to GET the share page and parse
    const html = HTTP_GET(`${BASE_URL}/file/${fileId}`);
    // Try to find a direct video URL in page (heuristic)
    const regex = /(https?:\/\/[^\s"']+?(?:mp4|m3u8|googleusercontent)[^\s"']*)/gi;
    const match = regex.exec(html);
    if (match && match[1]) return match[1];
    log("[Fshare] Không tìm thấy direct link trong response.");
    return null;
  } catch (err) {
    log("[Fshare] Exception getDirectLink: " + err);
    return null;
  }
}

/* -------------------------
   Plugin interface (home/search/load)
   ------------------------- */

// Home page (demo + quick actions)
function getHomePage() {
  return [
    {
      name: "Profilm Việt - Nổi bật",
      list: [
        {
          name: "Big Buck Bunny (test)",
          url: "https://www.fshare.vn/file/demo-abc123",
          poster: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217"
        },
        {
          name: "Hướng dẫn cấu hình Fshare",
          url: "https://www.fshare.vn/file/help-config",
          poster: "https://www.stremio.com/website/stremio-logo-small.png"
        }
      ]
    }
  ];
}

// Basic search: try Fshare search page and parse titles/links
function getSearchResults(query) {
  try {
    const html = HTTP_GET(`${BASE_URL}/search?keyword=${encodeURIComponent(query)}`);
    const results = [];
    const regex = /href="\/file\/([A-Za-z0-9_.-]+)".*?title="([^"]+)"/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      results.push({ name: m[2], url: `${BASE_URL}/file/${m[1]}` });
    }
    return results;
  } catch (err) {
    log("[Fshare] Lỗi search: " + err);
    return [];
  }
}

// Load (Cloudstream will call to get streams)
function load(url) {
  const direct = getDirectLink(url);
  if (!direct) return null;
  return {
    name: "Fshare Stream",
    type: "movie",
    streams: [
      { url: direct, quality: "HD", lang: "vi" }
    ]
  };
}

/* ============================
   Usage notes (quick)
   ============================
 - Commit fshare.js + config.json etc.
 - To login (if runtime allows calling functions), call:
     login("youremail@example.com", "yourpassword")
   Otherwise, implement simple UI or set config.json.fshare.token manually (private).
 - If GET/POST or pref API names differ, adapt HTTP_GET/HTTP_POST and saveConfig/loadConfig.
*/
