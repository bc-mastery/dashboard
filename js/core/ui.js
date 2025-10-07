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

  // The observer will fire frequently as sections move through the viewport.
  const observerOptions = {
    rootMargin: `-${headerHeight}px 0px -50px 0px`,
    threshold: 0,
  };

  const observerCallback = () => {
    let bestSection = null;
    let maxScore = -Infinity;

    // The ideal position for a section's top is just below the sticky header.
    const idealPosition = headerHeight;

    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const top = rect.top;

        // Ignore sections completely off-screen.
        if (rect.bottom < idealPosition || top > window.innerHeight) {
            return;
        }

        const distance = top - idealPosition;
        let score;

        if (distance <= 0) {
            // Section is at or above the ideal line (already scrolled past).
            // Penalize it more heavily the further up it goes.
            score = 1000 + distance; // `distance` is negative, so this decreases the score.
        } else {
            // Section is below the ideal line (approaching).
            // Penalize it less to give it priority.
            score = 1000 - (distance * 1.5);
        }

        if (score > maxScore) {
            maxScore = score;
            bestSection = section;
        }
    });

    const newActiveId = bestSection ? bestSection.id : null;

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
  
  // Also attach to the main scroll event for maximum responsiveness.
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(observerCallback, 50);
  }, { passive: true });
  
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
  const downloadBtn = document.getElementById("downloadBtn");
  if (!downloadBtn) return;

  const downloadText = document.getElementById("downloadText");
  const downloadIcon = downloadBtn.querySelector('.download-icon');

  if (!downloadText || !downloadIcon) return;

  const buttonTextMap = {
    growth: "Growth Scan",
    targeting: "Targeting Strategy",
    offer: "Offer Strategy",
    marketing: "Marketing Strategy",
    sales: "Sales Strategy",
  };

  const link = state.dynamicPdfLinks[tab];
  downloadBtn.style.display = "inline-flex";

  if (link) {
    downloadBtn.href = link;
    downloadBtn.target = "_self";
    downloadBtn.classList.remove('disabled');
    downloadIcon.style.display = 'inline-block';
    downloadText.textContent = buttonTextMap[tab] || "Download";
    downloadBtn.onclick = null;
  } else {
    downloadBtn.href = "#";
    downloadBtn.target = "";
    downloadBtn.classList.add('disabled');
    downloadIcon.style.display = 'none';
    downloadText.textContent = "Strategy not available";
    downloadBtn.onclick = (e) => e.preventDefault();
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
