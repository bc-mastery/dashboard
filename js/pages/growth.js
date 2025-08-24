// /js/pages/growth.js

// NOTE: We no longer import APPS_SCRIPT_URL or token.
// The token and endpoint are built centrally via utils.js.
import { ACCESS } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { esc, toDownloadLink, getTokenFromUrl, buildApiUrl } from "../core/utils.js";
import { ensureCharts, drawDonut, drawSegmentedBars, injectGsStylesOnce } from "../core/charts.js";
import {
  setTitleAndIcon,
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";

/* ------------------------------ helpers ------------------------------ */
// Accepts 65, "65", "65%", "65,3%", 0.65 → 65, etc.
function toPercent(val) {
  if (val === null || val === undefined) return 0;
  let s = String(val).trim();
  // handle european decimal comma
  s = s.replace(",", ".");
  const hasPercent = s.includes("%");
  if (hasPercent) s = s.replace("%", "");
  let n = parseFloat(s);
  if (!isFinite(n)) return 0;
  // If looks like a ratio (0..1) and wasn't explicitly a percent string, scale
  if (!hasPercent && n > 0 && n <= 1) n = n * 100;
  // clamp
  if (n < 0) n = 0;
  if (n > 100) n = 100;
  return Math.round(n * 100) / 100;
}

function pctLabel(n) {
  return `${toPercent(n)}%`;
}

/* ------------------------------ main render ------------------------------ */
export async function renderGrowthTab() {
  setCurrentTab("growth");
  document.body.setAttribute("data-current-tab", "growth");
  clearUpgradeBlock();
  setTitleAndIcon("growth");

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  // Get token robustly from URL (single source of truth)
  const token = getTokenFromUrl();
  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Growth Scan…</p></div>`;

  try {
    // Force nocache for Growth to avoid stale payloads during setup
    const url = buildApiUrl({ nocache: true });
    console.debug("Growth fetch:", { token, url, tokenLen: token.length });

    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    // Cache + access + header brand
    state.lastApiByTab.growth = { ...api, data: { ...api.data } };
    const d = api.data || {};

    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    // Growth PDF direct link (always allowed on Growth)
    if (d.GS_OUTPUT) {
      state.dynamicPdfLinks.growth = toDownloadLink(String(d.GS_OUTPUT));
    }

    // Extract + normalize Growth numbers
    const avg = toPercent(d.GS_AVERAGE);             // utilized
    const counter = toPercent(d.GS_COUNTER_AVERAGE);  // untapped
    // If both set but sum > 100, normalize proportionally
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

    // Build page HTML (Block #1 reversed layout; then bars; then text blocks)
    contentDiv.innerHTML = `
      <!-- Block 1 -->
      <section class="card scrollTarget" id="block-gs-overview">
        <div class="bfGrid" style="grid-template-columns: auto 1fr; align-items:start; gap:22px;">
          <!-- Left: donut -->
          <div class="bfMap">
            <div id="gsDonut" style="width:min(44vw,420px); max-width:100%; height:320px;"></div>
          </div>
          <!-- Right: text -->
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

    // Populate chips row and ensure CTA label/link
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();
    updateFloatingCTA("growth"); // Growth is always downloadable

    // Draw charts
    injectGsStylesOnce();
    await ensureCharts();

    drawDonut(
      "gsDonut",
      [
        { label: "Utilized", value: util,   color: "#30BA80" },
        { label: "Untapped", value: untapped, color: "#D34B4B" },
      ],
      {
        pieHole: 0.62,
        legendPosition: "right",
      }
    );

    drawSegmentedBars("gsBars", [
      { key: "targeting", label: "Targeting", value: tRate },
      { key: "offer",     label: "Offer",     value: oRate },
      { key: "marketing", label: "Marketing", value: mRate },
      { key: "sales",     label: "Sales",     value: sRate },
    ]);

    // Show floating call button only for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err?.message || err}</p></div>`;
  }
}



