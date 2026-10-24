import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawLetterheadFooter,
  drawLetterheadHeader,
  LETTERHEAD_FOOTER_HEIGHT,
  LETTERHEAD_MARGIN,
} from "./letterheadPdf.js";

// =====================================================
// SEMESTER ATTENDANCE REPORT (PDF, portrait)
//
// The HOD attendance sheet: one row per student, one
// column per subject (attended / eligible and %), and
// the overall attendance. Anything below 75% is
// highlighted in red.
//
// After the sheet: the subject codes with their names,
// and the students whose overall attendance is below
// 75%.
//
// students  [{ registerNumber, name, batchNumber,
//              subjects: { [subjectId]: { attended,
//              conducted } } }]
// subjects  [{ _id, code, name }]
// =====================================================

const MARGIN = LETTERHEAD_MARGIN;

const MINIMUM = 75;

const DARK = [15, 23, 42];
const GREY = [100, 116, 139];
const LINE = [148, 163, 184];
const HEAD = [216, 228, 188];

const LOW_FILL = [254, 202, 202];
const LOW_TEXT = [153, 27, 27];
const OK_FILL = [236, 246, 228];
const EMPTY_FILL = [241, 245, 249];

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
    fontSize: 7,
    cellPadding: 1,
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

const percentOf = (attended, conducted) =>
  conducted > 0 ? (attended / conducted) * 100 : null;

// One attendance cell: "12/15" over "80.0%"
const attendanceCell = (attended, conducted) => {
  const percentage = percentOf(attended, conducted);

  if (percentage === null) {
    return {
      content: "-",
      styles: { fillColor: EMPTY_FILL, textColor: GREY },
    };
  }

  const low = percentage < MINIMUM;

  return {
    content: `${attended}/${conducted}\n${percentage.toFixed(1)}%`,
    styles: {
      fillColor: low ? LOW_FILL : OK_FILL,
      textColor: low ? LOW_TEXT : DARK,
      fontStyle: low ? "bold" : "normal",
    },
  };
};

// Overall attendance of a student, over the subjects
// that have attendance entered for them.
const getOverall = (student, subjects) => {
  let attended = 0;
  let conducted = 0;

  subjects.forEach((subject) => {
    const record = student.subjects?.[String(subject._id)];

    const subjectConducted = Number(record?.conducted || 0);

    if (subjectConducted > 0) {
      attended += Number(record?.attended || 0);
      conducted += subjectConducted;
    }
  });

  return {
    attended,
    conducted,
    percentage: percentOf(attended, conducted),
  };
};

const ensureSpace = (doc, y, needed) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + needed > pageHeight - LETTERHEAD_FOOTER_HEIGHT - 2) {
    doc.addPage();
    return MARGIN + 4;
  }

  return y;
};

const sectionTitle = (doc, text, y) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  doc.text(text, MARGIN, y);

  return y + 2;
};

export const attendanceReportFileName = ({
  department,
  semester,
  monthLabel,
  year,
}) =>
  `Attendance_${String(department || "").toUpperCase()}_Sem${semester}_${String(
    monthLabel || ""
  ).replace(/\s+/g, "_")}_${year}.pdf`;

export function buildAttendanceReportPdf(
  {
    departmentLabel,
    semester,
    monthLabel,
    year,
    batchLabel,
    students,
    subjects,
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

  const overall = students.map((student) =>
    getOverall(student, subjects)
  );

  const below = students
    .map((student, index) => ({
      student,
      overall: overall[index],
    }))
    .filter(
      (item) =>
        item.overall.percentage !== null &&
        item.overall.percentage < MINIMUM
    );

  // ---------------------------------------------------
  // TITLE
  // ---------------------------------------------------

  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...DARK);
  doc.text("SEMESTER ATTENDANCE REPORT", pageWidth / 2, y, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  y += 5;
  doc.text(
    `${departmentLabel}  |  Semester ${semester}  |  ${monthLabel} ${year}  |  ${batchLabel}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 4.6;
  doc.setTextColor(...GREY);
  doc.text(
    `${students.length} students  |  ${subjects.length} subjects  |  ${below.length} below ${MINIMUM}% overall`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 4;

  // ---------------------------------------------------
  // ATTENDANCE SHEET
  //
  // Name and subjects share the width of the page.
  // ---------------------------------------------------

  const usableWidth = pageWidth - MARGIN * 2;

  const fixedWidth = 7 + 20 + 16; // #, register no, overall

  const nameWidth = Math.max(
    26,
    Math.min(48, usableWidth - fixedWidth - subjects.length * 12)
  );

  const subjectWidth =
    subjects.length > 0
      ? (usableWidth - fixedWidth - nameWidth) / subjects.length
      : 0;

  const subjectFontSize = subjectWidth < 12 ? 5.8 : 6.5;

  const columnStyles = {
    0: { cellWidth: 7 },
    1: { cellWidth: 20, fontSize: 6.5 },
    2: { cellWidth: nameWidth, halign: "left" },
  };

  subjects.forEach((_, index) => {
    columnStyles[3 + index] = {
      cellWidth: subjectWidth,
      fontSize: subjectFontSize,
    };
  });

  columnStyles[3 + subjects.length] = { cellWidth: 16 };

  autoTable(doc, {
    ...baseTable,

    startY: y,

    margin: {
      left: MARGIN,
      right: MARGIN,
      bottom: LETTERHEAD_FOOTER_HEIGHT + 2,
    },

    columnStyles,

    // A student's row is never split across pages.
    rowPageBreak: "avoid",

    // Smaller headings when the subject columns are
    // narrow, so a subject code stays on one line.
    headStyles: {
      ...baseTable.headStyles,
      fontSize: subjectWidth < 14 ? 5.6 : 6.5,
    },

    head: [
      [
        "#",
        "Register No.",
        "Student",
        ...subjects.map((subject) => subject.code),
        "Overall",
      ],
    ],

    body: students.map((student, index) => [
      index + 1,
      student.registerNumber || "",
      `${student.name || ""}${
        student.batchNumber ? `\nBatch ${student.batchNumber}` : ""
      }`,
      ...subjects.map((subject) => {
        const record =
          student.subjects?.[String(subject._id)];

        return attendanceCell(
          Number(record?.attended || 0),
          Number(record?.conducted || 0)
        );
      }),
      attendanceCell(
        overall[index].attended,
        overall[index].conducted
      ),
    ]),
  });

  y = doc.lastAutoTable.finalY + 3.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GREY);
  doc.text(
    `Each cell: classes attended / classes the student was eligible for, and the percentage. Red = below ${MINIMUM}%.  - = not entered.`,
    MARGIN,
    y
  );

  y += 6;

  // ---------------------------------------------------
  // SUBJECTS
  // ---------------------------------------------------

  y = ensureSpace(doc, y, 20);
  y = sectionTitle(doc, "Subjects", y);

  autoTable(doc, {
    ...baseTable,

    startY: y,

    margin: {
      left: MARGIN,
      right: MARGIN,
      bottom: LETTERHEAD_FOOTER_HEIGHT + 2,
    },

    columnStyles: {
      0: { cellWidth: 30 },
      1: { halign: "left" },
    },

    head: [["Code", "Subject"]],

    body: subjects.map((subject) => [
      subject.code,
      subject.name,
    ]),
  });

  y = doc.lastAutoTable.finalY + 7;

  // ---------------------------------------------------
  // BELOW 75%
  // ---------------------------------------------------

  y = ensureSpace(doc, y, 20);
  y = sectionTitle(
    doc,
    `Students Below ${MINIMUM}% Overall Attendance (${below.length})`,
    y
  );

  if (below.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text(
      `Every student has at least ${MINIMUM}% overall attendance.`,
      MARGIN,
      y + 5
    );

    y += 9;
  } else {
    autoTable(doc, {
      ...baseTable,

      startY: y,

      margin: {
        left: MARGIN,
        right: MARGIN,
        bottom: LETTERHEAD_FOOTER_HEIGHT + 2,
      },

      columnStyles: {
        0: { cellWidth: 9 },
        1: { cellWidth: 28 },
        2: { halign: "left" },
        3: { cellWidth: 16 },
        4: { cellWidth: 28 },
        5: { cellWidth: 20 },
      },

      head: [
        [
          "#",
          "Register No.",
          "Student",
          "Batch",
          "Attended / Eligible",
          "Overall",
        ],
      ],

      body: below.map((item, index) => [
        index + 1,
        item.student.registerNumber || "",
        item.student.name || "",
        item.student.batchNumber || "",
        `${item.overall.attended} / ${item.overall.conducted}`,
        {
          content: `${item.overall.percentage.toFixed(1)}%`,
          styles: {
            fillColor: LOW_FILL,
            textColor: LOW_TEXT,
            fontStyle: "bold",
          },
        },
      ]),
    });

    y = doc.lastAutoTable.finalY;
  }

  // ---------------------------------------------------
  // SIGNATURE
  // ---------------------------------------------------

  y = ensureSpace(doc, y, 22);

  y += 16;

  const lineWidth = 60;
  const x = pageWidth - MARGIN - lineWidth;

  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.25);
  doc.line(x, y, pageWidth - MARGIN, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text("Signature of HOD", x, y + 4);

  drawLetterheadFooter(doc, letterhead, footerNote);

  return doc;
}
