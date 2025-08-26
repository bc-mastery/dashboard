// /js/pages/growth.js

import { ACCESS, APPS_SCRIPT_URL, token } from "../core/config.js";
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

/* ------------------------------ local styles for the help icon/bubble ------------------------------ */
function injectPillarHelpStylesOnce() {
  if (document.getElementById("gs-pillar-help-styles")) return;
  const style = document.createElement("style");
  style.id = "gs-pillar-help-styles";
  style.textContent = `
    /* Header line that holds the title and the help icon (keeps spacing equal to section padding) */
    #block-gs-pillars .sectionHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      position: relative;
    }

    /* Green circular ? icon */
    .gsHelpWrap {
      position: static;   /* let the bubble position against .sectionHeader */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .gsHelpBtn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #30BA80;
      color: #FFFFFF;
      border: none;
      cursor: pointer;
      font-weight: 800;
      font-size: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 2px rgba(0,0,0,.06);
    }
    .gsHelpBtn:focus-visible {
      outline: 2px solid #024D4F;
      outline-offset: 2px;
    }

    /* Tooltip bubble */
    .gsHelpBubble {
      position: absolute;
      left: 24px;              /* align with the card’s inner left padding */
      right: 0;                /* end at the icon/right edge */
      top: calc(100% + 8px);
      width: auto;
      max-width: none;         /* remove previous cap */
      background: #333333;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 10px 20px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.06);
      z-index: 1000;
      display: none;
    }
    .gsHelpBubble p {
      margin: 0 0 8px 0;
      color: #FFFFFF;
      font-size: 14px;
    }
    .gsHelpBubble p:last-child { margin-bottom: 0; }

    /* Show on hover/focus */
    .gsHelpWrap:hover .gsHelpBubble,
    .gsHelpWrap:has(.gsHelpBtn:focus) .gsHelpBubble {
      display: block;
    }
    /* Show when toggled open (mobile tap) */
    .gsHelpWrap.open .gsHelpBubble { display: block; }
  `;
  document.head.appendChild(style);
}

/* ------------------------------ main render ------------------------------ */
export async function renderGrowthTab() {
  setCurrentTab("growth");
  document.body.setAttribute("data-current-tab", "growth");
  clearUpgradeBlock();
  setTitleAndIcon("growth");

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

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
    // Growth Potential can be a fuzzy range like "~80–85%". If so, show it as-is.
    const rawGP = String(d.GS_GROWTH_POTENTIAL ?? "");
    const isRange = /~?\s*\d+(\.\d+)?\s*[–-]\s*\d+(\.\d+)?\s*%?/.test(rawGP);
    const growthPotential = toPercent(d.GS_GROWTH_POTENTIAL); // keep numeric in case it’s exact
    const growthPotentialLabel = isRange ? rawGP : pctLabel(growthPotential);

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

            <p style="margin:0; color:#333333;">
              Currently utilized business potential:
              <strong style="color:#30BA80;">${esc(pctLabel(util))}</strong>
            </p>

            <p>
              That means your business still has another
              <strong style="color:#FF0040;">
                ${esc(pctLabel(untapped))} of untapped business potential.
              </strong>
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
              <strong style="color:#30BA80">${esc(growthPotentialLabel)}</strong>
              growth.
            </p>

            <p style="color:#FF0040; font-weight:700;">
              Right now, your biggest blocker is ${esc(d.GS_BLOCKER || "")}.
            </p>


            <p class="muted">
              Besides that, below you can see how your business performs in the most critical strategic areas — a.k.a. pillars.
            </p>
          </div>
        </div>
      </section>

      <!-- Block 2 -->
      <section class="card scrollTarget" id="block-gs-pillars" style="padding-bottom: 28px;">
        <div class="sectionHeader">
          <div class="sectionTitle">4-Pillar Snapshot</div>

          <!-- Help icon + bubble -->
          <div class="gsHelpWrap" id="gsPillarHelpWrap">
            <button
              type="button"
              class="gsHelpBtn"
              id="gsPillarHelpBtn"
              aria-label="What do the percentage ranges mean?"
              aria-expanded="false"
              aria-controls="gsPillarHelpBubble"
              title="What do these percentages mean?"
            >?</button>

            <div class="gsHelpBubble" id="gsPillarHelpBubble" role="tooltip">
              <p><strong>0–60%:</strong> You don’t have an established strategy in the given area. You plan and execute based on intuition and experience—which may have gotten you this far, but to break through, you need a stable strategy and the right tactics.</p>
              <p><strong>61–80%:</strong> You have an established strategy in the given area. You know how to catch the right customers and build a prosperous business. However, you have plenty of room to improve—and with the right resources, you can multiply your outcomes.</p>
              <p><strong>81–100%:</strong> You’ve mastered the given area with a well-built strategy. If you’ve plateaued and want to level up, you need a strategic shift in this or other areas so you can break out of your current limitations.</p>
            </div>
          </div>
        </div>

        <div id="gsBars" class="gsBars" role="list" aria-label="Pillar progress"></div>
      </section>

      <!-- Block 3..7 -->
      <section class="card scrollTarget" id="block-gs-targeting">
        <div class="sectionTitle">Targeting Scan</div>
        <p class="preserve">${esc(d.GS_T_DESC || "")}</p>

        <!-- green divider -->
        <div style="height:3px; background:#30BA80; width:100%; border-radius:2px; margin:16px 0 14px;"></div>

        <!-- Targeting: universal follow-up -->
        <p style="margin:10px 0 6px; color:#024D4F; font-weight:700;">Core aspects to understand in your Targeting:</p>
        <ul style="margin:0; padding-left:18px; list-style-position:outside;">
          <li style="margin:0;">Behavioral Factors</li>
          <li style="margin:0;">Positioning</li>
          <li style="margin:0;">Macro-Behavior</li>
          <li style="margin:0;">Target Persona</li>
        </ul>
        <p style="margin-top:10px;">
          Even if you already have a clear picture of your audience, deeper insights into how they actually think and decide make your targeting sharper and more effective.
          In the full strategy, we connect these aspects directly to behavioral patterns so you know exactly who to focus on — and how to reach them.
          Want a preview? → Check the <strong>TARGETING</strong> tab.
        </p>
      </section>

      <section class="card scrollTarget" id="block-gs-offer">
        <div class="sectionTitle">Offer Scan</div>
        <p class="preserve">${esc(d.GS_O_DESC || "")}</p>

        <!-- green divider -->
        <div style="height:3px; background:#30BA80; width:100%; border-radius:2px; margin:16px 0 14px;"></div>

        <!-- Offer: universal follow-up -->
        <p style="margin:10px 0 6px; color:#024D4F; font-weight:700;">Core elements to define in your Offer:</p>
        <ul style="margin:0; padding-left:18px; list-style-position:outside;">
          <li style="margin:0;">Offer Concept</li>
          <li style="margin:0;">Features</li>
          <li style="margin:0;">Perceived Value</li>
          <li style="margin:0;">Retention Factors</li>
          <li style="margin:0;">Appearance (design &amp; visuals)</li>
          <li style="margin:0;">Price Positioning</li>
          <li style="margin:0;">Actual Price Point</li>
          <li style="margin:0;">Pricing Logic (tiers &amp; packages)</li>
          <li style="margin:0;">Friction Reductors</li>
        </ul>
        <p style="margin-top:10px;">
          Even if your offer feels well-structured today, a clear strategy makes sure every element consistently reflects your audience’s needs and motivations.
          In the full strategy, we shape your offer around how your market really thinks and buys.
          Want a snapshot? → Check the <strong>OFFER</strong> tab.
        </p>
      </section>

      <section class="card scrollTarget" id="block-gs-marketing">
        <div class="sectionTitle">Marketing Scan</div>
        <p class="preserve">${esc(d.GS_M_DESC || "")}</p>

        <!-- green divider -->
        <div style="height:3px; background:#30BA80; width:100%; border-radius:2px; margin:16px 0 14px;"></div>

        <!-- Marketing: universal follow-up -->
        <p style="margin:10px 0 6px; color:#024D4F; font-weight:700;">Core elements to align in your Marketing:</p>
        <ul style="margin:0; padding-left:18px; list-style-position:outside;">
          <li style="margin:0;">Preferred Channels</li>
          <li style="margin:0;">Decision Ladder</li>
          <li style="margin:0;">Pain Points</li>
          <li style="margin:0;">Preferred Contents</li>
          <li style="margin:0;">Communication Style</li>
          <li style="margin:0;">Buying Triggers</li>
          <li style="margin:0;">Red Flags to avoid</li>
          <li style="margin:0;">CTAs</li>
          <li style="margin:0;">Visual Elements</li>
        </ul>
        <p style="margin-top:10px;">
          Even if your marketing is already performing, a solid strategy ensures your efforts stay consistent, scalable, and in tune with how your audience reacts.
          In the full strategy, we align each element with your audience’s behavior so your message always lands.
          Want to see how this looks? → Check the <strong>MARKETING</strong> tab.
        </p>
      </section>

      <section class="card scrollTarget" id="block-gs-sales">
        <div class="sectionTitle">Sales Scan</div>
        <p class="preserve">${esc(d.GS_S_DESC || "")}</p>

        <!-- green divider -->
        <div style="height:3px; background:#30BA80; width:100%; border-radius:2px; margin:16px 0 14px;"></div>

        <!-- Sales: universal follow-up -->
        <p style="margin:10px 0 6px; color:#024D4F; font-weight:700;">Core elements to keep aligned in your Sales:</p>
        <ul style="margin:0; padding-left:18px; list-style-position:outside;">
          <li style="margin:0;">Prospecting &amp; Lead Flow</li>
          <li style="margin:0;">Sales Communication</li>
          <li style="margin:0;">Trust Building Elements</li>
          <li style="margin:0;">Cadence &amp; Processes</li>
          <li style="margin:0;">Sales Deck Elements</li>
          <li style="margin:0;">Negotiation Tactics</li>
          <li style="margin:0;">Objection Handling</li>
          <li style="margin:0;">Follow-up Methods</li>
          <li style="margin:0;">Retention Tactics</li>
        </ul>
        <p style="margin-top:10px;">
          Even if you already have these elements working well, a clear strategy keeps them consistently aligned with your actual target audience and how they think.
          In the full strategy, we map each of these directly to behavior so you can sell with precision.
          Want a preview? → Check the <strong>SALES</strong> tab.
        </p>
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
    injectPillarHelpStylesOnce(); // <-- styles for the help icon/bubble
    await ensureCharts();

    drawDonut(
      "gsDonut",
      [
        { label: "Your utilized business potential", value: util,    color: "#30BA80" },
        { label: "Your untapped business potential", value: untapped, color: "#FF0040" },
      ],
      { pieHole: 0.62, legendPosition: "none" }
    );

    drawSegmentedBars("gsBars", [
      { key: "targeting", label: "Targeting", value: tRate },
      { key: "offer",     label: "Offer",     value: oRate },
      { key: "marketing", label: "Marketing", value: mRate },
      { key: "sales",     label: "Sales",     value: sRate },
    ]);

    // --- Help icon behavior (hover via CSS; click for touch/tablet) ---
    const wrap = document.getElementById("gsPillarHelpWrap");
    const btn  = document.getElementById("gsPillarHelpBtn");

    if (wrap && btn) {
      const close = () => {
        wrap.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      };
      const toggle = (e) => {
        e.preventDefault();
        const isOpen = wrap.classList.toggle("open");
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      };

      btn.addEventListener("click", toggle, { passive: false });
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });

      // Click outside to close (mobile)
      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) close();
      });
      // Prevent section scroll tap from instantly closing after opening
      wrap.addEventListener("click", (e) => e.stopPropagation());
    }

    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${esc(err?.message || String(err))}</p></div>`;
  }
}






