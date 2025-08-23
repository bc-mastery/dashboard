// /js/pages/targeting.js

import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS, IMAGES } from "../core/config.js";
import { state } from "../core/state.js";
import { inferAccess, esc, parseAreas, toDownloadLink } from "../core/utils.js";
import { detectMode, setABCMap } from "../core/abcMap.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  maybeInsertUniversalUpgradeBlock,
  updateFloatingCTA,
} from "../core/ui.js";
import { finalBlockContent } from "../components/blocks.js";
import { fetchPdfLinks } from "../services/pdf.js";

/* ------------------------------ main render ------------------------------ */
export async function renderTargetingTab() {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Targeting Strategy…</p></div>`;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    // Cache + access
    state.lastApiByTab.targeting = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    // Pre-fill direct PDF link (from T_STRATEGY_OUTPUT)
    const view = d.T_STRATEGY_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.targeting = toDownloadLink(view);
      updateFloatingCTA("targeting");
    }

    // Allow full content if TS_PAID or 4PBS_PAID is set
    const allowFull = !!d.TS_PAID || !!d["4PBS_PAID"];

    // Paint page
    paintTargeting(api, allowFull);

    // Show the secondary chips row and populate chips from sections
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    // Optionally fetch dynamic PDF links from the Apps Script "pdf" mode, then refresh CTA
    try {
      await fetchPdfLinks("targeting");
      updateFloatingCTA("targeting");
    } catch (_) {
      // ignore PDF fetch errors silently
    }

    // Insert upgrade block for preview users
    maybeInsertUniversalUpgradeBlock({
      isPreviewOnly: !allowFull,
      content: finalBlockContent.targeting,
    });

    // Floating call button for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err?.message || err}</p></div>`;
  }
}

/* ------------------------------ page painter ----------------------------- */
function paintTargeting(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const brandEl = document.getElementById("brandName");
  if (brandEl) {
    const full = String(d.Brand || "");
    const short = full.length > 80 ? full.slice(0, 80) : full;
    brandEl.textContent = short;
    brandEl.title = full;
  }

  const areas = parseAreas(d.D_AREA);
  const mode = detectMode(areas);

  let html = `
    <div class="card scrollTarget" id="block-behavioral">
      <div class="bfGrid">
        <div class="bfText">
          <div class="bfTitle">Behavioral Factors</div>
          ${d.D_AREA ? `<p><span class="bfSub">Demand Area(s):</span> ${esc(d.D_AREA)}</p>` : ""}
          ${d.D_DRIVER ? `<p><span class="bfSub">Driver(s):</span> ${esc(d.D_DRIVER)}</p>` : ""}
          ${d.D_DRIVER_DESC ? `<p class="bfDesc preserve">${esc(d.D_DRIVER_DESC)}</p>` : ""}
        </div>
        <div class="bfMap">
          <div class="abc-wrap"
               data-mode="${mode}"
               data-areas="${areas.map(String).join("|")}"
               data-overlay="${IMAGES.abcFrame}">
            <div class="donut"></div>
            <img class="overlay" alt="ABC overlay">
          </div>
        </div>
      </div>
    </div>
  `;

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

  // Hydrate any ABC maps present
  document.querySelectorAll(".abc-wrap").forEach((container) => {
    const m = (container.dataset.mode || "B2B").toUpperCase();
    const a = (container.dataset.areas || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    // Always use the configured, case-correct path (with version param if present)
    const overlayPath = container.dataset.overlay || IMAGES.abcFrame;
    setABCMap({ container, mode: m, areas: a, overlayPath });
  });
}
