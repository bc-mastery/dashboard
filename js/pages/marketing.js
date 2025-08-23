// /js/pages/marketing.js

import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS } from "../core/config.js";
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
  clearUpgradeBlock, // prevent stale upgrade block on tab switch
} from "../core/ui.js";
import { fetchPdfLinks } from "../services/pdf.js";

/* ------------------------------ main render ------------------------------ */
export async function renderMarketingTab() {
  // Mark active tab & clear any leftover upgrade block from previous tab
  setCurrentTab("marketing");
  document.body.setAttribute("data-current-tab", "marketing");
  clearUpgradeBlock();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Marketing Strategy…</p></div>`;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${
      nocacheFlag ? "&nocache=1" : ""
    }`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${
        (api && api.message) || "No data found."
      }</p></div>`;
      return;
    }

    // Cache + access
    state.lastApiByTab.marketing = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    // Header brand text
    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    // Pre-fill direct PDF link (from M_STRATEGY_OUTPUT)
    const view = d.M_STRATEGY_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.marketing = toDownloadLink(view);
      updateFloatingCTA("marketing");
    }

    // Allow full content if MARKETING_PAID or 4PBS_PAID is set
    const allowFull = !!d.MARKETING_PAID || !!d["4PBS_PAID"];

    // Paint page
    paintMarketing(api, allowFull);

    // Secondary chips row
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    // Try to fetch dynamic PDF links from pdf mode, then refresh CTA
    try {
      await fetchPdfLinks("marketing");
      updateFloatingCTA("marketing");
    } catch (_) {
      /* ignore */
    }

    // Insert upgrade block for preview users (guarded by tab name)
    maybeInsertUniversalUpgradeBlock({
      tab: "marketing",
      isPreviewOnly: !allowFull,
      content: finalBlockContent.marketing,
    });

    // Floating call button for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${
      err?.message || err
    }</p></div>`;
  }
}

/* ------------------------------ page painter ----------------------------- */
function paintMarketing(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const areas = parseAreas(d.D_AREA);

  // Try to pick a sensible subtitle + description if your sheet uses different field names.
  const subtitleValue =
    d.M_FOCUS ||
    d.M_MESSAGE ||
    d.M_CHANNELS ||
    d.M_POSITIONING ||
    d.M_ARCH ||
    d.M_THEME ||
    ""; // falls back to "—" via buildFirstBlockHTML

  const descText =
    d.M_DESC ||
    d.M_SUMMARY ||
    d.M_STRATEGY ||
    d.M_OVERVIEW ||
    d.M_OUTLINE ||
    d.MARKETING_DESC ||
    "";

  let html = "";

  // First block — always shown (ABC map via buildFirstBlockHTML -> IMAGES.abcFrame)
  html += buildFirstBlockHTML({
    title: "Marketing Foundations",
    subtitleLabel: "Primary Focus",
    subtitleValue,
    descText,
    areas,
  });

  // Full details when allowed — render only fields that exist
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
        ${lines
          .map(
            ([label, val]) =>
              `<p><span class="subtitle">${esc(label)}:</span> ${esc(val)}</p>`
          )
          .join("")}
      </div>`;
    }
  }

  contentDiv.innerHTML = html;

  // Activate any abc-wrap we just injected
  hydrateABCMaps();
}
