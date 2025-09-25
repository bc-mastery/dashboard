// /js/main.js  — master router (pure JS)

import {
  setTitleAndIcon,
  updateFloatingCTA,
  initDownloadButtonIsolation,
  initBlockChipDelegation,
} from "./core/ui.js";
import { state } from "./core/state.js";
import { token, getParam } from "./core/config.js";

// Page renderers
import { renderGrowthTab } from "./pages/growth.js";
import { renderTargetingTab } from "./pages/targeting.js";
import { renderOfferTab } from "./pages/offer.js";
import { renderMarketingTab } from "./pages/marketing.js";
import { renderSalesTab } from "./pages/sales.js";
import { renderMentoringTab } from "./pages/mentoring.js";
import { renderKnowledgeTab } from "./pages/knowledge.js";

/* ----------------------------- helpers ----------------------------- */
function getTabFromURL() {
  return getParam("tab") || "growth";
}

function setURLTab(tabName) {
  const next = new URL(window.location.href);
  next.searchParams.set("tab", tabName);
  next.searchParams.delete("refresh"); // Clean up refresh param after use
  history.replaceState(null, "", next.toString());
}

/* ------------------------------ router ----------------------------- */
async function loadTab(tabName) {
  window.scrollTo(0, 0);
  const contentDiv = document.getElementById("content");
  if (contentDiv) contentDiv.innerHTML = "";

  const forceRefresh = getParam("refresh") === "true";

  switch (tabName) {
    case "growth":      await renderGrowthTab(forceRefresh); break;
    case "targeting":   await renderTargetingTab(forceRefresh); break;
    case "offer":       await renderOfferTab(forceRefresh); break;
    case "marketing":   await renderMarketingTab(forceRefresh); break;
    case "sales":       await renderSalesTab(forceRefresh); break;
    case "mentoring":   await renderMentoringTab(forceRefresh); break;
    case "knowledge":   await renderKnowledgeTab(forceRefresh); break;
    default:            await renderGrowthTab(forceRefresh); break;
  }
  setURLTab(tabName);
}

/* ----------------------------- bootstrap --------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    const contentDiv = document.getElementById("content");
    if(contentDiv) contentDiv.innerHTML = `<div class="card"><p class="muted">Token missing in URL. Please check your link.</p></div>`;
    return;
  }

  // CORRECTED: Use event delegation for tab navigation
  const tabsContainer = document.getElementById("tabs");
  if (tabsContainer) {
    tabsContainer.addEventListener("click", (e) => {
      const tabBtn = e.target.closest(".tabBtn");
      if (tabBtn && tabsContainer.contains(tabBtn)) {
        e.preventDefault();
        const tabName = (tabBtn.dataset.tab || "growth").toLowerCase();
        state.currentTab = tabName;
        setTitleAndIcon(tabName);
        loadTab(tabName);
        updateFloatingCTA(tabName);
      }
    });
  }

  // Initial page load
  state.currentTab = getTabFromURL();
  setTitleAndIcon(state.currentTab);
  initDownloadButtonIsolation();
  initBlockChipDelegation();
  loadTab(state.currentTab).then(() => {
    updateFloatingCTA(state.currentTab);
  });
});
