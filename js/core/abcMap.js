// /js/core/abcMap.js

/* ------------------------------ Angle maps ------------------------------ */
export const B2B_ANGLES = {
  "Sales": [0, 45],
  "Business Development": [45, 90],
  "Finance": [90, 135],
  "Infrastructure": [135, 180],
  "Operative Processes": [180, 225],
  "Organizational Operation": [225, 270],
  "Organizational Development": [270, 315],
  "Marketing": [315, 360],
};

export const B2C_ANGLES = {
  "High Living": [0, 45],
  "Unique Need": [45, 90],
  "Regimen": [90, 135],
  "Critical Solution": [135, 180],
  "Necessity": [180, 225],
  "Basic Need": [225, 270],
  "Unwinding": [270, 315],
  "Fulfillment": [315, 360],
};

/* ------------------------------ Color maps ------------------------------ */
export const B2B_COLORS = {
  "Sales": "#0D685C",
  "Business Development": "#196162",
  "Finance": "#468A8A",
  "Infrastructure": "#75B6B0",
  "Operative Processes": "#A0E5D2",
  "Organizational Operation": "#93EDCC",
  "Organizational Development": "#51CB9B",
  "Marketing": "#249F74",
};

export const B2C_COLORS = {
  "High Living": "#0D685C",
  "Unique Need": "#196162",
  "Regimen": "#468A8A",
  "Critical Solution": "#75B6B0",
  "Necessity": "#A0E5D2",
  "Basic Need": "#93EDCC",
  "Unwinding": "#51CB9B",
  "Fulfillment": "#249F74",
};

/* ------------------------------ Helpers ------------------------------ */
function ciLookup(map, name) {
  if (!name) return null;
  const target = String(name).trim().toUpperCase();
  for (const k of Object.keys(map)) {
    if (k.toUpperCase() === target) return k;
  }
  return null;
}

/** Decide B2B vs B2C by which map has more recognized areas */
export function detectMode(areaList = []) {
  const b2b = areaList.filter((a) => ciLookup(B2B_ANGLES, a)).length;
  const b2c = areaList.filter((a) => ciLookup(B2C_ANGLES, a)).length;
  return b2c > b2b ? "B2C" : "B2B";
}

export const ANGLE_START = 0;

/**
 * Paints the donut segments and sets the overlay image
 * @param {HTMLElement} container - element containing .donut and .overlay
 * @param {"B2B"|"B2C"} mode
 * @param {string[]} areas - names that match keys from the selected angle map
 * @param {string} overlayPath - optional image path for overlay
 */
export function setABCMap({ container, mode = "B2B", areas = [], overlayPath } = {}) {
  if (!container) return;

  const donut = container.querySelector(".donut");
  const overlay = container.querySelector(".overlay");
  if (!donut) return;

  const ANG = mode === "B2B" ? B2B_ANGLES : B2C_ANGLES;
  const COL = mode === "B2B" ? B2B_COLORS : B2C_COLORS;

  // Normalize + dedupe
  const canonical = Array.from(
    new Set(
      (areas || [])
        .map((name) => ciLookup(ANG, name))
        .filter(Boolean)
    )
  );

  // Build segment ranges in ascending order
  const ranges = canonical
    .map((n) => ({ n, r: ANG[n], c: COL[n] }))
    .filter((x) => x.r && x.c)
    .sort((a, b) => a.r[0] - b.r[0]);

  // Compose conic-gradient stops
  const stops = [];
  let cursor = 0;
  for (const { r: [start, end], c } of ranges) {
    if (cursor < start) stops.push(`transparent ${cursor}deg ${start}deg`);
    stops.push(`${c} ${start}deg ${end}deg`);
    cursor = end;
  }
  if (cursor < 360) stops.push(`transparent ${cursor}deg 360deg`);

  donut.style.background = `conic-gradient(from ${ANGLE_START}deg, ${stops.join(",")})`;

  // Set overlay if provided (blocks.js already pre-resolves the correct path)
  if (overlay && overlayPath && overlay.src !== overlayPath) {
    overlay.src = overlayPath;

    // Helpful console if path is wrong
    overlay.onerror = () => {
      console.error("ABC overlay not found at:", overlayPath);
    };
  }
}
