// Helpers to pick first non-empty field and coerce to %
const firstNonEmpty = (obj, keys) => {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return ""; // nothing found
};

// ===== Robust extraction with fallbacks =====
// Utilized / Untapped
const avgRaw     = firstNonEmpty(d, ["GS_AVERAGE", "GS_AVERAGE_CHART"]);
const counterRaw = firstNonEmpty(d, ["GS_COUNTER_AVERAGE", "GS_COUNTER_AVERAGE_CHART"]);

// Pillars
const tRaw = firstNonEmpty(d, ["GS_T_RATE", "GS_T_CHART_VALUE", "GS_T_CHART"]);
const oRaw = firstNonEmpty(d, ["GS_O_RATE", "GS_O_CHART_VALUE", "GS_O_CHART"]);
const mRaw = firstNonEmpty(d, ["GS_M_RATE", "GS_M_CHART_VALUE", "GS_M_CHART"]);
const sRaw = firstNonEmpty(d, ["GS_S_RATE", "GS_S_CHART_VALUE", "GS_S_CHART"]);

// Growth potential
const potRaw = firstNonEmpty(d, ["GS_GROWTH_POTENTIAL"]);

// Coerce to numeric %
const avg = toPercent(avgRaw);
const counter = toPercent(counterRaw);

let util = avg, untapped = counter;
const sum = util + untapped;
if (sum > 100 && sum > 0) {
  util = Math.round((util / sum) * 10000) / 100;
  untapped = Math.round((untapped / sum) * 10000) / 100;
}

const tRate = toPercent(tRaw);
const oRate = toPercent(oRaw);
const mRate = toPercent(mRaw);
const sRate = toPercent(sRaw);
const growthPotential = toPercent(potRaw);

// Optional: surface what we used
console.table({
  brand: d.Brand,
  avgRaw, avg,
  counterRaw, counter,
  tRaw, tRate, oRaw, oRate, mRaw, mRate, sRaw, sRate,
  potRaw, growthPotential
});
