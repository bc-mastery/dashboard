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

/**
 * NEW LOGIC: This function now only controls the visibility and state of the main download button.
 * The pop-up logic is handled separately in the event listener.
 */
export function updateFloatingCTA(tab) {
    const downloadBtn = document.getElementById("downloadBtn");
    if (!downloadBtn) return;

    const downloadText = document.getElementById("downloadText");
    if (!downloadText) return;

    // Define all potential PDF sources for all tabs.
    // When you have a second PDF, add its key here, e.g., { key: 'M_SUMMARY_OUTPUT', label: 'Download Summary' }
    const potentialPdfs = {
        growth: [{ key: 'GS_OUTPUT', label: 'Download Growth Scan' }],
        targeting: [{ key: 'T_STRATEGY_OUTPUT', label: 'Download Targeting Strategy' }],
        offer: [{ key: 'O_STRATEGY_OUTPUT', label: 'Download Offer Strategy' }],
        marketing: [{ key: 'M_STRATEGY_OUTPUT', label: 'Download Marketing Strategy' }],
        sales: [{ key: 'S_STRATEGY_OUTPUT', label: 'Download Sales Strategy' }],
    };

    const sources = potentialPdfs[tab] || [];
    const data = state.lastApiByTab[tab]?.data || {};
    
    // Check if at least one valid PDF link exists for the current tab.
    const hasDownloads = sources.some(source => {
        const rawLink = data[source.key];
        return !!toDownloadLink(rawLink);
    });

    downloadBtn.style.display = "inline-flex"; // Always show the button structure

    if (hasDownloads) {
        downloadBtn.classList.remove('disabled');
        downloadBtn.setAttribute('aria-disabled', 'false');
        downloadText.textContent = "Download"; // Generic text
    } else {
        downloadBtn.classList.add('disabled');
        downloadBtn.setAttribute('aria-disabled', 'true');
        downloadText.textContent = "Not Available"; // Or "Download" if you prefer
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

  // --- START: MODIFIED CODE ---
  // Use a DocumentFragment to build the new chips off-DOM, preventing layout shift.
  const fragment = document.createDocumentFragment();
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

    fragment.appendChild(chip);
  });

  // Use .replaceChildren() for a single, atomic DOM update.
  blockTabs.replaceChildren(fragment);
  // --- END: MODIFIED CODE ---

  const hasChips = blockTabs.querySelectorAll(".blockBtn").length > 0;
  blockTabsRow.style.visibility = hasChips ? "visible" : "hidden";

  enforceDownloadProtection();

  // ✅ ACTIVATE SCROLL SPY
  activateScrollSpy();
}


/* ------------------- NEW: Manages the download button and its pop-up --------------- */
export function initDownloadButtonIsolation() {
    const btn = document.getElementById("downloadBtn");
    if (!btn) return;

    // A function to close any open popup
    const closePopup = () => {
        const existingPopup = document.querySelector('.download-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
    };

    btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // If the button is disabled, do nothing
        if (btn.classList.contains('disabled')) {
            return;
        }

        // If a popup is already open, this click should close it and do nothing else.
        const existingPopup = document.querySelector('.download-popup');
        if (existingPopup) {
            closePopup();
            return;
        }

        const tab = state.currentTab;
        const data = state.lastApiByTab[tab]?.data || {};
        
        // Define all known PDF sources here. This makes it easy to add more later.
        const pdfSources = {
            growth: [{ key: 'GS_OUTPUT', label: 'Download Growth Scan' }],
            targeting: [{ key: 'T_STRATEGY_OUTPUT', label: 'Download Targeting Strategy' }],
            offer: [{ key: 'O_STRATEGY_OUTPUT', label: 'Download Offer Strategy' }],
            marketing: [{ key: 'M_STRATEGY_OUTPUT', label: 'Download Marketing Strategy' }],
            // Example for when you add a second PDF:
            // marketing: [
            //   { key: 'M_STRATEGY_OUTPUT', label: 'Download Full Strategy' },
            //   { key: 'M_SUMMARY_OUTPUT', label: 'Download Summary' }
            // ],
            sales: [{ key: 'S_STRATEGY_OUTPUT', label: 'Download Sales Strategy' }],
        };

        const availableDownloads = (pdfSources[tab] || [])
            .map(source => {
                const rawLink = data[source.key];
                const finalLink = toDownloadLink(rawLink);
                return finalLink ? { url: finalLink, label: source.label } : null;
            })
            .filter(Boolean); // Filter out any nulls

        if (availableDownloads.length === 0) {
            console.warn("Download button clicked, but no links found for tab:", tab);
            return;
        }

        // If there's only one link, just trigger the download directly
        if (availableDownloads.length === 1) {
            window.location.href = availableDownloads[0].url;
            return;
        }
        
        // If there are multiple links, create and show the pop-up
        const popup = document.createElement('div');
        popup.className = 'download-popup';

        availableDownloads.forEach(download => {
            const link = document.createElement('a');
            link.href = download.url;
            link.textContent = download.label;
            link.target = '_self'; // Ensure it doesn't open a new tab
            popup.appendChild(link);
        });

        const parent = btn.closest('#blockTabsRow');
        if(parent) parent.appendChild(popup);

        // Add a one-time event listener to close the popup when clicking anywhere else
        setTimeout(() => {
            document.addEventListener('click', function closeHandler(event) {
                if (!popup.contains(event.target)) {
                    closePopup();
                    document.removeEventListener('click', closeHandler);
                }
            });
        }, 100);
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
