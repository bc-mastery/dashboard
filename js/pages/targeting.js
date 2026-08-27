// /js/pages/targeting.js

import { ACCESS, IMAGES, token } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { inferAccess, esc, parseAreas, toDownloadLink } from "../core/utils.js";
import { detectMode, setABCMap } from "../core/abcMap.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  maybeInsertUniversalUpgradeBlock,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";
import { finalBlockContent } from "../components/blocks.js";
import { centerLockChart } from "../core/charts.js";
import { fetchDashboardData } from "../services/api.js";

function getSpreadsheetValue(data, columnName) {
  if (!data) return "";

  const target =
    columnName.toLowerCase().trim();

  for (const key of Object.keys(data)) {
    const cleanKey =
      key
        .replace(/[{}]/g, "")
        .toLowerCase()
        .trim();

    if (cleanKey === target) {
      return String(data[key] ?? "").trim();
    }
  }

  return "";
}

function renderInterpretationBlock(value, brand, className = "preserve") {
  const interpretation = String(value || "").trim();
  const brandName = String(brand || "").trim();

  if (!interpretation || !brandName) return "";

  return `
    <p class="${className}"><strong>What it means for ${esc(brandName)}:</strong></p>
    <p class="${className}">${esc(interpretation)}</p>
  `;
}

function injectTargetingStylesOnce() {
  if (document.getElementById("targeting-styles")) return;
  const style = document.createElement("style");
  style.id = "targeting-styles";
  style.textContent = `
    #content .card .bfGrid { display: grid; grid-template-columns: 2fr 1fr; align-items: start; gap: 22px; }
    #content .bfMap .abc-wrap { position: relative; width: 100%; max-width: 360px; aspect-ratio: 1 / 1; margin-left: auto; }
    #content .bfMap .abc-wrap .overlay { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; user-select: none; display: block; }
    #content .bfMap .abc-wrap .donut { position: absolute; inset: 0; width: 100%; height: 100%; }
    @media (max-width: 860px) {
      #content .card .bfGrid { grid-template-columns: 1fr; gap: 16px; }
      #content .bfMap { display: flex; justify-content: center; }
      #content .bfMap .abc-wrap { max-width: 300px; margin-left: 0; }
    }
  `;
  document.head.appendChild(style);
}

export async function renderTargetingTab(forceRefresh = false) {
  setCurrentTab("targeting");
  document.body.setAttribute("data-current-tab", "targeting");
  clearUpgradeBlock();
  injectTargetingStylesOnce();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Targeting Strategy…</p></div>`;

  try {
    const api = await fetchDashboardData(forceRefresh);
    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${api?.message || "No data found."}</p></div>`;
      return;
    }

    state.lastApiByTab.targeting = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || d["{{Brand}}"] || "");
      brandEl.textContent = full.length > 80 ? full.slice(0, 80) : full;
    }

    const view = d.T_STRATEGY_OUTPUT || d["{{T_STRATEGY_OUTPUT}}"] || "";
    if (view) {
      state.dynamicPdfLinks.targeting = toDownloadLink(view);
      updateFloatingCTA("targeting");
    }

    /* --- GATE CHECK WITH ACTIVE CONSOLE LOGGING --- */
    const tsReadyValue = getSpreadsheetValue(d, "TS_READY");

    console.log(
      "🔍 Debug Gate Verification (Targeting): Found raw value for TS_READY =",
      `"${tsReadyValue}"`
    );
    
    const allowFull =
      tsReadyValue.toUpperCase() === "TRUE";

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

function paintTargeting(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const areas = parseAreas(d.D_AREA || d["{{D_AREA}}"]);
  const mode = detectMode(areas);

  const brand = d.Brand || d["{{Brand}}"] || "";

  const dArea = d.D_AREA || d["{{D_AREA}}"] || "";

  const dEffect = d.D_EFFECT || d["{{D_EFFECT}}"] || "";
  const dEffectDesc = d.D_EFFECT_DESC || d["{{D_EFFECT_DESC}}"] || "";
  const tEffectInterpretation =
    d.T_EFFECT_INTERPRETATION || d["{{T_EFFECT_INTERPRETATION}}"] || "";

  const dDriver = d.D_DRIVER || d["{{D_DRIVER}}"] || "";
  const dDriverDesc = d.D_DRIVER_DESC || d["{{D_DRIVER_DESC}}"] || "";
  const tDriverInterpretation =
    d.T_DRIVER_INTERPRETATION || d["{{T_DRIVER_INTERPRETATION}}"] || "";

  let html = `
    <div class="card scrollTarget" id="block-behavioral">
      <div class="bfGrid">
        <div class="bfText">
          <div class="bfTitle">Behavioral Factors</div>
          ${dArea ? `<p><span class="bfSub">Demand Area(s):</span> ${esc(dArea)}</p>` : ""}
          ${dEffect ? `<p><span class="bfSub">Expected Effect:</span> ${esc(dEffect)}</p>` : ""}
          ${dEffectDesc ? `<p class="bfDesc preserve">${esc(dEffectDesc)}</p>` : ""}
          ${allowFull ? renderInterpretationBlock(tEffectInterpretation, brand, "bfDesc preserve") : ""}
          ${dDriver ? `<p><span class="bfSub">Driver(s):</span> ${esc(dDriver)}</p>` : ""}
          ${dDriverDesc ? `<p class="bfDesc preserve">${esc(dDriverDesc)}</p>` : ""}
          ${allowFull ? renderInterpretationBlock(tDriverInterpretation, brand, "bfDesc preserve") : ""}
        </div>
        <div class="bfMap">
          <div class="abc-wrap" data-mode="${esc(mode)}" data-areas="${areas.map(String).map(esc).join("|")}" data-overlay="${esc(IMAGES.abcFrame)}">
            <div class="donut"></div>
            <img class="overlay" src="${IMAGES.abcFrame}" alt="ABC overlay">
          </div>
        </div>
      </div>
    </div>
  `;

  if (allowFull) {
    const dSegment = d.D_SEGMENT || d["{{D_SEGMENT}}"] || "";
    const dSegmentDesc = d.D_SEGMENT_DESC || d["{{D_SEGMENT_DESC}}"] || "";
    const tSegmentInterpretation =
      d.T_SEGMENT_INTERPRETATION || d["{{T_SEGMENT_INTERPRETATION}}"] || "";

    const tCharacter = d.T_CHARACTER || d["{{T_CHARACTER}}"] || "";
    const tCharacterDesc = d.T_CHARACTER_DESC || d["{{T_CHARACTER_DESC}}"] || "";
    const tCharacterInterpretation =
      d.T_CHARACTER_INTERPRETATION || d["{{T_CHARACTER_INTERPRETATION}}"] || "";

    const tDecision = d.T_DECISION || d["{{T_DECISION}}"] || "";
    const tDecisionDesc = d.T_DECISION_DESC || d["{{T_DECISION_DESC}}"] || "";
    const tDecisionInterpretation =
      d.T_DECISION_INTERPRETATION || d["{{T_DECISION_INTERPRETATION}}"] || "";

    const tAction = d.T_ACTION || d["{{T_ACTION}}"] || "";
    const tActionDesc = d.T_ACTION_DESC || d["{{T_ACTION_DESC}}"] || "";
    const tActionInterpretation =
      d.T_ACTION_INTERPRETATION || d["{{T_ACTION_INTERPRETATION}}"] || "";

    const tApproach = d.T_APPROACH || d["{{T_APPROACH}}"] || "";
    const tApproachDesc = d.T_APPROACH_DESC || d["{{T_APPROACH_DESC}}"] || "";
    const tApproachInterpretation =
      d.T_APPROACH_INTERPRETATION || d["{{T_APPROACH_INTERPRETATION}}"] || "";

    html += `
      <div class="card scrollTarget" id="block-positioning">
        <div class="sectionTitle">Positioning</div>
        ${dSegment ? `<p><span class="subtitle">Target Segment:</span> ${esc(dSegment)}</p>` : ""}
        ${dSegmentDesc ? `<p class="preserve">${esc(dSegmentDesc)}</p>` : ""}
        ${renderInterpretationBlock(tSegmentInterpretation, brand)}
        ${tCharacter ? `<p><span class="subtitle">Customer Label:</span> ${esc(tCharacter)}</p>` : ""}
        ${tCharacterDesc ? `<p class="preserve">${esc(tCharacterDesc)}</p>` : ""}
        ${renderInterpretationBlock(tCharacterInterpretation, brand)}
      </div>
      <div class="card scrollTarget" id="block-macro">
        <div class="sectionTitle">Macro-behavior</div>
        ${tDecision ? `<p><span class="subtitle">Decision-making of your customers:</span> ${esc(tDecision)}</p>` : ""}
        ${tDecisionDesc ? `<p class="preserve">${esc(tDecisionDesc)}</p>` : ""}
        ${renderInterpretationBlock(tDecisionInterpretation, brand)}
        ${tAction ? `<p><span class="subtitle">Action pattern of your customers:</span> ${esc(tAction)}</p>` : ""}
        ${tActionDesc ? `<p class="preserve">${esc(tActionDesc)}</p>` : ""}
        ${renderInterpretationBlock(tActionInterpretation, brand)}
        ${tApproach ? `<p><span class="subtitle">Mindset of your customers:</span> ${esc(tApproach)}</p>` : ""}
        ${tApproachDesc ? `<p class="preserve">${esc(tApproachDesc)}</p>` : ""}
        ${renderInterpretationBlock(tApproachInterpretation, brand)}
      </div>
      <div class="card scrollTarget" id="block-persona">
        <div class="sectionTitle">Target Persona</div>
        ${d.TP_NAME || d["{{TP_NAME}}"] ? `<p><span class="subtitle">Name of the Target Persona:</span> ${esc(d.TP_NAME || d["{{TP_NAME}}"])}</p>` : ""}
        ${d.TP_ROLE || d["{{TP_ROLE}}"] ? `<p><span class="subtitle">Role and objectives:</span> ${esc(d.TP_ROLE || d["{{TP_ROLE}}"])}</p>` : ""}
        ${d.TP_INTENT || d["{{TP_INTENT}}"] ? `<p><span class="subtitle">Intent and purchasing behavior:</span> ${esc(d.TP_INTENT || d["{{TP_INTENT}}"])}</p>` : ""}
        ${d.TP_TRIGGERS || d["{{TP_TRIGGERS}}"] ? `<p><span class="subtitle">Behavior, mindset and decision triggers:</span> ${esc(d.TP_TRIGGERS || d["{{TP_TRIGGERS}}"])}</p>` : ""}
        ${d.TP_DRIVERS || d["{{TP_DRIVERS}}"] ? `<p><span class="subtitle">Emotional drivers and motivations:</span> ${esc(d.TP_DRIVERS || d["{{TP_DRIVERS}}"])}</p>` : ""}
        ${d.TP_FEARS || d["{{TP_FEARS}}"] ? `<p><span class="subtitle">Underlying fears and sensitivities:</span> ${esc(d.TP_FEARS || d["{{TP_FEARS}}"])}</p>` : ""}
        ${d.TP_OFFER_FIT || d["{{TP_OFFER_FIT}}"] ? `<p><span class="subtitle">Brand and offering fit:</span> ${esc(d.TP_OFFER_FIT || d["{{TP_OFFER_FIT}}"])}</p>` : ""}
        ${d.TP_COMM_STYLE || d["{{TP_COMM_STYLE}}"] ? `<p><span class="subtitle">Ideal communication style:</span> ${esc(d.TP_COMM_STYLE || d["{{TP_COMM_STYLE}}"])}</p>` : ""}
        ${d.TP_SUMMARY || d["{{TP_SUMMARY}}"] ? `<p><span class="subtitle">Persona summary statement:</span> ${esc(d.TP_SUMMARY || d["{{TP_SUMMARY}}"])}</p>` : ""}
      </div>
    `;
  }

  contentDiv.innerHTML = html;

  document.querySelectorAll(".abc-wrap").forEach((wrapper) => {
    const m = (wrapper.dataset.mode || "B2B").toUpperCase();
    const a = (wrapper.dataset.areas || "").split("|").map((s) => s.trim()).filter(Boolean);
    setABCMap({ container: wrapper, mode: m, areas: a, overlayPath: IMAGES.abcFrame });
    centerLockChart({ wrapper, host: wrapper.querySelector(".donut"), mobileYOffset: -20 });
  });
}
