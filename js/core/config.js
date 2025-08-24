// /js/core/config.js

// URL params (query + hash) with auto-repair to query string
const parseHashParams = () => {
  const h = window.location.hash || "";
  if (!h) return new URLSearchParams();
  const s = h.startsWith("#") ? h.slice(1) : h; // remove leading '#'
  // support "#token=...", "#/path?token=...", "#?token=..."
  const q = s.includes("?") ? s.slice(s.indexOf("?") + 1) : (s.includes("=") ? s : "");
  return q ? new URLSearchParams(q) : new URLSearchParams();
};

const getParam = (name) => {
  const qs = new URLSearchParams(window.location.search);
  let v = qs.get(name);
  if (!v) v = parseHashParams().get(name);
  return v ? v.trim() : "";
};

// Get token + nocache
let _token = getParam("token");
export const token = _token ? _token.toLowerCase() : "";
export const nocacheFlag = getParam("nocache") === "1";

// one-time auto-repair: move token/tab from hash → query so refreshes keep working
(() => {
  const url = new URL(window.location.href);
  const hp = parseHashParams();
  let changed = false;
  const ht = hp.get("token");
  const htab = hp.get("tab");
  if (!url.searchParams.get("token") && ht) { url.searchParams.set("token", ht); changed = true; }
  if (!url.searchParams.get("tab") && htab) { url.searchParams.set("tab", htab); changed = true; }
  if (changed) {
    // strip token/tab from hash
    const newHash = (window.location.hash || "").replace(/([?&])(token|tab)=[^&#]*/g, "").replace(/[?&]$/, "");
    history.replaceState(null, "", url.origin + url.pathname + "?" + url.searchParams.toString() + newHash);
  }
})();

// Debug marker to verify new build is live
console.debug("config.js: URL param patch active");

// Apps Script endpoint (BASE URL — no token here)
export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz3aia88ngH0vnWvPEAznF0nxQ1ogqzRlz6YjXsfmNYxhXdxLpV7m8RI8oX7fTFwuE1/exec";

/**
 * Asset paths
 * Use ROOT-ABSOLUTE paths so they work on Cloudflare Pages regardless of the page URL.
 * Add a tiny cache-buster to images to avoid stale CDN versions when you change files.
 */
export const ASSET_BASE = "/assets/";
export const ASSET_VER = "2"; // bump to force refresh, e.g. "3"

export const PATHS = {
  icons:  `${ASSET_BASE}icons/`,
  logos:  `${ASSET_BASE}logos/`,
  images: `${ASSET_BASE}images/`,
};

// Dynamic header (title + icon)
export const TAB_TITLES = {
  growth: "Growth Scan",
  targeting: "Targeting Strategy",
  offer: "Offer Strategy",
  marketing: "Marketing Strategy",
  sales: "Sales Strategy",
  mentoring: "Mentoring",
  knowledge: "Knowledge Hub",
};

export const TAB_ICONS = {
  growth:     `${PATHS.icons}Icon_gs_white.png?v=${ASSET_VER}`,
  targeting:  `${PATHS.icons}Icon_targeting.png?v=${ASSET_VER}`,
  offer:      `${PATHS.icons}Icon_offer.png?v=${ASSET_VER}`,
  marketing:  `${PATHS.icons}Icon_marketing.png?v=${ASSET_VER}`,
  sales:      `${PATHS.icons}Icon_sales.png?v=${ASSET_VER}`,
  mentoring:  `${PATHS.icons}Icon_sales.png?v=${ASSET_VER}`,     // placeholder
  knowledge:  `${PATHS.icons}Icon_marketing.png?v=${ASSET_VER}`, // placeholder
};

// Used by ui.js for the CTA icon swap
export const UI_ICONS = {
  download: `${PATHS.icons}Icon_download.png?v=${ASSET_VER}`,
  lock:     `${PATHS.icons}Icon_lock.png?v=${ASSET_VER}`,
};

// Used by components/blocks.js for the ABC overlay frame
export const IMAGES = {
  abcFrame: `${PATHS.images}ABC_map_frame.PNG?v=${ASSET_VER}`,
};

// Access enum
export const ACCESS = {
  GS_ONLY: "GS_ONLY",
  TARGETING_ONLY: "TARGETING_ONLY",
  FULL_4PBS: "FULL_4PBS",
};
