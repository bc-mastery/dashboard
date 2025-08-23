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

/* ---------- Robust: build a safe, downloadable PDF link (never throws) ---------- */
export function toDownloadLink(raw) {
  if (!raw || typeof raw !== "string") return "";

  try {
    const s = raw.trim();

    // Already a data: PDF URL
    if (/^data:application\/pdf/i.test(s)) return s;

    // Any direct http(s) .pdf URL
    if (/^https?:\/\/\S+\.pdf(\?.*)?$/i.test(s)) return s;

    // Google Drive: file/d/<ID>/...
    let m = s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;

    // Google Drive links with ?id=<ID> (open?id=..., uc?id=..., etc.)
    m = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;

    // Google Docs/Sheets/Slides -> export as PDF
    // Keeps existing export=pdf links intact; otherwise builds one.
    m = s.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/i);
    if (m) {
      if (/export=pdf/i.test(s)) return s;
      const type = m[1].toLowerCase(); // document | spreadsheets | presentation
      const id   = m[2];
      return `https://docs.google.com/${type}/d/${id}/export?format=pdf`;
    }

    // Unknown/unsupported format → fail closed but do NOT throw.
    console.warn("toDownloadLink: Unrecognized URL format", s);
    return "";
  } catch (e) {
    console.warn("toDownloadLink failed:", e);
    return "";
  }
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
