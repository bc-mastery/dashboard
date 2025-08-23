

---


## /js/core/state.js


```js
import { ACCESS, params } from "./config.js";


export const state = {
lastApiByTab: {}, // cache of last JSON payload per tab
dynamicPdfLinks: {}, // tab -> direct download link
currentTab: (params.get("tab") || "growth").toLowerCase(),
lastAccess: ACCESS.GS_ONLY,
};