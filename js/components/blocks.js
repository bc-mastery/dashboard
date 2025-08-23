// /js/components/blocks.js
import { esc } from "../core/utils.js";
import { IMAGES } from "../core/config.js";
import { detectMode, setABCMap } from "../core/abcMap.js";

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
  overlay = IMAGES.abcFrame, // ← uses ./assets/images/abc/ABC_map_frame.png via config
}) {
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
               data-overlay="${esc(overlay)}">
            <div class="donut"></div>
            <img class="overlay" alt="ABC overlay">
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
