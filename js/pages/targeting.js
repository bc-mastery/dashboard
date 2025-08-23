// /js/pages/sales.js
import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS, IMAGES } from "../core/config.js";
import { state } from "../core/state.js";
import { inferAccess, parseAreas, toDownloadLink, esc } from "../core/utils.js";
import { detectMode, setABCMap } from "../core/abcMap.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  maybeInsertUniversalUpgradeBlock,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";
import { fetchPdfLinks } from "../services/pdf.js";

/* ------------------------------ main render ------------------------------ */
export async function renderSalesTab() {
  // Mark active tab + clear stale upgrade block immediately
  document.body.setAttribute("data-current-tab", "sales");
  clearUpgradeBlock();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Sales Strategy…</p></div>`;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;

    // Use the shared AbortController signal (set in main.js)
    const r = await fetch(url, { signal: state.fetchSignal });
    const api = await r.json();

    // If user switched tabs while we were loading, do nothing
    if ((document.body.dataset.currentTab || "") !== "sales") return;

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    // Cache + access
    state.lastApiByTab.sales = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    // Pre-fill direct PDF link (from S_STRATEGY_OUTPUT)
    const view = d.S_STRATEGY_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.sales = toDownloadLink(view);
      updateFloatingCTA("sales");
    }

    // Allow full content if SALES_PAID or 4PBS_PAID is set
    const allowFull = !!d.SALES_PAID || !!d["4PBS_PAID"];

    // Paint page
    paintSales(api, allowFull);

    // Chips row & CTA refresh
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    try {
      await fetchPdfLinks("sales");
      // User might have switched tabs while waiting:
      if ((document.body.dataset.currentTab || "") === "sales") {
        updateFloatingCTA("sales");
      }
    } catch {
      /* ignore */
    }

    // Insert upgrade block (guarded to this tab)
    maybeInsertUniversalUpgradeBlock({
      tab: "sales",
      isPreviewOnly: !allowFull,
      content: {
        title: "Your Sales Strategy — First Step in the Journey",
        text: `You’re seeing the opening layer of your Sales Strategy.
The complete view includes objection handling, relationship progression, persuasion timing, and follow-up psychology — the tools to move prospects from interested to committed.

Unlock your full Sales Strategy — order the 4-Pillar Business Strategy or reserve a strategic call to review the complete journey.`,
      },
    });

    // Floating call button for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    // Swallow aborts quietly
    if (err?.name === "AbortError") return;
    console.error(err);
    if ((document.body.dataset.currentTab || "") === "sales") {
      const contentDivNow = document.getElementById("content");
      if (contentDivNow) {
        contentDivNow.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err?.message || err}</p></div>`;
      }
    }
  }
}

/* ------------------------------ page painter ----------------------------- */
function paintSales(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const areas = parseAreas(d.D_AREA);
  const mode = detectMode(areas);

  // First (always shown) block with ABC map
  let html = `
    <div class="card scrollTarget" id="block-sales-core">
      <div class="bfGrid">
        <div class="bfText">
          <div class="bfTitle">Sales Foundations</div>
          ${d.S_SITUATION ? `<p><span class="bfSub">Situation:</span> ${esc(d.S_SITUATION)}</p>` : ""}
          ${d.S_VALUE ? `<p><span class="bfSub">Primary Value:</span> ${esc(d.S_VALUE)}</p>` : ""}
          ${d.S_DESC ? `<p class="bfDesc preserve">${esc(d.S_DESC)}</p>` : ""}
        </div>
        <div class="bfMap">
          <div class="abc-wrap"
               data-mode="${esc(mode)}"
               data-areas="${areas.map(String).map(esc).join("|")}"
               data-overlay="${esc(IMAGES.abcFrame)}">
            <div class="donut"></div>
            <img class="overlay" src="${IMAGES.abcFrame}" alt="ABC overlay">
          </div>
        </div>
      </div>
    </div>
  `;

  // Full details when allowed
  if (allowFull) {
    html += `
      <div class="card scrollTarget" id="block-sales-details">
        <div class="sectionTitle">Sales Strategy</div>
        ${d.S_POSITION ? `<p><span class="subtitle">Positioning:</span> ${esc(d.S_POSITION)}</p>` : ""}
        ${d.S_OBJECTIONS ? `<p><span class="subtitle">Objection Handling:</span> ${esc(d.S_OBJECTIONS)}</p>` : ""}
        ${d.S_SEQUENCE ? `<p><span class="subtitle">Sequence & Timing:</span> ${esc(d.S_SEQUENCE)}</p>` : ""}
        ${d.S_FOLLOWUP ? `<p><span class="subtitle">Follow-up Psychology:</span> ${esc(d.S_FOLLOWUP)}</p>` : ""}
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
    const overlayPath = container.dataset.overlay || IMAGES.abcFrame;
    setABCMap({ container, mode: m, areas: a, overlayPath });
  });
}
