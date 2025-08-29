// /js/pages/targeting.js

import { ACCESS, IMAGES } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { inferAccess, esc, parseAreas, toDownloadLink } from "../core/utils.js";
import {
  buildFirstBlockHTML,
  hydrateABCMaps, // <-- THE FIX IS HERE
  finalBlockContent,
} from "../components/blocks.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  maybeInsertUniversalUpgradeBlock,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";
import { fetchDashboardData } from "../services/api.js";

/* ------------------------------ main render ------------------------------ */
export async function renderTargetingTab() {
  setCurrentTab("targeting");
  document.body.setAttribute("data-current-tab", "targeting");
  clearUpgradeBlock();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Targeting Strategy…</p></div>`;

  try {
    const api = await fetchDashboardData();

    state.lastApiByTab.targeting = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    const view = d.T_STRATEGY_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.targeting = toDownloadLink(view);
      updateFloatingCTA("targeting");
    }

    const allowFull = !!d.TS_PAID || !!d["4PBS_PAID"];
    paintTargeting(api, allowFull);

    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();
    updateFloatingCTA("targeting");

    maybeInsertUniversalUpgradeBlock({
      tab: "targeting",
      isPreviewOnly: !allowFull,
      content: finalBlockContent.targeting,
    });

    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${esc(err?.message || err)}</p></div>`;
  }
}

/* ------------------------------ page painter ----------------------------- */
function paintTargeting(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const areas = parseAreas(d.D_AREA);

  let html = buildFirstBlockHTML({
    title: "Behavioral Factors",
    subtitleLabel: "Demand Area(s)",
    subtitleValue: d.D_AREA,
    descText: d.D_DRIVER_DESC,
    areas,
  });

  if (allowFull) {
    html += `
      <div class="card scrollTarget" id="block-positioning">
        <div class="sectionTitle">Positioning</div>
        ${d.D_SEGMENT ? `<p><span class="subtitle">Target Segment:</span> ${esc(d.D_SEGMENT)}</p>` : ""}
        ${d.D_SEGMENT_DESC ? `<p class="preserve">${esc(d.D_SEGMENT_DESC)}</p>` : ""}
        ${d.T_CHARACTER ? `<p><span class="subtitle">Customer Label:</span> ${esc(d.T_CHARACTER)}</p>` : ""}
        ${d.T_CHARACTER_DESC ? `<p class="preserve">${esc(d.T_CHARACTER_DESC)}</p>` : ""}
      </div>

      <div class="card scrollTarget" id="block-macro">
        <div class="sectionTitle">Macro-behavior</div>
        ${d.T_DECISION ? `<p><span class="subtitle">Decision-making of your customers:</span> ${esc(d.T_DECISION)}</p>` : ""}
        ${d.T_DECISION_DESC ? `<p class="preserve">${esc(d.T_DECISION_DESC)}</p>` : ""}
        ${d.T_ACTION ? `<p><span class="subtitle">Action pattern of your customers:</span> ${esc(d.T_ACTION)}</p>` : ""}
        ${d.T_ACTION_DESC ? `<p class="preserve">${esc(d.T_ACTION_DESC)}</p>` : ""}
        ${d.T_APPROACH ? `<p><span class="subtitle">Mindset of your customers:</span> ${esc(d.T_APPROACH)}</p>` : ""}
        ${d.T_APPROACH_DESC ? `<p class="preserve">${esc(d.T_APPROACH_DESC)}</p>` : ""}
      </div>

      <div class="card scrollTarget" id="block-persona">
        <div class="sectionTitle">Target Persona</div>
        ${d.TP_NAME ? `<p><span class="subtitle">Name of the Target Persona:</span> ${esc(d.TP_NAME)}</p>` : ""}
        ${d.TP_ROLE ? `<p><span class="subtitle">Role and objectives:</span> ${esc(d.TP_ROLE)}</p>` : ""}
        ${d.TP_INTENT ? `<p><span class="subtitle">Intent and purchasing behavior:</span> ${esc(d.TP_INTENT)}</p>` : ""}
        ${d.TP_TRIGGERS ? `<p><span class="subtitle">Behavior, mindset and decision triggers:</span> ${esc(d.TP_TRIGGERS)}</p>` : ""}
        ${d.TP_DRIVERS ? `<p><span class="subtitle">Emotional drivers and motivations:</span> ${esc(d.TP_DRIVERS)}</p>` : ""}
        ${d.TP_FEARS ? `<p><span class="subtitle">Underlying fears and sensitivities:</span> ${esc(d.TP_FEARS)}</p>` : ""}
        ${d.TP_OFFER_FIT ? `<p><span class="subtitle">Brand and offering fit:</span> ${esc(d.TP_OFFER_FIT)}</p>` : ""}
        ${d.TP_COMM_STYLE ? `<p><span class="subtitle">Ideal communication style:</span> ${esc(d.TP_COMM_STYLE)}</p>` : ""}
        ${d.TP_SUMMARY ? `<p><span class="subtitle">Persona summary statement:</span> ${esc(d.TP_SUMMARY)}</p>` : ""}
      </div>
    `;
  }

  contentDiv.innerHTML = html;
  hydrateABCMaps();
}
