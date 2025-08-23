// /js/core/charts.js

/** Ensure Google Charts loader is available (used elsewhere too) */
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
 * CSS/DOM donut showing "Utilized" (green) vs "Untapped" (red).
 * containerId: element id to render into
 * utilizedPct: number 0..100 (green)
 * untappedPct: number 0..100 (red)
 */
export function drawUtilizationDonut(containerId, utilizedPct, untappedPct) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const u = clamp0to100(utilizedPct);
  const r = clamp0to100(untappedPct);
  const sum = u + r || 1;
  const uNorm = (u / sum) * 100;
  const rNorm = 100 - uNorm;

  el.innerHTML = `
    <div style="
      position:relative; width:100%; height:100%;
      display:grid; place-items:center;
    ">
      <div style="
        position:relative; width:100%; height:100%; max-width:360px; aspect-ratio:1/1;
      ">
        <div aria-hidden="true" style="
          position:absolute; inset:0; border-radius:50%;
          background:
            conic-gradient(#30BA80 0 ${uNorm}%,
                           #FF0040 ${uNorm}% 100%);
          -webkit-mask: radial-gradient(circle at 50% 50%, transparent 0 38%, #000 38.5% 100%);
                  mask: radial-gradient(circle at 50% 50%, transparent 0 38%, #000 38.5% 100%);
          box-shadow: 0 6px 18px rgba(0,0,0,0.12) inset;
          transition: background 320ms ease;
        "></div>

        <div style="
          position:absolute; inset:0; display:grid; place-items:center;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          text-align:center; line-height:1.15;
        ">
          <div style="font-weight:700; font-size:22px; color:#024D4F;">Currently utilized</div>
          <div style="font-weight:900; font-size:36px; color:#30BA80;">${round1(u)}%</div>
          <div style="margin-top:6px; font-size:13px; color:#333">Untapped: <b style="color:#FF0040">${round1(r)}%</b></div>
        </div>
      </div>
    </div>
  `;

  // simple hover tooltip effect (title attribute on container)
  el.title = `Utilized: ${round1(u)}% • Untapped: ${round1(r)}%`;
}

/**
 * Segmented bars (Targeting, Offer, Marketing, Sales)
 * containerId: element id where rows are injected
 * items: [{ key, label, value }]
 */
export function drawSegmentedBars(containerId, items) {
  const root = document.getElementById(containerId);
  if (!root) return;

  const rows = (items || []).map((p) => {
    const v = clamp0to100(p.value);
    const color = barColor(v);
    return `
      <div class="gsRow" role="listitem" aria-label="${escapeHtml(p.label)} ${v}%"
           style="display:grid; grid-template-columns: 150px 1fr 56px; gap:12px; align-items:center;">
        <div class="gsLabel"><span style="font-weight:700; color:#333; letter-spacing:.2px;">${escapeHtml(p.label)}</span></div>
        <div class="gsBar v2" style="position:relative; height:16px; border-radius:999px;">
          <div class="gsTrack" style="position:absolute; inset:0; background:rgba(2,77,79,0.08); border-radius:inherit;"></div>
          <div class="gsFill" data-width="${v}%" style="position:absolute; inset:0 auto 0 0; width:0; background:${color}; border-radius:inherit; transition: width 420ms cubic-bezier(.22,.61,.36,1); box-shadow: inset 0 1px 0 rgba(255,255,255,.4);"></div>
          <div class="gsTicks" aria-hidden="true" style="position:absolute; inset:0; border-radius:inherit; pointer-events:none;
            background: repeating-linear-gradient(to right,
              transparent 0,
              transparent calc(10% - 1px),
              rgba(2,77,79,0.14) calc(10% - 1px),
              rgba(2,77,79,0.14) 10%
            );"></div>
        </div>
        <div class="gsPct" style="text-align:right; font-weight:700; color:#333;">${v}%</div>
      </div>
    `;
  }).join("");

  root.innerHTML = rows;

  // animate widths
  requestAnimationFrame(() => {
    root.querySelectorAll(".gsFill").forEach((el) => {
      const w = el.getAttribute("data-width");
      if (w) el.style.width = w;
    });
  });
}

/* --------------------------- helpers --------------------------- */
function clamp0to100(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}
function round1(n) {
  return Math.round(clamp0to100(n) * 10) / 10;
}
function barColor(v) {
  if (v <= 60) return "#333333";
  if (v <= 80) return "#024D4F";
  return "#30BA80";
}
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
