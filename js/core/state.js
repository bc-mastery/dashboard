// /js/core/state.js
import { ACCESS, params } from "./config.js";

export const state = {
  lastApiByTab: {},      // cache of last JSON payload per tab
  dynamicPdfLinks: {},   // tab -> direct download link
  currentTab: (params.get("tab") || "growth").toLowerCase(),
  lastAccess: ACCESS.GS_ONLY,
};

/**
 * Centralized setter so UI + async guards stay in sync.
 * Call at the start of each renderXTab().
 */
export function setCurrentTab(tab) {
  const t = String(tab || "").toLowerCase() || "growth";
  state.currentTab = t;
  if (typeof document !== "undefined" && document.body) {
    document.body.setAttribute("data-current-tab", t);
  }
}
