// /js/main.js
// Master router with persistent per-tab DOM cache.

import {
  setTitleAndIcon,
  updateFloatingCTA,
  initDownloadButtonIsolation,
  initBlockChipDelegation,
  populateBlockTabsFromPage,
  clearUpgradeBlock,
} from "./core/ui.js";

import { state } from "./core/state.js";
import { token, getParam } from "./core/config.js";


// ============================================================
// PAGE RENDERERS
// ============================================================

import { renderGrowthTab } from "./pages/growth.js";
import { renderTargetingTab } from "./pages/targeting.js";
import { renderOfferTab } from "./pages/offer.js";
import { renderMarketingTab } from "./pages/marketing.js";
import { renderSalesTab } from "./pages/sales.js";
import { renderKnowledgeTab } from "./pages/knowledge.js";


// ============================================================
// TAB DEFINITIONS
// ============================================================

const TAB_RENDERERS = {
  growth: renderGrowthTab,
  targeting: renderTargetingTab,
  offer: renderOfferTab,
  marketing: renderMarketingTab,
  sales: renderSalesTab,
  knowledge: renderKnowledgeTab,
};


// ============================================================
// PAGE DOM CACHE
//
// Each tab is rendered only once during the browser session.
//
// We keep the ACTUAL DOM nodes, not just HTML strings.
// This preserves:
// - chart DOM
// - help-button listeners
// - other page-specific event listeners
//
// Hard browser refresh clears this automatically.
// ============================================================

const pageCache = new Map();


// ============================================================
// ROUTER STATE
// ============================================================

let activeTab = null;
let routeInProgress = false;


// ============================================================
// HELPERS
// ============================================================

function getTabFromURL() {

  const requested =
    (
      getParam("tab") ||
      "growth"
    ).toLowerCase();


  return TAB_RENDERERS[requested]
    ? requested
    : "growth";
}


function setURLTab(tabName) {

  const next =
    new URL(
      window.location.href
    );


  next.searchParams.set(
    "tab",
    tabName
  );


  // One-time explicit refresh flag should not remain
  // in the URL after navigation.
  next.searchParams.delete(
    "refresh"
  );


  history.replaceState(
    null,
    "",
    next.toString()
  );
}


// ============================================================
// DETACH CURRENT PAGE
//
// Moving nodes into a DocumentFragment removes them from the
// visible document WITHOUT destroying them.
//
// Event listeners remain attached.
// ============================================================

function cacheCurrentPage() {

  if (!activeTab) {
    return;
  }


  const contentDiv =
    document.getElementById(
      "content"
    );


  if (!contentDiv) {
    return;
  }


  const fragment =
    document.createDocumentFragment();


  while (
    contentDiv.firstChild
  ) {

    fragment.appendChild(
      contentDiv.firstChild
    );
  }


  // ----------------------------------------------------------
  // Upgrade block lives OUTSIDE #content.
  //
  // Preserve it together with its owning tab.
  // ----------------------------------------------------------

  const upgradeBlock =
    document.querySelector(
      ".upgradeBlock"
    );


  if (
    upgradeBlock &&
    upgradeBlock.parentNode
  ) {

    upgradeBlock
      .parentNode
      .removeChild(
        upgradeBlock
      );
  }


  pageCache.set(
    activeTab,
    {
      fragment:
        fragment,

      upgradeBlock:
        upgradeBlock || null,
    }
  );
}


// ============================================================
// RESTORE CACHED PAGE
// ============================================================

function restoreCachedPage(
  tabName
) {

  const cached =
    pageCache.get(
      tabName
    );


  if (!cached) {

    return false;
  }


  const contentDiv =
    document.getElementById(
      "content"
    );


  if (!contentDiv) {

    return false;
  }


  // Remove any currently visible upgrade block.
  clearUpgradeBlock();


  // Restore the saved page DOM.
  contentDiv.appendChild(
    cached.fragment
  );


  // ----------------------------------------------------------
  // DocumentFragment becomes empty after appendChild().
  //
  // Create a fresh fragment for the NEXT time this tab
  // is detached.
  // ----------------------------------------------------------

  cached.fragment =
    document.createDocumentFragment();


  // Restore this tab's upgrade block, if it had one.
  if (
    cached.upgradeBlock
  ) {

    const footer =
      document.querySelector(
        ".siteFooter"
      );


    if (
      footer &&
      footer.parentNode
    ) {

      footer.parentNode.insertBefore(
        cached.upgradeBlock,
        footer
      );
    }
  }


  return true;
}


// ============================================================
// RENDER A TAB FOR THE FIRST TIME
// ============================================================

async function renderTabFirstTime(
  tabName,
  forceRefresh = false
) {

  const renderer =
    TAB_RENDERERS[
      tabName
    ];


  if (!renderer) {

    throw new Error(
      `Unknown Dashboard tab: ${tabName}`
    );
  }


  await renderer(
    forceRefresh
  );
}


// ============================================================
// REFRESH GLOBAL UI FOR ACTIVE PAGE
//
// The page itself stays cached, but these elements belong to
// the shared Dashboard shell and therefore need to reflect the
// tab that is currently visible.
// ============================================================

function refreshActiveTabUI(
  tabName
) {

  state.currentTab =
    tabName;


  document.body.setAttribute(
    "data-current-tab",
    tabName
  );


  setTitleAndIcon(
    tabName
  );


  // Rebuild the small secondary navigation chips from the
  // currently restored page DOM.
  populateBlockTabsFromPage();


  // Restore the correct PDF/download state.
  updateFloatingCTA(
    tabName
  );
}


// ============================================================
// MAIN TAB LOADER
// ============================================================

async function loadTab(
  tabName
) {

  if (routeInProgress) {

    return;
  }


  const normalizedTab =
    TAB_RENDERERS[
      tabName
    ]
      ? tabName
      : "growth";


  // Clicking the already-active tab should do nothing.
  if (
    normalizedTab ===
      activeTab &&
    pageCache.has(
      normalizedTab
    )
  ) {

    window.scrollTo(
      0,
      0
    );

    return;
  }


  routeInProgress =
    true;


  try {

    // --------------------------------------------------------
    // Save current page without destroying it.
    // --------------------------------------------------------

    if (activeTab) {

      cacheCurrentPage();
    }


    window.scrollTo(
      0,
      0
    );


    activeTab =
      normalizedTab;


    state.currentTab =
      normalizedTab;


    document.body.setAttribute(
      "data-current-tab",
      normalizedTab
    );


    setTitleAndIcon(
      normalizedTab
    );


    // --------------------------------------------------------
    // If already rendered:
    //
    // Restore immediately.
    // NO renderer.
    // NO API call.
    // NO HTML reconstruction.
    // --------------------------------------------------------

    const restored =
      restoreCachedPage(
        normalizedTab
      );


    if (restored) {

      console.log(
        `⚡ Page Cache Active: Restored ${normalizedTab} instantly.`
      );


      refreshActiveTabUI(
        normalizedTab
      );


      setURLTab(
        normalizedTab
      );


      return;
    }


    // --------------------------------------------------------
    // FIRST VISIT TO THIS MODULE
    // --------------------------------------------------------

    console.log(
      `🧩 First render: ${normalizedTab}`
    );


    const forceRefresh =
      getParam(
        "refresh"
      ) === "true";


    await renderTabFirstTime(
      normalizedTab,
      forceRefresh
    );


    // --------------------------------------------------------
    // IMPORTANT
    //
    // We deliberately do NOT detach the newly rendered page
    // yet. It remains visible.
    //
    // It will be moved into pageCache when the user leaves it.
    // --------------------------------------------------------

    refreshActiveTabUI(
      normalizedTab
    );


    setURLTab(
      normalizedTab
    );


  } catch (error) {

    console.error(
      `Failed to load Dashboard tab "${normalizedTab}":`,
      error
    );


    const contentDiv =
      document.getElementById(
        "content"
      );


    if (contentDiv) {

      contentDiv.innerHTML = `
        <div class="card">
          <p class="muted">
            Error loading this module.
          </p>
        </div>
      `;
    }


  } finally {

    routeInProgress =
      false;
  }
}


// ============================================================
// BOOTSTRAP
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {


    if (!token) {

      const contentDiv =
        document.getElementById(
          "content"
        );


      if (contentDiv) {

        contentDiv.innerHTML = `
          <div class="card">
            <p class="muted">
              Token missing in URL. Please check your link.
            </p>
          </div>
        `;
      }


      return;
    }


    // ========================================================
    // PRIMARY TAB NAVIGATION
    // ========================================================

    const tabsContainer =
      document.getElementById(
        "tabs"
      );


    if (tabsContainer) {

      tabsContainer.addEventListener(
        "click",
        async (e) => {


          const tabBtn =
            e.target.closest(
              ".tabBtn"
            );


          if (
            !tabBtn ||
            !tabsContainer.contains(
              tabBtn
            )
          ) {

            return;
          }


          e.preventDefault();


          const tabName =
            (
              tabBtn.dataset.tab ||
              "growth"
            ).toLowerCase();


          if (
            !TAB_RENDERERS[
              tabName
            ]
          ) {

            return;
          }


          await loadTab(
            tabName
          );
        }
      );
    }


    // ========================================================
    // SHARED UI INITIALIZATION
    // ========================================================

    initDownloadButtonIsolation();

    initBlockChipDelegation();


    // ========================================================
    // INITIAL PAGE
    // ========================================================

    const initialTab =
      getTabFromURL();


    activeTab =
      null;


    loadTab(
      initialTab
    ).then(
      () => {

        updateFloatingCTA(
          initialTab
        );
      }
    );
  }
);
