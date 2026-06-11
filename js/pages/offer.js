// /js/pages/offer.js

import { ACCESS } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { inferAccess, parseAreas, toDownloadLink, esc } from "../core/utils.js";
import { buildFirstBlockHTML, hydrateABCMaps, finalBlockContent } from "../components/blocks.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  maybeInsertUniversalUpgradeBlock,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";
import { fetchDashboardData } from "../services/api.js";

function getSpreadsheetValue(data, columnName) {
  if (!data) return "";
  const target = columnName.toLowerCase().trim();
  for (const key of Object.keys(data)) {
    const cleanKey = key.replace(/[{}]/g, "").toLowerCase().trim();
    if (cleanKey === target) {
      return String(data[key]).trim();
    }
  }
  return "";
}

export async function renderOfferTab(forceRefresh = false) {
  setCurrentTab("offer");
  document.body.setAttribute("data-current-tab", "offer");
  clearUpgradeBlock();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Offer Strategy…</p></div>`;

  try {
    const api = await fetchDashboardData(forceRefresh);
    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${api?.message || "No data found."}</p></div>`;
      return;
    }

    state.lastApiByTab.offer = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || d["{{Brand}}"] || "");
      brandEl.textContent = full.length > 80 ? full.slice(0, 80) : full;
    }

    const view = d.O_STRATEGY_OUTPUT || d["{{O_STRATEGY_OUTPUT}}"] || "";
    if (view) {
      state.dynamicPdfLinks.offer = toDownloadLink(view);
      updateFloatingCTA("offer");
    }

    /* --- GATE CHECK WITH ACTIVE CONSOLE LOGGING --- */
    const osReadyValue = getSpreadsheetValue(d, "OS_READY");
    console.log("🔍 Debug Gate Verification (Offer): Found raw value for OS_READY =", `"${osReadyValue}"`);
    
    const allowFull = osReadyValue !== "";
    
    paintOffer(api, allowFull);

    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();
    updateFloatingCTA("offer");

    maybeInsertUniversalUpgradeBlock({
      tab: "offer",
      isPreviewOnly: !allowFull,
      content: finalBlockContent.offer,
    });

    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${esc(err?.message || err)}</p></div>`;
  }
}

function paintOffer(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const areas = parseAreas(d.D_AREA || d["{{D_AREA}}"]);

  const oCharacter = d.O_CHARACTER || d["{{O_CHARACTER}}"] || "";
  const oCharacterDesc = d.O_CHARACTER_DESC || d["{{O_CHARACTER_DESC}}"] || "";

  let html = buildFirstBlockHTML({
    title: "Concept",
    subtitleLabel: "Offer Character",
    subtitleValue: oCharacter,
    descText: oCharacterDesc,
    areas,
    page: "offer",
  });

  if (allowFull) {
    html += `
      <div class="card scrollTarget" id="block-characteristics">
        <div class="sectionTitle">Characteristics</div>
        <p><span class="subtitle">${esc(d.O_CHARACTERISTIC_1 || d["{{O_CHARACTERISTIC_1}}"] || "")}</span><br>${esc(d.O_CHARACTERISTIC_1_DESC || d["{{O_CHARACTERISTIC_1_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_CHARACTERISTIC_2 || d["{{O_CHARACTERISTIC_2}}"] || "")}</span><br>${esc(d.O_CHARACTERISTIC_2_DESC || d["{{O_CHARACTERISTIC_2_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_CHARACTERISTIC_3 || d["{{O_CHARACTERISTIC_3}}"] || "")}</span><br>${esc(d.O_CHARACTERISTIC_3_DESC || d["{{O_CHARACTERISTIC_3_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_CHARACTERISTIC_4 || d["{{O_CHARACTERISTIC_4}}"] || "")}</span><br>${esc(d.O_CHARACTERISTIC_4_DESC || d["{{O_CHARACTERISTIC_4_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_CHARACTERISTIC_5 || d["{{O_CHARACTERISTIC_5}}"] || "")}</span><br>${esc(d.O_CHARACTERISTIC_5_DESC || d["{{O_CHARACTERISTIC_5_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_CHARACTERISTIC_6 || d["{{O_CHARACTERISTIC_6}}"] || "")}</span><br>${esc(d.O_CHARACTERISTIC_6_DESC || d["{{O_CHARACTERISTIC_6_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_CHARACTERISTIC_7 || d["{{O_CHARACTERISTIC_7}}"] || "")}</span><br>${esc(d.O_CHARACTERISTIC_7_DESC || d["{{O_CHARACTERISTIC_7_DESC}}"] || "")}</p>
      </div>
      <div class="card scrollTarget" id="block-features">
        <div class="sectionTitle">Features and Services</div>
        <p><span class="subtitle">${esc(d.O_FEATURE_1 || d["{{O_FEATURE_1}}"] || "")}</span><br>${esc(d.O_FEATURE_1_DESC || d["{{O_FEATURE_1_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_FEATURE_2 || d["{{O_FEATURE_2}}"] || "")}</span><br>${esc(d.O_FEATURE_2_DESC || d["{{O_FEATURE_2_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_FEATURE_3 || d["{{O_FEATURE_3}}"] || "")}</span><br>${esc(d.O_FEATURE_3_DESC || d["{{O_FEATURE_3_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_FEATURE_4 || d["{{O_FEATURE_4}}"] || "")}</span><br>${esc(d.O_FEATURE_4_DESC || d["{{O_FEATURE_4_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_FEATURE_5 || d["{{O_FEATURE_5}}"] || "")}</span><br>${esc(d.O_FEATURE_5_DESC || d["{{O_FEATURE_5_DESC}}"] || "")}</p>
      </div>
      <div class="card scrollTarget" id="block-value-triggers">
        <div class="sectionTitle">Value Triggers</div>
        <p><span class="subtitle">${esc(d.O_VALUE_1 || d["{{O_VALUE_1}}"] || "")}</span><br>${esc(d.O_VALUE_1_DESC || d["{{O_VALUE_1_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_VALUE_2 || d["{{O_VALUE_2}}"] || "")}</span><br>${esc(d.O_VALUE_2_DESC || d["{{O_VALUE_2_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_VALUE_3 || d["{{O_VALUE_3}}"] || "")}</span><br>${esc(d.O_VALUE_3_DESC || d["{{O_VALUE_3_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_VALUE_4 || d["{{O_VALUE_4}}"] || "")}</span><br>${esc(d.O_VALUE_4_DESC || d["{{O_VALUE_4_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_VALUE_5 || d["{{O_VALUE_5}}"] || "")}</span><br>${esc(d.O_VALUE_5_DESC || d["{{O_VALUE_5_DESC}}"] || "")}</p>
      </div>
      <div class="card scrollTarget" id="block-retention">
        <div class="sectionTitle">Retention Factors</div>
        <p><span class="subtitle">${esc(d.O_RETENTION_1 || d["{{O_RETENTION_1}}"] || "")}</span><br>${esc(d.O_RETENTION_1_DESC || d["{{O_RETENTION_1_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_RETENTION_2 || d["{{O_RETENTION_2}}"] || "")}</span><br>${esc(d.O_RETENTION_2_DESC || d["{{O_RETENTION_2_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_RETENTION_3 || d["{{O_RETENTION_3}}"] || "")}</span><br>${esc(d.O_RETENTION_3_DESC || d["{{O_RETENTION_3_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_RETENTION_4 || d["{{O_RETENTION_4}}"] || "")}</span><br>${esc(d.O_RETENTION_4_DESC || d["{{O_RETENTION_4_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_RETENTION_5 || d["{{O_RETENTION_5}}"] || "")}</span><br>${esc(d.O_RETENTION_5_DESC || d["{{O_RETENTION_5_DESC}}"] || "")}</p>
      </div>
      <div class="card scrollTarget" id="block-appearance">
        <div class="sectionTitle">Appearance</div>
        <p><span class="subtitle">${esc(d.O_APPEARANCE_1 || d["{{O_APPEARANCE_1}}"] || "")}</span><br>${esc(d.O_APPEARANCE_1_DESC || d["{{O_APPEARANCE_1_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_APPEARANCE_2 || d["{{O_APPEARANCE_2}}"] || "")}</span><br>${esc(d.O_APPEARANCE_2_DESC || d["{{O_APPEARANCE_2_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_APPEARANCE_3 || d["{{O_APPEARANCE_3}}"] || "")}</span><br>${esc(d.O_APPEARANCE_3_DESC || d["{{O_APPEARANCE_3_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_APPEARANCE_4 || d["{{O_APPEARANCE_4}}"] || "")}</span><br>${esc(d.O_APPEARANCE_4_DESC || d["{{O_APPEARANCE_4_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_APPEARANCE_5 || d["{{O_APPEARANCE_5}}"] || "")}</span><br>${esc(d.O_APPEARANCE_5_DESC || d["{{O_APPEARANCE_5_DESC}}"] || "")}</p>
      </div>
      <div class="card scrollTarget" id="block-pricing">
        <div class="sectionTitle">Pricing</div>
        <p><span class="subtitle">${esc(d.O_PRICING_POSITIONING || d["{{O_PRICING_POSITIONING}}"] || "")}</span><br>${esc(d.O_PRICING_POSITIONING_DESC || d["{{O_PRICING_POSITIONING_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_PRICING_PRICE_POINT || d["{{O_PRICING_PRICE_POINT}}"] || "")}</span><br>${esc(d.O_PRICING_PRICE_POINT_DESC || d["{{O_PRICING_PRICE_POINT_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_PRICING_PRICING_LOGIC || d["{{O_PRICING_PRICING_LOGIC}}"] || "")}</span><br>${esc(d.O_PRICING_PRICING_LOGIC_DESC || d["{{O_PRICING_PRICING_LOGIC_DESC}}"] || "")}</p>
        <p><span class="subtitle">${esc(d.O_PRICING_FRICTION_REDUCTION || d["{{O_PRICING_FRICTION_REDUCTION}}"] || "")}</span><br>${esc(d.O_PRICING_FRICTION_REDUCTION_DESC || d["{{O_PRICING_FRICTION_REDUCTION_DESC}}"] || "")}</p>
      </div>
    `;
  }

  contentDiv.innerHTML = html;
  hydrateABCMaps();
}
