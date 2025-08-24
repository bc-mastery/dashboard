// /js/pages/growth.js

import { ACCESS, APPS_SCRIPT_URL } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { esc, toDownloadLink, getTokenFromUrl } from "../core/utils.js";
import { ensureCharts, drawDonut, drawSegmentedBars, injectGsStylesOnce } from "../core/charts.js";
import {
  setTitleAndIcon,
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";

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

/** Build URL safely (adds token & extra query params). */
function buildUrlWithToken(baseUrl, token, extraParams = {}) {
  const sep = baseUrl.includes("?") ? "&" : "?";
  const qs = new URLSearchParams({ token, ...extraParams });
  return `${baseUrl}${sep}${qs.toString()}`;
}

/* ------------------------------ main render ------------------------------ */
export async function renderGrowthTab() {
  setCurrentTab("growth");
  document.body.setAttribute("data-current-tab", "growth");
  clearUpgradeBlock();
  setTitleAndIcon("growth");

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const token = getTokenFromUrl();
  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Growth Scan…</p></div>`;

  try {
    const url = buildUrlWithToken(APPS_SCRIPT_URL, token, { nocache: "1" });
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    // Cache + data
    state.lastApiByTab.growth = { ...api, data: { ...api.data } };
    const d = api.data || {};

    // Header brand
    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      brandEl.textContent = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.title = full;
    }

    // PDF link
    if (d.GS_OUTPUT) {
      state.dynamicPdfLinks.growth = toDownloadLink(String(d.GS_OUTPUT));
    }

    // Numbers
    const avg = toPercent(d.GS_AVERAGE);
    const counter = toPercent(d.GS_COUNTER_AVERAGE);
    let util = avg, untapped = counter;
    const sum = util + untapped;
    if (sum > 100 && sum > 0) {
      util = Math.round((util / sum) * 10000) / 100;
      untapped = Math.round((untapped / sum) * 10000) / 100;
    }

    const tRate = toPercent(d.GS_T_RATE);
    const oRate = toPercent(d.GS_O_RATE);
    const mRate = toPercent(d.GS_M_RATE);
    const sRate = toPercent(d.GS_S_RATE);
    const growthPotential = toPercent(d.GS_GROWTH_POTENTIAL);

    // HTML
    contentDiv.innerHTML = `
      <!-- Block 1 -->
      <section class="card scrollTarget" id="block-gs-overview">
        <div class="bfGrid" style="grid-template-columns: auto 1fr; align-items:start; gap:22px;">
          <div class="bfMap">
            <div id="gsDonut" style="width:min(44vw,420px); max-width:100%; height:320px;"></div>
          </div>
          <div class="bfText">
            <div class="bfTitle">Quick Scan</div>

            <p>
              <span class="bfSub">Currently utilized business potential:</span>
              <strong>${esc(pctLabel(util))}</strong>
            </p>

            <p>
              That means your business still has another
              <strong style="color:#FF0040">${esc(pctLabel(untapped))}</strong>
              of untapped business potential.
            </p>

           <p style="margin-bottom:0;">Your utilization rate depends on how well you know…</p>
            <ul style="margin:0; padding-left:18px; list-style-position:outside;">
              <li style="margin:0;">Who you sell to;</li>
              <li style="margin:0;">What you sell to them;</li>
              <li style="margin:0;">How you attract them;</li>
              <li style="margin:0;">And how you sell to them.</li>
            </ul>



            <p>
              But right now, you’re leaving money on the table and limiting your ability to break through.
              With only a few strategic changes, you could achieve
              <strong style="color:#30BA80">${esc(pctLabel(growthPotential))}</strong>
              growth.
            </p>

            <p>
              Right now, your biggest blocker is
              <strong style="color:#FF0040">${esc(d.GS_BLOCKER || "")}</strong>.
            </p>

            <p class="muted">
              Besides that, below you can see how your business performs in the most critical strategic areas — a.k.a. pillars.
            </p>
          </div>
        </div>
      </section>

      <!-- Block 2 -->
      <section class="card scrollTarget" id="block-gs-pillars" style="padding-bottom: 28px;">
        <div class="sectionTitle">4-Pillar Snapshot</div>
        <div id="gsBars" class="gsBars" role="list" aria-label="Pillar progress"></div>
      </section>

      <!-- Block 3..7 -->
      <section class="card scrollTarget" id="block-gs-targeting">
        <div class="sectionTitle">Targeting Scan</div>
        <p class="preserve">${esc(d.GS_T_DESC || "")}</p>
      </section>

      <section class="card scrollTarget" id="block-gs-offer">
        <div class="sectionTitle">Offer Scan</div>
        <p class="preserve">${esc(d.GS_O_DESC || "")}</p>
      </section>

      <section class="card scrollTarget" id="block-gs-marketing">
        <div class="sectionTitle">Marketing Scan</div>
        <p class="preserve">${esc(d.GS_M_DESC || "")}</p>
      </section>

      <section class="card scrollTarget" id="block-gs-sales">
        <div class="sectionTitle">Sales Scan</div>
        <p class="preserve">${esc(d.GS_S_DESC || "")}</p>
      </section>

      <section class="card scrollTarget" id="block-gs-summary">
        <div class="sectionTitle">Growth Scan Summary</div>
        <p class="preserve">${esc(d.GS_GAPS_SUMMARY || "")}</p>
      </section>
    `;

    // UI & charts
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();
    updateFloatingCTA("growth");

    injectGsStylesOnce();
    await ensureCharts();

    drawDonut(
      "gsDonut",
      [
        { label: "Your utilized business potential", value: util,    color: "#30BA80" },
        { label: "Your untapped business potential", value: untapped, color: "#FF0040 },
      ],
      { pieHole: 0.62, legendPosition: "none" }
    );

    drawSegmentedBars("gsBars", [
      { key: "targeting", label: "Targeting", value: tRate },
      { key: "offer",     label: "Offer",     value: oRate },
      { key: "marketing", label: "Marketing", value: mRate },
      { key: "sales",     label: "Sales",     value: sRate },
    ]);

    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${esc(err?.message || String(err))}</p></div>`;
  }
}








