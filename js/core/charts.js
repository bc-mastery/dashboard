// /js/core/charts.js

/** Load Google Charts corechart package (idempotent) */
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

/** Utility: read CSS custom property (px) from an element or its parents */
function readPxVar(el, name) {
  if (!el) return null;
  const val = getComputedStyle(el).getPropertyValue(name).trim();
  if (!val) return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

/** Render a Google Charts donut (expects ensureCharts() already awaited) */
export function drawDonut(targetId, slices = [], options = {}) {
  const el = document.getElementById(targetId);
  if (!el || !(window.google && google.visualization)) return null;

  const rows = slices.map(s => [String(s.label ?? ""), Number(s.value ?? 0)]);
  const data = google.visualization.arrayToDataTable([
    ["Status", "Value"],
    ...rows,
  ]);

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

  // ---- BUILT-IN Y NUDGE FOR THE INNER SVG (this is the key) ----
  const isMobile = window.matchMedia("(max-width: 860px)").matches;

  // Priority of sources for Y offset:
  // 1) CSS var --donut-nudge-y (px) on el or ancestors
  // 2) options.svgYOffset (px) — always applied (desktop + mobile)
  // 3) options.mobileYOffset (px) — only if mobile
  // 4) default: 0
  const varNudge =
    readPxVar(el, "--donut-nudge-y") ??
    readPxVar(el.parentElement, "--donut-nudge-y") ??
    readPxVar(el.closest ? el.closest(".abc-wrap, .bfMap, .card, body") : null, "--donut-nudge-y");

  const svgYOffset =
    (Number.isFinite(options.svgYOffset) ? Number(options.svgYOffset) : 0) +
    (isMobile ? (Number(options.mobileYOffset) || 0) : 0);

  const nudge = Number.isFinite(varNudge) ? varNudge : svgYOffset;

  const applySvgNudge = () => {
    const svg = el.querySelector("svg");
    if (svg) {
      svg.style.setProperty("transform", `translateY(${nudge}px)`, "important");
      svg.style.willChange = "transform";
      // Nudge first <g> as an extra belt-and-suspenders for some chart builds
      const g = svg.querySelector("g");
      if (g) g.style.setProperty("transform", `translateY(${nudge}px)`, "important");
    }
  };

  applySvgNudge();
  setTimeout(applySvgNudge, 80);
  setTimeout(applySvgNudge, 180);
  new MutationObserver(applySvgNudge).observe(el, { childList: true, subtree: true });

  return chart;
}

/** Render segmented “capsule” bars for the 4 pillars */
export function drawSegmentedBars(targetId, pillars = []) {
  const root = document.getElementById(targetId);
  if (!root) return;

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

  requestAnimationFrame(() => {
    root.querySelectorAll(".gsFill").forEach((el) => {
      const w = el.getAttribute("data-width");
      el.style.width = w;
    });
  });
}

/* ---------------------------------------------------------------------- */
/*  Universal helpers to keep Google Charts visually centered/aligned     */
/* ---------------------------------------------------------------------- */

/**
 * centerLockChart({ wrapper, host, extraYOffset, mobileYOffset, forceYOffset })
 * - wrapper: square container that overlay uses (e.g., .abc-wrap)
 * - host:    element that holds the chart DOM (e.g., .donut)
 * - extraYOffset: additional px nudge (added on top of measured delta)
 * - mobileYOffset: extra px applied on mobile only (default -12)
 * - forceYOffset: if provided, this value is used (in px) regardless of media
 *
 * Total vertical offset = measuredDelta + extraYOffset + nudge
 * where nudge = (forceYOffset ?? (isMobile ? mobileYOffset : 0))
 */
export function centerLockChart({
  wrapper,
  host,
  extraYOffset = 0,
  mobileYOffset = -12,
  forceYOffset = null,
}) {
  if (!wrapper || !host) return;

  const isMobile = () => window.matchMedia("(max-width: 860px)").matches;

  const setTransformImportant = (el, val) => {
    if (!el) return;
    el.style.setProperty("transform", val, "important");
    el.style.willChange = "transform";
  };

  const applyInnerNudge = (hostEl, px) => {
    const svg = hostEl.querySelector("svg");
    if (svg) setTransformImportant(svg, `translateY(${px}px)`);
    const g = svg && svg.querySelector("g");
    if (g) setTransformImportant(g, `translateY(${px}px)`);
  };

  let rafId = 0;
  const measure = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const wrapRect = wrapper.getBoundingClientRect();

      let innerRect = null;
      const svg = host.querySelector("svg");
      if (svg) innerRect = svg.getBoundingClientRect();
      if (!innerRect) {
        const canvas = host.querySelector("canvas");
        if (canvas) innerRect = canvas.getBoundingClientRect();
      }
      if (!innerRect) {
        const first = host.firstElementChild;
        if (first) innerRect = first.getBoundingClientRect();
      }
      if (!innerRect) return;

      const wrapCY  = wrapRect.top + wrapRect.height / 2;
      const innerCY = innerRect.top + innerRect.height / 2;
      const measured = wrapCY - innerCY;

      const nudge = (forceYOffset !== null)
        ? Number(forceYOffset) || 0
        : (isMobile() ? (Number(mobileYOffset) || 0) : 0);

      const totalDy = measured + (Number(extraYOffset) || 0) + nudge;

      setTransformImportant(host, `translate(-50%, calc(-50% + ${totalDy}px))`);

      // keep the same 'nudge' inside the SVG to avoid Google redraws fighting it
      applyInnerNudge(host, nudge);
    });
  };

  measure();
  setTimeout(measure, 80);
  setTimeout(measure, 180);

  const ro = new ResizeObserver(measure);
  ro.observe(wrapper);
  ro.observe(host);

  const mo = new MutationObserver(measure);
  mo.observe(host, { childList: true, subtree: true });
}

/** Nudge the rendered chart vertically by X px (affects the inner <svg>) */
export function nudgeChartY(hostEl, px = 0) {
  const apply = () => {
    const svg = hostEl && hostEl.querySelector && hostEl.querySelector("svg");
    if (svg) {
      svg.style.transform = `translateY(${px}px)`;  // negative = move up
      svg.style.willChange = "transform";
    }
  };
  apply();
  setTimeout(apply, 60);
  setTimeout(apply, 160);
  const mo = new MutationObserver(apply);
  if (hostEl) mo.observe(hostEl, { childList: true, subtree: true });
}
