// /js/pages/growth.js
import { ensureCharts } from "../core/charts.js";
import { toggleFloatingCallBtn, updateFloatingCTA } from "../core/ui.js";
import { state } from "../core/state.js";
import { ACCESS } from "../core/config.js";

export function renderGrowthTab() {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <div class="card">
      <div id="gsDonut" style="width:100%;height:280px;"></div>
    </div>
  `;

  ensureCharts()
    .then(() => {
      const data = google.visualization.arrayToDataTable([
        ["Status", "Value"],
        ["Untapped", 30],
        ["Utilized", 70],
      ]);
      const options = {
        pieHole: 0.6,
        legend: { position: "right", textStyle: { color: "#024D4F", fontSize: 12, bold: true } },
        pieSliceText: "none",
        backgroundColor: "transparent",
        slices: { 0: { color: "#D34B4B" }, 1: { color: "#30BA80" } },
      };
      const chart = new google.visualization.PieChart(document.getElementById("gsDonut"));
      chart.draw(data, options);
    })
    .catch(() => {
      // ignore chart load errors silently
    });

  // Show floating call button only for GS-only users
  toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);

  // Update the download CTA after initial render
  setTimeout(() => updateFloatingCTA(state.currentTab), 100);
}
