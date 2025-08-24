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

/** Build URL safely regardless of base style (exec vs macros/echo). */
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
    console.debug("Growth fetch:", { url, token, tokenLen: token.length });

    const r = await fetch(url, { cache: "no-store" });
    const text = await r.text();
    let api;
    try {
      api = JSON.parse(text);
    } catch (e) {
      throw new Error(`Non-JSON from API. HTTP ${r.status}. First 200 chars: ${text.slice(0, 200)}`);
    }

    console.debug("Growth API response:", api);

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    state.lastApiByTab.growth = { ...api, data: { ...api.data } };
    const d = api.data || {};

    // If core GS fields are missing, surface it immediately
    const keys = Object.keys(d);
    if (!("GS_T_RATE" in d) && !("GS_AVERAGE" in d)) {
      console.warn("Growth: API returned no GS_* fields. Keys:", keys);
    }

    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    if (d.GS_OUTPUT) {
      state.dynamicPdfLinks.growth = toDownloadLink(String(d.GS_OUTPUT));
    }

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

    contentDiv.innerHTML = `
      <!-- Block 1 -->
      <section class="card scrollTarget" id="block-gs-overview">
        <div class="bfGrid" style="grid-template-columns: auto 1fr; align-items:start; gap:22px;">
          <div class="bfMap">
            <div id="gsDonut" style="width:min(44vw,420px); max-width:100%; height:320px;"></div>
          </div>
          <div class="bfText">
            <div class="bfTitle">Growth Scan</div>
            <p>
              <span class="bfSub">Currently utilized potential:</span>
              <strong>${esc(pctLabel(util))}</strong>
            </p>
            <p>
              That means you miss out on another
              <strong style="color:#FF0040">${esc(pctLabel(untapped))}</strong>
              — so you leave money on the table.
            </p>
            <p>
              To be accurate, with just a few strategic changes, you could achieve
              <strong style="color:#30BA80">${esc(pctLabel(growthPotential))}</strong>
              growth.
            </p>
            <p class="muted">
              Below you can see how your business performs in the most critical strategic areas (pillars).
            </p>
          </div>
        </div>
      </section>

      <!-- Block 2 -->
      <section class="card scrollTarget" id="block-gs-pillars">
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

    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();
    updateFloatingCTA("growth");

    injectGsStylesOnce();
    await ensureCharts();

    drawDonut("gsDonut", [
      { label: "Utilized", value: util, color: "#30BA80" },
      { label: "Untapped", value: untapped, color: "#D34B4B" },
    ], { pieHole: 0.62, legendPosition: "right" });

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
