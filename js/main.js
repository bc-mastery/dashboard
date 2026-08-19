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
import "./core/methodTheme.js";

import { renderGrowthTab } from "./pages/growth.js";
import { renderTargetingTab } from "./pages/targeting.js";
import { renderOfferTab } from "./pages/offer.js";
import { renderMarketingTab } from "./pages/marketing.js";
import { renderSalesTab } from "./pages/sales.js";
import { renderMethodTab } from "./pages/method.js";
import { renderKnowledgeTab } from "./pages/knowledge.js";

const TAB_RENDERERS = {
  growth: renderGrowthTab,
  targeting: renderTargetingTab,
  offer: renderOfferTab,
  marketing: renderMarketingTab,
  sales: renderSalesTab,
  method: renderMethodTab,
  knowledge: renderKnowledgeTab,
};

const pageCache = new Map();
let activeTab = null;
let routeInProgress = false;

function ensureMethodTabButton() {
  const tabs = document.getElementById("tabs");
  if (!tabs || tabs.querySelector('[data-tab="method"]')) return;

  const button = document.createElement("button");
  button.className = "tabBtn";
  button.dataset.tab = "method";
  button.type = "button";
  button.innerHTML = `
    <img src="./assets/icons/Icon_method_green.svg" alt="">
    <span>Method</span>
  `;
  tabs.appendChild(button);
}

function getTabFromURL() {
  const requested = (getParam("tab") || "growth").toLowerCase();
  return TAB_RENDERERS[requested] ? requested : "growth";
}

function setURLTab(tabName) {
  const next = new URL(window.location.href);
  next.searchParams.set("tab", tabName);
  next.searchParams.delete("refresh");
  history.replaceState(null, "", next.toString());
}

function cacheCurrentPage() {
  if (!activeTab) return;
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  const fragment = document.createDocumentFragment();
  while (contentDiv.firstChild) fragment.appendChild(contentDiv.firstChild);

  const upgradeBlock = document.querySelector(".upgradeBlock");
  if (upgradeBlock?.parentNode) upgradeBlock.parentNode.removeChild(upgradeBlock);

  pageCache.set(activeTab, {
    fragment,
    upgradeBlock: upgradeBlock || null,
  });
}

function restoreCachedPage(tabName) {
  const cached = pageCache.get(tabName);
  if (!cached) return false;

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return false;

  clearUpgradeBlock();
  contentDiv.appendChild(cached.fragment);
  cached.fragment = document.createDocumentFragment();

  if (cached.upgradeBlock) {
    const footer = document.querySelector(".siteFooter");
    if (footer?.parentNode) footer.parentNode.insertBefore(cached.upgradeBlock, footer);
  }

  return true;
}

async function renderTabFirstTime(tabName, forceRefresh = false) {
  const renderer = TAB_RENDERERS[tabName];
  if (!renderer) throw new Error(`Unknown Dashboard tab: ${tabName}`);
  await renderer(forceRefresh);
}

function refreshActiveTabUI(tabName) {
  state.currentTab = tabName;
  document.body.setAttribute("data-current-tab", tabName);
  setTitleAndIcon(tabName);
  populateBlockTabsFromPage();
  updateFloatingCTA(tabName);
}

async function loadTab(tabName) {
  if (routeInProgress) return;

  const normalizedTab = TAB_RENDERERS[tabName] ? tabName : "growth";

  if (normalizedTab === activeTab && pageCache.has(normalizedTab)) {
    window.scrollTo(0, 0);
    return;
  }

  routeInProgress = true;

  try {
    if (activeTab) cacheCurrentPage();
    window.scrollTo(0, 0);

    activeTab = normalizedTab;
    state.currentTab = normalizedTab;
    document.body.setAttribute("data-current-tab", normalizedTab);
    setTitleAndIcon(normalizedTab);

    if (restoreCachedPage(normalizedTab)) {
      console.log(`⚡ Page Cache Active: Restored ${normalizedTab} instantly.`);
      refreshActiveTabUI(normalizedTab);
      setURLTab(normalizedTab);
      return;
    }

    console.log(`🧩 First render: ${normalizedTab}`);
    const forceRefresh = getParam("refresh") === "true";
    await renderTabFirstTime(normalizedTab, forceRefresh);

    refreshActiveTabUI(normalizedTab);
    setURLTab(normalizedTab);
  } catch (error) {
    console.error(`Failed to load Dashboard tab "${normalizedTab}":`, error);
    const contentDiv = document.getElementById("content");
    if (contentDiv) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading this module.</p></div>`;
    }
  } finally {
    routeInProgress = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ensureMethodTabButton();

  if (!token) {
    const contentDiv = document.getElementById("content");
    if (contentDiv) {
      contentDiv.innerHTML = `<div class="card"><p class="muted">Token missing in URL. Please check your link.</p></div>`;
    }
    return;
  }

  const tabsContainer = document.getElementById("tabs");
  if (tabsContainer) {
    tabsContainer.addEventListener("click", async (event) => {
      const tabBtn = event.target.closest(".tabBtn");
      if (!tabBtn || !tabsContainer.contains(tabBtn)) return;

      event.preventDefault();
      const tabName = (tabBtn.dataset.tab || "growth").toLowerCase();
      if (!TAB_RENDERERS[tabName]) return;
      await loadTab(tabName);
    });
  }

  initDownloadButtonIsolation();
  initBlockChipDelegation();

  const initialTab = getTabFromURL();
  activeTab = null;
  loadTab(initialTab).then(() => updateFloatingCTA(initialTab));
});
