

---


## /js/pages/sales.js


```js
import { APPS_SCRIPT_URL, token, nocacheFlag } from "../core/config.js";
import { state } from "../core/state.js";
import { inferAccess, parseAreas } from "../core/utils.js";
import { buildFirstBlockHTML, hydrateABCMaps, finalBlockContent } from "../components/blocks.js";
import { populateBlockTabsFromPage, toggleFloatingCallBtn, maybeInsertUniversalUpgradeBlock, updateFloatingCTA } from "../core/ui.js";
import { fetchPdfLinks } from "../services/pdf.js";


export function renderSalesTab() {
const contentDiv = document.getElementById("content");
if (!token) {
contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
return;
}


contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Sales Strategy…</p></div>`;


const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
fetch(url)
.then((r) => r.json())
.then((api) => {
if (!api || !api.ok) {
contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
return;
}


state.lastApiByTab.sales = { ...api, data: { ...api.data } };
const d = api.data || {};
state.lastAccess = inferAccess(d);


const view = d.S_STRATEGY_OUTPUT || "";
if (view) {
import("../core/utils.js").then(({ toDownloadLink }) => {
state.dynamicPdfLinks.sales = toDownloadLink(view);
updateFloatingCTA("sales");
});
}


const allowFull = !!d.SALES_PAID || !!d["4PBS_PAID"];
paintSales(api, allowFull);


const blockTabsRow = document.getElementById("blockTabsRow");
if (blockTabsRow) blockTabsRow.style.display = "block";
populateBlockTabsFromPage();
fetchPdfLinks("sales").then(() => updateFloatingCTA("sales"));
}