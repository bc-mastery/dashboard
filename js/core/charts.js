// /js/core/charts.js

/**
 * Lazily load Google Charts (corechart).
 * Resolves when google.charts is ready.
 */
export function ensureCharts() {
  return new Promise((resolve, reject) => {
    if (window.google && google.charts) {
      google.charts.load("current", { packages: ["corechart"] });
      google.charts.setOnLoadCallback(resolve);
      return;
    }
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

/**
 * Inject shared CSS for Growth Scan bars once.
 * Safe to call multiple times.
 */
const GS_STYLE_ID = "gs-shared-styles";
export function injectGsStylesOnce() {
  if (document.getElementById(GS_STYLE_ID)) return;

  const css = `
  .gsBars { display: grid; gap: 12px; }
  .gsRow { display:grid; grid-template-columns: 150px 1fr 56px; gap:12px; align-items:center; }
  .gsLabel span{ font-weight:700; color:var(--bc-dark, #333333); letter-spacing:.2px; }
  .gsPct{ text-align:right; font-weight:700; color:var(--bc-dark, #333333); }
  @media (max-width: 560px){ .gsRow{ grid-template-columns: 120px 1fr 48px; } }

  .gsBar.v2 { position: relative; height: 16px; border-radius: 999px; }
  .gsBar.v2 .gsTrack { position:absolute; inset:0; background:rgba(2,77,79,0.08); border-radius: inherit; z-index:0; }
  .gsBar.v2 .gsFill  { position:absolute; inset:0 auto 0 0; width:0; background:var(--bc-green, #30BA80); border-radius:inherit; transition: width 420ms cubic-bezier(.22,.61,.36,1); box-shadow: inset 0 1px 0 rgba(255,255,255,.4); z-index:2; }
  .gsBar.v2 .gsTicks { position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:1;
    background: repeating-linear-gradient( to right, transparent 0, transparent calc(10% - 1px), rgba(2,77,79,0.14) calc(10% - 1px), rgba(2,77,79,0.14) 10% );
  }`;

  const style = document.createElement("style");
  style.id = GS_STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Draw the GS utilization donut: green = utilized, red = remaining.
 * Accepts numbers in 0..100 (strings like "78%" also fine).
 */
export async function drawUtilizationDonut(containerId, utilizedPct, counterPct) {
  // sanitize
  const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    const m = String(v).trim().match(/^(-?\d+(?:\.\d+)?)%?$/);
    return m ? Number(m[1]) : Number(v) || 0;
  };
  const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
  const utilized = clamp(toNum(utilizedPct));
  let remaining = clamp(toNum(counterPct));
  if (utilized + remaining === 0 || utilized + remaining > 100.0001) {
    remaining = clamp(100 - utilized);
  }

  await ensureCharts();

  const el = document.getElementById(containerId);
  if (!el) return;

  const data = google.visualization.arrayToDataTable([
    ["Status", "Value"],
    ["Utilized", utilized],
    ["Untapped", remaining],
  ]);

  const options = {
    pieHole: 0.62,
    legend: { position: "right", textStyle: { color: "#024D4F", fontSize: 12, bold: true } },
    pieSliceText: "none",
    backgroundColor: "transparent",
    tooltip: { textStyle: { fontSize: 12 } },
    slices: { 0: { color: "#30BA80" }, 1: { color: "#FF0040" } },
    chartArea: { left: 0, top: 8, width: "80%", height: "84%" },
  };

  const chart = new google.visualization.PieChart(el);
  chart.draw(data, options);
}

/**
 * Render the 4 pillar segmented bars with tick marks.
 * pillars: [{ key, label, value }, ...] with value in 0..100.
 * Uses the CSS injected by injectGsStylesOnce().
 */
export function drawSegmentedBars(containerId, pillars = []) {
  injectGsStylesOnce(); // make sure styles exist

  const el = document.getElementById(containerId);
  if (!el) return;

  const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
  const colorFor = (v) => {
    const n = clamp(v);
    if (n <= 60) return "#333333";
    if (n <= 80) return "#024D4F";
    return "#30BA80";
  };

  el.innerHTML = pillars
    .map((p) => {
      const v = clamp(p.value);
      const color = colorFor(v);
      return `
        <div class="gsRow" role="listitem" aria-label="${p.label} ${v}%">
          <div class="gsLabel"><span>${p.label}</span></div>
          <div class="gsBar v2">
            <div class="gsTrack"></div>
            <div class="gsFill" data-width="${v}%" style="background:${color}"></div>
            <div class="gsTicks" aria-hidden="true"></div>
          </div>
          <div class="gsPct">${v}%</div>
        </div>`;
    })
    .join("");

  requestAnimationFrame(() => {
    el.querySelectorAll(".gsFill").forEach((fill) => {
      const w = fill.getAttribute("data-width");
      fill.style.width = w;
    });
  });
}
