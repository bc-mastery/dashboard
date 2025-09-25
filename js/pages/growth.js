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

// STYLES TO MAKE BUBBLE APPEAR ON TOP
function injectPillarHelpStylesOnce() {
  if (document.getElementById("gs-pillar-help-styles")) return;
  const style = document.createElement("style");
  style.id = "gs-pillar-help-styles";
  style.textContent = `
    .sectionHeader { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative; }
    .gsHelpWrap { position: static; display: inline-flex; }
    .gsHelpBtn { width: 28px; height: 28px; border-radius: 50%; background: #30BA80; color: #FFFFFF; border: none; cursor: pointer; font-weight: 800; font-size: 16px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
    .gsHelpBtn:focus-visible { outline: 2px solid #024D4F; outline-offset: 2px; }
    .gsHelpBubble { position: absolute; max-width: 520px; background: #333333; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; box-shadow: 0 10px 20px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.06); z-index: 5002; display: none; }
    .gsHelpBubble p, .gsHelpBubble ul { margin: 0 0 8px 0; color: #FFFFFF; font-size: 14px; line-height: 1.5; }
    .gsHelpBubble p:last-child, .gsHelpBubble ul:last-child { margin-bottom: 0; }
    #gsOverlay { position: fixed; inset: 0; background: rgba(2, 77, 79, 0.25); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); z-index: 5001; display: none; }
    #gsOverlay.show { display: block; }
    .gsHelpWrap.open .gsHelpBubble { display: block; }
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

    const brandEl = document.getElementById("brandName");
    if (brandEl) brandEl.textContent = d.Brand || "";
    if (d.GS_OUTPUT) state.dynamicPdfLinks.growth = toDownloadLink(String(d.GS_OUTPUT));

    const util = toPercent(d.GS_AVERAGE);
    const untapped = 100 - util;
    const growthPotentialLabel = `${toPercent(d.GS_GROWTH_POTENTIAL)}%`;

    injectGrowthOverviewStylesOnce();

    // PRESERVED HTML LAYOUT
    contentDiv.innerHTML = `
      <section class="card scrollTarget" id="block-gs-overview">
        <div class="sectionHeader" style="margin-bottom: -8px;">
            <div class="bfTitle" style="margin-bottom: 0;">Quick Scan</div>
            <div class="gsHelpWrap" id="gsOverviewHelpWrap">
                <button type="button" class="gsHelpBtn" id="gsOverviewHelpBtn" aria-label="What does this section mean?" aria-expanded="false" aria-controls="gsOverviewHelpBubble" title="What does this section mean?">?</button>
                <div class="gsHelpBubble" id="gsOverviewHelpBubble" role="tooltip">
                    <p>Every business owner sees their product, service, and customers in a certain way — but customers don’t always see things the same.</p>
                    <p>The Growth Scan compares two sides:</p>
                    <ul style="padding-left: 18px; margin-top: -4px; margin-bottom: 8px;">
                        <li>Your view: how you frame your offer, approach customers, and build trust.</li>
                        <li>Your audience’s reality: how they actually think, decide, and act.</li>
                    </ul>
                    <p>By running both through our <strong>Audience Behavior Canvas (ABC) Matrix</strong>, we reveal where your strategy and your audience are aligned — and where gaps are holding you back.</p>
                    <p style="margin-top: 16px; color:#B4FDE5; font-weight:700;"><strong>The results you see are based on this comparison: your perception vs. your actual Target Audience. Those differences show exactly what needs fixing to unlock growth.</strong></p>
                </div>
            </div>
        </div>
        <div class="bfGrid">
          <div class="bfMap"><div id="gsDonut" class="gsDonutChart"></div></div>
          <div class="bfText">
            <p style="margin:0; color:#333333;">Currently utilized business potential: <strong style="color:#30BA80;">${esc(pctLabel(util))}</strong></p>
            <p>That means your business still has another <strong style="color:#FF0040;">${esc(pctLabel(untapped))} of untapped business potential.</strong></p>
            <p style="margin-bottom:0;">Your utilization rate depends on how well you know…</p>
            <ul style="margin:0; padding-left:18px; list-style-position:outside;">
              <li style="margin:0;">Who you sell to;</li><li style="margin:0;">What you sell to them;</li>
              <li style="margin:0;">How you attract them;</li><li style="margin:0;">And how you sell to them.</li>
            </ul>
            <p>But right now, you’re leaving money on the table and limiting your ability to break through. With only a few strategic changes, you could achieve <strong style="color:#30BA80">${esc(growthPotentialLabel)}</strong> growth.</p>
            <p style="color:#FF0040; font-weight:700;">Right now, your biggest blocker is ${esc(d.GS_BLOCKER || "")}.</p>
            <p class="muted">Besides that, below you can see how your business performs in the most critical strategic areas — a.k.a. pillars.</p>
          </div>
        </div>
      </section>
      <section class="card scrollTarget" id="block-gs-pillars" style="padding-bottom: 28px;">
        <div class="sectionHeader">
          <div class="sectionTitle">4-Pillar Snapshot</div>
          <div class="gsHelpWrap" id="gsPillarHelpWrap">
            <button type="button" class="gsHelpBtn" id="gsPillarHelpBtn" aria-label="What do the percentage ranges mean?" aria-expanded="false" aria-controls="gsPillarHelpBubble" title="What do these percentages mean?">?</button>
            <div class="gsHelpBubble" id="gsPillarHelpBubble" role="tooltip">
              <p><strong>0–60%:</strong> You don’t have an established strategy in the given area. You plan and execute based on intuition and experience — which may have gotten you this far, but to break through, you need a stable strategy and the right tactics.</p>
              <p><strong>61–80%:</strong> You have an established strategy in the given area. You know how to catch the right customers and build a prosperous business. However, you have plenty of room to improve — and with the right resources, you can multiply your outcomes.</p>
              <p><strong>81–100%:</strong> You’ve mastered the given area with a well-built strategy. If you’ve plateaued and want to level up, you need a strategic shift in this or other areas so you can break out of your current limitations.</p>
              <p style="margin-top: 16px; color:#B4FDE5; font-weight:700;"><strong>Scroll down to see how to improve your Targeting, Offer, Marketing, and Sales!</strong></p>
            </div>
          </div>
        </div>
        <div id="gsBars" class="gsBars" role="list" aria-label="Pillar progress"></div>
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
    
    // DEFINITIVE BUBBLE LOGIC THAT SOLVES ALL ISSUES
    const initHelpBubble = (wrapId, btnId) => {
      const wrap = document.getElementById(wrapId);
      const btn = document.getElementById(btnId);
      const bubble = wrap.querySelector('.gsHelpBubble');
      const overlay = document.getElementById('gsOverlay');
      if (!wrap || !btn || !bubble || !overlay) return;

      const originalParent = bubble.parentElement;

      const close = () => {
        wrap.classList.remove("open");
        overlay.classList.remove("show");
        if (bubble.parentElement !== originalParent) {
            originalParent.appendChild(bubble);
            bubble.style.cssText = '';
        }
        document.removeEventListener("click", docClickHandler, true);
        document.removeEventListener("keydown", keydownHandler);
      };

      const docClickHandler = (e) => {
        if (!bubble.contains(e.target) && !btn.contains(e.target)) {
          close();
        }
      };
      
      const keydownHandler = (e) => {
        if (e.key === "Escape") close();
      };

      const open = () => {
        wrap.classList.add("open");
        overlay.classList.add("show");
        document.body.appendChild(bubble);

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

        setTimeout(() => {
          document.addEventListener("click", docClickHandler, true);
          document.addEventListener("keydown", keydownHandler);
        }, 0);
      };

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (wrap.classList.contains("open")) {
          close();
        } else {
          open();
        }
      });
    };

    initHelpBubble("gsPillarHelpWrap", "gsPillarHelpBtn");
    initHelpBubble("gsOverviewHelpWrap", "gsOverviewHelpBtn");

    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error: ${esc(err.message)}</p></div>`;
  }
}
