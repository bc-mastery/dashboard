// /js/pages/offer.js

import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS } from "../core/config.js";
import { state } from "../core/state.js";
import { inferAccess, parseAreas, toDownloadLink, esc } from "../core/utils.js";
import {
  buildFirstBlockHTML,
  hydrateABCMaps,
  finalBlockContent,
} from "../components/blocks.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  maybeInsertUniversalUpgradeBlock,
  updateFloatingCTA,
} from "../core/ui.js";
import { fetchPdfLinks } from "../services/pdf.js";

/* ------------------------------ main render ------------------------------ */
export async function renderOfferTab() {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Offer Strategy…</p></div>`;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    // Cache + access
    state.lastApiByTab.offer = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    // Header brand text
    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    // Pre-fill direct PDF link (from O_STRATEGY_OUTPUT)
    const view = d.O_STRATEGY_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.offer = toDownloadLink(view);
      updateFloatingCTA("offer");
    }

    // Allow full content if OFFER_PAID or 4PBS_PAID is set
    const allowFull = !!d.OFFER_PAID || !!d["4PBS_PAID"];

    // Paint page
    paintOffer(api, allowFull);

    // Secondary chips row
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    // Try to fetch dynamic PDF links from pdf mode, then refresh CTA
    try {
      await fetchPdfLinks("offer");
      updateFloatingCTA("offer");
    } catch (_) {
      // ignore
    }

    // Insert upgrade block for preview users
    maybeInsertUniversalUpgradeBlock({
      isPreviewOnly: !allowFull,
      content: finalBlockContent.offer,
    });

    // Floating call button for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err?.message || err}</p></div>`;
  }
}

/* ------------------------------ page painter ----------------------------- */
function paintOffer(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const areas = parseAreas(d.D_AREA);

  let html = "";

  // First block — always shown (ABC map via buildFirstBlockHTML -> IMAGES.abcFrame)
  html += buildFirstBlockHTML({
    title: "Offer Characteristics",
    subtitleLabel: "Offer Character",
    subtitleValue: d.O_CHARACTER,
    descText: d.O_CHARACTER_DESC,
    areas,
  });

  // Full details when allowed
  if (allowFull) {
    html += `
      <div class="card scrollTarget" id="block-offer-details">
        <div class="sectionTitle">Offer Strategy</div>
        ${d.O_CONCEPT ? `<p><span class="subtitle">Core Concept:</span> ${esc(d.O_CONCEPT)}</p>` : ""}
        ${d.O_CHARACTERISTICS ? `<p><span class="subtitle">Key Characteristics:</span> ${esc(d.O_CHARACTERISTICS)}</p>` : ""}
        ${d.O_FEATURE ? `<p><span class="subtitle">Defining Feature:</span> ${esc(d.O_FEATURE)}</p>` : ""}
        ${d.O_VALUE ? `<p><span class="subtitle">Primary Value:</span> ${esc(d.O_VALUE)}</p>` : ""}
        ${d.O_RETENTION ? `<p><span class="subtitle">Retention Mechanism:</span> ${esc(d.O_RETENTION)}</p>` : ""}
        ${d.O_APPEARANCE ? `<p><span class="subtitle">Appearance and Delivery:</span> ${esc(d.O_APPEARANCE)}</p>` : ""}
        ${d.O_PRICING ? `<p><span class="subtitle">Pricing Strategy:</span> ${esc(d.O_PRICING)}</p>` : ""}
      </div>
    `;
  }

  contentDiv.innerHTML = html;

  // Activate any abc-wrap we just injected
  hydrateABCMaps();
}
