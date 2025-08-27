// /js/core/charts.js

/** Load Google Charts corechart package (idempotent) */
export function ensureCharts() {
  return new Promise((resolve, reject) => {
    // Already loaded?
    if (window.google && google.charts) {
      google.charts.load("current", { packages: ["corechart"] });
      google.charts.setOnLoadCallback(resolve);
      return;
    }

    // Inject loader then load
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

/** Inject once: minimal CSS for Growth segmented bars */
let __gsStylesInjected = false;
export function injectGsStylesOnce() {
  if (__gsStylesInjected) return;
  const css = `
  .gsBars { display: grid; gap: 12px; }
  .gsRow { display:grid; grid-template-columns: 150px 1fr 56px; gap:12px; align-items:center; }
  .gsLabel span{ font-weight:700; color:#333333; letter-spacing:.2px; }
  .gsPct{ text-align:right; font-weight:700; color:#333333; }
  @media (max-width: 560px){ .gsRow{ grid-template-columns: 120px 1fr 48px; } }
  .gsBar.v2 { position: relative; height: 16px; border-radius: 999px; }
  .gsBar.v2 .gsTrack { position:absolute; inset:0; background:rgba(2,77,79,0.08); border-radius: inherit; z-index:0; }
  .gsBar.v2 .gsFill  { position:absolute; inset:0 auto 0 0; width:0; background:#30BA80; border-radius:inherit; transition: width 420ms cubic-bezier(.22,.61,.36,1); box-shadow: inset 0 1px 0 rgba(255,255,255,.4); z-index:2; }
  .gsBar.v2 .gsTicks { position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:1;
    background: repeating-linear-gradient( to right, transparent 0, transparent calc(10% - 1px), rgba(2,77,79,0.14) calc(10% - 1px), rgba(2,77,79,0.14) 10% ); }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  __gsStylesInjected = true;
}

/** Render a Google Charts donut (expects ensureCharts() already awaited) */
export function drawDonut(targetId, slices = [], options = {}) {
  const el = document.getElementById(targetId);
  if (!el || !(window.google && google.visualization)) return null;

  // Build DataTable: ["Label","Value"]
  const rows = slices.map(s => [String(s.label ?? ""), Number(s.value ?? 0)]);
  const data = google.visualization.arrayToDataTable([
    ["Status", "Value"],
    ...rows,
  ]);

  // Slice colors
  const sliceOpts = {};
  slices.forEach((s, i) => {
    const color = s.color || (i === 0 ? "#30BA80" : "#D34B4B");
    sliceOpts[i] = { color };
  });

  const opts = {
    pieHole: options.pieHole ?? 0.6,
    legend: {
      position: options.legendPosition || "none",
      textStyle: { color: "#024D4F", fontSize: 12, bold: true },
    },
    pieSliceText: "none",
    backgroundColor: "transparent",
    slices: sliceOpts,
    chartArea: options.chartArea || { left: "5%", top: "5%", width: "90%", height: "90%" },
    tooltip: { text: "percentage" },
  };

  const chart = new google.visualization.PieChart(el);
  chart.draw(data, opts);
  return chart;
}

/** Render segmented “capsule” bars for the 4 pillars */
export function drawSegmentedBars(targetId, pillars = []) {
  const root = document.getElementById(targetId);
  if (!root) return;

  // Decide color by value
  const colorFor = (v) => {
    if (v <= 60) return "#FF0040";
    if (v <= 80) return "#333333";
    return "#30BA80";
  };

  root.innerHTML = pillars
    .map((p) => {
      const val = Number(p.value || 0);
      const color = colorFor(val);
      const label = String(p.label || "");
      return `
        <div class="gsRow" role="listitem" aria-label="${label} ${val}%">
          <div class="gsLabel"><span>${label}</span></div>
          <div class="gsBar v2">
            <div class="gsTrack"></div>
            <div class="gsFill" data-width="${val}%" style="background:${color}"></div>
            <div class="gsTicks" aria-hidden="true"></div>
          </div>
          <div class="gsPct">${val}%</div>
        </div>`;
    })
    .join("");

  // Animate fills
  requestAnimationFrame(() => {
    root.querySelectorAll(".gsFill").forEach((el) => {
      const w = el.getAttribute("data-width");
      el.style.width = w;
    });
  });
}



