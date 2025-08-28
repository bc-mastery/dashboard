// /js/main.js  — master router (pure JS)

import {
  setTitleAndIcon,
  updateFloatingCTA,
  initDownloadButtonIsolation,
} from "./core/ui.js";
import { state } from "./core/state.js";
import { token } from "./core/config.js";

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
  const p = new URLSearchParams(window.location.search);
  return (p.get("tab") || "growth").toLowerCase();
}

function setURLTab(tabName) {
  const next = new URL(window.location.href);
  next.searchParams.set("tab", tabName);
  history.replaceState(null, "", next.toString());
}

/* ------------------------------ router ----------------------------- */
function loadTab(tabName) {
  const contentDiv = document.getElementById("content");
  if (contentDiv) contentDiv.innerHTML = "";

  switch (tabName) {
    case "growth":
      renderGrowthTab();
      setTimeout(() => updateFloatingCTA("growth"), 100);
      break;
    case "targeting":
      renderTargetingTab();
      break;
    case "offer":
      renderOfferTab();
      break;
    case "marketing":
      renderMarketingTab();
      break;
    case "sales":
      renderSalesTab();
      break;
    case "mentoring":
      renderMentoringTab();
      break;
    case "knowledge":
      if (typeof renderKnowledgeTab === "function") renderKnowledgeTab();
      break;
    default:
      renderGrowthTab();
      setTimeout(() => updateFloatingCTA("growth"), 100);
  }
}

/* ----------------------------- bootstrap --------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    alert("Token missing in URL");
    return;
  }

  // Wire ONLY the PRIMARY navigation tabs (top strip)
  document.querySelectorAll("#tabs .tabBtn").forEach((tabBtn) => {
    tabBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const tabName = (tabBtn.dataset.tab || "growth").toLowerCase();
      state.currentTab = tabName;

      setURLTab(tabName);
      setTitleAndIcon(tabName);
      loadTab(tabName);
      updateFloatingCTA(tabName);
    });
  });

  // Initial page load
  state.currentTab = getTabFromURL();
  setTitleAndIcon(state.currentTab);
  initDownloadButtonIsolation();
  loadTab(state.currentTab);
  updateFloatingCTA(state.currentTab);
});
