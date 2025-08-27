// /js/pages/targeting.js

import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS, IMAGES } from "../core/config.js";
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

/* ------------------------------ styles ------------------------------ */
function injectTargetingStylesOnce() {
  if (document.getElementById("targeting-styles")) return;
  const style = document.createElement("style");
  style.id = "targeting-styles";
  style.textContent = `
    /* Desktop: 2:1 text:map */
    #content .card .bfGrid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      align-items: start;
      gap: 22px;
    }

    /* Map wrapper (square) */
    #content .bfMap .abc-wrap {
      position: relative;
      width: 100%;
      max-width: 360px;
      aspect-ratio: 1 / 1;
      margin-left: auto;
    }

    /* Overlay fills the wrapper */
    #content .bfMap .abc-wrap .overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
      user-select: none;
    }

    /* Donut host fills wrapper and is centered; final Y offset set by JS */
    #content .bfMap .abc-wrap .donut {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 100%;
      transform: translate(-50%, -50%); /* JS will add a px tweak after measuring */
      will-change: transform;
    }

    /* Mobile: stack and center the map */
    @media (max-width: 860px) {
      #content .card .bfGrid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      #content .bfMap {
        display: flex;
        justify-content: center;
      }
      #content .bfMap .abc-wrap {
        max-width: 300px;
        margin-left: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------ donut/overlay auto-align ------------------------------ */
/**
 * Ensures the donut's *rendered* inner graphics (svg/canvas) are vertically centered
 * with the wrapper/overlay. Google Charts leaves internal padding, especially on mobile.
 * We measure and apply an exact translateY correction on the host.
 */
function autoAlignDonut(container) {
  const host = container.querySelector(".donut");
  if (!host) return;

  const measureAndAlign = () => {
    // Wrapper we want to center against
    const wrapRect = container.getBoundingClientRect();

    // Try to find the actual rendered graphic bounds
    let innerRect = null;

    // Google Charts: an inner <div> with an <svg>
    const svg = host.querySelector("svg");
    if (svg) innerRect = svg.getBoundingClientRect();

    // Fallback for canvas renderers
    if (!innerRect) {
      const canvas = host.querySelector("canvas");
      if (canvas) innerRect = canvas.getBoundingClientRect();
    }

    // Last resort: first child element
    if (!innerRect) {
      const first = host.firstElementChild;
      if (first) innerRect = first.getBoundingClientRect();
    }

    if (!innerRect) return;

    const wrapCenterY = wrapRect.top + wrapRect.height / 2;
    const innerCenterY = innerRect.top + innerRect.height / 2;
    const dy = wrapCenterY - innerCenterY; // positive means the donut is too high (needs to go down)

    // Apply correction (keep X centering intact)
    host.style.transform = `translate(-50%, calc(-50% + ${dy}px))`;
  };

  // Initial attempts (render is async)
  measureAndAlign();
  setTimeout(measureAndAlign, 0);
  setTimeout(measureAndAlign, 100);
  setTimeout(measureAndAlign, 300);

  // Re-align on size changes and on DOM mutations inside the host
  const ro = new ResizeObserver(measureAndAlign);
  ro.observe(container);
  ro.observe(host);

  const mo = new MutationObserver(measureAndAlign);
  mo.observe(host, { childList: true, subtree: true });
}

/* ------------------------------ main render ------------------------------ */
export async function renderTargetingTab() {
  setCurrentTab("targeting");
  document.body.setAttribute("data-current-tab", "targeting");
  clearUpgradeBlock();

  injectTargetingStylesOnce();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Targeting Strategy…</p></div>`;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    // cache + access
    state.lastApiByTab.targeting = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    // header brand
    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    // PDF link from T_STRATEGY_OUTPUT
    const view = d.T_STRATEGY_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.targeting = toDownloadLink(view);
      updateFloatingCTA("targeting");
    }

    const allowFull = !!d.TS_PAID || !!d["4PBS_PAID"];

    // paint page
    paintTargeting(api, allowFull);

    // chips + CTA refresh
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();
    updateFloatingCTA("targeting");

    // upgrade block only for preview users
    maybeInsertUniversalUpgradeBlock({
      tab: "targeting",
      isPreviewOnly: !allowFull,
      content: finalBlockContent.targeting,
    });

    // floating call button for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${esc(err?.message || err)}</p></div>`;
  }
}

/* ------------------------------ page painter ----------------------------- */
function paintTargeting(api, allowFull = false) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const d = (api && api.data) || {};
  const areas = parseAreas(d.D_AREA);
  const mode = detectMode(areas);

  let html = `
    <div class="card scrollTarget" id="block-behavioral">
      <div class="bfGrid">
        <div class="bfText">
          <div class="bfTitle">Behavioral Factors</div>
          ${d.D_AREA ? `<p><span class="bfSub">Demand Area(s):</span> ${esc(d.D_AREA)}</p>` : ""}
          ${d.D_DRIVER ? `<p><span class="bfSub">Driver(s):</span> ${esc(d.D_DRIVER)}</p>` : ""}
          ${d.D_DRIVER_DESC ? `<p class="bfDesc preserve">${esc(d.D_DRIVER_DESC)}</p>` : ""}
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

  if (allowFull) {
    html += `
      <div class="card scrollTarget" id="block-positioning">
        <div class="sectionTitle">Positioning</div>
        ${d.D_SEGMENT ? `<p><span class="subtitle">Target Segment:</span> ${esc(d.D_SEGMENT)}</p>` : ""}
        ${d.D_SEGMENT_DESC ? `<p class="preserve">${esc(d.D_SEGMENT_DESC)}</p>` : ""}
        ${d.T_CHARACTER ? `<p><span class="subtitle">Customer Label:</span> ${esc(d.T_CHARACTER)}</p>` : ""}
        ${d.T_CHARACTER_DESC ? `<p class="preserve">${esc(d.T_CHARACTER_DESC)}</p>` : ""}
      </div>

      <div class="card scrollTarget" id="block-macro">
        <div class="sectionTitle">Macro-behavior</div>
        ${d.T_DECISION ? `<p><span class="subtitle">Decision-making of your customers:</span> ${esc(d.T_DECISION)}</p>` : ""}
        ${d.T_DECISION_DESC ? `<p class="preserve">${esc(d.T_DECISION_DESC)}</p>` : ""}
        ${d.T_ACTION ? `<p><span class="subtitle">Action pattern of your customers:</span> ${esc(d.T_ACTION)}</p>` : ""}
        ${d.T_ACTION_DESC ? `<p class="preserve">${esc(d.T_ACTION_DESC)}</p>` : ""}
        ${d.T_APPROACH ? `<p><span class="subtitle">Mindset of your customers:</span> ${esc(d.T_APPROACH)}</p>` : ""}
        ${d.T_APPROACH_DESC ? `<p class="preserve">${esc(d.T_APPROACH_DESC)}</p>` : ""}
      </div>

      <div class="card scrollTarget" id="block-persona">
        <div class="sectionTitle">Target Persona</div>
        ${d.TP_NAME ? `<p><span class="subtitle">Name of the Target Persona:</span> ${esc(d.TP_NAME)}</p>` : ""}
        ${d.TP_ROLE ? `<p><span class="subtitle">Role and objectives:</span> ${esc(d.TP_ROLE)}</p>` : ""}
        ${d.TP_INTENT ? `<p><span class="subtitle">Intent and purchasing behavior:</span> ${esc(d.TP_INTENT)}</p>` : ""}
        ${d.TP_TRIGGERS ? `<p><span class="subtitle">Behavior, mindset and decision triggers:</span> ${esc(d.TP_TRIGGERS)}</p>` : ""}
        ${d.TP_DRIVERS ? `<p><span class="subtitle">Emotional drivers and motivations:</span> ${esc(d.TP_DRIVERS)}</p>` : ""}
        ${d.TP_FEARS ? `<p><span class="subtitle">Underlying fears and sensitivities:</span> ${esc(d.TP_FEARS)}</p>` : ""}
        ${d.TP_OFFER_FIT ? `<p><span class="subtitle">Brand and offering fit:</span> ${esc(d.TP_OFFER_FIT)}</p>` : ""}
        ${d.TP_COMM_STYLE ? `<p><span class="subtitle">Ideal communication style:</span> ${esc(d.TP_COMM_STYLE)}</p>` : ""}
        ${d.TP_SUMMARY ? `<p><span class="subtitle">Persona summary statement:</span> ${esc(d.TP_SUMMARY)}</p>` : ""}
      </div>
    `;
  }

  contentDiv.innerHTML = html;

  // Activate ABC map and then auto-align donut vs overlay
  document.querySelectorAll(".abc-wrap").forEach((container) => {
    const m = (container.dataset.mode || "B2B").toUpperCase();
    const a = (container.dataset.areas || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const overlayPath = container.dataset.overlay || IMAGES.abcFrame;

    setABCMap({ container, mode: m, areas: a, overlayPath });

    // Align after the chart renders (and keep it aligned)
    autoAlignDonut(container);
  });
}
