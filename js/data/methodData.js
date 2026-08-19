import { demandAreas } from "./demandAreas.js";
import { archetypes } from "./archetypes.js";
import { decision } from "./decision.js";
import { action } from "./action.js";
import { driver } from "./driver.js";
import { segment } from "./segment.js";

const ARCHETYPE_ORDER = ["IDEALIST", "OPPORTUNIST", "PERFECTIONIST", "PROTECTIONIST"];

function archetypeList(mode) {
  return ARCHETYPE_ORDER.map((key) => ({
    key,
    description: archetypes[key].description,
    motivations: archetypes[key].motivations[mode],
    hiddenFears: archetypes[key].hiddenFears,
  }));
}

export const METHOD_MATRIX = {
  B2B: {
    demandAreas: demandAreas.B2B,
    archetypes: archetypeList("B2B"),
    decision: decision.B2B,
    action,
    driver: driver.B2B,
    segment: segment.B2B,
  },
  B2C: {
    demandAreas: demandAreas.B2C,
    archetypes: archetypeList("B2C"),
    decision: decision.B2C,
    action,
    driver: driver.B2C,
    segment: segment.B2C,
  },
};
