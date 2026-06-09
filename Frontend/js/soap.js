document.addEventListener('DOMContentLoaded', async () => {
  if (!await initAuth()) return;
  document.body.insertAdjacentHTML('afterbegin', createSidebar('soap'));

  document.getElementById('search-btn').addEventListener('click', handleSoapSearch);
  document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSoapSearch();
  });
});

async function handleSoapSearch() {
  const term      = document.getElementById('search-input').value.trim();
  const resultsEl = document.getElementById('soap-results');
  clearAlert('alert-container');

  const btn  = document.getElementById('search-btn');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Searching…`;

  try {
    const data = await apiRequest('POST', '/api/soap/search', { searchTerm: term });

    const tags      = data?.tags ?? data?.results ?? data?.items ?? (Array.isArray(data) ? data : []);
    const total     = data?.totalFound ?? data?.total ?? tags.length;
    const isValid   = data?.isXmlValid ?? data?.xmlValid ?? true;
    const valErrors = data?.validationErrors ?? [];

    const CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const CROSS = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    let html = `<div class="card mb-4">
      <div class="card-header">
        <span class="card-title">${total} result${total !== 1 ? 's' : ''} found</span>
        ${isValid
          ? `<span class="valid-badge">${CHECK} XML Valid</span>`
          : `<span class="invalid-badge">${CROSS} XML Invalid</span>`}
      </div>`;

    if (!isValid && valErrors.length) {
      html += `<div class="card-body-sm">
        <div class="alert alert-error" style="margin-bottom:0">
          <div><strong>Validation errors:</strong><ul style="margin:.5rem 0 0 1.25rem">
            ${valErrors.map(e => `<li>${escapeHtml(String(e))}</li>`).join('')}
          </ul></div>
        </div>
      </div>`;
    }

    if (tags.length) {
      html += `<div style="overflow-x:auto"><table class="tbl">
        <thead><tr><th>Tag</th><th>Description</th><th>Created</th></tr></thead>
        <tbody>${tags.map(t => {
          const color = t.color || '#6B7280';
          const [r,g,b] = [parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16)];
          return `<tr>
            <td><span class="tag-badge" style="background:rgba(${r},${g},${b},.12);color:${color}">
              <span class="tag-dot" style="background:${color}"></span>${escapeHtml(t.name)}
            </span></td>
            <td class="text-2 text-sm">${escapeHtml(t.description || '—')}</td>
            <td class="text-2 text-sm">${formatDate(t.dateCreated || t.createdAt)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
    } else {
      html += `<div class="empty"><div class="empty-text">No matching tags</div></div>`;
    }

    html += `</div>`;
    resultsEl.innerHTML = html;
    resultsEl.classList.remove('hidden');
    appendJakartaPanel(resultsEl, { tags, isValid, valErrors });
  } catch (err) {
    showAlert('alert-container', err.message, 'error');
    resultsEl.classList.add('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

function appendJakartaPanel(container, { tags, isValid, valErrors }) {
  const SHIELD = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>`;
  const CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/></svg>`;
  const CROSS = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const summaryHtml = `
    <div style="padding:0.75rem 1.125rem;display:flex;gap:1.25rem;align-items:center;
                flex-wrap:wrap;border-bottom:1px solid var(--border);background:var(--bg)">
      <span class="text-sm text-2"><strong>${tags.length}</strong> tag(ova) pronađeno</span>
      ${isValid
        ? `<span class="valid-badge">${CHECK} XML Validan</span>`
        : `<span class="invalid-badge">${CROSS} XML Nevaljano</span>`}
    </div>`;

  let contentHtml;
  if (!isValid && valErrors.length) {
    contentHtml = `<div class="card-body-sm">
      <ul style="margin:0;padding-left:1.25rem;list-style:disc">
        ${valErrors.map(e =>
          `<li style="font-size:0.8rem;color:#991b1b;line-height:1.6;margin:.1rem 0">
            ${escapeHtml(String(e))}
          </li>`).join('')}
      </ul>
    </div>`;
  } else if (tags.length === 0) {
    contentHtml = `<div class="empty" style="padding:1.5rem">
      <div class="empty-text">Nema tagova za prikaz</div>
    </div>`;
  } else {
    contentHtml = `<div style="overflow:hidden">
      ${tags.map(t => `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:0.75rem 1.125rem;border-bottom:1px solid var(--border)">
          <span style="font-size:0.875rem;font-weight:600;color:var(--text)">
            ${escapeHtml(t.name || '—')}
          </span>
          <span class="valid-badge">${CHECK} Valjano</span>
        </div>`).join('')}
    </div>`;
  }

  container.insertAdjacentHTML('beforeend', `
    <div id="jakarta-panel" class="card mt-4">
      <button id="jakarta-toggle" onclick="toggleJakartaPanel()"
        style="width:100%;display:flex;align-items:center;justify-content:space-between;
               padding:0.875rem 1.125rem;background:none;border:none;cursor:pointer;
               text-align:left;border-radius:var(--r-lg)">
        <span style="display:flex;align-items:center;gap:0.5rem;font-size:0.9375rem;
                     font-weight:600;color:var(--text)">
          ${SHIELD} Prikaži Jakarta validaciju
        </span>
        <span id="jakarta-arrow"
          style="font-size:0.7rem;color:var(--text-3);letter-spacing:.05em">▼</span>
      </button>
      <div id="jakarta-body" class="hidden" style="border-top:1px solid var(--border)">
        ${summaryHtml}${contentHtml}
      </div>
    </div>`);
}

function toggleJakartaPanel() {
  const body  = document.getElementById('jakarta-body');
  const arrow = document.getElementById('jakarta-arrow');
  const btn   = document.getElementById('jakarta-toggle');
  if (!body) return;

  const nowHidden = body.classList.toggle('hidden');
  if (arrow) arrow.textContent = nowHidden ? '▼' : '▲';

  const labelSpan = btn?.querySelector('span:first-child');
  if (labelSpan) {
    const svg = labelSpan.querySelector('svg');
    labelSpan.textContent = nowHidden ? 'Prikaži Jakarta validaciju' : 'Sakrij Jakarta validaciju';
    if (svg) labelSpan.prepend(svg);
  }
}
