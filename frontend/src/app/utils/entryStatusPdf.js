import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawLetterheadFooter,
  drawLetterheadHeader,
  LETTERHEAD_FOOTER_HEIGHT,
  LETTERHEAD_MARGIN,
} from "./letterheadPdf.js";
import {
  buildEntryCells,
  getCellKey,
  getElectivesNotTaken,
  isBridge,
  isElective,
  sumEntryCells,
} from "./entryCounts.js";

// =====================================================
// ENTRY STATUS REPORT (PDF)
//
// The department x semester grid of the IA marks or
// attendance page, followed by the list of subjects
// that still have a batch to be entered.
//
// Counted the same way as the page (entryCounts.js):
// bridge courses are left out, and an elective group
// counts as one subject.
// =====================================================

const MARGIN = LETTERHEAD_MARGIN;

const DARK = [15, 23, 42];
const GREY = [100, 116, 139];
const LINE = [148, 163, 184];
const HEAD = [216, 228, 188];

const COMPLETE = [220, 237, 200];
const PROGRESS = [253, 236, 200];
const NOT_STARTED = [254, 215, 215];
const EMPTY = [241, 245, 249];

const today = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const footerNote = (page, pageCount) =>
  `Generated from ia.kptmangaluru.in on ${today()}${
    pageCount > 1 ? `  |  Page ${page} of ${pageCount}` : ""
  }`;

const baseTable = {
  theme: "grid",
  styles: {
    font: "helvetica",
    fontSize: 8.5,
    cellPadding: 1.8,
    textColor: DARK,
    lineColor: LINE,
    lineWidth: 0.15,
    halign: "center",
    valign: "middle",
  },
  headStyles: {
    fillColor: HEAD,
    textColor: DARK,
    fontStyle: "bold",
  },
};

const getStatus = (cell) => {
  if (!cell || cell.total === 0) {
    return { label: "No subjects", fill: EMPTY };
  }

  if (cell.entered === 0) {
    return { label: "Not started", fill: NOT_STARTED };
  }

  if (cell.entered < cell.total) {
    return { label: "In progress", fill: PROGRESS };
  }

  return { label: "Complete", fill: COMPLETE };
};

const gridCell = (cell) => {
  const status = getStatus(cell);

  return {
    content:
      !cell || cell.total === 0
        ? "-"
        : `${cell.entered} / ${cell.total}\n${status.label}`,
    styles: {
      fillColor: status.fill,
      fontStyle: "bold",
    },
  };
};

const batchCell = (entered) => ({
  content: entered ? "Entered" : "Pending",
  styles: {
    textColor: entered ? [22, 101, 52] : [185, 28, 28],
    fontStyle: entered ? "normal" : "bold",
  },
});

// =====================================================
// PENDING SUBJECTS
//
// Regular subjects with a batch not entered, and
// electives:
// - an elective group with nothing entered is one row
//   naming all of its electives
// - an elective that is entered for one batch only
//   is its own row
// - electives not taken are left out
// =====================================================

const getPendingRows = (subjects, semesters, departments) => {
  const notTaken = getElectivesNotTaken(subjects);

  const departmentOrder = departments.map(
    (department) => department.value
  );

  const relevant = subjects
    .filter(
      (subject) =>
        !isBridge(subject) &&
        semesters.includes(Number(subject.semester)) &&
        !notTaken.has(String(subject.subjectId))
    )
    .sort((a, b) => {
      const departmentA = departmentOrder.indexOf(
        String(a.department || "").toLowerCase()
      );

      const departmentB = departmentOrder.indexOf(
        String(b.department || "").toLowerCase()
      );

      return (
        departmentA - departmentB ||
        Number(a.semester) - Number(b.semester) ||
        String(a.sequence || a.code || "").localeCompare(
          String(b.sequence || b.code || "")
        )
      );
    });

  const rows = [];

  // Elective groups with nothing entered, by group key
  const emptyGroups = new Map();

  relevant.forEach((subject) => {
    const batch1 = Boolean(subject.batch1?.entered);
    const batch2 = Boolean(subject.batch2?.entered);

    if (batch1 && batch2) {
      return;
    }

    if (isElective(subject) && !batch1 && !batch2) {
      const groupKey = `${getCellKey(subject)}_${String(
        subject.electiveGroup || "ELECTIVE"
      ).toUpperCase()}`;

      if (!emptyGroups.has(groupKey)) {
        const row = {
          subject,
          code: [],
          name: [],
          batch1: false,
          batch2: false,
          elective: true,
        };

        emptyGroups.set(groupKey, row);
        rows.push(row);
      }

      const row = emptyGroups.get(groupKey);

      row.code.push(subject.code);
      row.name.push(subject.name || subject.subject || "");

      return;
    }

    rows.push({
      subject,
      code: [subject.code],
      name: [subject.name || subject.subject || ""],
      batch1,
      batch2,
      elective: isElective(subject),
    });
  });

  return rows;
};

// =====================================================
// BUILD
//
// title     e.g. "IA 1 ENTRY STATUS"
// subtitle  e.g. "Academic Year 2026-27  |  Odd semesters"
// subjects  the subjects of the page, with batch1 /
//           batch2 entered flags
// semesters the semester columns
// departments [{ value, label }]
// =====================================================

export function buildEntryStatusPdf(
  {
    title,
    subtitle,
    subjects,
    semesters,
    departments,
  },
  letterhead = {}
) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  drawLetterheadHeader(doc, letterhead);

  const cells = buildEntryCells(subjects);
  const summary = sumEntryCells(cells, semesters);

  // ---------------------------------------------------
  // TITLE
  // ---------------------------------------------------

  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...DARK);
  doc.text(title, pageWidth / 2, y, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  y += 5;
  doc.text(subtitle, pageWidth / 2, y, { align: "center" });

  y += 4.6;
  doc.setTextColor(...GREY);
  doc.text(
    `${summary.entered} of ${summary.total} subject-batches entered`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 5;

  // ---------------------------------------------------
  // GRID
  // ---------------------------------------------------

  const totalCell = (department) => {
    let entered = 0;
    let total = 0;

    semesters.forEach((semester) => {
      const cell = cells[`${department}_${semester}`];

      if (cell) {
        entered += cell.entered;
        total += cell.total;
      }
    });

    return { entered, total };
  };

  autoTable(doc, {
    ...baseTable,

    startY: y,

    margin: {
      left: MARGIN,
      right: MARGIN,
      bottom: LETTERHEAD_FOOTER_HEIGHT + 2,
    },

    columnStyles: {
      0: { halign: "left", cellWidth: 58 },
    },

    head: [
      [
        "Department",
        ...semesters.map((semester) => `Semester ${semester}`),
        "Total",
      ],
    ],

    body: [
      ...departments.map((department) => [
        `${department.label} (${department.value.toUpperCase()})`,
        ...semesters.map((semester) =>
          gridCell(cells[`${department.value}_${semester}`])
        ),
        gridCell(totalCell(department.value)),
      ]),
      [
        {
          content: "All departments",
          styles: { fontStyle: "bold", halign: "left" },
        },
        ...semesters.map((semester) =>
          gridCell(sumEntryCells(cells, [semester]))
        ),
        gridCell(summary),
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);

  const note = doc.splitTextToSize(
    "Each cell counts subject-batches: a subject with Batch 1 and Batch 2 counts as two. Bridge courses are not counted. Electives of one group count as one subject, the one the class has taken.",
    pageWidth - MARGIN * 2
  );

  doc.text(note, MARGIN, y);

  y += note.length * 3.4 + 4;

  // ---------------------------------------------------
  // PENDING SUBJECTS
  // ---------------------------------------------------

  const pending = getPendingRows(
    subjects,
    semesters,
    departments
  );

  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + 20 > pageHeight - LETTERHEAD_FOOTER_HEIGHT - 2) {
    doc.addPage();
    y = MARGIN + 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("Pending Entries", MARGIN, y);

  y += 2;

  if (pending.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text("Nothing is pending.", MARGIN, y + 5);
  } else {
    autoTable(doc, {
      ...baseTable,

      startY: y,

      margin: {
        left: MARGIN,
        right: MARGIN,
        bottom: LETTERHEAD_FOOTER_HEIGHT + 2,
      },

      styles: {
        ...baseTable.styles,
        fontSize: 7.5,
        cellPadding: 1.3,
      },

      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 14 },
        2: { cellWidth: 10 },
        3: { cellWidth: 28 },
        4: { halign: "left" },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
      },

      head: [
        [
          "#",
          "Dept",
          "Sem",
          "Code",
          "Subject",
          "Batch 1",
          "Batch 2",
        ],
      ],

      body: pending.map((row, index) => [
        index + 1,
        String(row.subject.department || "").toUpperCase(),
        row.subject.semester,
        row.code.join("\n"),
        row.elective && row.code.length > 1
          ? `Elective (any one): ${row.name.join(" / ")}`
          : `${row.name.join(" / ")}${
              row.elective ? " (Elective)" : ""
            }`,
        batchCell(row.batch1),
        batchCell(row.batch2),
      ]),
    });
  }

  drawLetterheadFooter(doc, letterhead, footerNote);

  return doc;
}
