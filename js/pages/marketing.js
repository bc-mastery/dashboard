// /js/pages/marketing.js

import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS } from "../core/config.js";
import { state } from "../core/state.js";
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
} from "../core/ui.js";
import { fetchPdfLinks } from "../services/pdf.js";

/* ------------------------------ main render ------------------------------ */
export async function renderMarketingTab() {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Marketing Strategy…</p></div>`;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    // Cache + access
    state.lastApiByTab.marketing = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

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
      // ignore
    }

    // Insert upgrade block for preview users
    maybeInsertUniversalUpgradeBlock({
      isPreviewOnly: !allowFull,
      content: finalBlockContent.marketing,
    });

    // Floating call button for GS-only users
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

  let html = "";

  // First block — always shown
  html += buildFirstBlockHTML({
    title: "Marketing Characteristics",
    subtitleLabel: "Marketing Character",
    subtitleValue: d.M_CHARACTER,
    descText: d.M_PROMISES,
    areas,
  });

  // Full details when allowed
  if (allowFull) {
    html += `
      <div class="card scrollTarget" id="block-marketing-details">
        <div class="sectionTitle">Marketing Strategy</div>
        ${d.M_BASE ? `<p><span class="subtitle">Marketing Base:</span> ${esc(d.M_BASE)}</p>` : ""}
        ${d.M_MESSAGE ? `<p><span class="subtitle">Message Focus:</span> ${esc(d.M_MESSAGE)}</p>` : ""}
        ${d.M_TONE ? `<p><span class="subtitle">Tone & Emotion:</span> ${esc(d.M_TONE)}</p>` : ""}
        ${d.M_ANGLE ? `<p><span class="subtitle">Marketing Angle:</span> ${esc(d.M_ANGLE)}</p>` : ""}
        ${d.M_CHANNEL ? `<p><span class="subtitle">Channel Preference:</span> ${esc(d.M_CHANNEL)}</p>` : ""}
        ${d.M_ACTION ? `<p><span class="subtitle">Marketing CTA:</span> ${esc(d.M_ACTION)}</p>` : ""}
        ${d.M_EXPERIENCE ? `<p><span class="subtitle">Marketing Experience:</span> ${esc(d.M_EXPERIENCE)}</p>` : ""}
      </div>
    `;
  }

  contentDiv.innerHTML = html;
  hydrateABCMaps();
}
