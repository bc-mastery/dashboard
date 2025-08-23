// /js/pages/knowledge.js

export function renderKnowledgeTab() {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <div class="card scrollTarget" id="block-knowledge">
      <div class="sectionTitle">Knowledge Hub</div>
      <p class="muted">
        Planned module. We’ll add rendering + CTA rules when ready.
      </p>
    </div>
  `;
}
