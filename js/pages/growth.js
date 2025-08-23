// /js/pages/growth.js
import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { inferAccess, toDownloadLink, esc } from "../core/utils.js";
import { drawPillarBars } from "../core/charts.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";

/* ------------------------------ main render ------------------------------ */
export async function renderGrowthTab() {
  // mark tab + clear any stale upgrade block
  setCurrentTab("growth");
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
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${
      nocacheFlag ? "&nocache=1" : ""
    }`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${
        (api && api.message) || "No data found."
      }</p></div>`;
      return;
    }

    // cache + access
    state.lastApiByTab.growth = { ...api, data: { ...api.data } };
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

    // direct PDF link (from GS_OUTPUT, column NC)
    const view = d.GS_OUTPUT || "";
    if (view) {
      state.dynamicPdfLinks.growth = toDownloadLink(view);
    }

    // paint
    paintGrowth(d);

    // chips + CTA
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();
    updateFloatingCTA("growth");

    // floating call for GS-only
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${esc(
      err?.message || err
    )}</p></div>`;
  }
}

/* ------------------------------ helpers ------------------------------ */
function toNumber(v) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function paintGrowth(d) {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const utilized = toNumber(d.GS_AVERAGE);           // MW
  const untapped = toNumber(d.GS_COUNTER_AVERAGE);   // MX
  const potential = String(d.GS_GROWTH_POTENTIAL || "—"); // NA

  const tRate = toNumber(d.GS_T_RATE); // MF
  const oRate = toNumber(d.GS_O_RATE); // MG
  const mRate = toNumber(d.GS_M_RATE); // MH
  const sRate = toNumber(d.GS_S_RATE); // MI

  const tDesc = d.GS_T_DESC ? esc(d.GS_T_DESC) : "";
  const oDesc = d.GS_O_DESC ? esc(d.GS_O_DESC) : "";
  const mDesc = d.GS_M_DESC ? esc(d.GS_M_DESC) : "";
  const sDesc = d.GS_S_DESC ? esc(d.GS_S_DESC) : "";
  const summary = d.GS_GAPS_SUMMARY ? esc(d.GS_GAPS_SUMMARY) : "";

  // compute green angle for CSS donut
  const total = utilized + untapped || 1;
  const greenDeg = Math.max(0, Math.min(360, (utilized / total) * 360));

  contentDiv.innerHTML = `
    <!-- Block 1: Overview (donut left, text right) -->
    <section class="card scrollTarget" id="block-overview">
      <div class="gsGrid">
        <div class="gsDonut">
          <div class="ring" id="gsDonutCanvas" style="--gs-green:${greenDeg}deg"></div>
          <div class="hole"></div>
          <div class="tooltip">
            <div>Utilized: <span class="pos" id="gsUtilVal">${utilized}%</span></div>
            <div>Untapped: <span class="neg" id="gsUntapVal">${untapped}%</span></div>
          </div>
        </div>
        <div class="gsText">
          <div class="bfTitle">Growth Utilization</div>
          <p class="line">
            <span class="bfSub">Currently utilized potential:</span>
            <span class="pos">${utilized}%</span>
          </p>
          <p class="line">
            That means you miss out on another <span class="neg">${untapped}%</span>. So you leave money on the table.
          </p>
          <p class="line">
            To be accurate, with just a few strategic changes, you could achieve
            <span class="pos">${esc(potential)}</span> growth.
          </p>
          <p class="line">
            Below you can see how your business performs in the most critical strategic areas (pillars).
          </p>
        </div>
      </div>
    </section>

    <!-- Block 2: 4-Pillar Snapshot -->
    <section class="card scrollTarget" id="block-snapshot">
      <div class="sectionTitle">4-Pillar Snapshot</div>
      <div id="gsBars" class="gsBars" role="list" aria-label="Pillar progress"></div>
      <div style="height:16px"></div>
    </section>

    <!-- Block 3..6: Narratives -->
    <section class="card scrollTarget" id="block-targeting">
      <div class="sectionTitle">Targeting Scan</div>
      ${tDesc ? `<p class="preserve">${tDesc}</p>` : `<p class="muted">—</p>`}
    </section>

    <section class="card scrollTarget" id="block-offer">
      <div class="sectionTitle">Offer Scan</div>
      ${oDesc ? `<p class="preserve">${oDesc}</p>` : `<p class="muted">—</p>`}
    </section>

    <section class="card scrollTarget" id="block-marketing">
      <div class="sectionTitle">Marketing Scan</div>
      ${mDesc ? `<p class="preserve">${mDesc}</p>` : `<p class="muted">—</p>`}
    </section>

    <section class="card scrollTarget" id="block-sales">
      <div class="sectionTitle">Sales Scan</div>
      ${sDesc ? `<p class="preserve">${sDesc}</p>` : `<p class="muted">—</p>`}
    </section>

    <!-- Block 7: Summary -->
    <section class="card scrollTarget" id="block-summary">
      <div class="sectionTitle">Growth Scan Summary</div>
      ${summary ? `<p class="preserve">${summary}</p>` : `<p class="muted">—</p>`}
    </section>
  `;

  // Bars
  drawPillarBars("gsBars", [
    { key: "targeting", label: "Targeting", value: tRate },
    { key: "offer",     label: "Offer",     value: oRate },
    { key: "marketing", label: "Marketing", value: mRate },
    { key: "sales",     label: "Sales",     value: sRate },
  ]);
}
