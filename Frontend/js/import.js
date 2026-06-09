let activeTab = "xml";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Tags>
  <Tag>
    <Name>…</Name>
    <Color>#FF0000</Color>
  </Tag>
</Tags>`;

const SAMPLE_JSON = `[
  { "name": "DevOps",  "color": "#10B981", "description": "Infrastructure" },
  { "name": "Testing", "color": "#F59E0B" }
]`;

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await initAuth())) return;
  document.body.insertAdjacentHTML("afterbegin", createSidebar("import"));

  const user = getUserInfo();
  const isFullAccess = user?.role === "FullAccess";

  if (!isFullAccess) {
    const importBtn = document.getElementById("import-btn");
    if (importBtn) {
      importBtn.disabled = true;
      importBtn.title = "ReadOnly users cannot import tags";
    }
    const notice = document.createElement("div");
    notice.className = "alert alert-error";
    notice.style.marginBottom = "1rem";
    notice.textContent =
      "You have read-only access. You can view the import form but cannot import tags.";
    document
      .querySelector(".import-grid")
      ?.insertAdjacentElement("beforebegin", notice);
  }

  document
    .getElementById("xml-tab")
    .addEventListener("click", () => switchTab("xml"));
  document
    .getElementById("json-tab")
    .addEventListener("click", () => switchTab("json"));
  if (isFullAccess)
    document
      .getElementById("import-btn")
      .addEventListener("click", handleImport);
  document.getElementById("sample-btn").addEventListener("click", loadSample);

  document.getElementById("file-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById("content-area").value = ev.target.result;
    };
    reader.readAsText(file);
    e.target.value = "";
  });
});

function switchTab(tab) {
  activeTab = tab;

  const xmlBtn = document.getElementById("xml-tab");
  const jsonBtn = document.getElementById("json-tab");
  xmlBtn.className = tab === "xml" ? "btn btn-primary" : "btn btn-secondary";
  jsonBtn.className = tab === "json" ? "btn btn-primary" : "btn btn-secondary";

  document.getElementById("content-label").textContent =
    tab === "xml" ? "XML Content" : "JSON Content";
  document.getElementById("import-btn-label").textContent =
    tab === "xml" ? "Import XML" : "Import JSON";
  document.getElementById("content-area").placeholder =
    tab === "xml" ? "Paste XML content here…" : "Paste JSON array here…";

  document.getElementById("results-box").classList.add("hidden");
}

function loadSample() {
  document.getElementById("content-area").value =
    activeTab === "xml" ? SAMPLE_XML : SAMPLE_JSON;
}

async function handleImport() {
  const content = document.getElementById("content-area").value.trim();
  const resultsBox = document.getElementById("results-box");
  clearAlert("alert-container");
  resultsBox.classList.add("hidden");

  if (!content) {
    showAlert("alert-container", "Please provide content to import.", "error");
    return;
  }

  const btn = document.getElementById("import-btn");
  btn.disabled = true;
  const origHtml = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span> Importing…`;

  const contentType =
    activeTab === "xml" ? "application/xml" : "application/json";

  try {
    const data = await apiRequest(
      "POST",
      "/api/tags/import",
      content,
      contentType,
    );
    const count =
      data?.importedCount ??
      data?.count ??
      data?.imported ??
      data?.created ??
      "?";

    document.getElementById("results-content").innerHTML =
      `<div class="alert alert-success" style="margin:0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-right:6px"><polyline points="20 6 9 17 4 12"/></svg>
        <span><strong>Import successful!</strong> ${activeTab === "xml" ? "XSD valid. " : ""}${count} tag(s) imported.</span>
      </div>`;
    resultsBox.classList.remove("hidden");
  } catch (err) {
    let html = "";
    if (err.status === 422 && err.data) {
      const errors = err.data.errors || err.data.validationErrors || err.data;
      let items = [];
      if (Array.isArray(errors)) {
        items = errors.map((e) => `<li> ${escapeHtml(String(e))}</li>`);
      } else if (errors && typeof errors === "object") {
        items = Object.entries(errors).flatMap(([k, v]) =>
          (Array.isArray(v) ? v : [v]).map(
            (m) =>
              `<li> <strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(m))}</li>`,
          ),
        );
      }
      html = items.length
        ? `<div class="alert alert-error" style="margin:0 0 0.75rem"><strong>Validation failed</strong></div>
           <ul class="error-list">${items.join("")}</ul>`
        : `<div class="alert alert-error" style="margin:0">${escapeHtml(err.message)}</div>`;
    } else {
      html = `<div class="alert alert-error" style="margin:0">${escapeHtml(err.message)}</div>`;
    }
    document.getElementById("results-content").innerHTML = html;
    resultsBox.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
}
