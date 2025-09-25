// /js/pages/growth.js

import { ACCESS, token } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { esc, toDownloadLink } from "../core/utils.js";
import { ensureCharts, drawDonut, drawSegmentedBars, injectGsStylesOnce } from "../core/charts.js";
import {
  setTitleAndIcon,
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";
import { fetchDashboardData } from "../services/api.js";

/* ------------------------------ helpers ------------------------------ */
function toPercent(val) {
  if (val === null || val === undefined) return 0;
  let s = String(val).trim().replace(",", ".");
  const hasPercent = s.includes("%");
  if (hasPercent) s = s.replace("%", "");
  let n = parseFloat(s);
  if (!isFinite(n)) return 0;
  if (!hasPercent && n > 0 && n <= 1) n *= 100;
  if (n < 0) n = 0;
  if (n > 100) n = 100;
  return Math.round(n * 100) / 100;
}
const pctLabel = (n) => `${toPercent(n)}%`;

/* ------------------------------ local styles ------------------------------ */
function injectGrowthOverviewStylesOnce() {
  if (document.getElementById("gs-overview-styles")) return;
  const style = document.createElement("style");
  style.id = "gs-overview-styles";
  style.textContent = `
    #block-gs-overview .bfGrid{ display:grid; grid-template-columns: 1fr 2fr; align-items:start; gap:22px; }
    #block-gs-overview .bfMap{ display:flex; align-items:center; justify-content:center; }
    #block-gs-overview #gsDonut{ width:100%; max-width:360px; height:360px; }
    @media (max-width: 860px){
      #block-gs-overview .bfGrid{ grid-template-columns: 1fr; gap:16px; }
      #block-gs-overview #gsDonut{ max-width:300px; height:300px; margin:0 auto; }
    }
  `;
  document.head.appendChild(style);
}

function injectPillarHelpStylesOnce() {
  if (document.getElementById("gs-pillar-help-styles")) return;
  const style = document.createElement("style");
  style.id = "gs-pillar-help-styles";
  style.textContent = `
    .sectionHeader { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative; }
    .gsHelpWrap { position: static; display: inline-flex; }
    .gsHelpBtn { width: 28px; height: 28px; border-radius: 50%; background: #30BA80; color: #FFFFFF; border: none; cursor: pointer; font-weight: 800; font-size: 16px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
    .gsHelpBtn:focus-visible { outline: 2px solid #024D4F; outline-offset: 2px; }
    .gsHelpBubble { position: absolute; max-width: 520px; background: #333333; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; box-shadow: 0 10px 20px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.06); z-index: 4002; display: none; }
    .gsHelpBubble p, .gsHelpBubble ul { margin: 0 0 8px 0; color: #FFFFFF; font-size: 14px; line-height: 1.5; }
    .gsHelpBubble p:last-child, .gsHelpBubble ul:last-child { margin-bottom: 0; }
    .gsHelpWrap.open .gsHelpBubble { display: block; }
    #gsOverlay { position: fixed; inset: 0; background: rgba(2, 77, 79, 0.25); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); z-index: 4001; display: none; }
    #gsOverlay.show { display: block; }
    @media (max-width: 768px) {
      .gsHelpBubble { width: calc(100% - 40px); max-height: 75vh; overflow-y: auto; }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------ main render ------------------------------ */
export async function renderGrowthTab(forceRefresh = false) {
  setCurrentTab("growth");
  document.body.setAttribute("data-current-tab", "growth");
  clearUpgradeBlock();
  setTitleAndIcon("growth");

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;
  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Growth Scan…</p></div>`;

  try {
    const api = await fetchDashboardData(forceRefresh);
    state.lastApiByTab.growth = { ...api, data: { ...api.data } };
    const d = api.data || {};
    if (d.Brand) document.getElementById("brandName").textContent = d.Brand;
    if (d.GS_OUTPUT) state.dynamicPdfLinks.growth = toDownloadLink(String(d.GS_OUTPUT));

    const util = toPercent(d.GS_AVERAGE);
    const untapped = 100 - util;
    const growthPotentialLabel = `${toPercent(d.GS_GROWTH_POTENTIAL)}%`;

    injectGrowthOverviewStylesOnce();
    contentDiv.innerHTML = `
      <section class="card scrollTarget" id="block-gs-overview">
        <div class="sectionHeader"><div class="bfTitle">Quick Scan</div><div class="gsHelpWrap" id="gsOverviewHelpWrap"><button type="button" class="gsHelpBtn" id="gsOverviewHelpBtn" title="What does this section mean?">?</button><div class="gsHelpBubble" id="gsOverviewHelpBubble"><p>The Growth Scan compares your view of your business with your audience’s reality. The results reveal where your strategy aligns with your customers and where gaps are holding you back.</p></div></div></div>
        <div class="bfGrid">
          <div class="bfMap"><div id="gsDonut"></div></div>
          <div class="bfText">
            <p>Currently utilized business potential: <strong>${pctLabel(util)}</strong></p>
            <p>That means another <strong>${pctLabel(untapped)} of untapped potential.</strong></p>
            <p>With a few changes, you could achieve <strong>${growthPotentialLabel}</strong> growth.</p>
            <p>Your biggest blocker is ${d.GS_BLOCKER || "not identified"}.</p>
          </div>
        </div>
      </section>
      <section class="card scrollTarget" id="block-gs-pillars" style="padding-bottom: 28px;">
        <div class="sectionHeader"><div class="sectionTitle">4-Pillar Snapshot</div><div class="gsHelpWrap" id="gsPillarHelpWrap"><button type="button" class="gsHelpBtn" id="gsPillarHelpBtn" title="What do these percentages mean?">?</button><div class="gsHelpBubble" id="gsPillarHelpBubble"><p><strong>0–60%:</strong> You plan based on intuition. You need a stable strategy.</p><p><strong>61–80%:</strong> You have an established strategy but room to improve outcomes.</p><p><strong>81–100%:</strong> You’ve mastered the area. A strategic shift may be needed to break plateaus.</p></div></div></div>
        <div id="gsBars"></div>
      </section>
      <section class="card scrollTarget" id="block-gs-targeting"><div class="sectionTitle">Targeting Scan</div><p class="preserve">${esc(d.GS_T_DESC || "")}</p></section>
      <section class="card scrollTarget" id="block-gs-offer"><div class="sectionTitle">Offer Scan</div><p class="preserve">${esc(d.GS_O_DESC || "")}</p></section>
      <section class="card scrollTarget" id="block-gs-marketing"><div class="sectionTitle">Marketing Scan</div><p class="preserve">${esc(d.GS_M_DESC || "")}</p></section>
      <section class="card scrollTarget" id="block-gs-sales"><div class="sectionTitle">Sales Scan</div><p class="preserve">${esc(d.GS_S_DESC || "")}</p></section>
      <section class="card scrollTarget" id="block-gs-summary"><div class="sectionTitle">Strategic Summary</div><p class="preserve">${esc(d.GS_GAPS_SUMMARY || "")}</p></section>
    `;

    populateBlockTabsFromPage();
    updateFloatingCTA("growth");
    injectGsStylesOnce();
    injectPillarHelpStylesOnce();
    await ensureCharts();

    drawDonut("gsDonut", [{ value: util, color: "#30BA80" }, { value: untapped, color: "#FF0040" }], { pieHole: 0.62 });
    drawSegmentedBars("gsBars", [{ label: "Targeting", value: toPercent(d.GS_T_RATE) }, { label: "Offer", value: toPercent(d.GS_O_RATE) }, { label: "Marketing", value: toPercent(d.GS_M_RATE) }, { label: "Sales", value: toPercent(d.GS_S_RATE) }]);

    if (!document.getElementById("gsOverlay")) {
      const overlay = document.createElement("div");
      overlay.id = "gsOverlay";
      document.body.appendChild(overlay);
    }
    
    const initHelpBubble = (wrapId, btnId) => {
        const wrap = document.getElementById(wrapId);
        const btn  = document.getElementById(btnId);
        const bubble = wrap.querySelector('.gsHelpBubble');
        const overlay = document.getElementById('gsOverlay');
        if (!wrap || !btn || !bubble || !overlay) return;
        const originalParent = bubble.parentElement;
        let isAppendedToBody = false;
        const close = () => {
            wrap.classList.remove("open");
            overlay.classList.remove("show");
            if (isAppendedToBody) originalParent.appendChild(bubble);
            isAppendedToBody = false;
        };
        const open = () => {
            wrap.classList.add("open");
            overlay.classList.add("show");
            document.body.appendChild(bubble);
            isAppendedToBody = true;
            const isMobile = window.matchMedia("(max-width: 768px)").matches;
            bubble.style.position = 'fixed';
            if (isMobile) {
                bubble.style.top = '50%';
                bubble.style.left = '50%';
                bubble.style.transform = 'translate(-50%, -50%)';
            } else {
                const btnRect = btn.getBoundingClientRect();
                bubble.style.top = `${btnRect.bottom + 8}px`;
                bubble.style.left = `${btnRect.left}px`;
                bubble.style.transform = '';
            }
        };
        const toggle = (e) => {
            e.stopPropagation();
            wrap.classList.contains("open") ? close() : open();
        };
        btn.addEventListener("click", toggle);
        document.addEventListener("click", (e) => {
          if (!bubble.contains(e.target) && !btn.contains(e.target)) close();
        });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    };

    initHelpBubble("gsPillarHelpWrap", "gsPillarHelpBtn");
    initHelpBubble("gsOverviewHelpWrap", "gsOverviewHelpBtn");

    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error: ${esc(err.message)}</p></div>`;
  }
}
