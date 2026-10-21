import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawLetterheadFooter,
  drawLetterheadHeader,
  LETTERHEAD_FOOTER_HEIGHT,
  LETTERHEAD_MARGIN,
} from "./letterheadPdf.js";

// =====================================================
// CO ATTAINMENT REPORTS (PDF + Excel)
//
// Subject report: every student's CO-wise IA marks,
// then for each CO column the students above the
// threshold, their percentage and the attainment level,
// and the attainment of each CO.
//
// Semester report: every subject of a semester with the
// attainment level of each CO.
//
// The data comes from /api/attainment/subject and
// /api/attainment/semester.
// =====================================================

const MARGIN = LETTERHEAD_MARGIN;

const DARK = [15, 23, 42];
const GREY = [100, 116, 139];
const LINE = [148, 163, 184];

// Same colours as the NBA attainment sheet
const ORANGE = [247, 150, 70];
const GREEN = [196, 215, 155];
const HEAD = [216, 228, 188];

const CO_NAMES = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"];

const DEPARTMENT_NAMES = {
  at: "Automobile Engineering",
  ch: "Chemical Engineering",
  ce: "Civil Engineering",
  cs: "Computer Science Engineering",
  ec: "Electronics & Communication",
  ee: "Electrical & Electronics",
  me: "Mechanical Engineering",
  ps: "Polymer Engineering",
};

const departmentName = (value) =>
  DEPARTMENT_NAMES[String(value || "").toLowerCase()] ||
  String(value || "").toUpperCase();

const today = () =>
  new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// 12.5 -> "12.5", 12 -> "12"
const formatNumber = (value) =>
  Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 100) / 100);

const formatMark = (value) =>
  value === null || value === undefined
    ? "-"
    : value === "AB"
    ? "AB"
    : formatNumber(value);

const formatLevel = (value) =>
  value === null || value === undefined
    ? "-"
    : formatNumber(value);

const formatPercent = (value) =>
  value === null || value === undefined
    ? "-"
    : formatNumber(value);

const iaLabel = (data) =>
  data.iaNumber
    ? `IA ${data.iaNumber}`
    : `All IAs (${
        data.iaNumbers.map((n) => `IA ${n}`).join(", ") ||
        "none"
      })`;

const targetsLine = (targets, saved) =>
  `Threshold: ${targets.marksPercent}% of the CO marks.  Level 3: ${targets.level3}% or more of the students above the threshold, Level 2: ${targets.level2}% or more, Level 1: ${targets.level1}% or more, otherwise 0.${
    saved
      ? ""
      : "  (Default targets: the faculty has not saved targets on the Course Outcomes page.)"
  }`;

// Columns of the same IA and test, side by side,
// share one heading.
const columnGroups = (columns) => {
  const groups = [];

  columns.forEach((column) => {
    const label = `${column.testName} (IA ${column.iaNumber})`;
    const last = groups[groups.length - 1];

    if (last && last.label === label) {
      last.span += 1;
    } else {
      groups.push({ label, span: 1 });
    }
  });

  return groups;
};

const fileSafe = (value) =>
  String(value || "").replace(/[^a-zA-Z0-9_-]/g, "_");

export const subjectFileName = (data, extension) =>
  `CO_Attainment_${fileSafe(data.subject.code)}_${
    data.iaNumber ? `IA${data.iaNumber}` : "AllIAs"
  }_${data.academicYear}.${extension}`;

export const semesterFileName = (data, extension) =>
  `CO_Attainment_${data.department.toUpperCase()}_Sem${data.semester}_${data.academicYear}.${extension}`;

// =====================================================
// TITLE BLOCK UNDER THE LETTERHEAD
// =====================================================

const drawTitle = (doc, title, lines) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...DARK);
  doc.text(title, pageWidth / 2, y, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  lines.forEach((line, index) => {
    doc.setTextColor(...(index === 0 ? DARK : GREY));

    const wrapped = doc.splitTextToSize(
      line,
      pageWidth - MARGIN * 2
    );

    y += 4.6;
    doc.text(wrapped, pageWidth / 2, y, {
      align: "center",
    });

    y += (wrapped.length - 1) * 3.6;
  });

  return y + 4;
};

const drawSignatures = (doc, y, titles) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + 22 > pageHeight - LETTERHEAD_FOOTER_HEIGHT - 2) {
    doc.addPage();
    y = MARGIN + 4;
  }

  y += 16;

  // Lines of a fixed length, spread across the page,
  // the last one at the right edge.
  const width = 75;

  const gap =
    titles.length > 1
      ? (pageWidth - MARGIN * 2 - width * titles.length) /
        (titles.length - 1)
      : 0;

  titles.forEach((title, index) => {
    const x =
      titles.length === 1
        ? pageWidth - MARGIN - width
        : MARGIN + (width + gap) * index;

    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.25);
    doc.line(x + 4, y, x + width - 8, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(title, x + 4, y + 4);
  });
};

const footerNote = (page, pageCount) =>
  `Generated from ia.kptmangaluru.in on ${today()}${
    pageCount > 1 ? `  |  Page ${page} of ${pageCount}` : ""
  }`;

const baseTable = {
  theme: "grid",
  styles: {
    font: "helvetica",
    fontSize: 7,
    cellPadding: 0.9,
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

// =====================================================
// SUBJECT REPORT - PDF
// =====================================================

export function buildSubjectAttainmentPdf(
  data,
  letterhead = {}
) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "landscape",
  });

  drawLetterheadHeader(doc, letterhead);

  let y = drawTitle(
    doc,
    "CO ATTAINMENT - INTERNAL ASSESSMENT",
    [
      `${data.subject.code} - ${data.subject.name}  |  ${departmentName(
        data.subject.department
      )}  |  Semester ${data.subject.semester}  |  Academic Year ${
        data.academicYear
      }  |  ${iaLabel(data)}`,
      targetsLine(data.targets, data.targetsSaved),
    ]
  );

  const bottomMargin = LETTERHEAD_FOOTER_HEIGHT + 2;

  if (data.columns.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text(
      "No IA marks have been saved for this selection yet.",
      MARGIN,
      y + 6
    );

    drawLetterheadFooter(doc, letterhead, footerNote);

    return doc;
  }

  // ---------------------------------------------------
  // STUDENT MARKS + COLUMN RESULTS
  // ---------------------------------------------------

  const groups = columnGroups(data.columns);

  const resultRow = (label, values, bold = false) => [
    {
      content: label,
      colSpan: 3,
      styles: {
        halign: "right",
        fillColor: ORANGE,
        fontStyle: bold ? "bold" : "normal",
      },
    },
    ...values.map((value) => ({
      content: value,
      styles: {
        fillColor: ORANGE,
        fontStyle: bold ? "bold" : "normal",
      },
    })),
  ];

  autoTable(doc, {
    ...baseTable,

    startY: y,

    margin: {
      left: MARGIN,
      right: MARGIN,
      bottom: bottomMargin,
    },

    styles: {
      ...baseTable.styles,
      fontSize: data.columns.length > 14 ? 6 : 7,
    },

    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 24 },
      2: { cellWidth: 46, halign: "left" },
    },

    head: [
      [
        { content: "#", rowSpan: 2 },
        { content: "Register No.", rowSpan: 2 },
        { content: "Student Name", rowSpan: 2 },
        ...groups.map((group) => ({
          content: group.label,
          colSpan: group.span,
        })),
      ],
      data.columns.map(
        (column) =>
          `${column.co} (${formatNumber(column.max)})`
      ),
    ],

    body: data.students.map((student, index) => [
      index + 1,
      student.registerNumber,
      student.name,
      ...student.marks.map(formatMark),
    ]),

    foot: [
      resultRow(
        "Students counted (present)",
        data.columns.map((column) => column.counted)
      ),
      resultRow(
        "Threshold marks",
        data.columns.map((column) =>
          formatNumber(column.threshold)
        )
      ),
      resultRow(
        "No. of students at or above threshold",
        data.columns.map(
          (column) => column.aboveThreshold
        )
      ),
      resultRow(
        "% of students at or above threshold",
        data.columns.map((column) =>
          formatPercent(column.percentage)
        )
      ),
      resultRow(
        "Attainment level",
        data.columns.map((column) =>
          formatLevel(column.level)
        ),
        true
      ),
    ],

    footStyles: {
      textColor: DARK,
    },

    // Results only once, after the last student
    showFoot: "lastPage",

    didParseCell: (cell) => {
      if (
        cell.section === "body" &&
        cell.cell.raw === "AB"
      ) {
        cell.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ---------------------------------------------------
  // ATTAINMENT OF EACH CO
  // ---------------------------------------------------

  const statements = new Map(
    (data.coStatements || []).map((co) => [
      co.code,
      co.statement,
    ])
  );

  autoTable(doc, {
    ...baseTable,

    startY: y,

    margin: {
      left: MARGIN,
      right: MARGIN,
      bottom: bottomMargin,
    },

    styles: {
      ...baseTable.styles,
      fontSize: 8,
      cellPadding: 1.3,
    },

    headStyles: {
      fillColor: GREEN,
      textColor: DARK,
      fontStyle: "bold",
    },

    columnStyles: {
      0: { cellWidth: 16 },
      1: { halign: "left" },
      2: { cellWidth: 34 },
      3: { cellWidth: 34, fontStyle: "bold" },
    },

    head: [
      [
        "CO",
        "Course outcome",
        "Columns used",
        "CO attainment level",
      ],
    ],

    body: data.cos.map((co) => [
      co.co,
      statements.get(co.co) || "-",
      co.columns,
      formatLevel(co.level),
    ]),
  });

  y = doc.lastAutoTable.finalY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);

  doc.text(
    "CO attainment level = average of the attainment levels of all the columns of that CO. Absent students are not counted.",
    MARGIN,
    y + 4
  );

  drawSignatures(doc, y + 4, [
    "Signature of Faculty",
    "Signature of HOD",
  ]);

  drawLetterheadFooter(doc, letterhead, footerNote);

  return doc;
}

// =====================================================
// SEMESTER REPORT - PDF
// =====================================================

export function buildSemesterAttainmentPdf(
  data,
  letterhead = {}
) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "landscape",
  });

  drawLetterheadHeader(doc, letterhead);

  const defaults = data.defaultTargets;

  let y = drawTitle(
    doc,
    "CO ATTAINMENT - SEMESTER SUMMARY",
    [
      `${departmentName(data.department)}  |  Semester ${
        data.semester
      }  |  Academic Year ${data.academicYear}  |  From all IAs`,
      `Each subject uses the threshold and level targets saved on its Course Outcomes page. Subjects marked * use the defaults: threshold ${defaults.marksPercent}%, Level 3 at ${defaults.level3}%, Level 2 at ${defaults.level2}%, Level 1 at ${defaults.level1}%.`,
    ]
  );

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
      fontSize: 8,
      cellPadding: 1.4,
    },

    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 24 },
      2: { halign: "left" },
      3: { cellWidth: 22 },
      4: { cellWidth: 16 },
    },

    head: [
      [
        "#",
        "Code",
        "Subject",
        "IAs",
        "Students",
        ...CO_NAMES,
        "Average",
      ],
    ],

    body: data.rows.map((row, index) => [
      index + 1,
      `${row.subject.code}${
        row.iaNumbers.length > 0 && !row.targetsSaved
          ? " *"
          : ""
      }`,
      row.subject.name,
      row.iaNumbers.length > 0
        ? row.iaNumbers.map((n) => `IA ${n}`).join(", ")
        : "None",
      row.students || "-",
      ...CO_NAMES.map((co) =>
        formatLevel(row.levels[co])
      ),
      {
        content: formatLevel(row.average),
        styles: {
          fillColor: GREEN,
          fontStyle: "bold",
        },
      },
    ]),
  });

  y = doc.lastAutoTable.finalY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);

  doc.text(
    "Level of a CO = average of the attainment levels of all the IA columns of that CO.  - = no IA marks for that CO.",
    MARGIN,
    y + 4
  );

  drawSignatures(doc, y + 4, ["Signature of HOD"]);

  drawLetterheadFooter(doc, letterhead, footerNote);

  return doc;
}

// =====================================================
// EXCEL
// =====================================================

const border = {
  top: { style: "thin", color: { rgb: "94A3B8" } },
  bottom: { style: "thin", color: { rgb: "94A3B8" } },
  left: { style: "thin", color: { rgb: "94A3B8" } },
  right: { style: "thin", color: { rgb: "94A3B8" } },
};

const cellStyle = ({
  bold = false,
  fill = null,
  color = "0F172A",
  size = 10,
  align = "center",
  withBorder = true,
} = {}) => ({
  font: { bold, color: { rgb: color }, sz: size },
  alignment: {
    horizontal: align,
    vertical: "center",
    wrapText: true,
  },
  ...(fill ? { fill: { fgColor: { rgb: fill } } } : {}),
  ...(withBorder ? { border } : {}),
});

// Writes rows of { v, s } cells to a sheet
const buildSheet = (XLSX, rows, merges, widths) => {
  const sheet = XLSX.utils.aoa_to_sheet(
    rows.map((row) =>
      row.map((cell) =>
        cell && typeof cell === "object" ? cell.v : cell
      )
    )
  );

  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell && typeof cell === "object" && cell.s) {
        const address = XLSX.utils.encode_cell({ r, c });

        if (!sheet[address]) {
          sheet[address] = { t: "s", v: "" };
        }

        sheet[address].s = cell.s;
      }
    });
  });

  sheet["!merges"] = merges;
  sheet["!cols"] = widths.map((wch) => ({ wch }));

  return sheet;
};

const titleRows = (width, lines) => {
  const rows = [];
  const merges = [];

  const add = (text, style) => {
    merges.push({
      s: { r: rows.length, c: 0 },
      e: { r: rows.length, c: width - 1 },
    });

    rows.push([
      { v: text, s: style },
      ...Array(width - 1).fill(null),
    ]);
  };

  add(
    "KARNATAKA (GOVT.) POLYTECHNIC, MANGALURU",
    cellStyle({
      bold: true,
      color: "991B34",
      size: 14,
      withBorder: false,
    })
  );

  lines.forEach((line, index) =>
    add(
      line,
      cellStyle({
        bold: index === 0,
        size: index === 0 ? 12 : 10,
        color: index === 0 ? "0F172A" : "475569",
        withBorder: false,
      })
    )
  );

  rows.push([]);

  return { rows, merges };
};

export const exportSubjectAttainmentExcel = (
  XLSX,
  data
) => {
  const width = Math.max(4, 3 + data.columns.length);

  const { rows, merges } = titleRows(width, [
    "CO Attainment - Internal Assessment",
    `${data.subject.code} - ${data.subject.name}  |  ${departmentName(
      data.subject.department
    )}  |  Semester ${data.subject.semester}  |  Academic Year ${
      data.academicYear
    }  |  ${iaLabel(data)}`,
    targetsLine(data.targets, data.targetsSaved),
  ]);

  const head = cellStyle({ bold: true, fill: "D8E4BC" });
  const plain = cellStyle();
  const left = cellStyle({ align: "left" });
  const orange = cellStyle({ fill: "F79646" });
  const orangeBold = cellStyle({ fill: "F79646", bold: true });
  const orangeLabel = cellStyle({
    fill: "F79646",
    align: "right",
  });

  // Headings
  const headRow1 = rows.length;

  const groups = columnGroups(data.columns);

  const first = [
    { v: "#", s: head },
    { v: "Register No.", s: head },
    { v: "Student Name", s: head },
  ];

  const second = [
    { v: "", s: head },
    { v: "", s: head },
    { v: "", s: head },
  ];

  let column = 3;

  groups.forEach((group) => {
    first.push({ v: group.label, s: head });

    for (let i = 1; i < group.span; i++) {
      first.push({ v: "", s: head });
    }

    if (group.span > 1) {
      merges.push({
        s: { r: headRow1, c: column },
        e: { r: headRow1, c: column + group.span - 1 },
      });
    }

    column += group.span;
  });

  data.columns.forEach((col) =>
    second.push({
      v: `${col.co} (${formatNumber(col.max)})`,
      s: head,
    })
  );

  [0, 1, 2].forEach((c) =>
    merges.push({
      s: { r: headRow1, c },
      e: { r: headRow1 + 1, c },
    })
  );

  rows.push(first, second);

  // Students
  data.students.forEach((student, index) => {
    rows.push([
      { v: index + 1, s: plain },
      { v: student.registerNumber, s: plain },
      { v: student.name, s: left },
      ...student.marks.map((mark) => ({
        v:
          mark === null || mark === undefined
            ? "-"
            : mark,
        s: plain,
      })),
    ]);
  });

  // Results
  const resultRow = (label, values, bold = false) => {
    merges.push({
      s: { r: rows.length, c: 0 },
      e: { r: rows.length, c: 2 },
    });

    rows.push([
      { v: label, s: orangeLabel },
      { v: "", s: orange },
      { v: "", s: orange },
      ...values.map((value) => ({
        v: value === null || value === undefined ? "-" : value,
        s: bold ? orangeBold : orange,
      })),
    ]);
  };

  resultRow(
    "Students counted (present)",
    data.columns.map((c) => c.counted)
  );
  resultRow(
    "Threshold marks",
    data.columns.map((c) => c.threshold)
  );
  resultRow(
    "No. of students at or above threshold",
    data.columns.map((c) => c.aboveThreshold)
  );
  resultRow(
    "% of students at or above threshold",
    data.columns.map((c) => c.percentage)
  );
  resultRow(
    "Attainment level",
    data.columns.map((c) => c.level),
    true
  );

  // CO attainment
  rows.push([]);

  const green = cellStyle({ fill: "C4D79B", bold: true });

  const statements = new Map(
    (data.coStatements || []).map((co) => [
      co.code,
      co.statement,
    ])
  );

  rows.push([
    { v: "CO", s: green },
    { v: "Columns used", s: green },
    { v: "Course outcome", s: green },
    { v: "CO attainment level", s: green },
  ]);

  data.cos.forEach((co) => {
    rows.push([
      { v: co.co, s: plain },
      { v: co.columns, s: plain },
      { v: statements.get(co.co) || "-", s: left },
      { v: co.level ?? "-", s: cellStyle({ bold: true }) },
    ]);
  });

  rows.push([]);
  rows.push([
    {
      v: "CO attainment level = average of the attainment levels of all the columns of that CO. Absent students are not counted.",
      s: cellStyle({ align: "left", withBorder: false, size: 9 }),
    },
  ]);

  const sheet = buildSheet(XLSX, rows, merges, [
    6,
    16,
    30,
    ...data.columns.map(() => 12),
  ]);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    "CO Attainment"
  );

  XLSX.writeFile(workbook, subjectFileName(data, "xlsx"));
};

export const exportSemesterAttainmentExcel = (
  XLSX,
  data
) => {
  const width = 12;

  const defaults = data.defaultTargets;

  const { rows, merges } = titleRows(width, [
    "CO Attainment - Semester Summary",
    `${departmentName(data.department)}  |  Semester ${
      data.semester
    }  |  Academic Year ${data.academicYear}  |  From all IAs`,
    `Subjects marked * use the default targets: threshold ${defaults.marksPercent}%, Level 3 at ${defaults.level3}%, Level 2 at ${defaults.level2}%, Level 1 at ${defaults.level1}%.`,
  ]);

  const head = cellStyle({ bold: true, fill: "D8E4BC" });
  const plain = cellStyle();
  const left = cellStyle({ align: "left" });
  const green = cellStyle({ bold: true, fill: "C4D79B" });

  rows.push(
    [
      "#",
      "Code",
      "Subject",
      "IAs",
      "Students",
      ...CO_NAMES,
      "Average",
    ].map((v) => ({ v, s: head }))
  );

  data.rows.forEach((row, index) => {
    rows.push([
      { v: index + 1, s: plain },
      {
        v: `${row.subject.code}${
          row.iaNumbers.length > 0 && !row.targetsSaved
            ? " *"
            : ""
        }`,
        s: plain,
      },
      { v: row.subject.name, s: left },
      {
        v:
          row.iaNumbers.length > 0
            ? row.iaNumbers.map((n) => `IA ${n}`).join(", ")
            : "None",
        s: plain,
      },
      { v: row.students || "-", s: plain },
      ...CO_NAMES.map((co) => ({
        v: row.levels[co] ?? "-",
        s: plain,
      })),
      { v: row.average ?? "-", s: green },
    ]);
  });

  const sheet = buildSheet(XLSX, rows, merges, [
    5,
    14,
    40,
    14,
    10,
    8,
    8,
    8,
    8,
    8,
    8,
    10,
  ]);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    "Semester CO Attainment"
  );

  XLSX.writeFile(workbook, semesterFileName(data, "xlsx"));
};
