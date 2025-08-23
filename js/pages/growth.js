// /js/pages/growth.js
import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS } from "../core/config.js";
import { state } from "../core/state.js";
import { inferAccess, toDownloadLink } from "../core/utils.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";

import {
  buildGrowthIntroBlock,
  hydrateGrowthDonut,
  buildPillarSnapshotBlock,
  hydrateGrowthPillarBars,
  buildTextCard,
} from "../components/blocks.js";

/* ------------------------------ helpers ------------------------------ */
function toPct(x) {
  const n = parseFloat(String(x ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/* ------------------------------ main render ------------------------------ */
export async function renderGrowthTab() {
  // Mark active tab and clear any stale upgrade block from other pages.
  import { setCurrentTab } from "../core/state.js";
setCurrentTab("growth");
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
    state.lastApiByTab.growth = { ...api, data: { ...(api.data || {}) } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    // Pull values
    const avg = toPct(d.GS_AVERAGE);                 // MW
    const counter = toPct(d.GS_COUNTER_AVERAGE);     // MX
    const potential = String(d.GS_GROWTH_POTENTIAL ?? ""); // NA (keep as provided, e.g. "25%")

    const tRate = toPct(d.GS_T_RATE); // MF
    const oRate = toPct(d.GS_O_RATE); // MG
    const mRate = toPct(d.GS_M_RATE); // MH
    const sRate = toPct(d.GS_S_RATE); // MI

    // Build HTML
    let html = "";

    // Block #1 — Intro (LEFT donut, RIGHT copy)
    html += buildGrowthIntroBlock({
      id: "gs-intro",
      title: "Growth Scan",
      avgPct: avg,
      counterPct: counter,
      avgLabel: "Currently utilized potential",
      avgText: `${avg}%`,
      counterText: `${counter}%`,
      potentialText: String(potential || `${Math.max(0, 100 - avg)}%`),
    });

    // Block #2 — 4-Pillar Snapshot
    html += buildPillarSnapshotBlock({ id: "gs-pillar-bars", title: "4-Pillar Snapshot" });

    // Block #3–6 — Text sections
    html += buildTextCard({ id: "gs-targeting", title: "Targeting Scan",  text: d.GS_T_DESC });
    html += buildTextCard({ id: "gs-offer",     title: "Offer Scan",      text: d.GS_O_DESC });
    html += buildTextCard({ id: "gs-marketing", title: "Marketing Scan",  text: d.GS_M_DESC });
    html += buildTextCard({ id: "gs-sales",     title: "Sales Scan",      text: d.GS_S_DESC });

    // Block #7 — Summary
    html += buildTextCard({ id: "gs-summary", title: "Growth Scan Summary", text: d.GS_GAPS_SUMMARY });

    // Paint page
    contentDiv.innerHTML = html;

    // Hydrate charts
    hydrateGrowthDonut({ id: "gs-intro", avgPct: avg, counterPct: counter });
    hydrateGrowthPillarBars({
      id: "gs-pillar-bars",
      pillars: [
        { key: "targeting", label: "Targeting", value: tRate },
        { key: "offer",     label: "Offer",     value: oRate },
        { key: "marketing", label: "Marketing", value: mRate },
        { key: "sales",     label: "Sales",     value: sRate },
      ],
    });

    // Chips row
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    // Wire the Download button (always clickable on Growth).
    // Column NC: GS_OUTPUT (Drive link or direct). Convert to direct-download if it's a Drive "view" link.
    const rawOut = String(d.GS_OUTPUT || "");
    state.dynamicPdfLinks.growth = toDownloadLink(rawOut);
    updateFloatingCTA("growth");

    // Floating call button visible for GS-only users
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err?.message || err}</p></div>`;
  }
}


