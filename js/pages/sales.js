// /js/pages/sales.js

import { ACCESS } from "../core/config.js";
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
import { fetchDashboardData } from "../services/api.js";

/* ------------------------------ main render ------------------------------ */
export async function renderSalesTab() {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Sales Strategy…</p></div>`;

  try {
    const api = await fetchDashboardData();

    state.lastApiByTab.sales = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    const view = d.S_STRATEGY_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.sales = toDownloadLink(view);
      updateFloatingCTA("sales");
    }

    const allowFull = !!d.SALES_PAID || !!d["4PBS_PAID"];
    paintSales(api, allowFull);

    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    maybeInsertUniversalUpgradeBlock({
      isPreviewOnly: !allowFull,
      content: finalBlockContent.sales,
    });

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

  let html = buildFirstBlockHTML({
    title: "Sales Characteristics",
    subtitleLabel: "Sales Style",
    subtitleValue: d.S_AUDIENCE_VISION,
    descText: d.S_COMMUNICATION_FOCUS,
    areas,
  });

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
