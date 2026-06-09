const API_BASE = "";

["access_token", "refresh_token", "auth-storage"].forEach((k) => {
  sessionStorage.removeItem(k);
  localStorage.removeItem(k);
});

let _accessToken = null;
let _isRefreshing = false;

function setAccessToken(token) {
  _accessToken = token;
}
function getAccessToken() {
  return _accessToken;
}

function getUserInfo() {
  try {
    return JSON.parse(localStorage.getItem("user_info")) || null;
  } catch {
    return null;
  }
}

async function initAuth() {
  console.log("[initAuth] called from", window.location.href);

  if (
    window.location.href.includes("login.html") ||
    window.location.href.includes("register.html")
  )
    return false;

  if (_accessToken) return true;

  const ok = await _doRefresh();
  if (!ok) {
    ["access_token", "refresh_token", "auth-storage", "user_info"].forEach(
      (k) => localStorage.removeItem(k),
    );
    console.log(
      "[REDIRECT] initAuth: refresh failed, redirecting to login.html from",
      window.location.href,
    );
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function checkFullAccess() {
  const u = getUserInfo();
  if (!u || u.role !== "FullAccess") {
    console.log(
      "[REDIRECT] checkFullAccess: not FullAccess, redirecting to tags.html from",
      window.location.href,
    );
    window.location.href = "tags.html";
    return false;
  }
  return true;
}

async function logout() {
  _accessToken = null;
  ["access_token", "refresh_token", "auth-storage", "user_info"].forEach((k) =>
    localStorage.removeItem(k),
  );
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {}
  console.log(
    "[REDIRECT] logout: redirecting to login.html from",
    window.location.href,
  );
  window.location.href = "login.html";
}

async function revokeSession() {
  const confirmed = await confirmDialog(
    "This will revoke your session and sign you out. Continue?",
    { confirmText: "Revoke", confirmClass: "danger" },
  );
  if (!confirmed) return;

  _accessToken = null;
  ["access_token", "refresh_token", "auth-storage", "user_info"].forEach((k) =>
    localStorage.removeItem(k),
  );
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {}
  window.location.href = "login.html";
}

async function _doRefresh() {
  if (_isRefreshing) return false;
  _isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      _isRefreshing = false;
      return false;
    }
    const d = await res.json();
    const token = d.accessToken || d.access_token;
    if (!token) {
      _isRefreshing = false;
      return false;
    }
    setAccessToken(token);
    _isRefreshing = false;
    return true;
  } catch {
    _isRefreshing = false;
    return false;
  }
}

const _REFRESH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
  stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
  <polyline points="23 4 23 10 17 10"/>
  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
</svg>`;

async function refreshAccessToken() {
  const btn = document.getElementById("__refresh-btn");
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner spinner-blue" style="width:12px;height:12px;border-width:2px"></span>`;

  const ok = await _doRefresh();

  if (ok) {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3"
      stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
      <polyline points="20 6 9 17 4 12"/></svg>`;
    setTimeout(() => {
      btn.innerHTML = _REFRESH_ICON;
      btn.disabled = false;
    }, 1500);
  } else {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="3"
      stroke-linecap="round" stroke-linejoin="round" width="13" height="13">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    setTimeout(() => {
      logout();
    }, 1500);
  }
}

async function apiRequest(
  method,
  path,
  body = null,
  contentType = "application/json",
) {
  const exec = async () => {
    const headers = {};
    if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;
    if (body !== null && contentType) headers["Content-Type"] = contentType;
    const opts = { method, headers, credentials: "include" };
    if (body !== null)
      opts.body = typeof body === "string" ? body : JSON.stringify(body);
    return fetch(`${API_BASE}${path}`, opts);
  };

  let res = await exec();

  if (res.status === 401) {
    const ok = await _doRefresh();
    if (ok) {
      res = await exec();
    } else {
      logout();
      throw new Error("Session expired. Please sign in again.");
    }
  }

  if (!res.ok) {
    let errData = null;
    try {
      errData = await res.json();
    } catch {}
    const msg =
      errData?.message ||
      errData?.title ||
      errData?.detail ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = errData;
    throw err;
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function formatDate(str) {
  if (!str) return "—";
  try {
    return new Date(str).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return str;
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = String(str ?? "");
  return d.innerHTML;
}

function showAlert(containerId, message, type = "error") {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = "";
}

function confirmDialog(
  message,
  { confirmText = "Delete", confirmClass = "danger" } = {},
) {
  return new Promise((resolve) => {
    let overlay = document.getElementById("__cdialog");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "__cdialog";
      overlay.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:9999",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:1rem",
        "background:rgba(15,23,42,.45)",
        "backdrop-filter:blur(4px)",
        "-webkit-backdrop-filter:blur(4px)",
      ].join(";");
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:1.625rem 1.75rem;max-width:380px;width:100%;
                    box-shadow:0 20px 40px rgba(15,23,42,.18),0 4px 8px rgba(15,23,42,.08);
                    animation:__cdin .15s ease">
          <p id="__cdialog-msg" style="font-size:.9375rem;color:#0F172A;line-height:1.55;margin:0 0 1.375rem"></p>
          <div style="display:flex;gap:.625rem;justify-content:flex-end">
            <button id="__cdialog-cancel"
              style="padding:.4375rem 1rem;border-radius:6px;border:1px solid #E2E8F0;
                     background:#fff;color:#475569;font-size:.875rem;font-weight:500;cursor:pointer">
              Cancel
            </button>
            <button id="__cdialog-confirm"
              style="padding:.4375rem 1rem;border-radius:6px;border:none;
                     font-size:.875rem;font-weight:500;cursor:pointer;color:#fff">
            </button>
          </div>
        </div>
        <style>@keyframes __cdin{from{opacity:0;transform:scale(.96) translateY(6px)}to{opacity:1;transform:none}}</style>`;
      document.body.appendChild(overlay);
    }

    document.getElementById("__cdialog-msg").textContent = message;
    document.getElementById("__cdialog-confirm").textContent = confirmText;
    document.getElementById("__cdialog-confirm").style.background =
      confirmClass === "danger" ? "#DC2626" : "#2563EB";
    overlay.style.display = "flex";

    const done = (r) => {
      overlay.style.display = "none";
      document.getElementById("__cdialog-cancel").onclick = null;
      document.getElementById("__cdialog-confirm").onclick = null;
      overlay.onclick = null;
      resolve(r);
    };
    document.getElementById("__cdialog-cancel").onclick = () => done(false);
    document.getElementById("__cdialog-confirm").onclick = () => done(true);
    overlay.onclick = (e) => {
      if (e.target === overlay) done(false);
    };
  });
}

function createSidebar(activePage) {
  const user = getUserInfo();
  const initials = user ? user.username.slice(0, 2).toUpperCase() : "U";

  const IC = {
    tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>`,
    bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    brand: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  };

  const nav = [
    { id: "tags", href: "tags.html", label: "Tags", icon: IC.tag },
    { id: "import", href: "import.html", label: "Import", icon: IC.upload },
    { id: "soap", href: "soap.html", label: "SOAP Search", icon: IC.search },
    {
      id: "weather",
      href: "weather.html",
      label: "Weather (gRPC)",
      icon: IC.cloud,
    },
    { id: "graphql", href: "graphql.html", label: "GraphQL", icon: IC.bolt },
    { id: "jakarta", href: "jakarta.html", label: "Jakarta XML", icon: IC.shield },
  ];

  const navHtml = nav
    .map(
      (n) =>
        `<a href="${n.href}" class="nav-item${activePage === n.id ? " active" : ""}">${n.icon}<span>${n.label}</span></a>`,
    )
    .join("");

  return `
  <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="closeSidebar()"></div>
  <nav class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-inner">
        <div class="sidebar-brand-icon">${IC.brand}</div>
        <div>
          <div class="sidebar-logo-title">Tags Manager</div>
          <div class="sidebar-logo-subtitle">Interoperability Demo</div>
        </div>
      </div>
    </div>
    <div class="sidebar-nav">${navHtml}</div>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${initials}</div>
        <div style="flex:1;min-width:0">
          <div class="sidebar-name">${escapeHtml(user?.username ?? "User")}</div>
          <div class="sidebar-role">${escapeHtml(user?.role ?? "")}</div>
        </div>
        <button id="__refresh-btn" onclick="refreshAccessToken()" title="Refresh access token"
          style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border);
                 background:var(--surface);color:var(--text-2);cursor:pointer;
                 display:flex;align-items:center;justify-content:center;
                 flex-shrink:0;transition:background .12s"
          onmouseover="this.style.background='var(--bg)'"
          onmouseout="this.style.background='var(--surface)'">
          ${_REFRESH_ICON}
        </button>
      </div>
      <button class="btn-logout" onclick="logout()">${IC.logout} Log out</button>
      <button class="btn-logout" onclick="revokeSession()" style="background:#dc2626;">${IC.logout} Revoke Session</button>
    </div>
  </nav>
  <button class="hamburger" onclick="openSidebar()" aria-label="Open menu">${IC.menu}</button>`;
}

function openSidebar() {
  document.getElementById("sidebar")?.classList.add("open");
  document.getElementById("sidebar-backdrop")?.classList.add("show");
}
function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebar-backdrop")?.classList.remove("show");
}

document.addEventListener("click", (e) => {
  if (
    e.defaultPrevented ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    e.button !== 0
  )
    return;
  const a = e.target.closest("a[href]");
  if (!a) return;
  const href = a.getAttribute("href");
  if (
    !href ||
    href.startsWith("http") ||
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:") ||
    a.target === "_blank"
  )
    return;

  e.preventDefault();

  const basePath = window.location.pathname.substring(
    0,
    window.location.pathname.lastIndexOf("/") + 1,
  );
  const fullHref = href.startsWith("/") ? href : basePath + href;

  const main = document.querySelector(".main-content");
  if (main) {
    main.style.transition = "opacity 0.18s ease";
    main.style.opacity = "0";
    setTimeout(() => {
      window.location.href = fullHref;
    }, 170);
  } else {
    window.location.href = fullHref;
  }
});
