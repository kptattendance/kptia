import Swal from "sweetalert2";
import { escapeHtml } from "./escapeHtml";

// =====================================================
// SUBJECT STATUS POP-UP
//
// Shown when a cell of an entry status grid is clicked:
// the subjects of that department + semester, each with
// its status (Batch 1 / Batch 2, or study material).
//
// rows: [{
//   code, name,
//   tags:  [{ label, dark }],          e.g. Elective, Yours
//   cells: [{ heading, label, tone }]  tone: done | pending
//                                         | warn | muted
// }]
//
// detailsText: when given, a second button that resolves
// with isConfirmed = true (the admin pages scroll to
// their detailed table with it).
// =====================================================

const TONES = {
  done: "background:#ecfdf5;color:#047857;",
  pending: "background:#fef2f2;color:#b91c1c;",
  warn: "background:#fffbeb;color:#b45309;",
  muted: "background:transparent;color:#94a3b8;font-weight:500;",
};

const renderTag = (tag) =>
  `<span style="margin-left:6px;border-radius:6px;padding:1px 7px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;${
    tag.dark
      ? "background:#0f172a;color:#fff;"
      : "background:#f1f5f9;color:#64748b;"
  }">${escapeHtml(tag.label)}</span>`;

const renderCell = (cell) =>
  `<div style="display:flex;align-items:center;gap:6px;">
    ${
      cell.heading
        ? `<span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;">${escapeHtml(
            cell.heading
          )}</span>`
        : ""
    }
    <span style="border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap;${
      TONES[cell.tone] || TONES.muted
    }">${escapeHtml(cell.label)}</span>
  </div>`;

const renderRow = (row) =>
  `<div style="padding:10px 4px;border-top:1px solid #f1f5f9;text-align:left;">
    <div style="font-family:ui-monospace,monospace;font-size:12px;font-weight:700;color:#334155;">
      ${escapeHtml(row.code)}${(row.tags || []).map(renderTag).join("")}
    </div>
    <div style="margin-top:2px;font-size:14px;font-weight:600;color:#0f172a;">
      ${escapeHtml(row.name)}
    </div>
    <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px 16px;">
      ${row.cells.map(renderCell).join("")}
    </div>
  </div>`;

// The admin pages keep a detailed table of the selected
// cell under the grid, with this id. "Show details"
// scrolls to it.
export const CELL_DETAILS_ID = "cell-details";

export const showSubjectStatusAlert = async ({
  title,
  subtitle,
  rows,
  detailsText,
}) => {
  const result = await Swal.fire({
    title: escapeHtml(title),
    html: `
      ${
        subtitle
          ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b;">${escapeHtml(
              subtitle
            )}</p>`
          : ""
      }
      <div style="max-height:60vh;overflow-y:auto;">
        ${
          rows.length > 0
            ? rows.map(renderRow).join("")
            : `<p style="padding:16px;color:#64748b;">No subjects.</p>`
        }
      </div>`,
    width: 640,
    showCloseButton: true,
    showConfirmButton: Boolean(detailsText),
    confirmButtonText: detailsText || "OK",
    showCancelButton: Boolean(detailsText),
    cancelButtonText: "Close",
    confirmButtonColor: "#283618",
    cancelButtonColor: "#9a9474",
    reverseButtons: true,
  });

  if (detailsText && result.isConfirmed) {
    document
      .getElementById(CELL_DETAILS_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return result;
};
