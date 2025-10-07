// /js/core/ui.js
import { TAB_TITLES } from "./config.js";
import { state } from "./state.js";
import { esc } from "./utils.js";

// ✅ --- START: SCROLL SPY LOGIC ---
let scrollSpyObserver = null;
let currentActiveSectionId = null;

function activateScrollSpy() {
  if (scrollSpyObserver) {
    scrollSpyObserver.disconnect();
  }
  currentActiveSectionId = null;

  const sections = Array.from(document.querySelectorAll(".scrollTarget"));
  const chips = document.querySelectorAll("#blockTabs .blockBtn");

  if (!sections.length || !chips.length) return;

  const headerHeight = document.querySelector(".siteHeader")?.offsetHeight || 150;

  const observerOptions = {
    rootMargin: `-${headerHeight}px 0px -50px 0px`,
    threshold: 0,
  };

  const observerCallback = () => {
    let bestSection = null;
    let maxScore = -Infinity;

    const idealPosition = headerHeight;

    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const top = rect.top;

        if (rect.bottom < idealPosition || top > window.innerHeight) {
            return;
        }

        const distance = top - idealPosition;
        let score;

        if (distance <= 0) {
            score = 1000 + distance;
        } else {
            score = 1000 - (distance * 1.5);
        }

        if (score > maxScore) {
            maxScore = score;
            bestSection = section;
        }
    });

    const newActiveId = bestSection ? bestSection.id : null;

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
  
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(observerCallback, 50);
  }, { passive: true });
  
  observerCallback();
}
// ✅ --- END: SCROLL SPY LOGIC ---


/* --------------------------- Header title + icon --------------------------- */
export function setTitleAndIcon(tab) {
  document.querySelectorAll("#tabs .tabBtn").forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle("tab-active", isActive);
    btn.classList.toggle("active", isActive);
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

  blockTabs.innerHTML = ''; // Clear previous chips

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

  activateScrollSpy();
}


/* ---------------- NEW UNIVERSAL DOWNLOAD BUTTON LOGIC ---------------- */
let isDownloadButtonInitialized = false;

export function initDownloadButton() {
  if (isDownloadButtonInitialized) return;

  const container = document.getElementById('universal-download-container');
  const button = document.getElementById('universal-download-button');
  const popover = document.getElementById('download-popover');

  if (!container || !button || !popover) return;

  const showPopover = () => {
    updateDownloadPopover(); // Populate content before showing
    popover.classList.add('visible');
  };

  const hidePopover = () => {
    popover.classList.remove('visible');
  };

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (popover.classList.contains('visible')) {
      hidePopover();
    } else {
      showPopover();
    }
  });

  document.addEventListener('click', (event) => {
    if (!container.contains(event.target) && popover.classList.contains('visible')) {
      hidePopover();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && popover.classList.contains('visible')) {
      hidePopover();
    }
  });

  isDownloadButtonInitialized = true;
}

export function updateDownloadPopover() {
  const popoverContent = document.getElementById('popover-content');
  const button = document.getElementById('universal-download-button');
  if (!popoverContent || !button) return;

  const tab = state.currentTab;
  const downloads = state.dynamicPdfLinks[tab] || [];

  popoverContent.innerHTML = ''; // Clear previous content

  if (downloads.length > 0) {
    button.disabled = false;
    downloads.forEach(item => {
      const link = document.createElement('a');
      link.textContent = item.title || 'Download';
      
      if (item.enabled) {
        link.href = item.url;
        link.setAttribute('download', '');
      } else {
        link.href = '#';
        link.classList.add('disabled');
        link.addEventListener('click', e => e.preventDefault());
      }
      popoverContent.appendChild(link);
    });
  } else {
    // No downloads for this tab, create a single disabled item
    button.disabled = false; // Keep button clickable to show the message
    const link = document.createElement('a');
    link.textContent = `${TAB_TITLES[tab] || 'Strategy'} not available`;
    link.href = '#';
    link.classList.add('disabled');
    link.addEventListener('click', e => e.preventDefault());
    popoverContent.appendChild(link);
  }
}
