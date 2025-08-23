

---


## /js/core/utils.js


```js
import { ACCESS } from "./config.js";


export function esc(str) {
if (!str) return "";
return String(str)
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#39;");
}


export function toDownloadLink(viewUrl) {
const match = String(viewUrl || "").match(/\/d\/([a-zA-Z0-9_-]+)\//);
if (match && match[1]) {
return `https://drive.google.com/uc?export=download&id=${match[1]}`;
}
return viewUrl;
}


export function getMinTabsRequiredForDownload() {
const row = document.getElementById("blockTabsRow");
const n = parseInt(row?.getAttribute("data-min-tabs") || "2", 10);
return Number.isFinite(n) && n > 0 ? n : 2;
}


export function truthyFlag(v) {
if (v === true) return true;
const s = String(v || "").trim().toLowerCase();
return s === "1" || s === "true" || s === "yes" || s === "paid" || s === "ok";
}


export function inferAccess(d = {}) {
const direct = String(d.ACCESS || "").toUpperCase();
if ([ACCESS.FULL_4PBS, ACCESS.TARGETING_ONLY, ACCESS.GS_ONLY].includes(direct)) return direct;


if (truthyFlag(d.PAID_4PBS) || truthyFlag(d.STRIPE_4PBS) || truthyFlag(d.FULL_4PBS)) return ACCESS.FULL_4PBS;
if (truthyFlag(d.PAID_TARGETING) || truthyFlag(d.STRIPE_TARGETING)) return ACCESS.TARGETING_ONLY;
return ACCESS.GS_ONLY;
}


}