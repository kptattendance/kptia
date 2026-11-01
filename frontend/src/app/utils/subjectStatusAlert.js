import Swal from "sweetalert2";
import { escapeHtml } from "./escapeHtml";

// =====================================================
// SUBJECT STATUS POP-UP
//
// Shown when a cell of an entry status grid is clicked:
// a table of the subjects of that department + semester,
// each with its status (Batch 1 / Batch 2, or study
// material).
//
// rows: [{
//   code, name,
//   tags:  [{ label, dark }],          e.g. Elective, Yours
//   cells: [{ heading, label, tone }]  tone: done | pending
//                                         | warn | muted
// }]
// Every row has the same cells; the headings of the
// first row become the column headings.
//
// detailsText: when given, a second button that resolves
// with isConfirmed = true (the admin pages scroll to
// their detailed table with it).
// =====================================================

const TONES = {
  done: "background:#dcfce7;color:#166534;",
  pending: "background:#fee2e2;color:#b91c1c;",
  warn: "background:#fef3c7;color:#92400e;",
  muted: "background:#f1f5f9;color:#94a3b8;",
};

// Header, rows and borders in the site colours
const HEAD = "background:#283618;color:#fefae0;";
const ROW_ODD = "background:#ffffff;";
const ROW_EVEN = "background:#fbf9f0;";
const BORDER = "border-bottom:1px solid #eee8d2;";

const th = (content, extra = "") =>
  `<th style="position:sticky;top:0;z-index:1;${HEAD}padding:9px 12px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;${extra}">${content}</th>`;

const renderTag = (tag) =>
  `<span style="margin-left:6px;border-radius:999px;padding:1px 8px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;vertical-align:middle;${
    tag.dark
      ? "background:#bc6c25;color:#fff;"
      : "background:#efe9d2;color:#606c38;"
  }">${escapeHtml(tag.label)}</span>`;

const renderStatus = (cell) =>
  `<span style="display:inline-block;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;${
    TONES[cell.tone] || TONES.muted
  }">${escapeHtml(cell.label)}</span>`;

const renderRow = (row, index) => {
  const background = index % 2 === 0 ? ROW_ODD : ROW_EVEN;

  return `<tr style="${background}">
    <td style="${BORDER}padding:9px 12px;text-align:center;font-size:12px;font-weight:600;color:#9a9474;">${
      index + 1
    }</td>
    <td style="${BORDER}padding:9px 12px;font-family:ui-monospace,monospace;font-size:12px;font-weight:700;color:#283618;white-space:nowrap;">${escapeHtml(
      row.code
    )}</td>
    <td style="${BORDER}padding:9px 12px;font-size:13px;font-weight:600;color:#1a240e;text-align:left;">${escapeHtml(
      row.name
    )}${(row.tags || []).map(renderTag).join("")}</td>
    ${row.cells
      .map(
        (cell) =>
          `<td style="${BORDER}padding:9px 12px;text-align:center;">${renderStatus(
            cell
          )}</td>`
      )
      .join("")}
  </tr>`;
};

// "4 entered · 2 pending · 1 unlocked" over all cells
const renderSummary = (rows) => {
  const counts = { done: 0, pending: 0, warn: 0 };

  rows.forEach((row) =>
    row.cells.forEach((cell) => {
      if (counts[cell.tone] !== undefined) {
        counts[cell.tone] += 1;
      }
    })
  );

  const chips = [
    ["done", `${counts.done} done`],
    ["warn", `${counts.warn} in progress`],
    ["pending", `${counts.pending} pending`],
  ]
    .filter(([tone]) => counts[tone] > 0)
    .map(([tone, text]) =>
      renderStatus({ tone, label: text })
    )
    .join(" ");

  return chips
    ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:0 0 10px;">${chips}</div>`
    : "";
};

const renderTable = (rows) => {
  const headings = rows[0].cells.map((cell) => cell.heading || "");

  return `<div style="max-height:62vh;overflow:auto;border:1px solid #eee8d2;border-radius:14px;">
    <table style="width:100%;border-collapse:separate;border-spacing:0;">
      <thead>
        <tr>
          ${th("Sl. No.", "text-align:center;width:56px;")}
          ${th("Code", "text-align:left;")}
          ${th("Subject", "text-align:left;")}
          ${headings
            .map((heading) => th(escapeHtml(heading), "text-align:center;"))
            .join("")}
        </tr>
      </thead>
      <tbody>${rows.map(renderRow).join("")}</tbody>
    </table>
  </div>`;
};

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
      ${
        rows.length > 0
          ? `${renderSummary(rows)}${renderTable(rows)}`
          : `<p style="padding:16px;color:#64748b;">No subjects.</p>`
      }`,
    // Wide on a computer, the full width on a phone
    width: "min(980px, 96vw)",
    padding: "1.25rem",
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
