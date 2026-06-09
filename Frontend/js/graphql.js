const PRESETS = {
  list: `query {
  tags(page: 1, pageSize: 10) {
    items {
      id
      name
      color
      description
      dateCreated
    }
    totalCount
  }
}`,

  get: `query {
  tag(id: "PASTE-UUID-HERE") {
    id
    name
    color
    description
  }
}`,

  search: `query {
  searchTags(searchTerm: "SEARCH-TERM") {
    id
    name
    color
    description
  }
}`,

  create: `mutation {
  createTag(name: "NewTag", color: "#FF0000", description: "desc") {
    id
    name
    color
  }
}`,

  update: `mutation {
  updateTag(id: "PASTE-UUID-HERE", name: "UpdatedName", color: "#00FF00", description: "updated") {
    id
    name
    color
  }
}`,

  delete: `mutation {
  deleteTag(id: "PASTE-UUID-HERE")
}`,
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!await initAuth()) return;
  document.body.insertAdjacentHTML('afterbegin', createSidebar('graphql'));

  const user = getUserInfo();
  if (user?.role !== 'FullAccess') {
    document.getElementById('preset-create').style.display = 'none';
    document.getElementById('preset-update').style.display = 'none';
    document.getElementById('preset-delete').style.display = 'none';
  }

  fetchModeBadge();

  document.getElementById('gql-execute-btn').addEventListener('click', executeQuery);

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('gql-query-textarea').value = PRESETS[btn.dataset.preset];
    });
  });
});

async function executeQuery() {
  const text       = document.getElementById('gql-query-textarea').value.trim();
  const responseEl = document.getElementById('gql-response');
  const statusEl   = document.getElementById('gql-response-status');

  if (!text) return;

  responseEl.className = 'response-pre';
  responseEl.textContent = 'Executing…';
  statusEl.className = 'text-xs text-3';
  statusEl.textContent = '';

  try {
    let data;
    const isMutation = /\bmutation\b/i.test(text);

    if (isMutation) {
      data = await apiRequest('POST', '/graphql', { query: text });
    } else {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      data = await res.json();
    }

    const hasErrors = Array.isArray(data?.errors) && data.errors.length > 0;
    responseEl.className = hasErrors ? 'response-pre has-errors' : 'response-pre';
    responseEl.textContent = JSON.stringify(data, null, 2);
    statusEl.className = hasErrors ? 'text-xs response-status-err' : 'text-xs response-status-ok';
    statusEl.textContent = hasErrors ? `${data.errors.length} error(s)` : 'OK';
  } catch (err) {
    responseEl.className = 'response-pre has-errors';
    responseEl.textContent = err.message;
    statusEl.className = 'text-xs response-status-err';
    statusEl.textContent = 'Error';
  }
}

async function fetchModeBadge() {
  const el = document.getElementById('mode-badge');
  if (!el) return;
  try {
    const data = await fetch('/api/config/mode').then(r => r.json());
    const isExternal = data.useExternalApi;
    const label  = isExternal ? 'PUBLIC API' : 'LOCAL DB';
    const styles = isExternal
      ? 'background:#f5f3ff;border:1px solid #ddd6fe;color:#7c3aed'
      : 'background:var(--green-bg);border:1px solid var(--green-border);color:var(--green)';
    el.innerHTML = `
      <span style="${styles};display:inline-flex;align-items:center;gap:0.375rem;
                   padding:0.3rem 0.75rem;border-radius:var(--r-full);font-size:0.75rem;
                   font-weight:700;letter-spacing:0.06em;white-space:nowrap">
        <span style="width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0"></span>
        ${label}
      </span>
      <span style="font-size:0.75rem;color:var(--text-3);margin-left:0.25rem">${escapeHtml(data.mode)}</span>`;
    applyModePresets(isExternal);
  } catch {}
}

function applyModePresets(useExternalApi) {
  const isFullAccess = getUserInfo()?.role === 'FullAccess';
  document.getElementById('preset-get').style.display    = useExternalApi ? 'none' : '';
  document.getElementById('preset-update').style.display = isFullAccess ? '' : 'none';
}
