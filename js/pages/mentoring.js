// /js/pages/mentoring.js

export function renderMentoringTab() {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <div class="card scrollTarget" id="block-mentoring">
      <div class="sectionTitle">Mentoring</div>
      <p class="muted">
        This section is coming soon. We’ll plug in the same data flow and PDF generation once columns are finalized.
      </p>
    </div>
  `;
}
