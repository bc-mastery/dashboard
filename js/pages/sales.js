// /js/pages/sales.js

import { ACCESS } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import {
  inferAccess,
  parseAreas,
  toDownloadLink,
  esc,
} from "../core/utils.js";

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
  clearUpgradeBlock,
} from "../core/ui.js";

import { fetchDashboardData } from "../services/api.js";


// ============================================================
// SPREADSHEET VALUE HELPER
// ============================================================

function getSpreadsheetValue(data, columnName) {

  if (!data) return "";

  const target =
    columnName
      .toLowerCase()
      .trim();


  for (const key of Object.keys(data)) {

    const cleanKey =
      key
        .replace(/[{}]/g, "")
        .toLowerCase()
        .trim();


    if (cleanKey === target) {

      return String(
        data[key] ?? ""
      ).trim();
    }
  }


  return "";
}


// ============================================================
// MAIN RENDER
// ============================================================

export async function renderSalesTab(
  forceRefresh = false
) {

  setCurrentTab("sales");

  document.body.setAttribute(
    "data-current-tab",
    "sales"
  );

  clearUpgradeBlock();

  injectSalesHelpStylesOnce();


  const contentDiv =
    document.getElementById("content");


  if (!contentDiv) return;


  contentDiv.innerHTML = `
    <div class="card">
      <p class="muted">
        Loading Sales Strategy…
      </p>
    </div>
  `;


  try {

    const api =
      await fetchDashboardData(
        forceRefresh
      );


    if (
      !api ||
      !api.ok
    ) {

      contentDiv.innerHTML = `
        <div class="card">
          <p class="muted">
            ${api?.message || "No data found."}
          </p>
        </div>
      `;

      return;
    }


    state.lastApiByTab.sales = {
      ...api,
      data: {
        ...api.data,
      },
    };


    const d =
      api.data || {};


    state.lastAccess =
      inferAccess(d);


    // ========================================================
    // BRAND
    // ========================================================

    const brandEl =
      document.getElementById(
        "brandName"
      );


    if (brandEl) {

      const full =
        String(
          d.Brand ||
          d["{{Brand}}"] ||
          ""
        );


      brandEl.textContent =
        full.length > 80
          ? full.slice(0, 80)
          : full;


      brandEl.title =
        full;
    }


    // ========================================================
    // PDF LINK
    // ========================================================

    const view =
      d.S_STRATEGY_OUTPUT ||
      d["{{S_STRATEGY_OUTPUT}}"] ||
      "";


    if (view) {

      state.dynamicPdfLinks.sales =
        toDownloadLink(view);


      updateFloatingCTA(
        "sales"
      );
    }


    // ========================================================
    // ACCESS GATE
    //
    // SS_READY is a Google Sheets checkbox.
    //
    // FALSE -> preview only
    // TRUE  -> full Sales Strategy
    // ========================================================

    const ssReadyValue =
      getSpreadsheetValue(
        d,
        "SS_READY"
      );


    console.log(
      "🔍 Debug Gate Verification (Sales): Found raw value for SS_READY =",
      `"${ssReadyValue}"`
    );


    const allowFull =
      ssReadyValue
        .toUpperCase() ===
      "TRUE";


    // ========================================================
    // PAINT PAGE
    // ========================================================

    paintSales(
      api,
      allowFull
    );


    setupSalesHelpBubbles();


    // ========================================================
    // BLOCK NAVIGATION
    // ========================================================

    const blockTabsRow =
      document.getElementById(
        "blockTabsRow"
      );


    if (blockTabsRow) {

      blockTabsRow.style.display =
        "block";
    }


    populateBlockTabsFromPage();


    updateFloatingCTA(
      "sales"
    );


    // ========================================================
    // PREVIEW / UPGRADE BLOCK
    // ========================================================

    maybeInsertUniversalUpgradeBlock({
      tab: "sales",
      isPreviewOnly: !allowFull,
      content:
        finalBlockContent.sales,
    });


    toggleFloatingCallBtn(
      state.lastAccess ===
      ACCESS.GS_ONLY
    );


  } catch (err) {

    console.error(err);


    contentDiv.innerHTML = `
      <div class="card">
        <p class="muted">
          Error loading data:
          ${esc(
            err?.message ||
            err
          )}
        </p>
      </div>
    `;
  }
}


// ============================================================
// PAGE PAINTER
// ============================================================

function paintSales(
  api,
  allowFull = false
) {

  const contentDiv =
    document.getElementById(
      "content"
    );


  if (!contentDiv) return;


  const d =
    (
      api &&
      api.data
    ) || {};


  const areas =
    parseAreas(
      d.D_AREA ||
      d["{{D_AREA}}"]
    );


  // ========================================================
  // FIRST / PREVIEW BLOCK — SALES APPROACH
  // ========================================================

  const salesApproach =
    getSpreadsheetValue(
      d,
      "S_APPROACH"
    );


  const salesApproachDesc =
    getSpreadsheetValue(
      d,
      "S_APPROACH_DESC"
    );


  let html =
    buildFirstBlockHTML({
      title:
        "Concept",

      subtitleLabel:
        "Sales Approach",

      subtitleValue:
        salesApproach,

      descText:
        salesApproachDesc,

      areas:
        areas,

      page:
        "sales",
    });


  // ========================================================
  // FULL SALES STRATEGY
  // ========================================================

  if (allowFull) {


    // ======================================================
    // 1. BUYING VISION
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-buying-vision"
      >

        ${buildSalesSectionHeader_(
          "Buying Vision",
          "salesBuyingVisionHelpWrap",
          "salesBuyingVisionHelpBtn",
          "salesBuyingVisionHelpBubble",
          "What is Buying Vision?",
          `
            <p>Buying Vision defines what prospects need to see, understand, and believe before moving forward feels like the right decision. It translates your value into a future state the buyer can clearly imagine and connect to their own priorities.</p>
            <p>Each vision gives Sales a specific outcome to make tangible through conversation, examples, evidence, demonstrations, or comparison. The goal is to help the prospect progressively recognize not only what your solution does, but why adopting it creates a better and more desirable business reality.</p>
          `
        )}

        ${renderTitleDescriptionItems_(
          d,
          "S_BUYING_VISION",
          4
        )}

      </div>
    `;


    // ======================================================
    // 2. SALES CADENCE
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-sales-cadence"
      >

        ${buildSalesSectionHeader_(
          "Sales Cadence",
          "salesCadenceHelpWrap",
          "salesCadenceHelpBtn",
          "salesCadenceHelpBubble",
          "What is the Sales Cadence?",
          `
            <p>Sales Cadence defines how the sales process should move prospects from first engagement to commitment. It structures the progression around the buyer's changing state, questions, level of confidence, and readiness to move forward.</p>
            <p>For each stage, the strategy defines the objective, buyer state, required sales actions and communication, supporting assets, progression signals, and appropriate timing. This gives Sales a clear path while preventing the process from becoming either rushed, passive, or disconnected from how the customer actually decides.</p>
          `
        )}

        ${renderSalesCadence_(d)}

      </div>
    `;


    // ======================================================
    // 3. RELATIONSHIP BUILDING
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-relationship-building"
      >

        ${buildSalesSectionHeader_(
          "Relationship Building",
          "salesRelationshipHelpWrap",
          "salesRelationshipHelpBtn",
          "salesRelationshipHelpBubble",
          "What is Relationship Building?",
          `
            <p>Relationship Building defines how trust and the buyer relationship should develop throughout the sales process. The right relationship is not identical at every stage: early interactions may require relevance and credibility, while later stages may require reassurance, collaboration, clarity, or respectful persistence.</p>
            <p>The guidance below defines the relationship objective for every cadence stage, how Sales should interact to support that objective, and what behaviors should be avoided. This helps maintain trust and momentum without creating unnecessary pressure or weakening the buyer's confidence.</p>
          `
        )}

        ${renderRelationshipBuilding_(d)}

      </div>
    `;


    // ======================================================
    // 4. TRUST DRIVERS
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-trust-drivers"
      >

        ${buildSalesSectionHeader_(
          "Trust Drivers",
          "salesTrustHelpWrap",
          "salesTrustHelpBtn",
          "salesTrustHelpBubble",
          "What are Trust Drivers?",
          `
            <p>Trust Drivers are the specific factors that increase confidence, credibility, and perceived safety in the buying decision. They identify what the prospect needs to trust before commitment feels sufficiently secure.</p>
            <p>These drivers should be reinforced deliberately throughout the sales process through the right evidence, behaviors, communication, demonstrations, references, and supporting materials. The stronger these signals become, the less uncertainty the buyer has to carry into the final decision.</p>
          `
        )}

        ${renderTitleDescriptionItems_(
          d,
          "S_TRUST_DRIVER",
          5
        )}

      </div>
    `;


    // ======================================================
    // 5. DECISION FRICTION
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-decision-friction"
      >

        ${buildSalesSectionHeader_(
          "Decision Friction",
          "salesFrictionHelpWrap",
          "salesFrictionHelpBtn",
          "salesFrictionHelpBubble",
          "What is Decision Friction?",
          `
            <p>Decision Friction identifies the main doubts, concerns, and perceived risks that can slow down or block commitment. Rather than treating objections as isolated statements, it explains why each concern appears and what the buyer is actually trying to protect.</p>
            <p>For every friction point, the strategy defines the underlying cause, the possible buyer risk, what can help overcome the doubt, and what Sales should focus on saying or showing. This turns objection handling into structured risk reduction rather than reactive persuasion.</p>
          `
        )}

        ${renderDecisionFriction_(d)}

      </div>
    `;


    // ======================================================
    // 6. SALES ASSETS
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-sales-assets"
      >

        ${buildSalesSectionHeader_(
          "Sales Assets",
          "salesAssetsHelpWrap",
          "salesAssetsHelpBtn",
          "salesAssetsHelpBubble",
          "What are Sales Assets?",
          `
            <p>Sales Assets are the materials and tools that support buyer consideration, reduce uncertainty, and help prospects progress through the sales process. Each asset is recommended for a specific commercial purpose rather than simply because it is a common sales document.</p>
            <p>Every recommended asset is defined through its purpose, cadence stage, intended buyer effect, required content, format and length, and tone and design. This turns the recommendation into a practical specification you can directly create and use in the sales process.</p>
          `
        )}

        ${renderSalesAssets_(d)}

      </div>
    `;
  }


  contentDiv.innerHTML =
    html;


  hydrateABCMaps();
}


// ============================================================
// SECTION HEADER + HELP BUBBLE
// ============================================================

function buildSalesSectionHeader_(
  title,
  wrapId,
  btnId,
  bubbleId,
  ariaLabel,
  helpHtml
) {

  return `
    <div class="sectionHeader">

      <div class="sectionTitle">
        ${esc(title)}
      </div>

      <div
        class="gsHelpWrap"
        id="${wrapId}"
      >

        <button
          type="button"
          class="gsHelpBtn"
          id="${btnId}"
          aria-label="${esc(ariaLabel)}"
          aria-expanded="false"
          aria-controls="${bubbleId}"
          title="${esc(ariaLabel)}"
        >
          ?
        </button>

        <div
          class="gsHelpBubble"
          id="${bubbleId}"
          role="tooltip"
        >

          <button
            type="button"
            class="gsHelpCloseBtn"
            aria-label="Close"
          >
            &times;
          </button>

          ${helpHtml}

        </div>

      </div>

    </div>
  `;
}


// ============================================================
// SIMPLE TITLE + DESCRIPTION ITEMS
// ============================================================

function renderTitleDescriptionItems_(
  d,
  baseField,
  count
) {

  let html =
    "";


  for (
    let i = 1;
    i <= count;
    i++
  ) {

    const title =
      getSpreadsheetValue(
        d,
        `${baseField}_${i}`
      );


    const desc =
      getSpreadsheetValue(
        d,
        `${baseField}_${i}_DESC`
      );


    if (
      !title &&
      !desc
    ) {

      continue;
    }


    html += `
      <p>
        <span class="subtitle">
          ${esc(title)}
        </span>

        <br>

        <span class="preserve">
          ${esc(desc)}
        </span>
      </p>
    `;
  }


  return html;
}


// ============================================================
// SALES CADENCE
// ============================================================

function renderSalesCadence_(d) {

  const stages = [

    {
      key: "ENTRY",
      title: "ENTRY & QUALIFICATION",
    },

    {
      key: "DISCOVERY",
      title: "DISCOVERY & DIAGNOSIS",
    },

    {
      key: "VALUE_ALIGNMENT",
      title: "VALUE ALIGNMENT",
    },

    {
      key: "PROOF",
      title: "PROOF & VALIDATION",
    },

    {
      key: "DECISION",
      title: "DECISION & COMMITMENT",
    },

    {
      key: "FOLLOW_UP",
      title: "FOLLOW-UP & REACTIVATION",
    },

  ];


  let html =
    "";


  for (const stage of stages) {

    html += `
      <div class="salesSubsection">

        <p>
          <span class="subtitle">
            ${stage.title}
          </span>
        </p>

        ${renderSalesField_(
          "What is the objective of this stage?",
          getSpreadsheetValue(
            d,
            `S_SC_${stage.key}_OBJECTIVE`
          )
        )}

        ${renderSalesField_(
          "What is the buyer’s state?",
          getSpreadsheetValue(
            d,
            `S_SC_${stage.key}_BUYER_STATE`
          )
        )}

        ${renderSalesField_(
          "What does Sales have to do?",
          getSpreadsheetValue(
            d,
            `S_SC_${stage.key}_SALES_ACTIONS`
          )
        )}

        ${renderSalesField_(
          "What should Sales communicate?",
          getSpreadsheetValue(
            d,
            `S_SC_${stage.key}_KEY_COMMUNICATION`
          )
        )}

        ${renderSalesField_(
          "What kind of asset(s) support the progression?",
          getSpreadsheetValue(
            d,
            `S_SC_${stage.key}_SUPPORTING_ASSET`
          )
        )}

        ${renderSalesField_(
          "What signs show that the customer is ready for the next stage?",
          getSpreadsheetValue(
            d,
            `S_SC_${stage.key}_PROGRESSION_TRIGGER`
          )
        )}

        ${renderSalesField_(
          "How should timing be for this stage?",
          getSpreadsheetValue(
            d,
            `S_SC_${stage.key}_TIMING`
          )
        )}

      </div>
    `;
  }


  return html;
}


// ============================================================
// RELATIONSHIP BUILDING
// ============================================================

function renderRelationshipBuilding_(d) {

  const stages = [

    {
      key: "ENTRY",
      title: "ENTRY & QUALIFICATION",
    },

    {
      key: "DISCOVERY",
      title: "DISCOVERY & DIAGNOSIS",
    },

    {
      key: "VALUE_ALIGNMENT",
      title: "VALUE ALIGNMENT",
    },

    {
      key: "PROOF",
      title: "PROOF & VALIDATION",
    },

    {
      key: "DECISION",
      title: "DECISION & COMMITMENT",
    },

    {
      key: "FOLLOW_UP",
      title: "FOLLOW-UP & REACTIVATION",
    },

  ];


  let html =
    "";


  for (const stage of stages) {

    html += `
      <div class="salesSubsection">

        <p>
          <span class="subtitle">
            ${stage.title}
          </span>
        </p>

        ${renderSalesField_(
          "What is the goal of the relationship at this stage?",
          getSpreadsheetValue(
            d,
            `S_RB_${stage.key}_RELATIONSHIP_OBJECTIVE`
          )
        )}

        ${renderSalesField_(
          "How should Sales interact to support that relationship?",
          getSpreadsheetValue(
            d,
            `S_RB_${stage.key}_INTERACTION`
          )
        )}

        ${renderSalesField_(
          "What to avoid at this stage?",
          getSpreadsheetValue(
            d,
            `S_RB_${stage.key}_AVOID`
          )
        )}

      </div>
    `;
  }


  return html;
}


// ============================================================
// DECISION FRICTION
// ============================================================

function renderDecisionFriction_(d) {

  let html =
    "";


  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    const doubt =
      getSpreadsheetValue(
        d,
        `S_DF_BUYER_DOUBT_${i}`
      );


    const cause =
      getSpreadsheetValue(
        d,
        `S_DF_ARISE_CAUSE_${i}`
      );


    const risk =
      getSpreadsheetValue(
        d,
        `S_DF_BUYING_RISK_${i}`
      );


    const resolution =
      getSpreadsheetValue(
        d,
        `S_DF_RESOLUTION_${i}`
      );


    const sayOrShow =
      getSpreadsheetValue(
        d,
        `S_DF_SAY_OR_SHOW_${i}`
      );


    if (
      !doubt &&
      !cause &&
      !risk &&
      !resolution &&
      !sayOrShow
    ) {

      continue;
    }


    html += `
      <div class="salesSubsection">

        <p>
          <span class="subtitle">
            ${esc(doubt)}
          </span>
        </p>

        ${renderSalesField_(
          "Why does the concern arise?",
          cause
        )}

        ${renderSalesField_(
          "What is the possible buyer risk behind the concern?",
          risk
        )}

        ${renderSalesField_(
          "What can help overcome that doubt?",
          resolution
        )}

        ${renderSalesField_(
          "What should Sales focus on in their communication?",
          sayOrShow
        )}

      </div>
    `;
  }


  return html;
}


// ============================================================
// SALES ASSETS — DYNAMIC 4–8
// ============================================================

function renderSalesAssets_(d) {

  let html =
    "";


  for (
    let i = 1;
    i <= 8;
    i++
  ) {

    const assetName =
      getSpreadsheetValue(
        d,
        `S_SALES_ASSET_${i}`
      );


    if (!assetName) {

      continue;
    }


    html += `
      <div class="salesSubsection salesAssetBlock">

        <p>
          <span class="subtitle">
            ${esc(assetName)}
          </span>
        </p>

        ${renderSalesField_(
          "Purpose:",
          getSpreadsheetValue(
            d,
            `S_SA_PURPOSE_${i}`
          )
        )}

        ${renderSalesField_(
          "Cadence Stage:",
          getSpreadsheetValue(
            d,
            `S_SA_STAGE_${i}`
          )
        )}

        ${renderSalesField_(
          "Buyer Effect:",
          getSpreadsheetValue(
            d,
            `S_SA_BUYER_EFFECT_${i}`
          )
        )}

        ${renderSalesField_(
          "Required Content:",
          getSpreadsheetValue(
            d,
            `S_SA_CONTENT_${i}`
          )
        )}

        ${renderSalesField_(
          "Format & Length:",
          getSpreadsheetValue(
            d,
            `S_SA_FORMAT_AND_LENGTH_${i}`
          )
        )}

        ${renderSalesField_(
          "Tone & Design:",
          getSpreadsheetValue(
            d,
            `S_SA_TONE_AND_DESIGN_${i}`
          )
        )}

      </div>
    `;
  }


  return html;
}


// ============================================================
// COMMON SALES FIELD RENDERER
// ============================================================

function renderSalesField_(
  label,
  value
) {

  if (!value) return "";


  return `
    <p>
      <span class="subtitle">
        ${esc(label)}
      </span>

      <br>

      <span class="preserve">
        ${esc(value)}
      </span>
    </p>
  `;
}


// ============================================================
// HELP BUBBLE STYLES
// ============================================================

function injectSalesHelpStylesOnce() {

  if (
    document.getElementById(
      "sales-help-styles"
    )
  ) {

    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "sales-help-styles";


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
      box-shadow:
        0 1px 2px
        rgba(0, 0, 0, .06);
    }


    .gsHelpBtn:focus-visible {
      outline:
        2px solid
        #024D4F;

      outline-offset:
        2px;
    }


    .gsHelpBubble {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 16px);
      width: 100%;
      background: #333333;
      border:
        1px solid
        #E5E7EB;

      border-radius:
        12px;

      padding:
        14px 16px;

      box-shadow:
        0 10px 20px
        rgba(0, 0, 0, .15);

      z-index:
        4002;

      display:
        none;
    }


    .gsHelpBubble p {
      margin:
        0 0 8px 0;

      color:
        #FFFFFF;

      font-size:
        14px;

      line-height:
        1.5;

      font-family:
        'Inter',
        sans-serif;
    }


    .gsHelpBubble p:last-child {
      margin-bottom:
        0;
    }


    .gsHelpWrap.open
    .gsHelpBubble {
      display:
        block;
    }


    .gsHelpCloseBtn {
      display:
        block;

      position:
        absolute;

      top:
        8px;

      right:
        8px;

      width:
        28px;

      height:
        28px;

      background:
        transparent;

      border:
        none;

      color:
        white;

      font-size:
        22px;

      line-height:
        1;

      cursor:
        pointer;

      font-weight:
        bold;
    }


    .salesSubsection {
      margin-top: 26px;
    }


    .salesSubsection:first-of-type {
      margin-top: 18px;
    }


    .salesAssetBlock {
      padding-top: 4px;
    }


    #gsOverlay {
      position:
        fixed;

      inset:
        0;

      background:
        rgba(
          2,
          77,
          79,
          0.25
        );

      backdrop-filter:
        blur(2px);

      -webkit-backdrop-filter:
        blur(2px);

      z-index:
        4001;

      display:
        none;
    }


    #gsOverlay.show {
      display:
        block;
    }

  `;


  document.head.appendChild(
    style
  );
}


// ============================================================
// HELP BUBBLE INTERACTIONS
// ============================================================

function setupSalesHelpBubbles() {

  let overlay =
    document.getElementById(
      "gsOverlay"
    );


  if (!overlay) {

    overlay =
      document.createElement(
        "div"
      );


    overlay.id =
      "gsOverlay";


    document.body.appendChild(
      overlay
    );
  }


  const initHelpBubble =
    (
      wrapId,
      btnId
    ) => {


      const wrap =
        document.getElementById(
          wrapId
        );


      const btn =
        document.getElementById(
          btnId
        );


      if (
        !wrap ||
        !btn
      ) {

        return;
      }


      const card =
        wrap.closest(
          ".card"
        );


      const bubble =
        wrap.querySelector(
          ".gsHelpBubble"
        );


      const closeBtn =
        bubble
          ? bubble.querySelector(
              ".gsHelpCloseBtn"
            )
          : null;


      const close = () => {

        wrap.classList.remove(
          "open"
        );


        btn.setAttribute(
          "aria-expanded",
          "false"
        );


        if (overlay) {

          overlay.classList.remove(
            "show"
          );
        }


        document.body.style
          .removeProperty(
            "overflow"
          );


        if (card) {

          card.style.zIndex =
            "";
        }
      };


      const open = () => {

        wrap.classList.add(
          "open"
        );


        btn.setAttribute(
          "aria-expanded",
          "true"
        );


        if (overlay) {

          overlay.classList.add(
            "show"
          );
        }


        document.body.style.overflow =
          "hidden";


        if (card) {

          card.style.zIndex =
            "4003";
        }
      };


      const toggle =
        (e) => {

          e.preventDefault();


          wrap.classList.contains(
            "open"
          )
            ? close()
            : open();
        };


      btn.addEventListener(
        "click",
        toggle,
        {
          passive: false,
        }
      );


      if (closeBtn) {

        closeBtn.addEventListener(
          "click",
          close
        );
      }


      const docClickHandler =
        (e) => {

          if (
            bubble &&
            !bubble.contains(
              e.target
            ) &&
            !btn.contains(
              e.target
            )
          ) {

            close();
          }
        };


      const docKeyHandler =
        (e) => {

          if (
            e.key === "Escape"
          ) {

            close();
          }
        };


      document.addEventListener(
        "keydown",
        docKeyHandler
      );


      document.addEventListener(
        "click",
        docClickHandler
      );


      if (overlay) {

        overlay.addEventListener(
          "click",
          close
        );
      }
    };


  // ========================================================
  // REGISTER SALES HELP BUTTONS
  // ========================================================

  initHelpBubble(
    "salesBuyingVisionHelpWrap",
    "salesBuyingVisionHelpBtn"
  );


  initHelpBubble(
    "salesCadenceHelpWrap",
    "salesCadenceHelpBtn"
  );


  initHelpBubble(
    "salesRelationshipHelpWrap",
    "salesRelationshipHelpBtn"
  );


  initHelpBubble(
    "salesTrustHelpWrap",
    "salesTrustHelpBtn"
  );


  initHelpBubble(
    "salesFrictionHelpWrap",
    "salesFrictionHelpBtn"
  );


  initHelpBubble(
    "salesAssetsHelpWrap",
    "salesAssetsHelpBtn"
  );
}
