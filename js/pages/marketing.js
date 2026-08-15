// /js/pages/marketing.js

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

export async function renderMarketingTab(
  forceRefresh = false
) {

  setCurrentTab("marketing");

  document.body.setAttribute(
    "data-current-tab",
    "marketing"
  );

  clearUpgradeBlock();

  injectMarketingHelpStylesOnce();


  const contentDiv =
    document.getElementById("content");


  if (!contentDiv) return;


  contentDiv.innerHTML = `
    <div class="card">
      <p class="muted">
        Loading Marketing Strategy…
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


    state.lastApiByTab.marketing = {
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
      d.M_STRATEGY_OUTPUT ||
      d["{{M_STRATEGY_OUTPUT}}"] ||
      "";


    if (view) {

      state.dynamicPdfLinks.marketing =
        toDownloadLink(view);


      updateFloatingCTA(
        "marketing"
      );
    }


    // ========================================================
    // ACCESS GATE
    //
    // MS_READY is a Google Sheets checkbox.
    //
    // FALSE -> preview only
    // TRUE  -> full Marketing Strategy
    // ========================================================

    const msReadyValue =
      getSpreadsheetValue(
        d,
        "MS_READY"
      );


    console.log(
      "🔍 Debug Gate Verification (Marketing): Found raw value for MS_READY =",
      `"${msReadyValue}"`
    );


    const allowFull =
      msReadyValue
        .toUpperCase() ===
      "TRUE";


    // ========================================================
    // PAINT PAGE
    // ========================================================

    paintMarketing(
      api,
      allowFull
    );


    setupMarketingHelpBubbles();


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
      "marketing"
    );


    // ========================================================
    // PREVIEW / UPGRADE BLOCK
    // ========================================================

    maybeInsertUniversalUpgradeBlock({
      tab: "marketing",
      isPreviewOnly: !allowFull,
      content:
        finalBlockContent.marketing,
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

function paintMarketing(
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
  // FIRST / PREVIEW BLOCK
  // ========================================================

  const mCharacter =
    getSpreadsheetValue(
      d,
      "M_CHARACTER"
    );


  const mCharacterDesc =
    getSpreadsheetValue(
      d,
      "M_CHARACTER_DESC"
    );


  let html =
    buildFirstBlockHTML({
      title:
        "Concept",

      subtitleLabel:
        "Marketing Approach",

      subtitleValue:
        mCharacter,

      descText:
        mCharacterDesc,

      areas:
        areas,

      page:
        "marketing",
    });


  // ========================================================
  // FULL MARKETING STRATEGY
  // ========================================================

  if (allowFull) {


    // ======================================================
    // 1. MARKETING FOUNDATIONS
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-foundations"
      >

        <div class="sectionHeader">

          <div class="sectionTitle">
            Marketing Foundations
          </div>

          <div
            class="gsHelpWrap"
            id="marketingFoundationsHelpWrap"
          >

            <button
              type="button"
              class="gsHelpBtn"
              id="marketingFoundationsHelpBtn"
              aria-label="What are Marketing Foundations?"
              aria-expanded="false"
              aria-controls="marketingFoundationsHelpBubble"
              title="What are Marketing Foundations?"
            >
              ?
            </button>

            <div
              class="gsHelpBubble"
              id="marketingFoundationsHelpBubble"
              role="tooltip"
            >

              <button
                type="button"
                class="gsHelpCloseBtn"
                aria-label="Close"
              >
                &times;
              </button>

<p>Marketing Foundations define the strategic role marketing should play in attracting and influencing your target customers. They connect your Targeting and Offer Strategies with the way your business needs to create awareness, build relevance, establish credibility, and move potential customers toward a buying decision.</p>
<p>This section provides the strategic foundation for everything that follows. Rather than defining individual campaigns or channels, it establishes what your marketing needs to accomplish and how it should support the broader commercial strategy of the business.</p>

            </div>

          </div>

        </div>


        <p class="preserve">${esc(
          d.M_STRATEGY_INTRO ||
          d["{{M_STRATEGY_INTRO}}"] ||
          ""
        )}</p>

      </div>
    `;


    // ======================================================
    // 2. OBJECTIVES
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-objectives"
      >

        <div class="sectionHeader">

          <div class="sectionTitle">
            Objectives
          </div>

          <div
            class="gsHelpWrap"
            id="marketingObjectivesHelpWrap"
          >

            <button
              type="button"
              class="gsHelpBtn"
              id="marketingObjectivesHelpBtn"
              aria-label="What are Marketing Objectives?"
              aria-expanded="false"
              aria-controls="marketingObjectivesHelpBubble"
              title="What are Marketing Objectives?"
            >
              ?
            </button>

            <div
              class="gsHelpBubble"
              id="marketingObjectivesHelpBubble"
              role="tooltip"
            >

              <button
                type="button"
                class="gsHelpCloseBtn"
                aria-label="Close"
              >
                &times;
              </button>

<p>Marketing Objectives define the specific outcomes your marketing should work toward. They translate the overall Marketing Strategy into clear priorities — such as increasing awareness, strengthening credibility, creating demand, improving consideration, generating qualified opportunities, or supporting customer retention.</p>
<p>These objectives help prevent marketing from becoming a collection of disconnected activities. They provide direction for deciding what to communicate, where to focus resources, and how different marketing initiatives should contribute to measurable business progress.</p>              </p>

            </div>

          </div>

        </div>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_OBJECTIVE_1 ||
              d["{{M_OBJECTIVE_1}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_OBJECTIVE_1_DESC ||
            d["{{M_OBJECTIVE_1_DESC}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_OBJECTIVE_2 ||
              d["{{M_OBJECTIVE_2}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_OBJECTIVE_2_DESC ||
            d["{{M_OBJECTIVE_2_DESC}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_OBJECTIVE_3 ||
              d["{{M_OBJECTIVE_3}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_OBJECTIVE_3_DESC ||
            d["{{M_OBJECTIVE_3_DESC}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_OBJECTIVE_4 ||
              d["{{M_OBJECTIVE_4}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_OBJECTIVE_4_DESC ||
            d["{{M_OBJECTIVE_4_DESC}}"] ||
            ""
          )}
        </p>

      </div>
    `;


    // ======================================================
    // 3. DIFFERENTIATION
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-differentiation"
      >

        <div class="sectionHeader">

          <div class="sectionTitle">
            Differentiation
          </div>

          <div
            class="gsHelpWrap"
            id="marketingDifferentiationHelpWrap"
          >

            <button
              type="button"
              class="gsHelpBtn"
              id="marketingDifferentiationHelpBtn"
              aria-label="What is Marketing Differentiation?"
              aria-expanded="false"
              aria-controls="marketingDifferentiationHelpBubble"
              title="What is Marketing Differentiation?"
            >
              ?
            </button>

            <div
              class="gsHelpBubble"
              id="marketingDifferentiationHelpBubble"
              role="tooltip"
            >

              <button
                type="button"
                class="gsHelpCloseBtn"
                aria-label="Close"
              >
                &times;
              </button>

              <p>Differentiation defines how your business should create a meaningful distinction from the alternatives your customers are likely to consider. It identifies the qualities, strengths, perspectives, or forms of value that should make your company easier to recognize, understand, and prefer.</p>
              <p>Effective differentiation is not simply about being different. It is about emphasizing differences that actually matter to your target customers and consistently reinforcing them through positioning, messaging, proof, content, and the overall experience surrounding your brand.</p>

            </div>

          </div>

        </div>


                <p class="preserve">${esc(
          d.M_DIFFERENTIATION ||
          d["{{M_DIFFERENTIATION}}"] ||
          ""
        )}</p>

      </div>
    `;


    // ======================================================
    // 4. ENGAGEMENT TRIGGERS
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-engagement-triggers"
      >

        <div class="sectionHeader">

          <div class="sectionTitle">
            Engagement Triggers
          </div>

          <div
            class="gsHelpWrap"
            id="marketingEngagementHelpWrap"
          >

            <button
              type="button"
              class="gsHelpBtn"
              id="marketingEngagementHelpBtn"
              aria-label="What are Engagement Triggers?"
              aria-expanded="false"
              aria-controls="marketingEngagementHelpBubble"
              title="What are Engagement Triggers?"
            >
              ?
            </button>

            <div
              class="gsHelpBubble"
              id="marketingEngagementHelpBubble"
              role="tooltip"
            >

              <button
                type="button"
                class="gsHelpCloseBtn"
                aria-label="Close"
              >
                &times;
              </button>

              <p>Engagement Triggers are the themes, signals, situations, and ideas most likely to capture the attention of your target customers and make them want to engage further. They reflect what feels immediately relevant because it connects with an active problem, ambition, concern, opportunity, or decision they already care about.</p>
<p>These triggers help determine what your marketing should lead with. They can shape content topics, campaign angles, headlines, outreach themes, and other attention-building activities so your communication starts from the customer's priorities rather than simply from what the business wants to promote.</p>

            </div>

          </div>

        </div>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_ENGAGEMENT_TRIGGER_1 ||
              d["{{M_ENGAGEMENT_TRIGGER_1}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_ENGAGEMENT_TRIGGER_1_DESC ||
            d["{{M_ENGAGEMENT_TRIGGER_1_DESC}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_ENGAGEMENT_TRIGGER_2 ||
              d["{{M_ENGAGEMENT_TRIGGER_2}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_ENGAGEMENT_TRIGGER_2_DESC ||
            d["{{M_ENGAGEMENT_TRIGGER_2_DESC}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_ENGAGEMENT_TRIGGER_3 ||
              d["{{M_ENGAGEMENT_TRIGGER_3}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_ENGAGEMENT_TRIGGER_3_DESC ||
            d["{{M_ENGAGEMENT_TRIGGER_3_DESC}}"] ||
            ""
          )}
        </p>

      </div>
    `;


    // ======================================================
    // 5. MESSAGING PILLARS
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-messaging-pillars"
      >

        <div class="sectionHeader">

          <div class="sectionTitle">
            Messaging Pillars
          </div>

          <div
            class="gsHelpWrap"
            id="marketingMessagingHelpWrap"
          >

            <button
              type="button"
              class="gsHelpBtn"
              id="marketingMessagingHelpBtn"
              aria-label="What are Messaging Pillars?"
              aria-expanded="false"
              aria-controls="marketingMessagingHelpBubble"
              title="What are Messaging Pillars?"
            >
              ?
            </button>

            <div
              class="gsHelpBubble"
              id="marketingMessagingHelpBubble"
              role="tooltip"
            >

              <button
                type="button"
                class="gsHelpCloseBtn"
                aria-label="Close"
              >
                &times;
              </button>

              <p>Messaging Pillars are the core themes your marketing should repeatedly communicate so customers develop the right understanding of your business and its value. Each pillar represents an important idea that should become associated with your brand across different messages, campaigns, content, and customer interactions.</p>
<p>They are not fixed slogans or individual pieces of copy. Instead, they provide a consistent strategic framework for communication, allowing individual messages to vary while continuing to reinforce the same positioning, customer relevance, value, and reasons to choose your business.</p>

            </div>

          </div>

        </div>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_MESSAGING_PILLAR_1 ||
              d["{{M_MESSAGING_PILLAR_1}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_MESSAGING_PILLAR_1_DESC ||
            d["{{M_MESSAGING_PILLAR_1_DESC}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_MESSAGING_PILLAR_2 ||
              d["{{M_MESSAGING_PILLAR_2}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_MESSAGING_PILLAR_2_DESC ||
            d["{{M_MESSAGING_PILLAR_2_DESC}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_MESSAGING_PILLAR_3 ||
              d["{{M_MESSAGING_PILLAR_3}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_MESSAGING_PILLAR_3_DESC ||
            d["{{M_MESSAGING_PILLAR_3_DESC}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_MESSAGING_PILLAR_4 ||
              d["{{M_MESSAGING_PILLAR_4}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_MESSAGING_PILLAR_4_DESC ||
            d["{{M_MESSAGING_PILLAR_4_DESC}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            ${esc(
              d.M_MESSAGING_PILLAR_5 ||
              d["{{M_MESSAGING_PILLAR_5}}"] ||
              ""
            )}
          </span>

          <br>

          ${esc(
            d.M_MESSAGING_PILLAR_5_DESC ||
            d["{{M_MESSAGING_PILLAR_5_DESC}}"] ||
            ""
          )}
        </p>

      </div>
    `;


    // ======================================================
    // 6. TONE OF VOICE
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-tone-of-voice"
      >

        <div class="sectionHeader">

          <div class="sectionTitle">
            Tone of Voice
          </div>

          <div
            class="gsHelpWrap"
            id="marketingToneHelpWrap"
          >

            <button
              type="button"
              class="gsHelpBtn"
              id="marketingToneHelpBtn"
              aria-label="What is Tone of Voice?"
              aria-expanded="false"
              aria-controls="marketingToneHelpBubble"
              title="What is Tone of Voice?"
            >
              ?
            </button>

            <div
              class="gsHelpBubble"
              id="marketingToneHelpBubble"
              role="tooltip"
            >

              <button
                type="button"
                class="gsHelpCloseBtn"
                aria-label="Close"
              >
                &times;
              </button>

              <p>Tone of Voice defines how your business should sound when communicating with its target customers. It translates customer psychology, expectations, positioning, and brand character into practical communication principles — influencing language, confidence, complexity, emotional intensity, formality, and the way ideas should be presented.</p>
<p>The DOs and DON'Ts provide practical boundaries for applying that voice consistently. They are not rigid writing rules, but guidance for keeping communication recognizable, credible, and appropriate for the way your customers prefer to receive and evaluate information.</p>

            </div>

          </div>

        </div>


                <p class="preserve">${esc(
          d.M_TONE_OF_VOICE_DESC ||
          d["{{M_TONE_OF_VOICE_DESC}}"] ||
          ""
        )}</p>


        <p>
          <span class="subtitle">
            DO's
          </span>
        </p>


                <p class="preserve">${esc(
          d.M_TONE_OF_VOICE_DOS ||
          d["{{M_TONE_OF_VOICE_DOS}}"] ||
          ""
        )}</p>


        <p>
          <span class="subtitle">
            DON'Ts
          </span>
        </p>


                <p class="preserve">${esc(
          d.M_TONE_OF_VOICE_DONTS ||
          d["{{M_TONE_OF_VOICE_DONTS}}"] ||
          ""
        )}</p>

      </div>
    `;


    // ======================================================
    // 7. CUSTOMER JOURNEY
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-customer-journey"
      >

        <div class="sectionHeader">

          <div class="sectionTitle">
            Customer Journey
          </div>

          <div
            class="gsHelpWrap"
            id="marketingJourneyHelpWrap"
          >

            <button
              type="button"
              class="gsHelpBtn"
              id="marketingJourneyHelpBtn"
              aria-label="What is the Customer Journey?"
              aria-expanded="false"
              aria-controls="marketingJourneyHelpBubble"
              title="What is the Customer Journey?"
            >
              ?
            </button>

            <div
              class="gsHelpBubble"
              id="marketingJourneyHelpBubble"
              role="tooltip"
            >

              <button
                type="button"
                class="gsHelpCloseBtn"
                aria-label="Close"
              >
                &times;
              </button>

              <p>The Customer Journey describes how the role of marketing changes as potential customers move from first becoming aware of the business to considering it, making a decision, and continuing the relationship afterward. At each stage, customers have different questions, expectations, uncertainties, and information needs.</p>
<p>The strategy therefore defines the audience mindset, marketing's role, and the most suitable content and engagement approaches for each stage. This helps marketing support progression through the buying journey instead of treating every customer interaction as if the audience were equally ready to buy.</p>

            </div>

          </div>

        </div>


        <!-- AWARENESS -->

        <p>
          <span class="subtitle">
            AWARENESS
          </span>
        </p>


        <p>
          <span class="subtitle">
            Audience mindset:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_1_A ||
            d["{{M_CUSTOMER_JOURNEY_1_A}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            Marketing's role:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_1_B ||
            d["{{M_CUSTOMER_JOURNEY_1_B}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            Best content/engagement approaches:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_1_C ||
            d["{{M_CUSTOMER_JOURNEY_1_C}}"] ||
            ""
          )}
        </p>


        <!-- CONSIDERATION -->

        <p>
          <span class="subtitle">
            CONSIDERATION
          </span>
        </p>


        <p>
          <span class="subtitle">
            Audience mindset:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_2_A ||
            d["{{M_CUSTOMER_JOURNEY_2_A}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            Marketing's role:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_2_B ||
            d["{{M_CUSTOMER_JOURNEY_2_B}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            Best content/engagement approaches:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_2_C ||
            d["{{M_CUSTOMER_JOURNEY_2_C}}"] ||
            ""
          )}
        </p>


        <!-- CONVERSION -->

        <p>
          <span class="subtitle">
            CONVERSION
          </span>
        </p>


        <p>
          <span class="subtitle">
            Audience mindset:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_3_A ||
            d["{{M_CUSTOMER_JOURNEY_3_A}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            Marketing's role:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_3_B ||
            d["{{M_CUSTOMER_JOURNEY_3_B}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            Best content/engagement approaches:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_3_C ||
            d["{{M_CUSTOMER_JOURNEY_3_C}}"] ||
            ""
          )}
        </p>


        <!-- RETENTION -->

        <p>
          <span class="subtitle">
            RETENTION
          </span>
        </p>


        <p>
          <span class="subtitle">
            Audience mindset:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_4_A ||
            d["{{M_CUSTOMER_JOURNEY_4_A}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            Marketing's role:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_4_B ||
            d["{{M_CUSTOMER_JOURNEY_4_B}}"] ||
            ""
          )}
        </p>


        <p>
          <span class="subtitle">
            Best content/engagement approaches:
          </span>

          <br>

          ${esc(
            d.M_CUSTOMER_JOURNEY_4_C ||
            d["{{M_CUSTOMER_JOURNEY_4_C}}"] ||
            ""
          )}
        </p>

      </div>
    `;


    // ======================================================
    // 8. LEAD PREPARATION
    // ======================================================

    html += `
      <div
        class="card scrollTarget"
        id="block-lead-preparation"
      >

        <div class="sectionHeader">

          <div class="sectionTitle">
            Lead Preparation
          </div>

          <div
            class="gsHelpWrap"
            id="marketingLeadHelpWrap"
          >

            <button
              type="button"
              class="gsHelpBtn"
              id="marketingLeadHelpBtn"
              aria-label="What is Lead Preparation?"
              aria-expanded="false"
              aria-controls="marketingLeadHelpBubble"
              title="What is Lead Preparation?"
            >
              ?
            </button>

            <div
              class="gsHelpBubble"
              id="marketingLeadHelpBubble"
              role="tooltip"
            >

              <button
                type="button"
                class="gsHelpCloseBtn"
                aria-label="Close"
              >
                &times;
              </button>

              <p>Lead Preparation defines how marketing should prepare potential customers before they enter a direct sales conversation. Its purpose is not simply to generate inquiries, but to create enough understanding, relevance, trust, and perceived value that qualified prospects reach Sales with stronger intent and fewer fundamental uncertainties.</p>
<p>This section bridges Marketing and Sales by defining what customers should ideally understand, believe, and recognize before conversion. Effective lead preparation makes sales conversations more focused and productive because marketing has already completed part of the educational and confidence-building work.</p>

            </div>

          </div>

        </div>


                <p class="preserve">${esc(
          d.M_LEAD_CONVERSION ||
          d["{{M_LEAD_CONVERSION}}"] ||
          ""
        )}</p>

      </div>
    `;
  }


  contentDiv.innerHTML =
    html;


  hydrateABCMaps();
}


// ============================================================
// HELP BUBBLE STYLES
// ============================================================

function injectMarketingHelpStylesOnce() {

  if (
    document.getElementById(
      "marketing-help-styles"
    )
  ) {

    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "marketing-help-styles";


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

function setupMarketingHelpBubbles() {

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
  // REGISTER MARKETING HELP BUTTONS
  // ========================================================

  initHelpBubble(
    "marketingFoundationsHelpWrap",
    "marketingFoundationsHelpBtn"
  );


  initHelpBubble(
    "marketingObjectivesHelpWrap",
    "marketingObjectivesHelpBtn"
  );


  initHelpBubble(
    "marketingDifferentiationHelpWrap",
    "marketingDifferentiationHelpBtn"
  );


  initHelpBubble(
    "marketingEngagementHelpWrap",
    "marketingEngagementHelpBtn"
  );


  initHelpBubble(
    "marketingMessagingHelpWrap",
    "marketingMessagingHelpBtn"
  );


  initHelpBubble(
    "marketingToneHelpWrap",
    "marketingToneHelpBtn"
  );


  initHelpBubble(
    "marketingJourneyHelpWrap",
    "marketingJourneyHelpBtn"
  );


  initHelpBubble(
    "marketingLeadHelpWrap",
    "marketingLeadHelpBtn"
  );
}
