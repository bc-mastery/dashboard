// /js/pages/mentoring.js
import { ACCESS } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";

export function renderMentoringTab() {
  // Mark active tab & clear any leftover upgrade block from previous tab
  setCurrentTab("mentoring");
  document.body.setAttribute("data-current-tab", "mentoring");
  clearUpgradeBlock();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  // Simple placeholder content for now
  contentDiv.innerHTML = `
    <div class="card scrollTarget" id="block-mentoring">
      <div class="sectionTitle">Mentoring</div>
      <p class="muted">
        This section is coming soon. We’ll plug in the same data flow and PDF generation once columns are finalized.
      </p>
    </div>
  `;

  // Show the secondary chips row and populate chips from sections (even if it’s just one)
  const blockTabsRow = document.getElementById("blockTabsRow");
  if (blockTabsRow) blockTabsRow.style.display = "block";
  populateBlockTabsFromPage();

  // Update the Download CTA (will show as “not available” until a PDF is wired)
  updateFloatingCTA("mentoring");

  // Keep same behavior as other tabs for the floating call button
  toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
}
