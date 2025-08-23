

---


## /js/main.js (master router)


```js
import { TAB_TITLES } from "./core/config.js";
import { state } from "./core/state.js";
import { getTabFromURL } from "./core/utils.js";
import { setTitleAndIcon, updateFloatingCTA, initDownloadButtonIsolation } from "./core/ui.js";


import { renderGrowthTab } from "./pages/growth.js";
import { renderTargetingTab } from "./pages/targeting.js";
import { renderOfferTab } from "./pages/offer.js";
import { renderMarketingTab } from "./pages/marketing.js";
import { renderSalesTab } from "./pages/sales.js";
import { renderMentoringTab } from "./pages/mentoring.js";
import { renderKnowledgeTab } from "./pages/knowledge.js";


function loadTab(tabName) {
const contentDiv = document.getElementById("content");
contentDiv.innerHTML = "";


switch (tabName) {
case "growth":
renderGrowthTab();
setTimeout(() => updateFloatingCTA(state.currentTab), 100);
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
renderKnowledgeTab();
break;
default:
renderGrowthTab();
}
}


function wireTabs() {
const tabs = document.querySelectorAll(".tabBtn");
tabs.forEach((tabBtn) => {
tabBtn.addEventListener("click", () => {
const tabName = (tabBtn.dataset.tab || "growth").toLowerCase();
state.currentTab = tabName;


const next = new URL(window.location.href);
next.searchParams.set("tab", tabName);
});