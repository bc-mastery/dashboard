// /js/pages/growth.js

import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { toDownloadLink, esc } from "../core/utils.js";
import { drawUtilizationDonut, drawSegmentedBars } from "../core/charts.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";

export async function renderGrowthTab() {
  // Mark active tab & clear any leftover upgrade block
  setCurrentTab?.("growth");
  document.body.setAttribute("data-current-tab", "growth");
  clearUpgradeBlock();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Growth Scan…</p></div>`;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    // Cache + access
    state.lastApiByTab.growth = { ...api, data: { ...api.data } };
    const d = api.data || {};

    // Header brand text
    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    // Pre-fill direct PDF link (GS_OUTPUT)
    const view = d.GS_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.growth = toDownloadLink(view);
      updateFloatingCTA("growth"); // always enabled for Growth
    }

    // Read numbers safely
    const avg = toNum(d.GS_AVERAGE);
    const ctr = toNum(d.GS_COUNTER_AVERAGE);
    const pot = String(d.GS_GROWTH_POTENTIAL || "").trim();

    const tRate = clampPct(d.GS_T_RATE);
    const oRate = clampPct(d.GS_O_RATE);
    const mRate = clampPct(d.GS_M_RATE);
    const sRate = clampPct(d.GS_S_RATE);

    // Build page
    const html = `
      <!-- Block #1 -->
      <section class="card scrollTarget" id="block-growth-top">
        <div class="bfGrid" style="grid-template-columns:auto 1fr;">
          <div class="bfMap" style="margin-right:22px;">
            <div id="gsDonut" style="width:min(28.5vw,315px); max-width:100%; aspect-ratio:1/1;"></div>
          </div>
          <div class="bfText">
            <div class="bfTitle">Growth Scan</div>
            <p><span class="bfSub">Currently utilized potential:</span> <b>${pct(avg)}</b></p>
            <p>That means you miss out on another <b style="color:#FF0040">${pct(ctr)}</b>. So you leave money on the table..</p>
            <p>To be accurate, with just a few strategic changes, you could achieve <b style="color:#30BA80">${esc(pot)}</b> growth.</p>
            <p>Below you can see how your business performs in the most critical strategic areas (pillars.</p>
          </div>
        </div>
      </section>

      <!-- Block #2 -->
      <section class="card scrollTarget" id="block-pillar-snapshot">
        <div class="sectionTitle">4-Pillar Snapshot</div>
        <div id="gsBars" class="gsBars" role="list" aria-label="Pillar progress" style="display:grid; gap:12px;"></div>
        <div style="height:18px;"></div>
      </section>

      <!-- Block #3 -->
      <section class="card scrollTarget" id="block-targeting-scan">
        <div class="sectionTitle">Targeting Scan</div>
        ${d.GS_T_DESC ? `<p class="preserve">${esc(d.GS_T_DESC)}</p>` : `<p class="muted">No details provided.</p>`}
      </section>

      <!-- Block #4 -->
      <section class="card scrollTarget" id="block-offer-scan">
        <div class="sectionTitle">Offer Scan</div>
        ${d.GS_O_DESC ? `<p class="preserve">${esc(d.GS_O_DESC)}</p>` : `<p class="muted">No details provided.</p>`}
      </section>

      <!-- Block #5 -->
      <section class="card scrollTarget" id="block-marketing-scan">
        <div class="sectionTitle">Marketing Scan</div>
        ${d.GS_M_DESC ? `<p class="preserve">${esc(d.GS_M_DESC)}</p>` : `<p class="muted">No details provided.</p>`}
      </section>

      <!-- Block #6 -->
      <section class="card scrollTarget" id="block-sales-scan">
        <div class="sectionTitle">Sales Scan</div>
        ${d.GS_S_DESC ? `<p class="preserve">${esc(d.GS_S_DESC)}</p>` : `<p class="muted">No details provided.</p>`}
      </section>

      <!-- Block #7 -->
      <section class="card scrollTarget" id="block-growth-summary">
        <div class="sectionTitle">Growth Scan Summary</div>
        ${d.GS_GAPS_SUMMARY ? `<p class="preserve">${esc(d.GS_GAPS_SUMMARY)}</p>` : `<p class="muted">No summary provided.</p>`}
      </section>
    `;

    contentDiv.innerHTML = html;

    // Render charts
    drawUtilizationDonut("gsDonut", avg, ctr);
    drawSegmentedBars("gsBars", [
      { key: "targeting", label: "Targeting", value: tRate },
      { key: "offer",     label: "Offer",     value: oRate },
      { key: "marketing", label: "Marketing", value: mRate },
      { key: "sales",     label: "Sales",     value: sRate },
    ]);

    // Chips row
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    // Floating call button for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);

    // Make sure the CTA reflects the GS PDF (from GS_OUTPUT)
    updateFloatingCTA("growth");
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err?.message || err}</p></div>`;
  }
}

/* -------------------- helpers (local) -------------------- */
function toNum(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  // Accept "78%" or "78.4"
  const m = s.match(/^(-?\d+(?:\.\d+)?)%?$/);
  return m ? Number(m[1]) : Number(s) || 0;
}
function clampPct(v) {
  const n = toNum(v);
  return Math.max(0, Math.min(100, n));
}
function pct(n) {
  const v = clampPct(n);
  // preserve decimals if provided (1 decimal)
  const r = Math.round(v * 10) / 10;
  return `${r}${Number.isInteger(r) ? "" : ""}%`;
}
