// /js/services/pdf.js
import { APPS_SCRIPT_URL, token, nocacheFlag } from "../core/config.js";
import { state } from "../core/state.js";
import { toDownloadLink } from "../core/utils.js";

/**
 * Fetch (or recover) a PDF link for a given tab and cache it on state.dynamicPdfLinks[tab].
 * - Tries Apps Script `mode=pdf` first (resp.data[tab]).
 * - Falls back to the latest tab payload in state.lastApiByTab using column-field names.
 * - Converts Google Drive "view" links to direct download via toDownloadLink().
 *
 * @param {string} tab - e.g., "growth", "targeting", "offer", "marketing", "sales", "mentoring", "knowledge"
 * @returns {Promise<string|undefined>} direct download URL if found
 */
export async function fetchPdfLinks(tab) {
  if (!token || !tab) return;

  // If we already have a cached link, keep it (still try to refresh quietly)
  let found = state.dynamicPdfLinks[tab];

  // 1) Try Apps Script `mode=pdf` endpoint
  try {
    const url =
      `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}&mode=pdf` +
      (nocacheFlag ? "&nocache=1" : "");
    const r = await fetch(url);
    const resp = await r.json();

    if (resp && resp.ok && resp.data) {
      const rawFromMode = resp.data[tab];
      if (rawFromMode) {
        found = toDownloadLink(rawFromMode);
      }
    } else {
      console.warn("No valid PDF data returned for tab:", tab);
    }
  } catch (err) {
    console.error("PDF fetch error:", err);
  }

  // 2) Fallback: derive from the last full API payload we already fetched for this tab
  if (!found) {
    const fieldMap = {
      targeting: "T_STRATEGY_OUTPUT",
      offer:     "O_STRATEGY_OUTPUT",
      marketing: "M_STRATEGY_OUTPUT",
      sales:     "S_STRATEGY_OUTPUT",
      growth:    "GS_OUTPUT",                 // <-- Growth uses GS_OUTPUT (NC)
      mentoring: "MENTORING_STRATEGY_OUTPUT",
      knowledge: "KNOWLEDGE_STRATEGY_OUTPUT",
    };

    // Legacy/alt fallbacks per tab (if schema changes again)
    const altKeys = {
      growth:    ["GROWTH_STRATEGY_OUTPUT"],
      knowledge: ["KNOWLEDGE_OUTPUT", "K_MASTER_PDF", "KNOWLEDGE_PDF"],
    };

    const data = state.lastApiByTab[tab]?.data || {};
    let raw = data[fieldMap[tab]];

    if (!raw && altKeys[tab]) {
      for (const k of altKeys[tab]) {
        if (data[k]) { raw = data[k]; break; }
      }
    }

    if (raw) {
      found = toDownloadLink(raw);
    }
  }

  // 3) Cache and return
  if (found) {
    state.dynamicPdfLinks[tab] = found;
    return found;
  }

  return undefined;
}
