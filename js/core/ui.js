// /js/core/ui.js
import { TAB_TITLES, TAB_ICONS, UI_ICONS } from "./config.js";
import { getMinTabsRequiredForDownload, toDownloadLink } from "./utils.js";
import { state } from "./state.js";

// ✅ --- START: SCROLL SPY LOGIC ---
let scrollSpyObserver = null;
let currentActiveSectionId = null; // Keep track of the active section

function activateScrollSpy() {
  if (scrollSpyObserver) {
    scrollSpyObserver.disconnect();
  }
  currentActiveSectionId = null; // Reset for the new page

  const sections = Array.from(document.querySelectorAll(".scrollTarget"));
  const chips = document.querySelectorAll("#blockTabs .blockBtn");

  if (!sections.length || !chips.length) return;

  const headerHeight = document.querySelector(".siteHeader")?.offsetHeight || 150;

  // This observer will fire frequently as sections move through the viewport.
  const observerOptions = {
    rootMargin: `-${headerHeight}px 0px -50px 0px`,
    threshold: 0,
  };

  const observerCallback = () => {
    let closestSection = null;
    let minDistance = Infinity;

    // The ideal position for a section's top is just below the sticky header.
    const idealPosition = headerHeight;

    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        
        // Consider any section that is not completely below the viewport
        if (rect.top < window.innerHeight) {
            const distance = Math.abs(rect.top - idealPosition);
            if (distance < minDistance) {
                minDistance = distance;
                closestSection = section;
            }
        }
    });

    const newActiveId = closestSection ? closestSection.id : null;

    // Only update the UI if the active section has changed.
    if (newActiveId !== currentActiveSectionId) {
        currentActiveSectionId = newActiveId;
        
        chips.forEach((chip) => {
            const isActive = chip.dataset.target === `#${currentActiveSectionId}`;
            chip.classList.toggle("active", isActive);
        });
    }
  };

  scrollSpyObserver = new IntersectionObserver(observerCallback, observerOptions);
  sections.forEach((section) => scrollSpyObserver.observe(section));
  
  // Run it once on load to set the initial state correctly.
  observerCallback();
}
// ✅ --- END: SCROLL SPY LOGIC ---


/* --------------------------- Header title + icon --------------------------- */
export function setTitleAndIcon(tab) {
  // This function is now much simpler. It ONLY toggles the active class.
  // All styling is handled by the CSS in index.html for robustness.
  document.querySelectorAll("#tabs .tabBtn").forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle("tab-active", isActive);
    btn.classList.toggle("active", isActive); // for legacy compatibility if needed
  });
}

/* ---------------------- Upgrade block helpers ------------------------ */
export function clearUpgradeBlock() {
  const existing = document.querySelector(".upgradeBlock");
  if (existing) existing.remove();
}

export function maybeInsertUniversalUpgradeBlock({ tab, isPreviewOnly, content }) {
  if (!isPreviewOnly) return;

  const current = document.body.getAttribute("data-current-tab") || state.currentTab || "";
  if (tab && tab !== current) return;

  const tpl = document.getElementById("universalUpgradeBlock");
  const footer = document.querySelector(".siteFooter");
  if (!tpl || !footer) return;

  clearUpgradeBlock();

  const node = tpl.content.cloneNode(true);

  const stripe4pbs = document.body.getAttribute("data-stripe-4pbs");
  const calendly   = document.body.getAttribute("data-calendly-url");
  const a4pbs = node.querySelector("#cta-4pbs");
  const acall = node.querySelector("#cta-call");
  if (a4pbs && stripe4pbs) a4pbs.setAttribute("href", stripe4pbs);
  if (acall && calendly)   acall.setAttribute("href", calendly);

  const titleEl = node.querySelector(".upgradeTitle") || node.querySelector("#upgradeBlockTitle");
  const textEl = node.querySelector(".upgradeText") || node.querySelector(".upgradeBlock p.muted");
  if (titleEl && content?.title) titleEl.textContent = content.title;
  if (textEl && content?.text)   textEl.textContent  = content.text;

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
  if (!cta) return;

  const tab = state.currentTab || document.body.getAttribute("data-current-tab") || "";
  if (tab === "growth") {
    cta.style.display = "inline-flex";
    return;
  }

  const chips = document.querySelectorAll("#blockTabs .blockBtn").length;
  const minTabs = getMinTabsRequiredForDownload();
  const allowed = chips >= minTabs;

  cta.style.display = allowed ? "inline-flex" : "none";
}

export function updateFloatingCTA(tab) {
  const btn = document.getElementById("downloadBtn");
  if (!btn) return;

  const labelSpan = btn.querySelector("#downloadText");
  const icon = btn.querySelector(".download-icon");
  let pdf = state.dynamicPdfLinks[tab];
  const d = (state.lastApiByTab[tab] && state.lastApiByTab[tab].data) || {};

  if (tab === "growth" && !pdf && d && d.GS_OUTPUT) {
    pdf = toDownloadLink(d.GS_OUTPUT);
    state.dynamicPdfLinks.growth = pdf;
  }

  let hasAccess = false;
  if (tab === "targeting") {
    hasAccess = d["TS_PAID"] || d["4PBS_PAID"];
  } else if (["offer", "marketing", "sales"].includes(tab)) {
    hasAccess = d["4PBS_PAID"];
  } else {
    hasAccess = true;
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

  window.scrollTo({ top: offsetPosition, behavior: "smooth" });
}

/* ------------------------ Build secondary chips from DOM -------------------- */
export function populateBlockTabsFromPage() {
  const blockTabsRow = document.getElementById("blockTabsRow");
  const blockTabs = document.getElementById("blockTabs");
  if (!blockTabsRow || !blockTabs) return;

  const cta = document.getElementById("downloadBtn");
  blockTabs.querySelectorAll(".blockBtn").forEach((el) => el.remove());

  const allBlocks = document.querySelectorAll(".scrollTarget");
  allBlocks.forEach((block) => {
    const title =
      block.querySelector(".sectionTitle")?.textContent?.trim() ||
      block.querySelector(".bfTitle")?.textContent?.trim();
    const id = block.id;
    if (!title || !id) return;

    const chip = document.createElement("button");
    chip.className = "blockBtn";
    chip.type = "button";
    chip.dataset.target = `#${id}`;
    chip.textContent = title;

    chip.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const el = document.getElementById(id);
        if (el) scrollToTarget(el);
      }, { capture: true }
    );

    blockTabs.appendChild(chip);
  });

  if (cta && cta.parentElement === blockTabs) {
    blockTabs.appendChild(cta);
  }

  const hasChips = blockTabs.querySelectorAll(".blockBtn").length > 0;
  blockTabsRow.style.visibility = hasChips ? "visible" : "hidden";

  enforceDownloadProtection();

  // ✅ ACTIVATE SCROLL SPY
  activateScrollSpy();
}

/* ------------------- Make the download button self-sufficient --------------- */
export function initDownloadButtonIsolation() {
  const btn = document.getElementById("downloadBtn");
  if (!btn) return;

  btn.classList.remove("tabBtn");
  btn.removeAttribute("data-tab");
  btn.setAttribute("target", "_self");
  btn.setAttribute("rel", "noopener");

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
        growth: "GS_OUTPUT",
        mentoring: "MENTORING_STRATEGY_OUTPUT",
        knowledge: "KNOWLEDGE_STRATEGY_OUTPUT",
      };

      const fallbacks = {
        growth: ["GS_OUTPUT", "GROWTH_STRATEGY_OUTPUT"],
        knowledge: ["KNOWLEDGE_OUTPUT", "K_MASTER_PDF", "KNOWLEDGE_PDF", "KNOWLEDGE_STRATEGY_OUTPUT"],
      };

      const primaryField = fieldMap[tab];
      let raw = primaryField ? data[primaryField] : "";

      if (!raw && fallbacks[tab]) {
        for (const k of fallbacks[tab]) {
          if (data[k]) { raw = data[k]; break; }
        }
      }

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

export function initBlockChipDelegation() {
  if (window.__bcBlockChipDelegated) return;
  window.__bcBlockChipDelegated = true;

  document.addEventListener(
    "click",
    (e) => {
      const chip = e.target.closest("#blockTabs .blockBtn");
      if (!chip) return;

      e.preventDefault();
      e.stopPropagation();

      const sel = (chip.dataset.target || chip.getAttribute("href") || "").trim();
      const id = sel.replace(/^#/, "");
      if (!id) return;
      const el = document.getElementById(id);
      if (el) scrollToTarget(el);
    },
    true
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if ((e.key !== "Enter" && e.key !== " ") || !e.target.closest("#blockTabs .blockBtn")) return;
      e.preventDefault();
      e.stopPropagation();
      e.target.click();
    },
    true
  );
}
