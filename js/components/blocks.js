// /js/components/blocks.js
import { esc } from "../core/utils.js";
import { IMAGES } from "../core/config.js";
import { detectMode, setABCMap } from "../core/abcMap.js";

/* --------------------------- Contextual upgrade copy --------------------------- */
export const finalBlockContent = {
  targeting: {
    growthScan: {
      title: "Targeting Strategy — Accelerator Module",
      paragraphs: [
        "Your Growth Scan provides an initial view of how your current Targeting, Offer, Marketing, and Sales align with your target audience.",
        "The 4-Pillar Accelerator Program takes these insights further by developing each area into a tailored strategy. The program is intentionally sequenced: Targeting establishes the foundation, followed by Offer, Marketing, and Sales, with each strategic layer building on the decisions developed before it.",
      ],
      emphasis: "This module is part of the Accelerator Program and is not included in the Growth Scan.",
    },
    accelerator: {
      title: "Targeting Strategy — Upcoming Module",
      paragraphs: [
        "Your Accelerator is intentionally sequenced so each strategic layer can build on the decisions and insights developed before it.",
        "Your Accelerator begins with Targeting. For now, your focus should remain on reviewing your Growth Scan and the foundations established during kickoff. At the same time, we use those insights, together with your workshop inputs, to prepare your Targeting Strategy.",
      ],
      emphasis: "Once the next strategic layer is ready, this module will unlock automatically.",
    },
  },

  offer: {
    growthScan: {
      title: "Offer Strategy — Accelerator Module",
      paragraphs: [
        "Your Growth Scan provides an initial view of how your current Targeting, Offer, Marketing, and Sales align with your target audience.",
        "The 4-Pillar Accelerator Program takes these insights further by developing each area into a tailored strategy. The program is intentionally sequenced: Targeting establishes the foundation, followed by Offer, Marketing, and Sales, with each strategic layer building on the decisions developed before it.",
      ],
      emphasis: "This module is part of the Accelerator Program and is not included in the Growth Scan.",
    },
    accelerator: {
      title: "Offer Strategy — Upcoming Module",
      paragraphs: [
        "Your Accelerator is intentionally sequenced so each strategic layer can build on the decisions and insights developed before it.",
        "For now, your focus should remain on understanding and working through your current Targeting Strategy. At the same time, we use those foundations, together with your Growth Scan and workshop inputs, to prepare your Offer Strategy.",
      ],
      emphasis: "Once the next strategic layer is ready, this module will unlock automatically.",
    },
  },

  marketing: {
    growthScan: {
      title: "Marketing Strategy — Accelerator Module",
      paragraphs: [
        "Your Growth Scan provides an initial view of how your current Targeting, Offer, Marketing, and Sales align with your target audience.",
        "The 4-Pillar Accelerator Program takes these insights further by developing each area into a tailored strategy. The program is intentionally sequenced: Targeting establishes the foundation, followed by Offer, Marketing, and Sales, with each strategic layer building on the decisions developed before it.",
      ],
      emphasis: "This module is part of the Accelerator Program and is not included in the Growth Scan.",
    },
    accelerator: {
      title: "Marketing Strategy — Upcoming Module",
      paragraphs: [
        "Your Accelerator is intentionally sequenced so each strategic layer can build on the decisions and insights developed before it.",
        "For now, your focus should remain on understanding and working through your current Offer Strategy. At the same time, we use the strategic foundations developed so far to prepare your Marketing Strategy.",
      ],
      emphasis: "Once the next strategic layer is ready, this module will unlock automatically.",
    },
  },

  sales: {
    growthScan: {
      title: "Sales Strategy — Accelerator Module",
      paragraphs: [
        "Your Growth Scan provides an initial view of how your current Targeting, Offer, Marketing, and Sales align with your target audience.",
        "The 4-Pillar Accelerator Program takes these insights further by developing each area into a tailored strategy. The program is intentionally sequenced: Targeting establishes the foundation, followed by Offer, Marketing, and Sales, with each strategic layer building on the decisions developed before it.",
      ],
      emphasis: "This module is part of the Accelerator Program and is not included in the Growth Scan.",
    },
    accelerator: {
      title: "Sales Strategy — Upcoming Module",
      paragraphs: [
        "Your Accelerator is intentionally sequenced so each strategic layer can build on the decisions and insights developed before it.",
        "For now, your focus should remain on understanding and working through your current Marketing Strategy. At the same time, we use the strategic foundations developed so far to prepare your Sales Strategy.",
      ],
      emphasis: "Once the next strategic layer is ready, this module will unlock automatically.",
    },
  },
};

/* --------------------------- Reusable ABC Map Component --------------------------- */

/**
 * Builds the HTML for the reusable ABC Map component.
 * This is the single source of truth for the map's structure.
 * @param {object} params
 * @param {string[]} params.areas - List of demand areas.
 * @param {string} [params.overlay] - Optional custom overlay image path.
 * @returns {string} The HTML string for the ABC map.
 */
function buildAbcMapHTML({ areas = [], overlay }) {
  const overlayPath = overlay || IMAGES.abcFrame;
  const mode = detectMode(areas);

  return `
    <div class="abc-wrap"
         data-mode="${esc(mode)}"
         data-areas="${areas.map(String).map(esc).join("|")}"
         data-overlay="${esc(overlayPath)}">
      <div class="donut"></div>
      <img class="overlay" src="${overlayPath}" alt="ABC overlay">
    </div>
  `;
}


/* --------------------- First block builder (Targeting-style) ------------------- */
export function buildFirstBlockHTML({
  title,
  subtitleLabel,
  subtitleValue,
  descText,
  areas,
  overlay, // optional custom overlay path
}) {
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
          ${buildAbcMapHTML({ areas, overlay })}
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

