

---


## /js/pages/targeting.js


```js
import { APPS_SCRIPT_URL, token, nocacheFlag } from "../core/config.js";
import { state } from "../core/state.js";
import { inferAccess, esc, parseAreas } from "../core/utils.js";
import { detectMode, setABCMap } from "../core/abcMap.js";
import { populateBlockTabsFromPage, toggleFloatingCallBtn, maybeInsertUniversalUpgradeBlock, updateFloatingCTA } from "../core/ui.js";
import { finalBlockContent } from "../components/blocks.js";
import { fetchPdfLinks } from "../services/pdf.js";


export function renderTargetingTab() {
const contentDiv = document.getElementById("content");
if (!token) {
contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
return;
}
contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Targeting Strategy…</p></div>`;


const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
fetch(url)
.then((r) => r.json())
.then((api) => {
if (!api || !api.ok) {
contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
return;
}


state.lastApiByTab.targeting = { ...api, data: { ...api.data } };
const d = api.data || {};
state.lastAccess = inferAccess(d);


const view = d.T_STRATEGY_OUTPUT || "";
if (view) {
const { toDownloadLink } = await import("../core/utils.js");
state.dynamicPdfLinks.targeting = toDownloadLink(view);
updateFloatingCTA("targeting");
}


const allowFull = !!d.TS_PAID || !!d["4PBS_PAID"];
paintTargeting(api, allowFull);


const blockTabsRow = document.getElementById("blockTabsRow");
if (blockTabsRow) blockTabsRow.style.display = "block";
}