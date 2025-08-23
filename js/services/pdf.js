

---


## /js/services/pdf.js


```js
import { APPS_SCRIPT_URL, token } from "../core/config.js";
import { state } from "../core/state.js";


export function fetchPdfLinks(tab) {
if (!token || !tab) return Promise.resolve();
const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}&mode=pdf`;
return fetch(url)
.then((r) => r.json())
.then((resp) => {
if (!resp || !resp.ok || !resp.data) {
console.warn("No valid PDF data returned for tab:", tab);
return;
}
if (resp.data[tab]) {
state.dynamicPdfLinks[tab] = resp.data[tab];
} else {
console.warn(`No PDF link found in Apps Script response for tab: ${tab}`);
}
})
.catch((err) => console.error("PDF fetch error:", err));
}