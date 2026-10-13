import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// =====================================================
// PROGRESS REPORT PDF
//
// One A4 page: student details with photo, attendance
// month by month, IA marks, and the declaration signed
// by the student and the parent.
//
// report:        the data from /api/students/me/progress-report
// photoDataUrl:  the student's photo as a JPEG data URL,
//                or "" when there is none
// =====================================================

const MARGIN = 12;

const DARK = [15, 23, 42];
const GREY = [100, 116, 139];
const LINE = [203, 213, 225];
const RED = [220, 38, 38];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

export const getDepartmentName = (value) =>
  DEPARTMENT_NAMES[
    String(value || "").toLowerCase()
  ] || String(value || "").toUpperCase();

export const getMonthLabel = (month) =>
  `${MONTH_NAMES[month.month - 1]} ${month.year}`;

export const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// 12.5 -> "12.5", 12 -> "12"
export const formatMarks = (value) =>
  Number.isInteger(value)
    ? String(value)
    : Number(value).toFixed(1);

export const formatPercent = (value) =>
  value === null || value === undefined
    ? "-"
    : `${Number(value).toFixed(1)}%`;

export function buildProgressReportPdf(
  report,
  photoDataUrl
) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const contentWidth = pageWidth - MARGIN * 2;

  const { student } = report;

  // ---------------------------------------------------
  // HEADER
  // ---------------------------------------------------

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);

  doc.text(
    "KARNATAKA GOVERNMENT POLYTECHNIC, MANGALURU",
    pageWidth / 2,
    16,
    { align: "center" }
  );

  doc.setFontSize(11);

  doc.text(
    "Student Progress Report",
    pageWidth / 2,
    22,
    { align: "center" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);

  doc.text(
    `Academic Year ${report.academicYear}  |  Semester ${student.semester}  |  As on ${formatDate(
      report.generatedAt
    )}`,
    pageWidth / 2,
    27,
    { align: "center" }
  );

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 30, pageWidth - MARGIN, 30);

  // ---------------------------------------------------
  // STUDENT DETAILS + PHOTO
  // ---------------------------------------------------

  const photoWidth = 24;
  const photoHeight = 30;

  const photoX = pageWidth - MARGIN - photoWidth;
  const photoY = 33;

  if (photoDataUrl) {
    doc.addImage(
      photoDataUrl,
      "JPEG",
      photoX,
      photoY,
      photoWidth,
      photoHeight
    );
  } else {
    doc.setFontSize(7);
    doc.setTextColor(...GREY);

    doc.text(
      "Photo",
      photoX + photoWidth / 2,
      photoY + photoHeight / 2,
      { align: "center" }
    );
  }

  doc.rect(photoX, photoY, photoWidth, photoHeight);

  const details = [
    ["Name", student.name],
    ["Register No.", student.registerNumber],
    ["Roll No.", student.rollNumber],
    [
      "Department",
      getDepartmentName(student.department),
    ],
    [
      "Semester / Batch",
      `Semester ${student.semester} / Batch ${student.batchNumber}`,
    ],
    ["Father's Name", student.fatherName],
    ["Parent's Phone", student.parentPhone],
  ];

  let y = 37;

  doc.setFontSize(9);

  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GREY);
    doc.text(label, MARGIN, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);

    doc.text(
      String(value || "-"),
      MARGIN + 32,
      y,
      {
        maxWidth: photoX - MARGIN - 36,
      }
    );

    y += 4.4;
  });

  y = Math.max(y, photoY + photoHeight) + 5;

  // ---------------------------------------------------
  // ATTENDANCE + INTERNAL ASSESSMENT
  //
  // One table, so that the whole report fits on a
  // single page even with ten subjects:
  //
  // Subject | Aug | Sep | Total | % | IA 1 | IA 2 | Total
  // ---------------------------------------------------

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("Attendance and Internal Assessment", MARGIN, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);

  doc.text(
    `Attendance below ${report.minimumAttendance}% is shown in red.  AB = absent.`,
    pageWidth - MARGIN,
    y,
    { align: "right" }
  );

  y += 2;

  const minimum = report.minimumAttendance;

  const hasAttendance = report.months.length > 0;
  const hasIA = report.iaNumbers.length > 0;

  // Month headings carry the year only when the
  // report runs across two calendar years.
  const sameYear = report.months.every(
    (month) => month.year === report.months[0].year
  );

  const monthHeading = (month) =>
    sameYear
      ? MONTH_NAMES[month.month - 1]
      : `${MONTH_NAMES[month.month - 1]} ${String(
          month.year
        ).slice(-2)}`;

  // Columns of each part. A part with nothing entered
  // yet is a single "Not entered yet" column.
  // With running totals each month column already
  // shows the total up to the end of that month.
  const runningTotal = report.attendanceIsRunningTotal;

  const attendanceHead = hasAttendance
    ? [
        ...report.months.map((month) =>
          runningTotal
            ? `Up to ${monthHeading(month)}`
            : monthHeading(month)
        ),
        runningTotal ? "To date" : "Total",
        "%",
      ]
    : ["Not entered yet"];

  const iaHead = hasIA
    ? [
        ...report.iaNumbers.map(
          (iaNumber) => `IA ${iaNumber}`
        ),
        "Total",
      ]
    : ["Not entered yet"];

  // Position of the attendance percentage column
  const percentColumn = hasAttendance
    ? report.months.length + 2
    : -1;

  // First column of the IA part
  const iaStartColumn = 1 + attendanceHead.length;

  const attendanceCells = (row) =>
    hasAttendance
      ? [
          ...report.months.map((month) => {
            const value = row.attendance[month.key];

            return value
              ? `${value.attended} / ${value.eligible}`
              : "-";
          }),

          row.attendanceTotal.eligible > 0
            ? `${row.attendanceTotal.attended} / ${row.attendanceTotal.eligible}`
            : "-",

          formatPercent(
            row.attendanceTotal.percentage
          ),
        ]
      : ["-"];

  const iaCells = (row) =>
    hasIA
      ? [
          ...report.iaNumbers.map((iaNumber) => {
            const value = row.ia[iaNumber];

            if (!value) {
              return "-";
            }

            return value.absent
              ? `AB / ${formatMarks(value.maxMarks)}`
              : `${formatMarks(
                  value.marks
                )} / ${formatMarks(value.maxMarks)}`;
          }),

          row.iaTotal.maxMarks > 0
            ? `${formatMarks(
                row.iaTotal.marks
              )} / ${formatMarks(
                row.iaTotal.maxMarks
              )}`
            : "-",
        ]
      : ["-"];

  autoTable(doc, {
    startY: y,

    margin: {
      left: MARGIN,
      right: MARGIN,
    },

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 1.2,
      textColor: DARK,
      lineColor: LINE,
      lineWidth: 0.2,
      halign: "center",
      valign: "middle",
    },

    headStyles: {
      fillColor: [241, 245, 249],
      textColor: DARK,
      fontStyle: "bold",
    },

    footStyles: {
      fillColor: [241, 245, 249],
      textColor: DARK,
      fontStyle: "bold",
    },

    columnStyles: {
      0: {
        halign: "left",
        cellWidth: 54,
      },
    },

    head: [
      [
        {
          content: "Subject",
          rowSpan: 2,
        },
        {
          content:
            "Attendance (classes attended / held)",
          colSpan: attendanceHead.length,
        },
        {
          content:
            "Internal Assessment (marks / maximum)",
          colSpan: iaHead.length,
        },
      ],
      [...attendanceHead, ...iaHead],
    ],

    body: report.rows.map((row) => [
      `${row.subject.code}\n${row.subject.name}`,
      ...attendanceCells(row),
      ...iaCells(row),
    ]),

    foot: hasAttendance
      ? [
          [
            "Overall attendance",
            ...report.months.map(() => ""),
            `${report.overallAttendance.attended} / ${report.overallAttendance.eligible}`,
            formatPercent(
              report.overallAttendance.percentage
            ),
            ...iaHead.map(() => ""),
          ],
        ]
      : undefined,

    didParseCell: (cell) => {
      // A slightly heavier line between the two parts
      if (
        cell.column.index === iaStartColumn &&
        cell.section !== "head"
      ) {
        cell.cell.styles.lineWidth = {
          left: 0.5,
          top: 0.2,
          right: 0.2,
          bottom: 0.2,
        };
      }

      // Low attendance in red
      if (cell.column.index === percentColumn) {
        const value =
          cell.section === "body"
            ? report.rows[cell.row.index]
                ?.attendanceTotal.percentage
            : cell.section === "foot"
            ? report.overallAttendance.percentage
            : null;

        if (
          value !== null &&
          value !== undefined &&
          value < minimum
        ) {
          cell.cell.styles.textColor = RED;
          cell.cell.styles.fontStyle = "bold";
        }
      }

      // Absent in red
      if (
        cell.section === "body" &&
        String(cell.cell.raw).startsWith("AB")
      ) {
        cell.cell.styles.textColor = RED;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 7;

  // ---------------------------------------------------
  // DECLARATION + SIGNATURES
  //
  // Kept together. Moves to a new page only if the
  // tables have left no room for it.
  // ---------------------------------------------------

  const declarationHeight = 62;

  if (
    y + declarationHeight >
    pageHeight - MARGIN
  ) {
    doc.addPage();
    y = MARGIN + 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("Declaration by Parent / Guardian", MARGIN, y);

  y += 5;

  const declaration = [
    `1. I have seen the attendance and internal assessment marks of my ward shown above, as on ${formatDate(
      report.generatedAt
    )}.`,
    `2. I understand that a minimum of ${report.minimumAttendance}% attendance in every subject is required to be eligible for the semester end examination, and that internal assessment marks are counted towards the final result.`,
    "3. I will advise my ward to attend classes regularly and to improve wherever the performance is low.",
    "4. I understand that this report shows only what has been entered up to the above date, and that the records kept by the college are final.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  declaration.forEach((line) => {
    const lines = doc.splitTextToSize(
      line,
      contentWidth
    );

    doc.text(lines, MARGIN, y);

    y += lines.length * 3.9 + 1;
  });

  // Signatures

  y += 16;

  const columnWidth = contentWidth / 3;

  const signatures = [
    ["Signature of Student", "Date:"],
    [
      "Signature of Parent / Guardian",
      "Name:                              Date:",
    ],
    ["Signature of HOD", "Date:"],
  ];

  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.25);

  signatures.forEach(([title, below], index) => {
    const x = MARGIN + columnWidth * index;

    doc.line(x + 2, y, x + columnWidth - 4, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(title, x + 2, y + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(below, x + 2, y + 8.5);
  });

  // ---------------------------------------------------
  // FOOTER ON EVERY PAGE
  // ---------------------------------------------------

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GREY);

    doc.text(
      `${student.registerNumber}  |  Generated from ia.kptmangaluru.in on ${formatDate(
        report.generatedAt
      )}${pageCount > 1 ? `  |  Page ${page} of ${pageCount}` : ""}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  return doc;
}
