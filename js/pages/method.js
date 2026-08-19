import { state, setCurrentTab } from "../core/state.js";
import { esc } from "../core/utils.js";
import { clearUpgradeBlock, populateBlockTabsFromPage, toggleFloatingCallBtn, updateFloatingCTA } from "../core/ui.js";
import { fetchDashboardData } from "../services/api.js";
import { METHOD_MATRIX } from "../data/methodData.js";

const LABEL_LINES = {
  "HIGHLY EMOTIONAL": ["Highly", "Emotional"],
  "EMOTIONAL": ["Emotional"],
  "RATIONAL": ["Rational"],
  "HIGHLY RATIONAL": ["Highly", "Rational"],
  "HIGHLY PROACTIVE": ["Highly", "Proactive"],
  "PROACTIVE": ["Proactive"],
  "REACTIVE": ["Reactive"],
  "HIGHLY REACTIVE": ["Highly", "Reactive"],
  "HIGH-END PREMIUM": ["High-End", "Premium"],
  "REASONABLE PREMIUM": ["Reasonable", "Premium"],
  "ELEVATED MASS": ["Elevated", "Mass"],
  "MAINSTREAM MASS": ["Mainstream", "Mass"],
  "GAIN": ["Gain"],
  "PAIN": ["Pain"],
};

function normalize(value) {
  return String(value ?? "").replace(/[{}]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}

function getSpreadsheetValue(data, columnName) {
  if (!data) return "";
  const target = normalize(columnName);
  for (const key of Object.keys(data)) {
    if (normalize(key) === target) return String(data[key] ?? "").trim();
  }
  return "";
}

function splitClientValues(raw) {
  return String(raw ?? "")
    .split(/\s*(?:\||;|,|\/|\+|&|\n|\band\b)\s*/i)
    .map(normalize)
    .filter(Boolean);
}

function hasClientValue(raw, key) {
  return splitClientValues(raw).includes(normalize(key));
}

function inferMode(data) {
  const raw = getSpreadsheetValue(data, "D_AREA");
  if (METHOD_MATRIX.B2C.demandAreas.some((item) => hasClientValue(raw, item.key))) return "B2C";
  return "B2B";
}

function findItem(mode, section, value) {
  return (METHOD_MATRIX[mode]?.[section] || []).find((item) => normalize(item.key) === normalize(value)) || null;
}

function firstClientMatch(mode, section, raw) {
  return (METHOD_MATRIX[mode]?.[section] || []).find((item) => hasClientValue(raw, item.key)) || null;
}

function segmentLabel(key) {
  return (LABEL_LINES[normalize(key)] || [String(key)])
    .map((line) => `<span>${esc(line)}</span>`)
    .join("");
}

function markerHTML(isClient) {
  return isClient
    ? `<span class="methodAudienceMarker"><span class="methodAudienceDot"></span><span class="methodAudienceText">Your audience</span></span>`
    : "";
}

function makeSegmentedControl({ items, selectedKey, clientRaw, mode, section }) {
  return `
    <div class="methodSegmented" role="radiogroup" style="--segment-count:${Math.max(items.length, 1)}">
      ${items.map((item) => {
        const selected = normalize(item.key) === normalize(selectedKey);
        const isClient = hasClientValue(clientRaw, item.key);
        return `
          <button type="button"
            class="methodSegment ${selected ? "is-selected" : ""}"
            data-method-section="${esc(section)}"
            data-method-value="${esc(item.key)}"
            data-method-mode="${esc(mode)}"
            role="radio" aria-checked="${selected ? "true" : "false"}">
            <span class="methodSegmentLabel">${segmentLabel(item.key)}</span>
            ${markerHTML(isClient)}
          </button>`;
      }).join("")}
    </div>`;
}

function polarPoint(cx, cy, radius, angleDeg) {
  const angle = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function wedgePath(startDeg, endDeg, radius = 46, cx = 50, cy = 50) {
  const start = polarPoint(cx, cy, radius, startDeg);
  const end = polarPoint(cx, cy, radius, endDeg);
  return `M ${cx} ${cy} L ${start.x.toFixed(4)} ${start.y.toFixed(4)} A ${radius} ${radius} 0 0 1 ${end.x.toFixed(4)} ${end.y.toFixed(4)} Z`;
}

function wheelLegend(hasClient) {
  return hasClient
    ? `<div class="methodWheelLegend"><span class="methodAudienceDot"></span>Your audience</div>`
    : "";
}

function makeDemandWheel({ mode, selectedKey, clientRaw }) {
  const items = METHOD_MATRIX[mode].demandAreas;
  const hasClient = items.some((item) => hasClientValue(clientRaw, item.key));
  return `
    <div class="methodWheelWrap">
      <svg class="methodWheel" viewBox="0 0 100 100" role="group" aria-label="${esc(mode)} demand areas">
        <circle class="methodWheelBase" cx="50" cy="50" r="46"></circle>
        ${items.map((item, index) => {
          const start = index * 45;
          const end = (index + 1) * 45;
          const selected = normalize(item.key) === normalize(selectedKey);
          const isClient = hasClientValue(clientRaw, item.key);
          const marker = polarPoint(50, 50, 34, start + 22.5);
          return `
            <path class="methodWheelSlice ${selected ? "is-selected" : ""} ${isClient ? "is-client" : ""}"
              d="${wedgePath(start, end)}"
              data-method-section="demandAreas" data-method-value="${esc(item.key)}"
              tabindex="0" role="button" aria-label="${esc(item.key)}" aria-pressed="${selected ? "true" : "false"}"></path>
            ${isClient ? `<circle class="methodWheelClientDot" cx="${marker.x.toFixed(3)}" cy="${marker.y.toFixed(3)}" r="1.65"></circle>` : ""}`;
        }).join("")}
        <circle class="methodWheelCenter" cx="50" cy="50" r="10.5"></circle>
        <text class="methodWheelCenterText" x="50" y="49" text-anchor="middle">${esc(mode)}</text>
        <text class="methodWheelCenterSub" x="50" y="54" text-anchor="middle">8 areas</text>
      </svg>
      ${wheelLegend(hasClient)}
      <div class="methodWheelHint">Tap an area to explore it.</div>
    </div>`;
}

function makeArchetypeWheel({ mode, selectedKey, clientRaw }) {
  const items = METHOD_MATRIX[mode].archetypes;
  const starts = [270, 0, 90, 180];
  const positions = [
    { x: 30, y: 31 },
    { x: 70, y: 31 },
    { x: 70, y: 69 },
    { x: 30, y: 69 },
  ];
  const hasClient = items.some((item) => hasClientValue(clientRaw, item.key));

  return `
    <div class="methodWheelWrap">
      <svg class="methodWheel" viewBox="0 0 100 100" role="group" aria-label="Four behavioral archetypes">
        <circle class="methodWheelBase" cx="50" cy="50" r="46"></circle>
        ${items.map((item, index) => {
          const selected = normalize(item.key) === normalize(selectedKey);
          const isClient = hasClientValue(clientRaw, item.key);
          const pos = positions[index];
          return `
            <path class="methodWheelSlice ${selected ? "is-selected" : ""} ${isClient ? "is-client" : ""}"
              d="${wedgePath(starts[index], starts[index] + 90)}"
              data-method-section="archetypes" data-method-value="${esc(item.key)}"
              tabindex="0" role="button" aria-label="${esc(item.key)}" aria-pressed="${selected ? "true" : "false"}"></path>
            <text class="methodArchetypeLabel ${selected ? "is-selected" : ""}" x="${pos.x}" y="${pos.y}" text-anchor="middle">${esc(item.key)}</text>
            ${isClient ? `<circle class="methodWheelClientDot" cx="${pos.x}" cy="${pos.y + 5.5}" r="1.65"></circle>` : ""}`;
        }).join("")}
        <circle class="methodWheelCenter" cx="50" cy="50" r="9.5"></circle>
      </svg>
      ${wheelLegend(hasClient)}
    </div>`;
}

function detailHTML(item, { mindset = false } = {}) {
  if (!item) return `<div class="methodDetailEmpty">Select a factor to see its Matrix description.</div>`;
  return `
    <div class="methodDetail">
      <div class="methodDetailKicker">Selected factor</div>
      <h3 class="methodDetailTitle">${esc(item.key)}</h3>
      ${item.effect ? `<div class="methodEffectLabel">${esc(item.effect)}</div>` : ""}
      <div class="methodDetailText preserve">${esc(item.description || "")}</div>
      ${mindset ? `
        <div class="methodAccordions">
          <details class="methodDetails"><summary>Motivations</summary><div class="methodDetailsBody preserve">${esc(item.motivations || "")}</div></details>
          <details class="methodDetails"><summary>Hidden fears</summary><div class="methodDetailsBody preserve">${esc(item.hiddenFears || "")}</div></details>
        </div>` : ""}
    </div>`;
}

function injectMethodStylesOnce() {
  if (document.getElementById("method-styles")) return;
  const style = document.createElement("style");
  style.id = "method-styles";
  style.textContent = `
    body[data-current-tab="method"] #download-container{display:none!important}
    #content .methodHero{padding-bottom:18px;min-height:0}
    #content .methodHeroTitle{font-family:'Rokkitt',serif;font-size:clamp(27px,3vw,34px);line-height:1.05;color:var(--bc-green);margin:4px 0 8px}
    #content .methodHeroText{margin:0;max-width:760px;color:#4b4b4b}
    #content .methodModeRow{display:flex;margin-top:16px}
    #content .methodModeToggle{width:min(320px,100%);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    #content .methodModeBtn,#content .methodSegment{appearance:none;border:2px solid #ddd;background:var(--bc-white);color:var(--bc-teal);border-radius:12px;font-family:Inter,system-ui,sans-serif;font-weight:600;letter-spacing:.2px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 4px 8px rgba(0,0,0,.12),0 1px 0 rgba(0,0,0,.04);transition:transform .18s ease,background-color .18s ease,border-color .18s ease}
    #content .methodModeBtn{height:42px;padding:0 14px;font-size:13px}
    #content .methodModeBtn:hover,#content .methodSegment:hover{background:#f0f0f0;transform:translateY(-1px)}
    #content .methodModeBtn.is-selected,#content .methodSegment.is-selected{position:relative;background:var(--bc-dark);color:var(--bc-white);border-color:transparent;box-shadow:none}
    #content .methodModeBtn.is-selected::before,#content .methodSegment.is-selected::before{content:"";position:absolute;inset:-2px;border-radius:inherit;padding:2px;background:linear-gradient(135deg,var(--bc-mint),var(--bc-teal));-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
    #content .methodSection{padding-bottom:22px;min-height:0}
    #content .methodSectionIntro{margin:-8px 0 18px;max-width:760px;color:#4b4b4b}
    #content .methodTwoCol{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(0,1.35fr);gap:30px;align-items:start}
    #content .methodSelectorPane{display:flex;justify-content:center;align-items:flex-start;min-width:0}
    #content .methodDetailPane{min-width:0;border-left:1px solid rgba(2,77,79,.14);padding-left:26px}
    #content .methodWheelWrap{width:min(100%,390px);margin:0 auto}
    #content .methodWheel{width:100%;aspect-ratio:1/1;overflow:visible;filter:drop-shadow(0 8px 12px rgba(0,0,0,.10))}
    #content .methodWheelBase{fill:#f7fbf9;stroke:rgba(2,77,79,.22);stroke-width:1}
    #content .methodWheelSlice{fill:rgba(180,253,229,.60);stroke:#fff;stroke-width:1.2;cursor:pointer;outline:none;transition:fill .18s ease,filter .18s ease;transform-origin:50px 50px}
    #content .methodWheelSlice:hover,#content .methodWheelSlice:focus{fill:rgba(48,186,128,.45)}
    #content .methodWheelSlice.is-selected{fill:var(--bc-green);filter:drop-shadow(0 2px 3px rgba(2,77,79,.28))}
    #content .methodWheelSlice.is-client:not(.is-selected){fill:rgba(2,77,79,.16)}
    #content .methodWheelClientDot{fill:var(--bc-teal);stroke:#fff;stroke-width:.7;pointer-events:none}
    #content .methodWheelCenter{fill:#fff;stroke:rgba(2,77,79,.18);stroke-width:.8;pointer-events:none}
    #content .methodWheelCenterText{fill:var(--bc-teal);font-size:5px;font-weight:700;pointer-events:none}
    #content .methodWheelCenterSub{fill:#6b6b6b;font-size:3.1px;font-weight:600;pointer-events:none}
    #content .methodWheelLegend{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;color:var(--bc-teal);font-size:10px;font-weight:700}
    #content .methodWheelHint{margin-top:5px;text-align:center;color:#666;font-size:12px}
    #content .methodArchetypeLabel{fill:var(--bc-teal);font-family:Inter,system-ui,sans-serif;font-size:3.65px;font-weight:700;pointer-events:none}
    #content .methodArchetypeLabel.is-selected{fill:#fff}
    #content .methodDetailKicker{color:#6f6f6f;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:3px}
    #content .methodDetailTitle{font-family:'Rokkitt',serif;color:var(--bc-green);font-size:26px;line-height:1.05;margin:0 0 8px}
    #content .methodEffectLabel{display:inline-flex;padding:4px 8px;margin:0 0 10px;border-radius:999px;background:var(--bc-mint);color:var(--bc-teal);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
    #content .methodDetailText,#content .methodDetailsBody{color:var(--bc-dark);line-height:1.58}
    #content .methodDetailEmpty{color:#666;padding:8px 0}
    #content .methodAccordions{display:grid;gap:9px;margin-top:18px}
    #content .methodDetails{border:1px solid rgba(2,77,79,.18);border-radius:12px;overflow:hidden;background:#fbfffd}
    #content .methodDetails summary{cursor:pointer;list-style:none;padding:11px 14px;color:var(--bc-teal);font-weight:700}
    #content .methodDetails summary::-webkit-details-marker{display:none}
    #content .methodDetails summary::after{content:"+";float:right;font-size:18px;line-height:1}
    #content .methodDetails[open] summary::after{content:"−"}
    #content .methodDetailsBody{padding:12px 14px 14px;border-top:1px solid rgba(2,77,79,.10)}
    #content .methodSpectrumBlock+.methodSpectrumBlock{margin-top:24px;padding-top:22px;border-top:1px solid rgba(2,77,79,.12)}
    #content .methodSpectrumTitle{font-size:13px;font-weight:700;color:var(--bc-teal);margin-bottom:10px}
    #content .methodSegmented{display:grid;grid-template-columns:repeat(var(--segment-count),minmax(0,1fr));gap:8px;width:100%}
    #content .methodSegment{position:relative;width:100%;height:64px;min-height:64px;max-height:64px;padding:7px 6px;font-size:11px;overflow:visible;display:flex;align-items:center;justify-content:center;text-align:center}
    #content .methodSegmentLabel{display:flex;flex-direction:column;justify-content:center;align-items:center;line-height:1.12;min-width:0}
    #content .methodAudienceMarker{position:absolute;left:50%;bottom:-18px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:4px;color:var(--bc-teal);font-size:8px;font-weight:700;white-space:nowrap;pointer-events:none}
    #content .methodAudienceDot{width:6px;height:6px;border-radius:50%;background:var(--bc-teal);box-shadow:0 0 0 2px #fff;flex:0 0 auto;display:inline-block}
    #content .methodSpectrumDetail{margin-top:30px}
    @media(max-width:860px){#content .methodTwoCol{grid-template-columns:1fr;gap:18px}#content .methodSelectorPane{order:1}#content .methodDetailPane{order:2;border-left:none;border-top:1px solid rgba(2,77,79,.12);padding-left:0;padding-top:18px}#content .methodWheelWrap{width:min(86vw,330px)}}
    @media(max-width:768px){#content .methodHero,#content .methodSection{padding:18px 16px}#content .methodHeroTitle{font-size:27px}#content .methodModeToggle{width:100%}#content .methodModeBtn{height:44px}#content .methodSectionIntro{margin-bottom:14px}#content .methodSegmented{gap:6px}#content .methodSegment{height:62px;min-height:62px;max-height:62px;border-radius:10px;padding:6px 3px;font-size:10px}#content .methodAudienceMarker{bottom:-17px;font-size:7.5px}#content .methodSpectrumDetail{margin-top:29px}#content .methodDetailTitle{font-size:24px}}
    @media(max-width:390px){#content .methodSegment{font-size:9px;padding-left:2px;padding-right:2px}#content .methodAudienceText{display:none}#content .methodAudienceDot{width:7px;height:7px}}
  `;
  document.head.appendChild(style);
}

function getClientProfile(data, mode) {
  const raw = {
    demandAreas: getSpreadsheetValue(data, "D_AREA"),
    archetypes: getSpreadsheetValue(data, "T_APPROACH"),
    decision: getSpreadsheetValue(data, "T_DECISION"),
    action: getSpreadsheetValue(data, "T_ACTION"),
    driver: getSpreadsheetValue(data, "D_DRIVER"),
    segment: getSpreadsheetValue(data, "D_SEGMENT"),
  };
  const selected = {};
  Object.keys(raw).forEach((section) => {
    selected[section] = firstClientMatch(mode, section, raw[section])?.key || METHOD_MATRIX[mode][section]?.[0]?.key || "";
  });
  return { raw, selected };
}

function renderPageShell(data, initialMode) {
  const contentDiv = document.getElementById("content");
  const profile = getClientProfile(data, initialMode);
  contentDiv.innerHTML = `
    <section class="card methodHero">
      <div class="methodHeroTitle">Method</div>
      <p class="methodHeroText">Explore the behavioral factors behind your strategy.</p>
      <div class="methodModeRow"><div class="methodModeToggle" role="radiogroup" aria-label="Business or consumer context">
        <button class="methodModeBtn ${initialMode === "B2B" ? "is-selected" : ""}" type="button" data-method-mode-switch="B2B" role="radio">B2B</button>
        <button class="methodModeBtn ${initialMode === "B2C" ? "is-selected" : ""}" type="button" data-method-mode-switch="B2C" role="radio">B2C</button>
      </div></div>
    </section>
    <section class="card methodSection scrollTarget" id="block-method-demand"><div class="sectionTitle">Demand Context</div><p class="methodSectionIntro">Where your solution creates the strongest behavioral impact.</p><div class="methodTwoCol"><div class="methodSelectorPane" data-method-host="demand-selector"></div><div class="methodDetailPane" data-method-host="demand-detail"></div></div></section>
    <section class="card methodSection scrollTarget" id="block-method-mindset"><div class="sectionTitle">Mindset</div><p class="methodSectionIntro">The underlying orientation shaping motivations, expectations, and fears.</p><div class="methodTwoCol"><div class="methodSelectorPane" data-method-host="mindset-selector"></div><div class="methodDetailPane" data-method-host="mindset-detail"></div></div></section>
    <section class="card methodSection scrollTarget" id="block-method-decision"><div class="sectionTitle">Decision-making</div><p class="methodSectionIntro">How your audience evaluates choices and weighs emotion against logic.</p><div data-method-host="decision-control"></div><div class="methodSpectrumDetail" data-method-host="decision-detail"></div></section>
    <section class="card methodSection scrollTarget" id="block-method-action"><div class="sectionTitle">Action & Value Orientation</div><p class="methodSectionIntro">How your audience moves toward action, what drives demand, and what market position feels right.</p>
      <div class="methodSpectrumBlock"><div class="methodSpectrumTitle">Action pattern</div><div data-method-host="action-control"></div><div class="methodSpectrumDetail" data-method-host="action-detail"></div></div>
      <div class="methodSpectrumBlock"><div class="methodSpectrumTitle">Demand driver</div><div data-method-host="driver-control"></div><div class="methodSpectrumDetail" data-method-host="driver-detail"></div></div>
      <div class="methodSpectrumBlock"><div class="methodSpectrumTitle">Market position</div><div data-method-host="segment-control"></div><div class="methodSpectrumDetail" data-method-host="segment-detail"></div></div>
    </section>`;
  contentDiv.dataset.methodMode = initialMode;
  contentDiv.__methodData = data;
  contentDiv.__methodSelection = { ...profile.selected };
}

function renderInteractiveState() {
  const contentDiv = document.getElementById("content");
  const data = contentDiv.__methodData || {};
  const mode = contentDiv.dataset.methodMode || "B2B";
  const profile = getClientProfile(data, mode);
  const selection = contentDiv.__methodSelection || { ...profile.selected };

  Object.keys(selection).forEach((section) => {
    if (!findItem(mode, section, selection[section])) selection[section] = profile.selected[section];
  });
  contentDiv.__methodSelection = selection;

  contentDiv.querySelector('[data-method-host="demand-selector"]').innerHTML = makeDemandWheel({ mode, selectedKey: selection.demandAreas, clientRaw: profile.raw.demandAreas });
  contentDiv.querySelector('[data-method-host="demand-detail"]').innerHTML = detailHTML(findItem(mode, "demandAreas", selection.demandAreas));
  contentDiv.querySelector('[data-method-host="mindset-selector"]').innerHTML = makeArchetypeWheel({ mode, selectedKey: selection.archetypes, clientRaw: profile.raw.archetypes });
  contentDiv.querySelector('[data-method-host="mindset-detail"]').innerHTML = detailHTML(findItem(mode, "archetypes", selection.archetypes), { mindset: true });

  [["decision","decision-control","decision-detail"],["action","action-control","action-detail"],["driver","driver-control","driver-detail"],["segment","segment-control","segment-detail"]].forEach(([section,controlHost,detailHost]) => {
    contentDiv.querySelector(`[data-method-host="${controlHost}"]`).innerHTML = makeSegmentedControl({ items: METHOD_MATRIX[mode][section], selectedKey: selection[section], clientRaw: profile.raw[section], mode, section });
    contentDiv.querySelector(`[data-method-host="${detailHost}"]`).innerHTML = detailHTML(findItem(mode, section, selection[section]));
  });

  contentDiv.querySelectorAll("[data-method-mode-switch]").forEach((button) => {
    const selected = button.dataset.methodModeSwitch === mode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", selected ? "true" : "false");
  });
}

function setSectionSelection(section, value) {
  const contentDiv = document.getElementById("content");
  contentDiv.__methodSelection = { ...(contentDiv.__methodSelection || {}), [section]: value };
  renderInteractiveState();
}

function bindMethodInteractions() {
  const contentDiv = document.getElementById("content");
  if (contentDiv.__methodBound) return;
  contentDiv.__methodBound = true;

  contentDiv.addEventListener("click", (event) => {
    const modeBtn = event.target.closest("[data-method-mode-switch]");
    if (modeBtn) {
      const nextMode = modeBtn.dataset.methodModeSwitch;
      contentDiv.dataset.methodMode = nextMode;
      contentDiv.__methodSelection = { ...getClientProfile(contentDiv.__methodData || {}, nextMode).selected };
      renderInteractiveState();
      return;
    }
    const target = event.target.closest("[data-method-section][data-method-value]");
    if (target) setSectionSelection(target.dataset.methodSection, target.dataset.methodValue);
  });

  contentDiv.addEventListener("keydown", (event) => {
    const target = event.target.closest(".methodWheelSlice[data-method-section][data-method-value]");
    if (!target || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    setSectionSelection(target.dataset.methodSection, target.dataset.methodValue);
  });
}

export async function renderMethodTab(forceRefresh = false) {
  setCurrentTab("method");
  document.body.setAttribute("data-current-tab", "method");
  clearUpgradeBlock();
  injectMethodStylesOnce();
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;
  contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Method…</p></div>`;

  try {
    const api = await fetchDashboardData(forceRefresh);
    if (!api || !api.ok) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">${esc(api?.message || "No data found.")}</p></div>`;
      return;
    }
    state.lastApiByTab.method = { ...api, data: { ...(api.data || {}) } };
    const data = api.data || {};
    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(data.Brand || data["{{Brand}}"] || "");
      brandEl.textContent = full.length > 80 ? full.slice(0, 80) : full;
    }
    renderPageShell(data, inferMode(data));
    renderInteractiveState();
    bindMethodInteractions();
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();
    toggleFloatingCallBtn(false);
    updateFloatingCTA("method");
  } catch (error) {
    console.error("Failed to render Method page:", error);
    contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading Method: ${esc(error?.message || error)}</p></div>`;
  }
}
