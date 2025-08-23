

---


## /js/pages/marketing.js


```js
import { APPS_SCRIPT_URL, token, nocacheFlag } from "../core/config.js";
import { state } from "../core/state.js";
import { inferAccess, parseAreas } from "../core/utils.js";
import { buildFirstBlockHTML, hydrateABCMaps, finalBlockContent } from "../components/blocks.js";
import { populateBlockTabsFromPage, toggleFloatingCallBtn, maybeInsertUniversalUpgradeBlock, updateFloatingCTA } from "../core/ui.js";
import { fetchPdfLinks } from "../services/pdf.js";


export function renderMarketingTab() {
const contentDiv = document.getElementById("content");
if (!token) {
contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
return;
}


contentDiv.innerHTML = `<div class="card"><p class="muted">Loading Marketing Strategy…</p></div>`;


const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
fetch(url)
.then((r) => r.json())
.then((api) => {
if (!api || !api.ok) {
contentDiv.innerHTML = `<div class="card"><p class="muted">${(api && api.message) || "No data found."}</p></div>`;
return;
}


state.lastApiByTab.marketing = { ...api, data: { ...api.data } };
const d = api.data || {};
state.lastAccess = inferAccess(d);


const view = d.M_STRATEGY_OUTPUT || "";
if (view) {
import("../core/utils.js").then(({ toDownloadLink }) => {
state.dynamicPdfLinks.marketing = toDownloadLink(view);
updateFloatingCTA("marketing");
});
}


const allowFull = !!d.MARKETING_PAID || !!d["4PBS_PAID"];
paintMarketing(api, allowFull);


const blockTabsRow = document.getElementById("blockTabsRow");
if (blockTabsRow) blockTabsRow.style.display = "block";
populateBlockTabsFromPage();
fetchPdfLinks("marketing").then(() => updateFloatingCTA("marketing"));


maybeInsertUniversalUpgradeBlock({ isPreviewOnly: !allowFull, content: finalBlockContent.marketing });
toggleFloatingCallBtn(state.lastAccess === "GS_ONLY");
})
.catch((err) => {
console.error(err);
contentDiv.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err.message}</p></div>`;
});
}


}