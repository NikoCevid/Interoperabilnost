document.addEventListener('DOMContentLoaded', () => {
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    checkAlreadyLoggedIn();
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    checkAlreadyLoggedIn();

    if (new URLSearchParams(window.location.search).get('registered') === '1') {
      const el = document.getElementById('register-success');
      if (el) el.style.display = 'block';
    }

    registerForm.addEventListener('submit', handleRegister);
  }
});

async function checkAlreadyLoggedIn() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    console.log('[checkAlreadyLoggedIn] refresh response status:', res.status);
    if (res.ok) {
      const data = await res.json();
      setAccessToken(data.accessToken);
      console.log('[REDIRECT] checkAlreadyLoggedIn: already logged in, redirecting to tags.html from', window.location.href);
      window.location.href = 'tags.html';
    }
  } catch {}
}

async function handleLogin(e) {
  e.preventDefault();
  const username  = document.getElementById('username').value.trim();
  const password  = document.getElementById('password').value;
  const errorEl   = document.getElementById('login-error');
  const submitBtn = e.target.querySelector('[type="submit"]');

  hideError(errorEl);
  if (!username || !password) { showError(errorEl, 'Please enter your username and password.'); return; }

  setBtnLoading(submitBtn, true, 'Signing in…');
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.message || d.title || 'Invalid username or password.');
    }

    const data = await res.json();

    const token = data.accessToken || data.access_token || data.token;

    if (!token) throw new Error('No access token received from server.');

    let userInfo = extractUserInfo(data, username);
    if (!userInfo.role || userInfo.role === 'Unknown') {
      userInfo = decodeJwtClaims(token, username);
    }

    setAccessToken(token);
    localStorage.setItem('user_info', JSON.stringify(userInfo));

    console.log('[REDIRECT] handleLogin: login successful, redirecting to tags.html from', window.location.href);
    window.location.replace('tags.html');
  } catch (err) {
    showError(errorEl, err.message);
    setBtnLoading(submitBtn, false, 'Sign in');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username  = document.getElementById('username').value.trim();
  const email     = document.getElementById('email').value.trim();
  const password  = document.getElementById('password').value;
  const role      = document.getElementById('role').value;
  const errorEl   = document.getElementById('register-error');
  const submitBtn = e.target.querySelector('[type="submit"]');

  hideError(errorEl);
  if (!username || !email || !password) {
    showError(errorEl, 'Please fill in all required fields.');
    return;
  }

  setBtnLoading(submitBtn, true, 'Creating account…');
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role })
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      const msgs = d.errors ? Object.values(d.errors).flat().join(' ') : null;
      throw new Error(msgs || d.message || d.title || 'Registration failed.');
    }

    console.log('[REDIRECT] handleRegister: registered, redirecting to login.html from', window.location.href);
    window.location.replace('login.html?registered=1');
  } catch (err) {
    showError(errorEl, err.message);
    setBtnLoading(submitBtn, false, 'Create account');
  }
}

function extractUserInfo(data, fallbackUsername) {
  const u = data.user || data.userInfo || data.userData || {};
  return {
    username: u.username || u.name || u.userName || data.username || fallbackUsername,
    role:     u.role     || u.userRole            || data.role     || 'Unknown'
  };
}

function decodeJwtClaims(token, fallbackUsername) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));

    const NAME_CLAIMS = [
      'name', 'unique_name', 'username', 'preferred_username',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
    ];
    const ROLE_CLAIMS = [
      'role', 'roles',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    ];

    let username = fallbackUsername;
    for (const k of NAME_CLAIMS) {
      if (payload[k]) { username = payload[k]; break; }
    }

    let role = 'ReadOnly';
    for (const k of ROLE_CLAIMS) {
      if (payload[k]) {
        role = Array.isArray(payload[k]) ? payload[k][0] : payload[k];
        break;
      }
    }

    return { username, role };
  } catch {
    return { username: fallbackUsername, role: 'ReadOnly' };
  }
}

function showError(el, msg) { if (el) { el.textContent = msg; el.classList.add('show'); } }
function hideError(el) { if (el) { el.textContent = ''; el.classList.remove('show'); } }

function setBtnLoading(btn, loading, loadingText) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn._orig = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
  } else {
    btn.innerHTML = btn._orig || loadingText;
  }
}
