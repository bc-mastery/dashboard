// /js/pages/sales.js

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
export async function renderSalesTab() {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Sales Strategy…</p></div>`;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    // Cache + access
    state.lastApiByTab.sales = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    // Pre-fill direct PDF link (from S_STRATEGY_OUTPUT)
    const view = d.S_STRATEGY_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.sales = toDownloadLink(view);
      updateFloatingCTA("sales");
    }

    // Allow full content if SALES_PAID or 4PBS_PAID is set
    const allowFull = !!d.SALES_PAID || !!d["4PBS_PAID"];

    // Paint page
    paintSales(api, allowFull);

    // Secondary chips row
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    // Try to fetch dynamic PDF links from pdf mode, then refresh CTA
    try {
      await fetchPdfLinks("sales");
      updateFloatingCTA("sales");
    } catch (_) {
      // ignore
    }

    // Insert upgrade block for preview users
    maybeInsertUniversalUpgradeBlock({
      isPreviewOnly: !allowFull,
      content: finalBlockContent.sales,
    });

    // Floating call button for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err?.message || err}</p></div>`;
  }
}

/* ------------------------------ page painter ----------------------------- */
function paintSales(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const areas = parseAreas(d.D_AREA);

  let html = "";

  // First block — always shown
  html += buildFirstBlockHTML({
    title: "Sales Characteristics",
    subtitleLabel: "Sales Style",
    subtitleValue: d.S_AUDIENCE_VISION,
    descText: d.S_COMMUNICATION_FOCUS,
    areas,
  });

  // Full details when allowed
  if (allowFull) {
    html += `
      <div class="card scrollTarget" id="block-sales-details">
        <div class="sectionTitle">Sales Strategy</div>
        ${d.S_VISION ? `<p><span class="subtitle">Sales Vision:</span> ${esc(d.S_VISION)}</p>` : ""}
        ${d.S_APPROACH ? `<p><span class="subtitle">Approach & Cadence:</span> ${esc(d.S_APPROACH)}</p>` : ""}
        ${d.S_COMMUNICATION ? `<p><span class="subtitle">Communication Type:</span> ${esc(d.S_COMMUNICATION)}</p>` : ""}
        ${d.S_CONVERSION ? `<p><span class="subtitle">Conversion Focus:</span> ${esc(d.S_CONVERSION)}</p>` : ""}
        ${d.S_RELATION ? `<p><span class="subtitle">Relationship Strategy:</span> ${esc(d.S_RELATION)}</p>` : ""}
        ${d.S_NEGOTIATION ? `<p><span class="subtitle">Negotiation Style:</span> ${esc(d.S_NEGOTIATION)}</p>` : ""}
        ${d.S_OBJECTION ? `<p><span class="subtitle">Objection Handling:</span> ${esc(d.S_OBJECTION)}</p>` : ""}
        ${d.S_DOCUMENTATION ? `<p><span class="subtitle">Documentation Support:</span> ${esc(d.S_DOCUMENTATION)}</p>` : ""}
      </div>
    `;
  }

  contentDiv.innerHTML = html;
  hydrateABCMaps();
}
