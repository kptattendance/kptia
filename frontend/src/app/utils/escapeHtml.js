// =====================================================
// Text placed inside an HTML message (for example a
// pop-up made with Swal and the html option) must be
// escaped, so that a name like "<img onerror=...>"
// typed into a subject or student is shown as text and
// never runs in someone else's browser.
// =====================================================

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
