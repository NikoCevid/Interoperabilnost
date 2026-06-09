let editId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!await initAuth()) return;
  if (!checkFullAccess()) return;
  document.body.insertAdjacentHTML('afterbegin', createSidebar('tags'));

  const params = new URLSearchParams(window.location.search);
  editId = params.get('id') || null;

  const picker = document.getElementById('color-picker');
  const hexIn  = document.getElementById('color-hex');

  picker.addEventListener('input', () => { hexIn.value = picker.value.toUpperCase(); });
  hexIn.addEventListener('input', () => {
    const v = hexIn.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) picker.value = v;
  });

  if (editId) {
    document.getElementById('form-title').textContent    = 'Edit Tag';
    document.getElementById('form-subtitle').textContent = 'Update tag details';
    document.getElementById('card-title').textContent    = 'Tag details';
    document.getElementById('submit-btn').textContent    = 'Update Tag';
    await loadTag(editId);
  }

  document.getElementById('tag-form').addEventListener('submit', handleSubmit);
});

async function loadTag(id) {
  try {
    const tag = await apiRequest('GET', `/api/tags/${id}`);
    if (!tag) throw new Error('Server returned an empty response.');
    document.getElementById('name-input').value   = tag.name        || '';
    document.getElementById('desc-input').value   = tag.description || '';
    const color = tag.color || '#6366F1';
    document.getElementById('color-picker').value = color;
    document.getElementById('color-hex').value    = color.toUpperCase();
  } catch (err) {
    const detail = err.status ? ` (HTTP ${err.status})` : '';
    showAlert('alert-container', `Failed to load tag${detail}: ${err.message}`, 'error');
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  clearAlert('alert-container');

  const name  = document.getElementById('name-input').value.trim();
  const color = document.getElementById('color-hex').value.trim() ||
                document.getElementById('color-picker').value;
  const desc  = document.getElementById('desc-input').value.trim();

  if (!name) { showAlert('alert-container', 'Tag name is required.', 'error'); return; }
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    showAlert('alert-container', 'Color must be a valid hex code, e.g. #FF5733.', 'error');
    return;
  }

  const btn  = document.getElementById('submit-btn');
  const orig = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = `<span class="spinner"></span> Saving…`;

  try {
    const payload = { name, color, description: desc || null };
    if (editId) {
      await apiRequest('PUT', `/api/tags/${editId}`, payload);
    } else {
      await apiRequest('POST', '/api/tags', payload);
    }
    console.log('[REDIRECT] tag-form: save successful, redirecting to tags.html from', window.location.href);
    window.location.replace('tags.html');
  } catch (err) {
    let msg = err.message;
    if (err.data?.errors) msg = Object.values(err.data.errors).flat().join('; ');
    showAlert('alert-container', msg, 'error');
    btn.disabled  = false;
    btn.innerHTML = orig;
  }
}
