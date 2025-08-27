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

/* ------------------------------ style fix (scoped) ------------------------------ */
function injectTargetingStylesOnce() {
  if (document.getElementById("tgt-mobile-fixes")) return;
  const style = document.createElement("style");
  style.id = "tgt-mobile-fixes";
  style.textContent = `
    /* Prevent any horizontal scroll only within the content area */
    #content { overflow-x: hidden; }

    /* Make our 2-col layout responsive */
    #content .card .bfGrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: start;
      gap: 22px;
    }
    @media (max-width: 860px) {
      #content .card .bfGrid {
        grid-template-columns: 1fr;  /* stack on mobile */
        gap: 16px;
      }
    }

    /* Wrapper of the map/chart area */
    #content .bfMap { max-width: 100%; overflow: hidden; }

    /* ABC map wrapper = single source of truth for size (perfect square) */
    #content .abc-wrap {
      position: relative;
      width: 100%;
      max-width: 520px;       /* desktop cap; tweak if you like */
      margin: 0 auto;
      aspect-ratio: 1 / 1;    /* force a perfect square */
      overflow: hidden;
    }

    /* The chart container fills the square */
    #content .abc-wrap .donut {
      position: absolute;
      inset: 0;               /* top/right/bottom/left: 0 */
      width: 100%;
      height: 100%;
    }

    /* Whatever the chart lib renders (svg/canvas/div), make it fill the square */
    #content .abc-wrap .donut > * {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }

    /* The overlay covers the same square exactly */
    #content .abc-wrap img.overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;   /* clicks go through */
      user-select: none;
    }

    /* Safety: wrap long tokens in text blocks */
    #content .card p,
    #content .card li,
    #content .card .preserve {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
  `;
  document.head.appendChild(style);
}

/* Ensure child SVG/canvas really fills the square even after async chart init */
function lockAbcSizing(container) {
  const donut = container.querySelector(".donut");
  if (!donut) return;

  // Helper that resizes any immediate child to fill the square
  const fit = () => {
    const child = donut.firstElementChild;
    if (!child) return;
    // Force sizing for common cases (div>svg, canvas, etc.)
    child.style.width = "100%";
    child.style.height = "100%";
    // Google Charts sometimes nests <div><svg> — grab svg if present
    const svg = child.tagName === "SVG" ? child : child.querySelector && child.querySelector("svg");
    if (svg) {
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      // If it has viewBox, let it scale cleanly
      if (!svg.getAttribute("viewBox") && svg.viewBox && svg.viewBox.baseVal) {
        const vb = svg.viewBox.baseVal;
        svg.setAttribute("viewBox", `0 0 ${vb.width || 100} ${vb.height || 100}`);
      }
    }
    const canvas = child.tagName === "CANVAS" ? child : child.querySelector && child.querySelector("canvas");
    if (canvas) {
      // Match canvas CSS size; some libs read width/height attributes for raster size
      const rect = donut.getBoundingClientRect();
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
    }
  };

  // Run now and after a brief delay (for async chart render)
  fit();
  setTimeout(fit, 0);
  setTimeout(fit, 100);

  // Observe future mutations (chart re-render)
  const mo = new MutationObserver(() => fit());
  mo.observe(donut, { childList: true, subtree: true });

  // Keep in sync on resize
  const ro = new ResizeObserver(() => fit());
  ro.observe(donut);
}

/* ------------------------------ main render ------------------------------ */
export async function renderTargetingTab() {
  setCurrentTab("targeting");
  document.body.setAttribute("data-current-tab", "targeting");
  clearUpgradeBlock();

  // Inject mobile/responsiveness fixes once
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
            <!-- The donut square: chart will render inside, overlay covers it -->
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

  // Activate ABC map (render chart) and lock sizing/alignment
  document.querySelectorAll(".abc-wrap").forEach((container) => {
    const m = (container.dataset.mode || "B2B").toUpperCase();
    const a = (container.dataset.areas || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const overlayPath = container.dataset.overlay || IMAGES.abcFrame;

    // Render chart
    setABCMap({ container, mode: m, areas: a, overlayPath });

    // Enforce fill/lock so overlay + chart stay aligned
    lockAbcSizing(container);
  });
}
