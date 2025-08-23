// /js/pages/growth.js
import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { ensureCharts, drawUtilizationDonut, drawSegmentedBars } from "../core/charts.js";
import { inferAccess, esc, toDownloadLink } from "../core/utils.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";
import { fetchPdfLinks } from "../services/pdf.js";

const pct = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
  return Math.max(0, Math.min(100, n));
};

export async function renderGrowthTab() {
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
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
      return;
    }

    state.lastApiByTab.growth = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    // Header brand
    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    // Numbers
    const avg = pct(d.GS_AVERAGE);              // MW
    const counter = pct(d.GS_COUNTER_AVERAGE);  // MX
    const potential = pct(d.GS_GROWTH_POTENTIAL); // NA

    const tRate = pct(d.GS_T_RATE); // MF
    const oRate = pct(d.GS_O_RATE); // MG
    const mRate = pct(d.GS_M_RATE); // MH
    const sRate = pct(d.GS_S_RATE); // MI

    // Build HTML blocks
    const block1 = `
      <div class="card scrollTarget" id="block-gs-summary">
        <div class="bfGrid">
          <!-- LEFT: Donut -->
          <div class="bfMap">
            <div id="gsDonut" style="width:min(28.5vw,315px);max-width:100%;aspect-ratio:1/1"></div>
          </div>
          <!-- RIGHT: Text -->
          <div class="bfText">
            <div class="bfTitle">Growth Scan</div>
            <p><span class="bfSub">Currently utilized potential:</span> <strong>${avg}%</strong></p>
            <p>That means you miss out on another <strong style="color:#ff0040">${counter}%</strong>. So you leave money on the table.</p>
            <p>To be accurate, with just a few strategic changes, you could achieve <strong style="color:#30ba80">${potential}%</strong> growth.</p>
            <p>Below you can see how your business performs in the most critical strategic areas (pillars).</p>
          </div>
        </div>
      </div>
    `;

    const block2 = `
      <div class="card scrollTarget" id="block-gs-pillars">
        <div class="sectionTitle">4-Pillar Snapshot</div>
        <div id="gsBars" class="gsBars" role="list" aria-label="Pillar progress"></div>
      </div>
    `;

    const block3 = d.GS_T_DESC ? `
      <div class="card scrollTarget" id="block-gs-targeting">
        <div class="sectionTitle">Targeting Scan</div>
        <p class="preserve">${esc(d.GS_T_DESC)}</p>
      </div>` : "";

    const block4 = d.GS_O_DESC ? `
      <div class="card scrollTarget" id="block-gs-offer">
        <div class="sectionTitle">Offer Scan</div>
        <p class="preserve">${esc(d.GS_O_DESC)}</p>
      </div>` : "";

    const block5 = d.GS_M_DESC ? `
      <div class="card scrollTarget" id="block-gs-marketing">
        <div class="sectionTitle">Marketing Scan</div>
        <p class="preserve">${esc(d.GS_M_DESC)}</p>
      </div>` : "";

    const block6 = d.GS_S_DESC ? `
      <div class="card scrollTarget" id="block-gs-sales">
        <div class="sectionTitle">Sales Scan</div>
        <p class="preserve">${esc(d.GS_S_DESC)}</p>
      </div>` : "";

    const block7 = d.GS_GAPS_SUMMARY ? `
      <div class="card scrollTarget" id="block-gs-summary-text">
        <div class="sectionTitle">Growth Scan Summary</div>
        <p class="preserve">${esc(d.GS_GAPS_SUMMARY)}</p>
      </div>` : "";

    // Render page
    const contentDiv2 = document.getElementById("content");
    contentDiv2.innerHTML = block1 + block2 + block3 + block4 + block5 + block6 + block7;

    // Charts
    await ensureCharts();
    drawUtilizationDonut("gsDonut", avg, counter);
    drawSegmentedBars("gsBars", [
      { key: "targeting", label: "Targeting", value: tRate },
      { key: "offer",     label: "Offer",     value: oRate },
      { key: "marketing", label: "Marketing", value: mRate },
      { key: "sales",     label: "Sales",     value: sRate },
    ]);

    // Chips & CTA
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    // Download link (always allowed for Growth)
    const out = d.GS_OUTPUT || "";
    if (out) {
      state.dynamicPdfLinks.growth = toDownloadLink(out);
      updateFloatingCTA("growth");
    } else {
      try {
        await fetchPdfLinks("growth");
        updateFloatingCTA("growth");
      } catch {}
    }

    // Floating call button for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${esc(err?.message || err)}</p></div>`;
  }
}
