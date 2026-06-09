const PAGE_SIZE = 10;
let currentPage  = 1;
let totalCount   = 0;
let searchTerm   = '';
let isFullAccess = false;
let searchTimer;

document.addEventListener('DOMContentLoaded', async () => {
  if (!await initAuth()) return;
  document.body.insertAdjacentHTML('afterbegin', createSidebar('tags'));

  const user = getUserInfo();
  isFullAccess = user?.role === 'FullAccess';
  if (isFullAccess) document.getElementById('new-tag-btn').classList.remove('hidden');

  loadTags();

  document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTerm  = e.target.value.trim();
      currentPage = 1;
      loadTags();
    }, 300);
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; loadTags(); }
  });
  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentPage * PAGE_SIZE < totalCount) { currentPage++; loadTags(); }
  });
});


async function loadTags() {
  const tbody = document.getElementById('tags-body');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="4"><span class="spinner spinner-blue"></span> Loading…</td></tr>`;
  clearAlert('alert-container');

  try {
    let qs = `?page=${currentPage}&pageSize=${PAGE_SIZE}`;
    if (searchTerm) qs += `&search=${encodeURIComponent(searchTerm)}`;

    const data  = await apiRequest('GET', `/api/tags${qs}`);
    const items = data?.items ?? data?.data ?? (Array.isArray(data) ? data : []);
    totalCount  = data?.totalCount ?? data?.total ?? items.length;

    renderRows(items);
    updatePagination();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2.5rem;color:var(--red)">${escapeHtml(err.message)}</td></tr>`;
  }
}

function makeBadge(tag) {
  const color = tag.color || '#6B7280';
  const [r, g, b] = [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
  const bg = `rgba(${r},${g},${b},0.12)`;
  return `<span class="tag-badge" style="background:${bg};color:${color}">` +
    `<span class="tag-dot" style="background:${color}"></span>` +
    escapeHtml(tag.name) +
    `</span>`;
}

function renderRows(tags) {
  const tbody = document.getElementById('tags-body');
  if (!tags.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty" style="padding:3rem">
      <div class="empty-text">No tags found</div>
      ${searchTerm ? `<div class="empty-sub">Try a different search term</div>` : ''}
    </div></td></tr>`;
    return;
  }

  const EDIT  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  const TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;

  tbody.innerHTML = tags.map(t => `
    <tr>
      <td>${makeBadge(t)}</td>
      <td class="text-2 text-sm">${escapeHtml(t.description || '—')}</td>
      <td class="text-2 text-sm" style="white-space:nowrap">${formatDate(t.dateCreated || t.createdAt)}</td>
      <td>
        ${isFullAccess ? `
          <div class="flex gap-2">
            <button class="icon-btn" title="Edit"
              onclick="location.href='tag-form.html?id=${escapeHtml(String(t.id))}'">
              ${EDIT}
            </button>
            <button class="icon-btn danger" title="Delete"
              onclick="confirmDelete('${escapeHtml(String(t.id))}','${escapeHtml(t.name)}')">
              ${TRASH}
            </button>
          </div>`
          : `<span class="text-xs text-3">View only</span>`}
      </td>
    </tr>`).join('');
}

function updatePagination() {
  const start = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(currentPage * PAGE_SIZE, totalCount);
  document.getElementById('page-info').textContent =
    totalCount > 0 ? `Showing ${start}–${end} of ${totalCount} tags` : 'No tags';
  document.getElementById('prev-btn').disabled = currentPage <= 1;
  document.getElementById('next-btn').disabled = currentPage * PAGE_SIZE >= totalCount;
}

async function confirmDelete(id, name) {
  const ok = await confirmDialog(`Delete tag "${name}"? This action cannot be undone.`);
  if (!ok) return;
  try {
    await apiRequest('DELETE', `/api/tags/${id}`);
    if (totalCount % PAGE_SIZE === 1 && currentPage > 1) currentPage--;
    loadTags();
  } catch (err) {
    showAlert('alert-container', err.message, 'error');
  }
}
