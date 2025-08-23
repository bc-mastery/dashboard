// /js/core/charts.js

/**
 * Google Charts loader – kept for backward compatibility.
 * If nothing else uses Google Charts, you can remove this later.
 */
export function ensureCharts() {
  return new Promise((resolve, reject) => {
    // If the Google Charts loader is already present, just (re)load the package and resolve on callback.
    if (window.google && google.charts) {
      google.charts.load("current", { packages: ["corechart"] });
      google.charts.setOnLoadCallback(resolve);
      return;
    }

    // Otherwise inject the loader script once, then load the package.
    const s = document.createElement("script");
    s.src = "https://www.gstatic.com/charts/loader.js";
    s.onload = () => {
      google.charts.load("current", { packages: ["corechart"] });
      google.charts.setOnLoadCallback(resolve);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* -------------------------------------------------------------------------- */
/* Lightweight, CSS-powered chart helpers for Growth Scan (no Google Charts). */
/* -------------------------------------------------------------------------- */

const GS_STYLE_ID = "gs-charts-styles";

const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));
const pct = (n) => Math.round(Number(n) || 0);

/** Inject the minimal CSS once (keeps HTML & global CSS untouched). */
export function injectGsStylesOnce() {
  if (document.getElementById(GS_STYLE_ID)) return;
  const css = `
  /* --- Split Donut ------------------------------------------------------- */
  .gsDonutWrap{ position:relative; width:min(28.5vw, 315px); max-width:100%; aspect-ratio:1/1; }
  .gsDonutWrap .donut{
    position:absolute; inset:0;
    --outer-radius: 44%;
    background: conic-gradient(from -90deg, transparent 0 360deg);
    -webkit-mask: radial-gradient(circle at 50% 50%, #000 0 var(--outer-radius), transparent calc(var(--outer-radius) + 1px) 100%);
            mask: radial-gradient(circle at 50% 50%, #000 0 var(--outer-radius), transparent calc(var(--outer-radius) + 1px) 100%);
    transition: transform 180ms ease, background 220ms ease;
  }
  .gsDonutWrap:hover .donut{ transform: scale(1.02); }
  .gsDonutCenter{
    position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    pointer-events:none; font-weight:700; color:#024D4F;
  }
  .gsDonutCenter .big{ font-size:28px; line-height:1; }
  @media (max-width:680px){
    .gsDonutWrap{ width:min(70vw, 380px); }
    .gsDonutWrap .donut{ --outer-radius:43.5%; }
  }

  /* --- 4-Pillar Snapshot bars ------------------------------------------- */
  .gsBars { display:grid; gap:12px; }
  .gsRow  { display:grid; grid-template-columns: 150px 1fr 56px; gap:12px; align-items:center; }
  .gsLabel span{ font-weight:700; color:#333333; letter-spacing:.2px; }
  .gsPct{ text-align:right; font-weight:700; color:#333333; }
  @media (max-width:560px){ .gsRow{ grid-template-columns: 120px 1fr 48px; } }

  .gsBar{ position:relative; height:16px; border-radius:999px; }
  .gsBar .gsTrack { position:absolute; inset:0; background:rgba(2,77,79,0.08); border-radius:inherit; z-index:0; }
  .gsBar .gsFill  { position:absolute; inset:0 auto 0 0; width:0; border-radius:inherit;
                    transition: width 420ms cubic-bezier(.22,.61,.36,1); box-shadow: inset 0 1px 0 rgba(255,255,255,.4); z-index:2; }
  .gsBar .gsTicks { position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:1;
                    background: repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1px),
                    rgba(2,77,79,0.14) calc(10% - 1px), rgba(2,77,79,0.14) 10%); }
  `;
  const tag = document.createElement("style");
  tag.id = GS_STYLE_ID;
  tag.textContent = css;
  document.head.appendChild(tag);
}

/**
 * Render a two-segment donut (green vs red) into container.
 * - green = avgPct (utilized)
 * - red   = counterPct (untapped)
 * The rest (if any) is transparent.
 * @param {HTMLElement} container
 * @param {{avgPct:number, counterPct:number, green?:string, red?:string}} opts
 */
export function renderSplitDonut(container, { avgPct, counterPct, green = "#30BA80", red = "#FF0040" } = {}) {
  if (!container) return;
  injectGsStylesOnce();

  const g = clamp01((avgPct || 0) / 100) * 360;     // degrees
  const r = clamp01((counterPct || 0) / 100) * 360; // degrees
  const total = Math.min(360, g + r);

  // Build DOM once if empty
  if (!container.querySelector(".donut")) {
    container.innerHTML = `
      <div class="donut" title="Utilized: ${pct((g/360)*100)}% • Untapped: ${pct((r/360)*100)}%"></div>
      <div class="gsDonutCenter"><span class="big">${pct((g/360)*100)}%</span></div>
    `;
  } else {
    const center = container.querySelector(".gsDonutCenter .big");
    if (center) center.textContent = `${pct((g/360)*100)}%`;
  }

  const donut = container.querySelector(".donut");
  if (!donut) return;

  const stops = [
    `${green} 0 ${g}deg`,
    `${red} ${g}deg ${g + r}deg`,
    `transparent ${g + r}deg 360deg`,
  ];

  donut.style.background = `conic-gradient(from -90deg, ${stops.join(",")})`;
}

/**
 * Render the 4-Pillar Snapshot bars.
 * @param {HTMLElement} container
 * @param {{key:string,label:string,value:number}[]} pillars
 * Colors:
 *  0–60  -> #333333
 *  61–80 -> #024D4F
 *  81–100 -> #30BA80
 */
export function renderPillarBars(container, pillars = []) {
  if (!container) return;
  injectGsStylesOnce();

  const getBarColor = (v) => (v <= 60 ? "#333333" : v <= 80 ? "#024D4F" : "#30BA80");

  container.innerHTML = pillars
    .map((p) => {
      const v = Math.max(0, Math.min(100, Math.round(Number(p.value) || 0)));
      const color = getBarColor(v);
      return `
        <div class="gsRow" role="listitem" aria-label="${p.label} ${v}%">
          <div class="gsLabel"><span>${p.label}</span></div>
          <div class="gsBar">
            <div class="gsTrack"></div>
            <div class="gsFill" data-width="${v}%" style="background:${color}"></div>
            <div class="gsTicks" aria-hidden="true"></div>
          </div>
          <div class="gsPct">${v}%</div>
        </div>
      `;
    })
    .join("");

  // Animate widths after insertion
  requestAnimationFrame(() => {
    container.querySelectorAll(".gsFill").forEach((el) => {
      el.style.width = el.getAttribute("data-width") || "0%";
    });
  });
}
