// /js/core/charts.js
export function ensureCharts() {
  return new Promise((resolve, reject) => {
    // If the Google Charts loader is already present, just (re)load the package and resolve on callback.
    if (window.google && google.charts) {
      google.charts.load("current", { packages: ["corechart"] });
      google.charts.setOnLoadCallback(resolve);
      return;
    }

    // Otherwise inject the loader script once, then load the package.
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
