// /js/services/pdf.js
import { APPS_SCRIPT_URL, token } from "../core/config.js";
import { state } from "../core/state.js";
import { toDownloadLink } from "../core/utils.js";

/**
 * Fetch PDF links for a given tab and cache them on state.dynamicPdfLinks[tab].
 * Safe to call multiple times; it just refreshes the cache.
 */
export async function fetchPdfLinks(tab) {
  if (!token || !tab) return;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}&mode=pdf`;
    const r = await fetch(url);
    const resp = await r.json();

    if (!resp || !resp.ok || !resp.data) {
      console.warn("No valid PDF data returned for tab:", tab);
      return;
    }

    const raw = resp.data[tab];
    if (raw) {
      state.dynamicPdfLinks[tab] = toDownloadLink(raw);
    } else {
      console.warn(`No PDF link found in Apps Script response for tab: ${tab}`);
    }
  } catch (err) {
    console.error("PDF fetch error:", err);
  }
}
