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
        "This module is part of your 4-Pillar Accelerator Program and will become available later in the program sequence.",
        "The Accelerator is intentionally paced so you have time to absorb and work through the strategies already delivered, while we prepare the remaining strategic layers using the foundations developed so far, together with your Growth Scan and workshop inputs.",
      
      ],
      emphasis: "This module will unlock automatically once it reaches its place in your Accelerator sequence and the strategy is ready.",
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
        "This module is part of your 4-Pillar Accelerator Program and will become available later in the program sequence.",
        "The Accelerator is intentionally paced so you have time to absorb and work through the strategies already delivered, while we prepare the remaining strategic layers using the foundations developed so far, together with your Growth Scan and workshop inputs.",
      
      ],
      emphasis: "This module will unlock automatically once it reaches its place in your Accelerator sequence and the strategy is ready.",
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
        "This module is part of your 4-Pillar Accelerator Program and will become available later in the program sequence.",
        "The Accelerator is intentionally paced so you have time to absorb and work through the strategies already delivered, while we prepare the remaining strategic layers using the foundations developed so far, together with your Growth Scan and workshop inputs.",
      
      ],
      emphasis: "This module will unlock automatically once it reaches its place in your Accelerator sequence and the strategy is ready.",
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
        "This module is part of your 4-Pillar Accelerator Program and will become available later in the program sequence.",
        "The Accelerator is intentionally paced so you have time to absorb and work through the strategies already delivered, while we prepare the remaining strategic layers using the foundations developed so far, together with your Growth Scan and workshop inputs.",
      
      ],
      emphasis: "This module will unlock automatically once it reaches its place in your Accelerator sequence and the strategy is ready.",
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

