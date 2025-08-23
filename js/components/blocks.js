// /js/components/blocks.js
import { esc } from "../core/utils.js";
import { IMAGES } from "../core/config.js";
import { detectMode, setABCMap } from "../core/abcMap.js";
import { injectGsStylesOnce, renderSplitDonut, renderPillarBars } from "../core/charts.js";

/* --------------------------- Contextual upgrade copy --------------------------- */
export const finalBlockContent = {
  targeting: {
    title: "Your Audience Map — Only Partially Revealed",
    text: `Right now, you’re seeing the first layer of your Audience profile.
In full form, your Audience Map connects behavioral drivers, decision triggers, and segmentation patterns — the factors that make your strategy resonate with the right people.
Without these insights, your targeting may rely on assumptions rather than behavioral alignment — often the difference between interest and conversion.

See your complete Audience Map — order the 4-Pillar Business Strategy or book a quick strategic review call to discuss your next steps.`,
  },
  offer: {
    title: "Your Offer’s Strategic Blueprint — Only the First Piece",
    text: `You’re seeing the first strategic layer of your Offer.
The complete blueprint defines value positioning, retention levers, emotional anchors, and pricing psychology — the combination that makes an offer irresistible to your ideal audience.
Without these details, your offer may be clear, but not compelling enough to outshine alternatives.

View your full Offer Blueprint — upgrade to the 4-Pillar Business Strategy or schedule a short strategy call to explore the missing pieces.`,
  },
  marketing: {
    title: "Your Marketing Framework — Just the Starting Point",
    text: `This is the foundation of your Marketing Strategy.
The complete framework reveals channel prioritization, content triggers, campaign timing, and message sequencing — a precision map for getting the right message to the right people at the right time.
Without it, your marketing may reach people — but miss the critical moments when they’re most ready to engage.

Access your complete Marketing Framework — get the 4-Pillar Business Strategy or book a quick consultation to see the full plan in action.`,
  },
  sales: {
    title: "Your Sales Strategy — First Step in the Journey",
    text: `You’re seeing the opening layer of your Sales Strategy.
The complete view includes objection handling, relationship progression, persuasion timing, and follow-up psychology — the tools to move prospects from interested to committed.
Without these, sales conversations risk stalling before they reach a decision point.

Unlock your full Sales Strategy — order the 4-Pillar Business Strategy or reserve a strategic call to review the complete journey.`,
  },
};

/* --------------------- First block builder (Targeting-style) ------------------- */
export function buildFirstBlockHTML({
  title,
  subtitleLabel,
  subtitleValue,
  descText,
  areas,
  overlay, // optional custom overlay path
}) {
  // Single source of truth (Cloudflare is case-sensitive)
  const overlayPath = overlay || IMAGES.abcFrame;

  const areaList = Array.isArray(areas) ? areas : [];
  const mode = detectMode(areaList);
  const safeVal = (subtitleValue && String(subtitleValue).trim()) || "—";
  const subLine = `<p><span class="bfSub">${esc(subtitleLabel)}:</span> ${esc(safeVal)}</p>`;
  const descLine = descText ? `<p class="bfDesc preserve">${esc(descText)}</p>` : "";

  return `
    <div class="card scrollTarget" id="block-first">
      <div class="bfGrid">
        <div class="bfText">
          <div class="bfTitle">${esc(title)}</div>
          ${subLine}
          ${descLine}
        </div>
        <div class="bfMap">
          <div class="abc-wrap"
               data-mode="${esc(mode)}"
               data-areas="${areaList.map(String).map(esc).join("|")}"
               data-overlay="${esc(overlayPath)}">
            <div class="donut"></div>
            <img class="overlay" src="${overlayPath}" alt="ABC overlay">
          </div>
        </div>
      </div>
    </div>
  `;
}

/* --------------- Activate any ABC maps that were just injected --------------- */
export function hydrateABCMaps() {
  document.querySelectorAll(".abc-wrap").forEach((container) => {
    const m = (container.dataset.mode || "B2B").toUpperCase();
    const a = (container.dataset.areas || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    const overlayPath = container.dataset.overlay || IMAGES.abcFrame;
    setABCMap({ container, mode: m, areas: a, overlayPath });
  });
}

/* -----------------------------------------------------------------------------
 *                           G R O W T H   S C A N
 * -------------------------------------------------------------------------- */

/**
 * Block #1 (Growth) — split donut on the LEFT, text on the RIGHT.
 * Values are passed in as percentages (0–100).
 */
export function buildGrowthIntroBlock({
  id = "gs-intro",
  title = "Growth Scan",
  avgPct = 0,
  counterPct = 0,
  avgLabel = "Currently utilized potential",
  avgText = "",             // e.g., "65%"
  counterText = "",         // e.g., "35%"
  potentialText = "",       // e.g., "25%"
} = {}) {
  // Ensure our lightweight chart CSS is available
  injectGsStylesOnce();

  const avgStrong = `<strong>${esc(avgText)}</strong>`;
  const missStrong = `<strong style="color:#FF0040">${esc(counterText)}</strong>`;
  const potStrong = `<strong style="color:#30BA80">${esc(potentialText)}</strong>`;

  return `
    <div class="card scrollTarget" id="block-${esc(id)}">
      <div class="bfGrid">
        <!-- LEFT: donut -->
        <div class="bfMap">
          <div class="gsDonutWrap" id="${esc(id)}-donut"></div>
        </div>

        <!-- RIGHT: copy -->
        <div class="bfText">
          <div class="bfTitle">${esc(title)}</div>
          <p><span class="bfSub">${esc(avgLabel)}:</span> ${avgStrong}</p>
          <p class="bfDesc">That means you miss out on another ${missStrong}. So you leave money on the table..</p>
          <p class="bfDesc">To be accurate, with just a few strategic changes, you could achieve ${potStrong} growth.</p>
          <p class="bfDesc">Below you can see how your business performs in the most critical strategic areas (pillars).</p>
        </div>
      </div>
    </div>
  `;
}

/** Hydrate the Growth split donut after insertion. */
export function hydrateGrowthDonut({ id = "gs-intro", avgPct = 0, counterPct = 0 } = {}) {
  const container = document.getElementById(`${id}-donut`);
  if (!container) return;
  renderSplitDonut(container, { avgPct, counterPct });
}

/**
 * Block #2 (Growth) — 4-Pillar Snapshot container (bars).
 * The bars are rendered by hydrateGrowthPillarBars().
 */
export function buildPillarSnapshotBlock({ id = "gs-pillar-bars", title = "4-Pillar Snapshot" } = {}) {
  injectGsStylesOnce();
  return `
    <div class="card scrollTarget" id="block-${esc(id)}">
      <div class="sectionTitle">${esc(title)}</div>
      <div id="${esc(id)}" class="gsBars" role="list" aria-label="Pillar progress"></div>
    </div>
  `;
}

/** Hydrate/animate the 4-Pillar Snapshot bars. */
export function hydrateGrowthPillarBars({
  id = "gs-pillar-bars",
  pillars = [], // [{key,label,value}]
} = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  renderPillarBars(el, pillars);
}

/**
 * Simple text block (used for GS section write-ups).
 */
export function buildTextCard({ id, title, text }) {
  return `
    <div class="card scrollTarget" id="${esc(id)}">
      <div class="sectionTitle">${esc(title)}</div>
      <p class="preserve">${esc(text || "")}</p>
    </div>
  `;
}
