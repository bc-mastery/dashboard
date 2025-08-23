// /js/core/config.js

// URL params
export const params = new URLSearchParams(window.location.search);
export const token = params.get("token") || "";
export const nocacheFlag = params.get("nocache") === "1";

// Apps Script endpoint
export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwSSewkiyRw1QaCZCCoT4U9CawClXEE9sH53Mz7DICuJ79gon6Z1V3s8q0iFOiy5iAt/exec";

// === Asset base paths (relative) ===
export const ASSET_BASE = "./assets/";
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
  growth:     `${PATHS.icons}Icon_gs_white.png`,
  targeting:  `${PATHS.icons}Icon_targeting.png`,
  offer:      `${PATHS.icons}Icon_offer.png`,
  marketing:  `${PATHS.icons}Icon_marketing.png`,
  sales:      `${PATHS.icons}Icon_sales.png`,
  mentoring:  `${PATHS.icons}Icon_sales.png`,     // placeholder
  knowledge:  `${PATHS.icons}Icon_marketing.png`, // placeholder
};

// Used by ui.js for the CTA icon swap
export const UI_ICONS = {
  download: `${PATHS.icons}Icon_download.png`,
  lock:     `${PATHS.icons}Icon_lock.png`,
};

// Used by components/blocks.js for the ABC overlay frame
// IMPORTANT: filename + casing must match your repo exactly.
export const IMAGES = {
  abcFrame: `${PATHS.images}ABC_map_frame.PNG`,
};

// Access enum
export const ACCESS = {
  GS_ONLY: "GS_ONLY",
  TARGETING_ONLY: "TARGETING_ONLY",
  FULL_4PBS: "FULL_4PBS",
};
