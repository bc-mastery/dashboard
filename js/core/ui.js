// /js/core/ui.js
import { TAB_TITLES, TAB_ICONS, UI_ICONS } from "./config.js";
import { getMinTabsRequiredForDownload, toDownloadLink } from "./utils.js";
import { state } from "./state.js";

/* --------------------------- Header title + icon --------------------------- */
export function setTitleAndIcon(tab) {
  const titleEl = document.getElementById("pageTitle");
  const iconEl = document.getElementById("pageIcon");
  if (titleEl) titleEl.textContent = TAB_TITLES[tab] || "Strategy Dashboard";
  if (iconEl) iconEl.src = TAB_ICONS[tab] || TAB_ICONS.growth;

  document.querySelectorAll(".tabBtn").forEach((btn) => {
    const isPrimary = !btn.classList.contains("blockBtn");
    const isActive =
      btn.dataset.tab === tab || btn.dataset.target === "#block-" + tab;
    btn.style.border = isActive ? "2px solid #024D4F" : "none";
    if (isPrimary) {
      btn.style.backgroundColor = "white";
      btn.style.color = "#024D4F";
    } else {
      btn.style.backgroundColor = "#B4FDE5";
      btn.style.color = "#024D4F";
    }
  });
}

/* ---------------------- Universal Upgrade block insert --------------------- */
export function maybeInsertUniversalUpgradeBlock({ isPreviewOnly, content }) {
  if (!isPreviewOnly) return;
  if (document.querySelector(".upgradeBlock")) return; // avoid duplicates

  const tpl = document.getElementById("universalUpgradeBlock");
  const footer = document.querySelector(".siteFooter");
  if (!tpl || !footer) return;

  const node = tpl.content.cloneNode(true);

  // Wire CTA links from <body> data attributes
  const stripe4pbs = document.body.getAttribute("data-stripe-4pbs");
  const calendly = document.body.getAttribute("data-calendly-url");
  const a4pbs = node.querySelector("#cta-4pbs");
  const acall = node.querySelector("#cta-call");
  if (a4pbs && stripe4pbs) a4pbs.setAttribute("href", stripe4pbs);
  if (acall && calendly) acall.setAttribute("href", calendly);

  // Optional: override title/text if provided
  const titleEl =
    node.querySelector(".upgradeTitle") ||
    node.querySelector("#upgradeBlockTitle");
  const textEl =
    node.querySelector(".upgradeText") ||
    node.querySelector(".upgradeBlock p.muted");
  if (titleEl && content?.title) titleEl.textContent = content.title;
  if (textEl && content?.text) textEl.textContent = content.text;

  footer.parentNode.insertBefore(node, footer);
}

/* -------------------------- Floating Calendly button ----------------------- */
export function toggleFloatingCallBtn(show) {
  const btn = document.getElementById("floatingCallBtn");
  if (!btn) return;
  const calendly = document.body.getAttribute("data-calendly-url");
  if (show && calendly) {
    btn.setAttribute("href", calendly);
    btn.setAttribute("aria-hidden", "false");
  } else {
    btn.setAttribute("aria-hidden", "true");
  }
}

/* ---------------------- Download CTA: access + visibility ------------------ */
export function enforceDownloadProtection() {
  const cta = document.getElementById("downloadBtn");
  const chips = document.querySelectorAll("#blockTabs .blockBtn").length;
  const minTabs = getMinTabsRequiredForDownload();
  if (!cta) return;

  const allowed = chips >= minTabs;
  cta.style.display = allowed ? "inline-flex" : "none";
  cta.style.pointerEvents = allowed ? "auto" : "none";
  cta.style.opacity = allowed ? "1" : "0.6";
}

export function updateFloatingCTA(tab) {
  const btn = document.getElementById("downloadBtn");
  if (!btn) return;

  const labelSpan = btn.querySelector("#downloadText");
  const icon = btn.querySelector(".download-icon");
  const pdf = state.dynamicPdfLinks[tab];
  const d = (state.lastApiByTab[tab] && state.lastApiByTab[tab].data) || {};

  // Access logic per tab
  let hasAccess = false;
  if (tab === "targeting") {
    hasAccess = d["TS_PAID"] || d["4PBS_PAID"];
  } else if (["offer", "marketing", "sales"].includes(tab)) {
    hasAccess = d["4PBS_PAID"];
  } else {
    hasAccess = true; // growth, mentoring, knowledge (by default)
  }

  const labelMap = {
    growth: "Growth Scan PDF",
    targeting: "Targeting Strategy PDF",
    offer: "Offer Strategy PDF",
    marketing: "Marketing Strategy PDF",
    sales: "Sales Strategy PDF",
    mentoring: "Mentoring PDF",
    knowledge: "Knowledge PDF",
  };
  const label = labelMap[tab] || "Strategy PDF";

  if (pdf && hasAccess) {
    btn.classList.remove("disabled");
    btn.removeAttribute("aria-disabled");
    btn.setAttribute("href", pdf);
    btn.setAttribute("download", "");
    if (labelSpan) labelSpan.textContent = label;
    if (icon) icon.src = UI_ICONS.download;
  } else {
    btn.classList.add("disabled");
    btn.setAttribute("aria-disabled", "true");
    btn.removeAttribute("href");
    btn.removeAttribute("download");
    if (labelSpan) labelSpan.textContent = `${label} not available`;
    if (icon) icon.src = UI_ICONS.lock;
  }
}

/* --------------------------------- Scrolling -------------------------------- */
export function scrollToTarget(el) {
  const scrollMarginTop = parseInt(getComputedStyle(el).scrollMarginTop) || 0;
  const elementPosition = el.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = elementPosition - scrollMarginTop;

  const currentScroll = window.scrollY;
  const delta = Math.abs(offsetPosition - currentScroll);
  const adjustedOffset = delta < 5 ? offsetPosition - 1 : offsetPosition;

  window.scrollTo({ top: adjustedOffset, behavior: "smooth" });
}

/* ------------------------ Build secondary chips from DOM -------------------- */
export function populateBlockTabsFromPage() {
  const blockTabsRow = document.getElementById("blockTabsRow");
  const blockTabs = document.getElementById("blockTabs");
  if (!blockTabsRow || !blockTabs) return;

  // Keep the CTA node; remove only previous chips
  const cta = document.getElementById("downloadBtn");
  blockTabs.querySelectorAll(".blockBtn").forEach((el) => el.remove());

  // Build chips from sections present in the page
  const allBlocks = document.querySelectorAll(".scrollTarget");
  allBlocks.forEach((block) => {
    const title =
      block.querySelector(".sectionTitle")?.textContent?.trim() ||
      block.querySelector(".bfTitle")?.textContent?.trim();
    const id = block.id;
    if (title && id) {
      const btn = document.createElement("button");
      btn.className = "tabBtn blockBtn";
      btn.dataset.target = `#${id}`;
      btn.textContent = title;

      btn.addEventListener("click", () => {
        const el = document.querySelector(`#${id}`);
        if (el) scrollToTarget(el);
      });

      blockTabs.appendChild(btn);
    }
  });

  // Ensure CTA is at the end
  if (cta && cta.parentElement === blockTabs) {
    blockTabs.appendChild(cta);
  }

  const hasChips = blockTabs.querySelectorAll(".blockBtn").length > 0;
  blockTabsRow.style.visibility = hasChips ? "visible" : "hidden";

  enforceDownloadProtection();
}

/* ------------------- Make the download button self-sufficient --------------- */
export function initDownloadButtonIsolation() {
  const btn = document.getElementById("downloadBtn");
  if (!btn) return;

  // Strip any tab-like behavior
  btn.classList.remove("tabBtn");
  btn.removeAttribute("data-tab");
  btn.setAttribute("target", "_self");
  btn.setAttribute("rel", "noopener");

  // Replace node to clear any attached listeners
  const clean = btn.cloneNode(true);
  clean.id = btn.id;
  btn.replaceWith(clean);

  clean.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const tab = state.currentTab;
    let link = state.dynamicPdfLinks[tab];

    if (!link) {
      const data = state.lastApiByTab[tab]?.data || {};
      const fieldMap = {
        targeting: "T_STRATEGY_OUTPUT",
        offer: "O_STRATEGY_OUTPUT",
        marketing: "M_STRATEGY_OUTPUT",
        sales: "S_STRATEGY_OUTPUT",
        growth: "GROWTH_STRATEGY_OUTPUT",
        mentoring: "MENTORING_STRATEGY_OUTPUT",
        knowledge: "KNOWLEDGE_STRATEGY_OUTPUT",
      };
      const field = fieldMap[tab];
      const raw = field ? data[field] : "";
      if (raw) {
        link = toDownloadLink(raw);
        state.dynamicPdfLinks[tab] = link;
        updateFloatingCTA(tab);
      }
    }

    if (link) {
      const a = document.createElement("a");
      a.href = link;
      a.download = "";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      console.warn("No valid PDF data returned for tab:", tab);
    }
  });
}