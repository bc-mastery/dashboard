// /js/pages/marketing.js
import { ACCESS } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
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
  clearUpgradeBlock,
} from "../core/ui.js";
import { fetchDashboardData } from "../services/api.js";

/* ------------------------------ main render ------------------------------ */
export async function renderMarketingTab() {
  setCurrentTab("marketing");
  document.body.setAttribute("data-current-tab", "marketing");
  clearUpgradeBlock();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Marketing Strategy…</p></div>`;

  try {
    const api = await fetchDashboardData();

    state.lastApiByTab.marketing = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    const view = d.M_STRATEGY_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.marketing = toDownloadLink(view);
      updateFloatingCTA("marketing");
    }

    // Allow full content if 4PBS is paid AND strategy has been sent
    const isStrategySent =
      d.OFFER_STRATEGY_SENT &&
      new Date(d.OFFER_STRATEGY_SENT).getTime() < new Date().getTime();
    const allowFull = !!d["4PBS_PAID"] && isStrategySent;
    paintMarketing(api, allowFull);

    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    maybeInsertUniversalUpgradeBlock({
      tab: "marketing",
      isPreviewOnly: !allowFull,
      content: finalBlockContent.marketing,
    });

    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err?.message || err}</p></div>`;
  }
}

/* ------------------------------ page painter ----------------------------- */
function paintMarketing(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const areas = parseAreas(d.D_AREA);

  let html = buildFirstBlockHTML({
    title: "Foundations",
    subtitleLabel: "Marketing Character",
    subtitleValue: d.M_CHARACTER,
    descText: d.M_CHARACTER_DESC,
    areas,
  });

  if (allowFull) {
    const buildBlock = (title, content, id) => {
      if (!content || !String(content).trim()) return "";
      return `
        <div class="card scrollTarget" id="block-${id}">
          <div class="sectionTitle">${esc(title)}</div>
          <p class="preserve">${esc(content)}</p>
        </div>
      `;
    };

    html += buildBlock("Strategy Introduction", d.M_STRATEGY_INTRO, "strategy-introduction");
    html += buildBlock("Objectives", d.M_OBJECTIVES, "objectives");
    html += buildBlock("Differentiation", d.M_DIFFERENTIATION, "differentiation");
    html += buildBlock("Attention Triggers", d.M_ATTENTION_TRIGGERS, "attention-triggers");
    html += buildBlock("Messaging Principles", d.M_MESSAGING_PRINCIPLES, "messaging-principles");
    html += buildBlock("Tone Of Voice", d.M_TONE_OF_VOICE, "tone-of-voice");
    html += buildBlock("Customer Journey", d.M_CUSTOMER_JOURNEY, "customer-journey");
    html += buildBlock("Lead Conversion", d.M_LEAD_CONVERSION, "lead-conversion");
  }

  contentDiv.innerHTML = html;
  hydrateABCMaps();
}
