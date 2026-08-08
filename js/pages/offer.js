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
    const cleanKey = key
      .replace(/[{}]/g, "")
      .toLowerCase()
      .trim();

    if (cleanKey === target) {
      return String(data[key] ?? "").trim();
    }
  }

  return "";
}


export async function renderOfferTab(forceRefresh = false) {
  setCurrentTab("offer");
  document.body.setAttribute("data-current-tab", "offer");
  clearUpgradeBlock();
  injectOfferHelpStylesOnce();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <div class="card">
      <p class="muted">Loading Offer Strategy…</p>
    </div>
  `;

  try {
    const api = await fetchDashboardData(forceRefresh);

    if (!api || !api.ok) {
      contentDiv.innerHTML = `
        <div class="card">
          <p class="muted">
            ${api?.message || "No data found."}
          </p>
        </div>
      `;
      return;
    }

    state.lastApiByTab.offer = {
      ...api,
      data: { ...api.data },
    };

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

    const osReadyValue = getSpreadsheetValue(d, "OS_READY");
    const allowFull = osReadyValue !== "";

    paintOffer(api, allowFull);
    setupOfferHelpBubbles();

    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) {
      blockTabsRow.style.display = "block";
    }

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
    contentDiv.innerHTML = `
      <div class="card">
        <p class="muted">
          Error loading data: ${esc(err?.message || err)}
        </p>
      </div>
    `;
  }
}


    // ------------------------------------------------------------
    // BRAND
    // ------------------------------------------------------------

    const brandEl = document.getElementById("brandName");

    if (brandEl) {
      const full = String(
        d.Brand ||
        d["{{Brand}}"] ||
        ""
      );

      brandEl.textContent =
        full.length > 80
          ? full.slice(0, 80)
          : full;
    }


    // ------------------------------------------------------------
    // OFFER PDF
    // ------------------------------------------------------------

    const view =
      d.O_STRATEGY_OUTPUT ||
      d["{{O_STRATEGY_OUTPUT}}"] ||
      "";

    if (view) {
      state.dynamicPdfLinks.offer =
        toDownloadLink(view);

      updateFloatingCTA("offer");
    }


    // ------------------------------------------------------------
    // FULL OFFER STRATEGY GATE
    //
    // IMPORTANT:
    // OS_READY controls ONLY the full strategy.
    // It does NOT control the first Concept section.
    // ------------------------------------------------------------

    const osReadyValue =
      getSpreadsheetValue(d, "OS_READY");

    const allowFull =
      osReadyValue !== "";

    console.log(
      "🔍 Offer OS_READY:",
      `"${osReadyValue}"`
    );

    console.log(
      "🔍 Offer full strategy available:",
      allowFull
    );


    // Debug first-section fields
    console.log(
      "🔍 Offer O_CHARACTER:",
      `"${getSpreadsheetValue(d, "O_CHARACTER")}"`
    );

    console.log(
      "🔍 Offer O_CHARACTER_DESC:",
      `"${getSpreadsheetValue(d, "O_CHARACTER_DESC")}"`
    );


    // ------------------------------------------------------------
    // PAINT OFFER PAGE
    // ------------------------------------------------------------

    paintOffer(api, allowFull);


    // ------------------------------------------------------------
    // BLOCK TABS
    // ------------------------------------------------------------

    const blockTabsRow =
      document.getElementById("blockTabsRow");

    if (blockTabsRow) {
      blockTabsRow.style.display = "block";
    }

    populateBlockTabsFromPage();
    updateFloatingCTA("offer");


    // ------------------------------------------------------------
    // DEMO / UPGRADE MESSAGE
    //
    // If OS_READY is empty:
    // First section remains visible,
    // but full strategy stays locked.
    // ------------------------------------------------------------

    maybeInsertUniversalUpgradeBlock({
      tab: "offer",
      isPreviewOnly: !allowFull,
      content: finalBlockContent.offer,
    });


    toggleFloatingCallBtn(
      state.lastAccess === ACCESS.GS_ONLY
    );

  } catch (err) {
    console.error(err);

    contentDiv.innerHTML = `
      <div class="card">
        <p class="muted">
          Error loading data:
          ${esc(err?.message || err)}
        </p>
      </div>
    `;
  }
}


function paintOffer(api, allowFull = false) {
  const contentDiv =
    document.getElementById("content");

  if (!contentDiv) return;

  const d =
    (api && api.data) || {};


  // ------------------------------------------------------------
  // DEMAND AREAS
  // ------------------------------------------------------------

  const areas = parseAreas(
    d.D_AREA ||
    d["{{D_AREA}}"]
  );


  // ------------------------------------------------------------
  // FIRST OFFER SECTION
  //
  // These are independent of OS_READY.
  // If the fields exist in the API response,
  // they are displayed here.
  // ------------------------------------------------------------

  const oCharacter =
    getSpreadsheetValue(d, "O_CHARACTER");

  const oCharacterDesc =
    getSpreadsheetValue(d, "O_CHARACTER_DESC");


  // FIRST BLOCK IS ALWAYS BUILT.
  // OS_READY has no influence on it.

  let html = buildFirstBlockHTML({
    title: "Concept",
    subtitleLabel: "Offer Character",
    subtitleValue: oCharacter,
    descText: oCharacterDesc,
    areas,
    page: "offer",
  });


  // ------------------------------------------------------------
  // FULL OFFER STRATEGY
  //
  // Everything below this point requires OS_READY.
  // ------------------------------------------------------------

  if (allowFull) {

  html += `
    <div class="card scrollTarget" id="block-value-triggers">
      <div class="sectionHeader">
        <div class="sectionTitle">Value Triggers</div>
        <div class="gsHelpWrap" id="offerValueTriggersHelpWrap">
          <button type="button" class="gsHelpBtn" id="offerValueTriggersHelpBtn"
            aria-label="What are Value Triggers?" aria-expanded="false"
            aria-controls="offerValueTriggersHelpBubble" title="What are Value Triggers?">?</button>
          <div class="gsHelpBubble" id="offerValueTriggersHelpBubble" role="tooltip">
            <button type="button" class="gsHelpCloseBtn" aria-label="Close">&times;</button>
            <p>Placeholder explanation for Value Triggers.</p>
          </div>
        </div>
      </div>

      <p>
        <span class="subtitle">${esc(d.O_CHARACTERISTIC_1 || d["{{O_CHARACTERISTIC_1}}"] || "")}</span>
        <br>
        ${esc(d.O_CHARACTERISTIC_1_DESC || d["{{O_CHARACTERISTIC_1_DESC}}"] || "")}
      </p>
      <!-- ... O_CHARACTERISTIC 2 through 7 ... -->
    </div>

    <div class="card scrollTarget" id="block-features">
      <div class="sectionHeader">
        <div class="sectionTitle">Features and Services</div>
        <div class="gsHelpWrap" id="offerFeaturesHelpWrap">
          <button type="button" class="gsHelpBtn" id="offerFeaturesHelpBtn"
            aria-label="What are Features and Services?" aria-expanded="false"
            aria-controls="offerFeaturesHelpBubble" title="What are Features and Services?">?</button>
          <div class="gsHelpBubble" id="offerFeaturesHelpBubble" role="tooltip">
            <button type="button" class="gsHelpCloseBtn" aria-label="Close">&times;</button>
            <p>Placeholder explanation for Features and Services.</p>
          </div>
        </div>
      </div>

      <p>
        <span class="subtitle">${esc(d.O_FEATURE_1 || d["{{O_FEATURE_1}}"] || "")}</span>
        <br>
        ${esc(d.O_FEATURE_1_DESC || d["{{O_FEATURE_1_DESC}}"] || "")}
      </p>
      <!-- ... O_FEATURE 2 through 5 ... -->
    </div>

    <div class="card scrollTarget" id="block-retention">
      <div class="sectionHeader">
        <div class="sectionTitle">Retention Factors</div>
        <div class="gsHelpWrap" id="offerRetentionHelpWrap">
          <button type="button" class="gsHelpBtn" id="offerRetentionHelpBtn"
            aria-label="What are Retention Factors?" aria-expanded="false"
            aria-controls="offerRetentionHelpBubble" title="What are Retention Factors?">?</button>
          <div class="gsHelpBubble" id="offerRetentionHelpBubble" role="tooltip">
            <button type="button" class="gsHelpCloseBtn" aria-label="Close">&times;</button>
            <p>Placeholder explanation for Retention Factors.</p>
          </div>
        </div>
      </div>

      <p>
        <span class="subtitle">${esc(d.O_RETENTION_1 || d["{{O_RETENTION_1}}"] || "")}</span>
        <br>
        ${esc(d.O_RETENTION_1_DESC || d["{{O_RETENTION_1_DESC}}"] || "")}
      </p>
      <!-- ... O_RETENTION 2 through 5 ... -->
    </div>

    <div class="card scrollTarget" id="block-appearance">
      <div class="sectionHeader">
        <div class="sectionTitle">Appearance</div>
        <div class="gsHelpWrap" id="offerAppearanceHelpWrap">
          <button type="button" class="gsHelpBtn" id="offerAppearanceHelpBtn"
            aria-label="What is Appearance here?" aria-expanded="false"
            aria-controls="offerAppearanceHelpBubble" title="What is Appearance here?">?</button>
          <div class="gsHelpBubble" id="offerAppearanceHelpBubble" role="tooltip">
            <button type="button" class="gsHelpCloseBtn" aria-label="Close">&times;</button>
            <p>Placeholder explanation for Appearance.</p>
          </div>
        </div>
      </div>

      <p>
        <span class="subtitle">${esc(d.O_APPEARANCE_1 || d["{{O_APPEARANCE_1}}"] || "")}</span>
        <br>
        ${esc(d.O_APPEARANCE_1_DESC || d["{{O_APPEARANCE_1_DESC}}"] || "")}
      </p>
      <!-- ... O_APPEARANCE 2 through 5 ... -->
    </div>

    <div class="card scrollTarget" id="block-pricing">
      <div class="sectionHeader">
        <div class="sectionTitle">Pricing</div>
        <div class="gsHelpWrap" id="offerPricingHelpWrap">
          <button type="button" class="gsHelpBtn" id="offerPricingHelpBtn"
            aria-label="What does Pricing cover?" aria-expanded="false"
            aria-controls="offerPricingHelpBubble" title="What does Pricing cover?">?</button>
          <div class="gsHelpBubble" id="offerPricingHelpBubble" role="tooltip">
            <button type="button" class="gsHelpCloseBtn" aria-label="Close">&times;</button>
            <p>Placeholder explanation for Pricing.</p>
          </div>
        </div>
      </div>

      <p>
        <span class="subtitle">${esc(d.O_PRICING_POSITIONING || d["{{O_PRICING_POSITIONING}}"] || "")}</span>
        <br>
        ${esc(d.O_PRICING_POSITIONING_DESC || d["{{O_PRICING_POSITIONING_DESC}}"] || "")}
      </p>
      <!-- ... PRICING fields ... -->
    </div>
  `;
}


      <div class="card scrollTarget" id="block-features">
        <div class="sectionTitle">Features and Services</div>

        <p>
          <span class="subtitle">${esc(d.O_FEATURE_1 || d["{{O_FEATURE_1}}"] || "")}</span>
          <br>
          ${esc(d.O_FEATURE_1_DESC || d["{{O_FEATURE_1_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_FEATURE_2 || d["{{O_FEATURE_2}}"] || "")}</span>
          <br>
          ${esc(d.O_FEATURE_2_DESC || d["{{O_FEATURE_2_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_FEATURE_3 || d["{{O_FEATURE_3}}"] || "")}</span>
          <br>
          ${esc(d.O_FEATURE_3_DESC || d["{{O_FEATURE_3_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_FEATURE_4 || d["{{O_FEATURE_4}}"] || "")}</span>
          <br>
          ${esc(d.O_FEATURE_4_DESC || d["{{O_FEATURE_4_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_FEATURE_5 || d["{{O_FEATURE_5}}"] || "")}</span>
          <br>
          ${esc(d.O_FEATURE_5_DESC || d["{{O_FEATURE_5_DESC}}"] || "")}
        </p>
      </div>

      <div class="card scrollTarget" id="block-retention">
        <div class="sectionTitle">Retention Factors</div>

        <p>
          <span class="subtitle">${esc(d.O_RETENTION_1 || d["{{O_RETENTION_1}}"] || "")}</span>
          <br>
          ${esc(d.O_RETENTION_1_DESC || d["{{O_RETENTION_1_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_RETENTION_2 || d["{{O_RETENTION_2}}"] || "")}</span>
          <br>
          ${esc(d.O_RETENTION_2_DESC || d["{{O_RETENTION_2_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_RETENTION_3 || d["{{O_RETENTION_3}}"] || "")}</span>
          <br>
          ${esc(d.O_RETENTION_3_DESC || d["{{O_RETENTION_3_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_RETENTION_4 || d["{{O_RETENTION_4}}"] || "")}</span>
          <br>
          ${esc(d.O_RETENTION_4_DESC || d["{{O_RETENTION_4_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_RETENTION_5 || d["{{O_RETENTION_5}}"] || "")}</span>
          <br>
          ${esc(d.O_RETENTION_5_DESC || d["{{O_RETENTION_5_DESC}}"] || "")}
        </p>
      </div>


      <div class="card scrollTarget" id="block-appearance">
        <div class="sectionTitle">Appearance</div>

        <p>
          <span class="subtitle">${esc(d.O_APPEARANCE_1 || d["{{O_APPEARANCE_1}}"] || "")}</span>
          <br>
          ${esc(d.O_APPEARANCE_1_DESC || d["{{O_APPEARANCE_1_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_APPEARANCE_2 || d["{{O_APPEARANCE_2}}"] || "")}</span>
          <br>
          ${esc(d.O_APPEARANCE_2_DESC || d["{{O_APPEARANCE_2_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_APPEARANCE_3 || d["{{O_APPEARANCE_3}}"] || "")}</span>
          <br>
          ${esc(d.O_APPEARANCE_3_DESC || d["{{O_APPEARANCE_3_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_APPEARANCE_4 || d["{{O_APPEARANCE_4}}"] || "")}</span>
          <br>
          ${esc(d.O_APPEARANCE_4_DESC || d["{{O_APPEARANCE_4_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_APPEARANCE_5 || d["{{O_APPEARANCE_5}}"] || "")}</span>
          <br>
          ${esc(d.O_APPEARANCE_5_DESC || d["{{O_APPEARANCE_5_DESC}}"] || "")}
        </p>
      </div>


      <div class="card scrollTarget" id="block-pricing">
        <div class="sectionTitle">Pricing</div>

        <p>
          <span class="subtitle">${esc(d.O_PRICING_POSITIONING || d["{{O_PRICING_POSITIONING}}"] || "")}</span>
          <br>
          ${esc(d.O_PRICING_POSITIONING_DESC || d["{{O_PRICING_POSITIONING_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_PRICING_PRICE_POINT || d["{{O_PRICING_PRICE_POINT}}"] || "")}</span>
          <br>
          ${esc(d.O_PRICING_PRICE_POINT_DESC || d["{{O_PRICING_PRICE_POINT_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_PRICING_PRICING_LOGIC || d["{{O_PRICING_PRICING_LOGIC}}"] || "")}</span>
          <br>
          ${esc(d.O_PRICING_PRICING_LOGIC_DESC || d["{{O_PRICING_PRICING_LOGIC_DESC}}"] || "")}
        </p>

        <p>
          <span class="subtitle">${esc(d.O_PRICING_FRICTION_REDUCTION || d["{{O_PRICING_FRICTION_REDUCTION}}"] || "")}</span>
          <br>
          ${esc(d.O_PRICING_FRICTION_REDUCTION_DESC || d["{{O_PRICING_FRICTION_REDUCTION_DESC}}"] || "")}
        </p>
      </div>
    `;
  }


  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  contentDiv.innerHTML = html;

  hydrateABCMaps();
}


// --- 1. Inject Styles ---
function injectOfferHelpStylesOnce() {
  if (document.getElementById("offer-help-styles")) return;
  const style = document.createElement("style");
  style.id = "offer-help-styles";
  style.textContent = `
    .sectionHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      position: relative;
    }
    .gsHelpWrap {
      position: static;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .gsHelpBtn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #30BA80;
      color: #FFFFFF;
      border: none;
      cursor: pointer;
      font-weight: 800;
      font-size: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 2px rgba(0,0,0,.06);
    }
    .gsHelpBtn:focus-visible {
      outline: 2px solid #024D4F;
      outline-offset: 2px;
    }
    .gsHelpBubble {
      position: absolute;
      left: 24px;
      right: 0;
      top: calc(100% + 8px);
      width: auto;
      max-width: none;
      background: #333333;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 10px 20px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.06);
      z-index: 4002;
      display: none;
    }
    .gsHelpBubble p {
      margin: 0 0 8px 0;
      color: #FFFFFF;
      font-size: 14px;
      line-height: 1.5;
      font-family: 'Inter', sans-serif;
    }
    .gsHelpBubble p:last-child { margin-bottom: 0; }
    .gsHelpWrap.open .gsHelpBubble { display: block; }
    .gsHelpCloseBtn {
      display: none;
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      color: white;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      font-weight: bold;
    }
    #gsOverlay {
      position: fixed;
      inset: 0;
      background: rgba(2, 77, 79, 0.25);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      z-index: 4001;
      display: none;
    }
    #gsOverlay.show { display: block; }

    @media (max-width: 768px) {
      .gsHelpBubble {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: calc(100% - 40px);
        max-width: 400px;
        max-height: 80vh;
        overflow-y: auto;
        padding: 24px;
      }
      .gsHelpCloseBtn {
        display: block;
      }
    }
  `;
  document.head.appendChild(style);
}

// --- 2. Initialize Click/Focus Event Listeners ---
function setupOfferHelpBubbles() {
  let overlay = document.getElementById("gsOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "gsOverlay";
    document.body.appendChild(overlay);
  }

  const initHelpBubble = (wrapId, btnId) => {
    const wrap = document.getElementById(wrapId);
    const btn = document.getElementById(btnId);
    if (!wrap || !btn) return;
    const card = wrap.closest('.card');
    const bubble = wrap.querySelector('.gsHelpBubble');
    const closeBtn = bubble ? bubble.querySelector('.gsHelpCloseBtn') : null;

    const close = () => {
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      if (overlay) overlay.classList.remove("show");
      document.body.style.removeProperty("overflow");
      if (card) card.style.zIndex = '';
    };

    const open = () => {
      wrap.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      if (overlay) overlay.classList.add("show");
      document.body.style.overflow = "hidden";
      if (card) card.style.zIndex = '4003';
    };

    const toggle = (e) => {
      e.preventDefault();
      wrap.classList.contains("open") ? close() : open();
    };

    btn.addEventListener("click", toggle, { passive: false });
    if (closeBtn) closeBtn.addEventListener("click", close);

    const docClickHandler = (e) => { if (bubble && !bubble.contains(e.target) && !btn.contains(e.target)) close(); };
    const docKeyHandler = (e) => { if (e.key === "Escape") close(); };

    document.addEventListener("keydown", docKeyHandler);
    document.addEventListener("click", docClickHandler);
    if (overlay) overlay.addEventListener("click", close);
  };

  initHelpBubble("offerValueTriggersHelpWrap", "offerValueTriggersHelpBtn");
  initHelpBubble("offerFeaturesHelpWrap", "offerFeaturesHelpBtn");
  initHelpBubble("offerRetentionHelpWrap", "offerRetentionHelpBtn");
  initHelpBubble("offerAppearanceHelpWrap", "offerAppearanceHelpBtn");
  initHelpBubble("offerPricingHelpWrap", "offerPricingHelpBtn");
}
