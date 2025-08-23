

---


## /js/core/charts.js


```js
export function ensureCharts() {
return new Promise((resolve, reject) => {
if (window.google && google.charts) {
google.charts.load("current", { packages: ["corechart"] });
google.charts.setOnLoadCallback(resolve);
return;
}
const s = document.createElement("script");
s.src = "https://www.gstatic.com/charts/loader.js";
s.onload = () => {
google.charts.load("current", { packages: ["corechart"] });
google.charts.setOnLoadCallback(resolve);
};
s.onerror = reject;
document.head.appendChild(s);
});
}