// /js/core/utils.js
import { ACCESS } from "./config.js";

/* ---------- HTML escape ---------- */
export function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Drive view URL -> direct download ---------- */
export function toDownloadLink(viewUrl) {
  const s = String(viewUrl || "");
  const m = s.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  return m && m[1]
    ? `https://drive.google.com/uc?export=download&id=${m[1]}`
    : s;
}

/* ---------- UI helper ---------- */
export function getMinTabsRequiredForDownload() {
  const row = document.getElementById("blockTabsRow");
  const n = parseInt(row?.getAttribute("data-min-tabs") || "2", 10);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/* ---------- truthy flags ---------- */
export function truthyFlag(v) {
  if (v === true) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "paid" || s === "ok";
}

/* ---------- access inference ---------- */
export function inferAccess(d = {}) {
  const direct = String(d.ACCESS || "").toUpperCase();
  if ([ACCESS.FULL_4PBS, ACCESS.TARGETING_ONLY, ACCESS.GS_ONLY].includes(direct)) {
    return direct;
  }
  // Heuristics / legacy flags
  if (truthyFlag(d.PAID_4PBS) || truthyFlag(d.STRIPE_4PBS) || truthyFlag(d.FULL_4PBS) || truthyFlag(d["4PBS_PAID"])) {
    return ACCESS.FULL_4PBS;
  }
  if (truthyFlag(d.PAID_TARGETING) || truthyFlag(d.STRIPE_TARGETING) || truthyFlag(d["TS_PAID"])) {
    return ACCESS.TARGETING_ONLY;
  }
  return ACCESS.GS_ONLY;
}

/* ---------- parse areas string ---------- */
export function parseAreas(s) {
  if (!s) return [];
  return String(s)
    .split(/(?:\s*(?:\+|,|&|\/|and)\s*)/i)
    .map((x) => x.trim())
    .filter(Boolean);
}
