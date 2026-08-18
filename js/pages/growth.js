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

function toGrowthPercent(val) {
  if (val === null || val === undefined || val === "") return 0;
  let s = String(val).trim().replace(",", ".");
  const hasPercent = s.includes("%");
  if (hasPercent) s = s.replace("%", "");
  let n = parseFloat(s);
  if (!isFinite(n)) return 0;
  // Google Sheets percentage values arrive as decimals:
  // 0.8 = 80%, 1.5 = 150%, 2 = 200%
  if (!hasPercent) n *= 100;
  if (n < 0) n = 0;
  return Math.round(n * 100) / 100;
}

function growthPercentRange(value) {
  const n = Number(value);
  if (!isFinite(n)) return "~0–5%";
  const lower = Math.floor(n / 5) * 5;
  const upper = lower + 5;
  return `~${lower}-${upper}%`;
}

const pctLabel = (n) => `${toPercent(n)}%`;

function renderStrategyOutline(title, items) {
  return `
    <p style="margin:10px 0 8px; color:#024D4F; font-weight:700;">${esc(title)}</p>
    <ul style="margin:0; padding-left:18px; list-style-position:outside;">
      ${items.map(({ name, desc }) => `
        <li style="margin:0 0 5px;">
          <strong>${esc(name)}:</strong> ${esc(desc)}
        </li>
      `).join("")}
    </ul>
  `;
}

const TARGETING_OUTLINE = [
  {
    name: "Behavioral Factors",
    desc: "Defines the demand context and behavioral characteristics shaping how your ideal customers choose.",
  },
  {
    name: "Positioning",
    desc: "Clarifies which market segment to prioritize and how those customers should be framed.",
  },
  {
    name: "Macro-behavior",
    desc: "Maps how your customers think, decide, and act across important buying situations.",
  },
  {
    name: "Target Persona",
    desc: "Turns behavioral insights into a practical portrait of the people you should prioritize.",
  },
];

const OFFER_OUTLINE = [
  {
    name: "Concept",
    desc: "Defines the core offer character customers should immediately recognize as valuable and relevant.",
  },
  {
    name: "Value Triggers",
    desc: "Identifies the qualities your offer must represent to feel attractive and worth choosing.",
  },
  {
    name: "Features and Services",
    desc: "Translates expected value into concrete services, deliverables, tools, support, and customer experiences.",
  },
  {
    name: "Retention Factors",
    desc: "Defines what must remain valuable over time to drive renewal, expansion, and loyalty.",
  },
  {
    name: "Appearance",
    desc: "Aligns presentation, naming, packaging, and visual polish with the offer’s intended perception.",
  },
  {
    name: "Pricing",
    desc: "Structures price, packages, payment logic, and friction around value and buyer decision-making.",
  },
];

const MARKETING_OUTLINE = [
  {
    name: "Concept",
    desc: "Defines the overall marketing approach needed to match how your customers evaluate value.",
  },
  {
    name: "Marketing Foundations",
    desc: "Clarifies marketing’s strategic role in creating awareness, relevance, credibility, and buying momentum.",
  },
  {
    name: "Objectives",
    desc: "Turns the strategy into clear marketing priorities linked to measurable business progress.",
  },
  {
    name: "Differentiation",
    desc: "Defines meaningful distinctions that make your business easier to recognize, understand, and prefer.",
  },
  {
    name: "Engagement Triggers",
    desc: "Identifies themes and signals most likely to capture attention and prompt further engagement.",
  },
  {
    name: "Messaging Pillars",
    desc: "Establishes recurring communication themes that reinforce positioning, relevance, value, and customer preference.",
  },
  {
    name: "Tone of Voice",
    desc: "Defines how your business should sound to remain credible, recognizable, and audience-aligned.",
  },
  {
    name: "Customer Journey",
    desc: "Maps marketing’s role as customers progress from awareness through decision and retention.",
  },
  {
    name: "Lead Preparation",
    desc: "Defines how marketing should nurture, qualify, and prepare prospects before sales engagement begins.",
  },
];

const SALES_OUTLINE = [
  {
    name: "Concept",
    desc: "Defines the overarching sales approach best aligned with how your customers make decisions.",
  },
  {
    name: "Buying Vision",
    desc: "Clarifies what prospects must see and believe before moving forward feels right.",
  },
  {
    name: "Sales Cadence",
    desc: "Structures buyer progression from first engagement to commitment around readiness and confidence.",
  },
  {
    name: "Relationship Building",
    desc: "Defines how trust and buyer relationships should evolve throughout every sales stage.",
  },
  {
    name: "Trust Drivers",
    desc: "Identifies the evidence and signals that increase confidence and reduce perceived buying risk.",
  },
  {
    name: "Decision Friction",
    desc: "Reveals doubts and risks blocking commitment, then structures how Sales should address them.",
  },
  {
    name: "Sales Assets",
    desc: "Specifies the materials and tools needed to support consideration and buyer progression.",
  },
];

/* ------------------------------ local styles ------------------------------ */
function injectGrowthOverviewStylesOnce() {
  if (document.getElementById("gs-overview-styles")) return;
  const style = document.createElement("style");
  style.id = "gs-overview-styles";
  style.textContent = `
    #block-gs-overview .bfGrid{
      display:grid;
      grid-template-columns:1fr 2fr;
      align-items:start;
      gap:22px;
    }
    #block-gs-overview .bfMap{
      position:relative;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    #block-gs-overview #gsDonut{
      width:100%;
      max-width:360px;
      height:360px;
    }
    .donut-center-text{
      position:absolute;
      top:50%;
      left:50%;
      transform:translate(-50%, -50%);
      text-align:center;
      color:#BABABA;
      font-weight:300;
      font-size:15px;
      line-height:1.3;
      pointer-events:none;
      z-index:10;
    }
    @media (max-width:860px){
      #block-gs-overview .bfGrid{
        grid-template-columns:1fr;
        gap:16px;
      }
      #block-gs-overview #gsDonut{
        max-width:300px;
        height:300px;
        margin:0 auto;
      }
      .donut-center-text{font-size:13px;}
    }
  `;
  document.head.appendChild(style);
}

function injectPillarHelpStylesOnce() {
  if (document.getElementById("gs-pillar-help-styles")) return;
  const style = document.createElement("style");
  style.id = "gs-pillar-help-styles";
  style.textContent = `
    #block-gs-pillars .sectionHeader, #block-gs-overview .sectionHeader{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      position:relative;
    }
    .gsHelpWrap{
      position:static;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      line-height:1;
    }
    .gsHelpBtn{
      width:28px;
      height:28px;
      border-radius:50%;
      background:#30BA80;
      color:#FFFFFF;
      border:none;
      cursor:pointer;
      font-weight:800;
      font-size:16px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 1px 2px rgba(0,0,0,.06);
    }
    .gsHelpBtn:focus-visible{
      outline:2px solid #024D4F;
      outline-offset:2px;
    }
    .gsHelpBubble{
      position:absolute;
      left:24px;
      right:0;
      top:calc(100% + 8px);
      width:auto;
      max-width:none;
      background:#333333;
      border:1px solid #E5E7EB;
      border-radius:12px;
      padding:12px 14px;
      box-shadow:0 10px 20px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.06);
      z-index:4002;
      display:none;
    }
    .gsHelpBubble p, .gsHelpBubble ul, .gsHelpBubble ol{
      margin:0 0 8px 0;
      color:#FFFFFF;
      font-size:14px;
      line-height:1.5;
      font-family:'Inter', sans-serif;
    }
    .gsHelpBubble p:last-child, .gsHelpBubble ul:last-child, .gsHelpBubble ol:last-child{margin-bottom:0;}
    .gsHelpWrap.open .gsHelpBubble{display:block;}
    #gsOverlay{
      position:fixed;
      inset:0;
      background:rgba(2,77,79,.25);
      backdrop-filter:blur(2px);
      -webkit-backdrop-filter:blur(2px);
      z-index:4001;
      display:none;
    }
    #gsOverlay.show{display:block;}
    .gsHelpCloseBtn{
      display:none;
      position:absolute;
      top:8px;
      right:8px;
      width:32px;
      height:32px;
      background:transparent;
      border:none;
      color:white;
      font-size:24px;
      line-height:1;
      cursor:pointer;
      font-weight:bold;
    }
    @media (max-width:768px){
      .gsHelpBubble{
        position:fixed;
        top:50%;
        left:50%;
        transform:translate(-50%, -50%);
        width:calc(100% - 40px);
        max-width:400px;
        max-height:80vh;
        overflow-y:auto;
        padding:24px;
      }
      .gsHelpCloseBtn{display:block;}
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

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Growth Scan…</p></div>`;

  try {
    const api = await fetchDashboardData(forceRefresh);

    state.lastApiByTab.growth = { ...api, data: { ...api.data } };
    const d = api.data || {};

    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      brandEl.textContent = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.title = full;
    }

    if (d.GS_OUTPUT) {
      state.dynamicPdfLinks.growth = toDownloadLink(String(d.GS_OUTPUT));
    }

    const avg = toPercent(d.GS_AVERAGE);
    const counter = toPercent(d.GS_COUNTER_AVERAGE);
    let util = avg;
    let untapped = counter;
    const sum = util + untapped;
    if (sum > 100 && sum > 0) {
      util = Math.round((util / sum) * 10000) / 100;
      untapped = Math.round((untapped / sum) * 10000) / 100;
    }

    const tRate = toPercent(d.GS_T_RATE);
    const oRate = toPercent(d.GS_O_RATE);
    const mRate = toPercent(d.GS_M_RATE);
    const sRate = toPercent(d.GS_S_RATE);

    const growthPotential = toGrowthPercent(d.GS_GROWTH_POTENTIAL);
    const growthPotentialLabel = growthPercentRange(growthPotential);

    injectGrowthOverviewStylesOnce();

    contentDiv.innerHTML = `
      <section class="card scrollTarget" id="block-gs-overview">
        <div class="sectionHeader" style="margin-bottom:-8px;">
          <div class="bfTitle" style="margin-bottom:0;">Quick Scan</div>
          <div class="gsHelpWrap" id="gsOverviewHelpWrap">
            <button
              type="button"
              class="gsHelpBtn"
              id="gsOverviewHelpBtn"
              aria-label="What does this section mean?"
              aria-expanded="false"
              aria-controls="gsOverviewHelpBubble"
              title="What does this section mean?"
            >?</button>

            <div class="gsHelpBubble" id="gsOverviewHelpBubble" role="tooltip">
              <button type="button" class="gsHelpCloseBtn" aria-label="Close">&times;</button>
              <p>Every business owner sees their product, service, and customers in a certain way — but customers don’t always see things the same.</p>
              <p>The Growth Scan compares two sides:</p>
              <ul style="padding-left:18px; margin-top:-4px; margin-bottom:8px;">
                <li>Your view: how you frame your offer, approach customers, and build trust.</li>
                <li>Your audience’s reality: how they actually think, decide, and act.</li>
              </ul>
              <p>By running both through our <strong>Audience Behavior Canvas (ABC) Matrix</strong>, we reveal where your strategy and your audience are aligned — and where gaps are holding you back.</p>
              <p style="margin-top:16px; color:#B4FDE5; font-weight:700;">
                <strong>The results you see are based on this comparison: your perception vs. your actual Target Audience. Those differences show exactly what needs fixing to unlock growth.</strong>
              </p>
            </div>
          </div>
        </div>

        <div class="bfGrid">
          <div class="bfMap">
            <div id="gsDonut" class="gsDonutChart"></div>
            <div class="donut-center-text">Hover<br>or click on<br>the different<br>sections!</div>
          </div>

          <div class="bfText">
            <p style="margin:0; color:#333333;">
              Currently utilized business potential:
              <strong style="color:#30BA80;">${esc(pctLabel(util))}</strong>
            </p>

            <p>
              That means your business still has another
              <strong style="color:#FF0040;">${esc(pctLabel(untapped))} of untapped business potential.</strong>
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

      <section class="card scrollTarget" id="block-gs-pillars" style="padding-bottom:28px;">
        <div class="sectionHeader">
          <div class="sectionTitle">4-Pillar Snapshot</div>

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
              <button type="button" class="gsHelpCloseBtn" aria-label="Close">&times;</button>
              <p><strong>0–60%:</strong> You don’t have an established strategy in the given area. You plan and execute based on intuition and experience — which may have gotten you this far, but to break through, you need a stable strategy and the right tactics.</p>
              <p><strong>61–80%:</strong> You have an established strategy in the given area. You know how to catch the right customers and build a prosperous business. However, you have plenty of room to improve — and with the right resources, you can multiply your outcomes.</p>
              <p><strong>81–100%:</strong> You’ve mastered the given area with a well-built strategy. If you’ve plateaued and want to level up, you need a strategic shift in this or other areas so you can break out of your current limitations.</p>
              <p style="margin-top:16px; color:#B4FDE5; font-weight:700;">
                <strong>Scroll down to see how to improve your Targeting, Offer, Marketing, and Sales!</strong>
              </p>
            </div>
          </div>
        </div>

        <div id="gsBars" class="gsBars" role="list" aria-label="Pillar progress"></div>
      </section>

      <section class="card scrollTarget" id="block-gs-targeting">
        <div class="sectionTitle">Targeting Scan</div>
        <p class="preserve">${esc(d.GS_T_DESC || "")}</p>
        <div style="height:3px; background:#30BA80; width:100%; border-radius:2px; margin:16px 0 14px;"></div>
        ${renderStrategyOutline("Inside the full Targeting Strategy:", TARGETING_OUTLINE)}
        <p style="margin-top:10px;">
          Even if you already have a clear picture of your audience, deeper insights into how they actually think and decide make your targeting sharper and more effective.
          In the full strategy, we connect these aspects directly to behavioral patterns so you know exactly who to focus on — and how to reach them.
          Want a preview? → Check the <strong>TARGETING</strong> tab.
        </p>
      </section>

      <section class="card scrollTarget" id="block-gs-offer">
        <div class="sectionTitle">Offer Scan</div>
        <p class="preserve">${esc(d.GS_O_DESC || "")}</p>
        <div style="height:3px; background:#30BA80; width:100%; border-radius:2px; margin:16px 0 14px;"></div>
        ${renderStrategyOutline("Inside the full Offer Strategy:", OFFER_OUTLINE)}
        <p style="margin-top:10px;">
          Even if your offer feels well-structured today, a clear strategy makes sure every element consistently reflects your audience’s needs and motivations.
          In the full strategy, we shape your offer around how your market really thinks and buys.
          Want a snapshot? → Check the <strong>OFFER</strong> tab.
        </p>
      </section>

      <section class="card scrollTarget" id="block-gs-marketing">
        <div class="sectionTitle">Marketing Scan</div>
        <p class="preserve">${esc(d.GS_M_DESC || "")}</p>
        <div style="height:3px; background:#30BA80; width:100%; border-radius:2px; margin:16px 0 14px;"></div>
        ${renderStrategyOutline("Inside the full Marketing Strategy:", MARKETING_OUTLINE)}
        <p style="margin-top:10px;">
          Even if your marketing is already performing, a solid strategy ensures your efforts stay consistent, scalable, and in tune with how your audience reacts.
          In the full strategy, we align each element with your audience’s behavior so your message always lands.
          Want to see how this looks? → Check the <strong>MARKETING</strong> tab.
        </p>
      </section>

      <section class="card scrollTarget" id="block-gs-sales">
        <div class="sectionTitle">Sales Scan</div>
        <p class="preserve">${esc(d.GS_S_DESC || "")}</p>
        <div style="height:3px; background:#30BA80; width:100%; border-radius:2px; margin:16px 0 14px;"></div>
        ${renderStrategyOutline("Inside the full Sales Strategy:", SALES_OUTLINE)}
        <p style="margin-top:10px;">
          Even if you already have these elements working well, a clear strategy keeps them consistently aligned with your actual target audience and how they think.
          In the full strategy, we map each of these directly to behavior so you can sell with precision.
          Want a preview? → Check the <strong>SALES</strong> tab.
        </p>
      </section>

      <section class="card scrollTarget" id="block-gs-summary">
        <div class="sectionTitle">Strategic Summary</div>
        <p class="preserve">${esc(d.GS_GAPS_SUMMARY || "")}</p>
      </section>
    `;

    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();
    updateFloatingCTA("growth");

    injectGsStylesOnce();
    injectPillarHelpStylesOnce();
    await ensureCharts();

    drawDonut(
      "gsDonut",
      [
        { label: "Your utilized business potential", value: util, color: "#30BA80" },
        { label: "Your untapped business potential", value: untapped, color: "#FF0040" },
      ],
      { pieHole: 0.62, legendPosition: "none" }
    );

    drawSegmentedBars("gsBars", [
      { key: "targeting", label: "Targeting", value: tRate },
      { key: "offer", label: "Offer", value: oRate },
      { key: "marketing", label: "Marketing", value: mRate },
      { key: "sales", label: "Sales", value: sRate },
    ]);

    let overlay = document.getElementById("gsOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "gsOverlay";
      document.body.appendChild(overlay);
    }

    const initHelpBubble = (wrapId, btnId) => {
      const wrap = document.getElementById(wrapId);
      const btn = document.getElementById(btnId);
      if (!wrap || !btn || !overlay) return;

      const card = wrap.closest(".card");
      const bubble = wrap.querySelector(".gsHelpBubble");
      const closeBtn = bubble ? bubble.querySelector(".gsHelpCloseBtn") : null;

      const close = () => {
        wrap.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        overlay.classList.remove("show");
        document.body.style.removeProperty("overflow");
        if (card) card.style.zIndex = "";
      };

      const open = () => {
        wrap.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        overlay.classList.add("show");
        document.body.style.overflow = "hidden";
        if (card) card.style.zIndex = "4003";
      };

      const toggle = (e) => {
        e.preventDefault();
        wrap.classList.contains("open") ? close() : open();
      };

      btn.addEventListener("click", toggle, { passive: false });
      if (closeBtn) closeBtn.addEventListener("click", close);

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });

      document.addEventListener("click", (e) => {
        if (bubble && !bubble.contains(e.target) && !btn.contains(e.target)) close();
      });

      overlay.addEventListener("click", close);
    };

    initHelpBubble("gsPillarHelpWrap", "gsPillarHelpBtn");
    initHelpBubble("gsOverviewHelpWrap", "gsOverviewHelpBtn");

    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${esc(err?.message || String(err))}</p></div>`;
  }
}
