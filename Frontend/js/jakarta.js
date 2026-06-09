document.addEventListener("DOMContentLoaded", async () => {
  if (!(await initAuth())) return;
  document.body.insertAdjacentHTML("afterbegin", createSidebar("jakarta"));

  document
    .getElementById("jakarta-validate-btn")
    .addEventListener("click", jakartaValidate);
});

async function jakartaValidate() {
  const btn = document.getElementById("jakarta-validate-btn");
  const resultsEl = document.getElementById("jakarta-results");

  btn.disabled = true;
  const origHtml = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span> Validating…`;
  resultsEl.classList.add("hidden");
  resultsEl.innerHTML = "";
  clearAlert("alert-container");

  try {
    const res = await fetch("/api/jakarta/validate");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Server returned ${res.status}${text ? ": " + text : ""}`);
    }

    const results = await res.json();

    if (!Array.isArray(results) || results.length === 0) {
      resultsEl.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📭</div>
          <div class="empty-text">No tags found</div>
          <div class="empty-sub">The database has no tags to validate.</div>
        </div>`;
      resultsEl.classList.remove("hidden");
      return;
    }

    const validCount = results.filter((r) => r.isValid).length;
    const invalidCount = results.length - validCount;

    const summaryHtml = `
      <div class="card mb-4">
        <div class="card-body-sm" style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap">
          <span class="text-sm text-2"><strong>${results.length}</strong> tag(s) validated</span>
          <span class="valid-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ${validCount} valid
          </span>
          ${invalidCount > 0 ? `
          <span class="invalid-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            ${invalidCount} invalid
          </span>` : ""}
        </div>
      </div>`;

    const rowsHtml = results
      .map((r) => {
        const nameDisplay = r.tagName
          ? escapeHtml(r.tagName)
          : `<span class="text-3" style="font-style:italic">(no name)</span>`;

        const badge = r.isValid
          ? `<span class="valid-badge">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
               Valid
             </span>`
          : `<span class="invalid-badge">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                 <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
               </svg>
               Invalid
             </span>`;

        const errorsHtml =
          r.errors && r.errors.length > 0
            ? `<ul style="margin:0.5rem 0 0;padding-left:1.25rem;list-style:disc">
                 ${r.errors
                   .map(
                     (e) =>
                       `<li style="font-size:0.8125rem;color:#991b1b;line-height:1.5;margin:0.15rem 0">${escapeHtml(e)}</li>`,
                   )
                   .join("")}
               </ul>`
            : "";

        return `
          <div style="display:flex;align-items:flex-start;gap:1rem;padding:0.875rem 1.125rem;
                      border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
              <span style="font-size:0.9rem;font-weight:600;color:var(--text)">${nameDisplay}</span>
              ${errorsHtml}
            </div>
            <div style="flex-shrink:0;padding-top:1px">${badge}</div>
          </div>`;
      })
      .join("");

    resultsEl.innerHTML =
      summaryHtml +
      `<div class="card"><div style="overflow:hidden;border-radius:var(--r-lg)">${rowsHtml}</div></div>`;

    resultsEl.classList.remove("hidden");
  } catch (err) {
    showAlert("alert-container", err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
}
