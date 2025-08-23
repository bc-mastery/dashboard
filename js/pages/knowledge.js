// /js/pages/knowledge.js
import { APPS_SCRIPT_URL, token, nocacheFlag, ACCESS } from "../core/config.js";
import { state, setCurrentTab } from "../core/state.js";
import { inferAccess, toDownloadLink, esc } from "../core/utils.js";
import {
  populateBlockTabsFromPage,
  toggleFloatingCallBtn,
  updateFloatingCTA,
  clearUpgradeBlock,
} from "../core/ui.js";
import { fetchPdfLinks } from "../services/pdf.js";

/* ------------------------------ public API ------------------------------ */
export async function renderKnowledgeTab() {
  // Mark active tab & clear any leftover upgrade block from previous tab
  setCurrentTab("knowledge");
  document.body.setAttribute("data-current-tab", "knowledge");
  clearUpgradeBlock();

  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  if (!token) {
    contentDiv.innerHTML = `<div class="card"><p class="muted">No token provided in URL.</p></div>`;
    return;
  }

  contentDiv.innerHTML = `
    <div class="card" id="block-knowledge">
      <div class="sectionTitle">Knowledge Hub</div>
      <p class="muted">Loading your resources…</p>
    </div>
  `;

  try {
    const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${nocacheFlag ? "&nocache=1" : ""}`;
    const r = await fetch(url);
    const api = await r.json();

    if (!api || !api.ok) {
      contentDiv.innerHTML = `
        <div class="card scrollTarget" id="block-knowledge">
          <div class="sectionTitle">Knowledge Hub</div>
          <p class="muted">${(api && api.message) || "No data found."}</p>
        </div>`;
      postRender();
      return;
    }

    // Cache + access
    state.lastApiByTab.knowledge = { ...api, data: { ...api.data } };
    const d = api.data || {};
    state.lastAccess = inferAccess(d);

    // Header brand text (optional)
    const brandEl = document.getElementById("brandName");
    if (brandEl) {
      const full = String(d.Brand || "");
      const short = full.length > 80 ? full.slice(0, 80) : full;
      brandEl.textContent = short;
      brandEl.title = full;
    }

    // Prefer a master Knowledge PDF for the main page CTA if present
    const masterPdfRaw =
      d.KNOWLEDGE_OUTPUT ||
      d.K_MASTER_PDF ||
      d.KNOWLEDGE_PDF ||
      ""; // leave empty if none
    if (masterPdfRaw) {
      state.dynamicPdfLinks.knowledge = toDownloadLink(masterPdfRaw);
    }

    // Build resources (PDFs and more) from several possible formats
    const resources = normalizeKnowledgeResources(d);

    // Render page
    contentDiv.innerHTML = buildKnowledgeHTML(resources);

    // Wire up search
    wireKnowledgeSearch();

    // Secondary chips row (built from section blocks per tag)
    const blockTabsRow = document.getElementById("blockTabsRow");
    if (blockTabsRow) blockTabsRow.style.display = "block";
    populateBlockTabsFromPage();

    // Try dynamic PDF mapping (Apps Script pdf mode), then refresh CTA
    try {
      await fetchPdfLinks("knowledge"); // if your backend returns a key for this tab, it will attach here
    } catch (_) {
      /* ignore */
    }
    updateFloatingCTA("knowledge");

    // Floating call button same rule as elsewhere
    toggleFloatingCallBtn(state.lastAccess === ACCESS.GS_ONLY);
  } catch (err) {
    console.error(err);
    const contentDiv2 = document.getElementById("content");
    if (contentDiv2) {
      contentDiv2.innerHTML = `<div class="card"><p class="muted">Error loading data: ${err?.message || err}</p></div>`;
    }
  } finally {
    postRender();
  }
}

/* ------------------------------ helpers ------------------------------ */

/**
 * Accepts multiple backend shapes and normalizes to:
 * [{ title, desc, url, tag, type, date, size }]
 */
function normalizeKnowledgeResources(d) {
  // 1) Preferred: JSON array in one of these fields
  const jsonStr =
    d.K_RESOURCES ||
    d.KNOWLEDGE_ITEMS ||
    d.KNOWLEDGE_JSON ||
    "";

  let list = [];
  if (jsonStr) {
    try {
      const arr = JSON.parse(jsonStr);
      if (Array.isArray(arr)) list = arr;
    } catch {
      // fall through to list fallback
    }
  }

  // 2) Fallback: newline list where each line = Title | URL | Tag | (optional)Desc
  if (!Array.isArray(list) || list.length === 0) {
    const rawList = d.KNOWLEDGE_LIST || d.K_RESOURCES_LIST || "";
    if (rawList) {
      list = rawList
        .split(/\n+/)
        .map((line) => {
          const parts = line.split("|").map((s) => s?.trim());
          const [title, url, tag, desc] = parts;
          if (!title || !url) return null;
          return { title, url, tag: tag || "Resource", desc: desc || "" };
        })
        .filter(Boolean);
    }
  }

  // Normalize & fill type
  return list.map((r) => {
    const title = String(r.title || "Untitled");
    const url = String(r.url || "");
    const tag = String(r.tag || r.category || r.type || "Resource");
    const desc = r.desc ? String(r.desc) : "";
    const type = inferTypeFromUrl(r.type ? String(r.type) : url);
    const date = r.date || "";
    const size = r.size || "";
    return { title, url, tag, desc, type, date, size };
  });
}

function inferTypeFromUrl(u) {
  const s = String(u || "").toLowerCase();
  if (s.endsWith(".pdf")) return "pdf";
  if (s.includes("drive.google.com")) return "pdf"; // most of these are PDFs in your flow
  if (s.includes("youtube.com") || s.includes("youtu.be") || s.includes("vimeo.com")) return "video";
  return "link";
}

/* ------------------------------ render ------------------------------ */

function buildKnowledgeHTML(resources) {
  // Group by tag for sections & chip navigation
  const groups = groupBy(resources, (r) => r.tag || "Resources");
  const tags = Object.keys(groups);

  const search = `
    <div class="card" id="block-knowledge">
      <div class="sectionTitle">Knowledge Hub</div>
      <div style="display:flex;gap:10px;align-items:center;margin:8px 0 12px">
        <input id="knowledgeSearch" type="search" placeholder="Search resources..."
               style="flex:1; padding:10px 12px; border-radius:10px; border:1px solid rgba(2,77,79,.2); font-size:14px" />
        <span id="knowledgeCount" class="muted" aria-live="polite"></span>
      </div>
      <p class="muted" style="margin-top:4px">
        Browse your PDFs, links, and videos. Use the search box to filter by title, tag, or description.
      </p>
    </div>
  `;

  const sections = tags
    .map((tag) => {
      const safeTagId = slugify(tag);
      const items = groups[tag];
      return `
        <section class="card scrollTarget" id="block-${safeTagId}">
          <div class="sectionTitle">${esc(tag)}</div>
          <div class="knowledgeGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
            ${items.map(renderResourceCard).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  // If there are no resources at all, show a friendly empty state
  const empty = `
    <section class="card scrollTarget" id="block-resources">
      <div class="sectionTitle">Resources</div>
      <p class="muted">No resources are available yet. Once your PDFs or links are added to the sheet, they will appear here automatically.</p>
    </section>
  `;

  return search + (resources.length ? sections : empty);
}

function renderResourceCard(item) {
  const isPdf = item.type === "pdf";
  const href = isPdf ? toDownloadLink(item.url) : item.url;
  const aria = `${item.title}${item.desc ? ". " + item.desc : ""}`;
  const badge =
    `<span class="muted" style="font-size:12px;border:1px solid rgba(2,77,79,.2);padding:2px 8px;border-radius:999px">${esc(item.tag || item.type)}</span>`;
  const meta =
    (item.date || item.size)
      ? `<div class="muted" style="font-size:12px">${item.date ? esc(item.date) : ""}${item.date && item.size ? " • " : ""}${item.size ? esc(item.size) : ""}</div>`
      : "";

  // Reuse existing .btn styles from your site
  const action = isPdf
    ? `<a class="btn btn-primary" href="${href}" download target="_self" rel="noopener">Download PDF</a>`
    : `<a class="btn btn-outline" href="${href}" target="_blank" rel="noopener">Open</a>`;

  return `
    <article class="knowledgeCard" role="article" aria-label="${esc(aria)}"
             data-title="${esc(item.title).toLowerCase()}"
             data-tag="${esc(item.tag || "").toLowerCase()}"
             data-desc="${esc(item.desc || "").toLowerCase()}">
      <div style="display:flex;flex-direction:column;gap:8px;border:1px solid rgba(2,77,79,.12);border-radius:12px;padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <h3 style="font-size:16px;line-height:1.25;margin:0">${esc(item.title)}</h3>
          ${badge}
        </div>
        ${item.desc ? `<p class="muted" style="margin:0">${esc(item.desc)}</p>` : ""}
        ${meta}
        <div style="margin-top:4px">${action}</div>
      </div>
    </article>
  `;
}

/* ------------------------------ interactions ------------------------------ */

function wireKnowledgeSearch() {
  const input = document.getElementById("knowledgeSearch");
  const count = document.getElementById("knowledgeCount");
  if (!input || !count) return;

  const allCards = Array.from(document.querySelectorAll(".knowledgeCard"));
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    allCards.forEach((card) => {
      const hay =
        (card.getAttribute("data-title") || "") +
        " " +
        (card.getAttribute("data-tag") || "") +
        " " +
        (card.getAttribute("data-desc") || "");
      const show = !q || hay.includes(q);
      card.style.display = show ? "" : "none";
      if (show) visible += 1;
    });
    count.textContent = visible === allCards.length
      ? `${visible} items`
      : `${visible} / ${allCards.length} items`;
  };

  input.addEventListener("input", apply, { passive: true });
  apply();
}

/* ------------------------------ misc utils ------------------------------ */

function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    const k = fn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function postRender() {
  // Nothing special yet; hook for future enhancements if needed
}
