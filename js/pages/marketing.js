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

    const allowFull = !!d.MARKETING_PAID || !!d["4PBS_PAID"];
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
    subtitleLabel: "Marketing Approach",
    subtitleValue: d.M_CHARACTER,
    descText: d.M_CHARACTER_DESC,
    areas,
  });

  if (allowFull) {
    const lines = [
      d.M_CONCEPT && ["Concept", d.M_CONCEPT],
      d.M_CHANNELS && ["Channels", d.M_CHANNELS],
      d.M_CONTENT && ["Content Strategy", d.M_CONTENT],
      d.M_SEQUENCING && ["Message Sequencing", d.M_SEQUENCING],
      d.M_RETENTION && ["Retention Loop", d.M_RETENTION],
      d.M_AUTOMATION && ["Automation", d.M_AUTOMATION],
      d.M_BUDGET && ["Budget / Bids", d.M_BUDGET],
      d.M_TIMING && ["Cadence & Timing", d.M_TIMING],
      d.M_PROMOTION && ["Key Promotions", d.M_PROMOTION],
      d.M_KPIS && ["Primary KPIs", d.M_KPIS],
    ].filter(Boolean);

    if (lines.length) {
      html += `<div class="card scrollTarget" id="block-marketing-details">
        <div class="sectionTitle">Marketing Strategy</div>
        ${lines.map(([label, val]) => `<p><span class="subtitle">${esc(label)}:</span> ${esc(val)}</p>`).join("")}
      </div>`;
    }
  }

  contentDiv.innerHTML = html;
  hydrateABCMaps();
}

