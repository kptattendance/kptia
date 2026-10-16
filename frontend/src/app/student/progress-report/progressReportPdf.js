import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// =====================================================
// PROGRESS REPORT PDF
//
// One A4 page: letterhead, student details with photo
// and mentor, attendance and IA month by month, the
// parent's declaration, and signatures of the student,
// parent, mentor, HOD and Principal.
//
// report:        the data from /api/students/me/progress-report
// photoDataUrl:  the student's photo as a JPEG data URL,
//                or "" when there is none
// letterhead:    images for the college letterhead
//                { leftLogo, centerLogo, rightLogo,
//                  kannadaFooter }, each a data URL.
//                A missing one is simply left out.
// =====================================================

const MARGIN = 12;

const DARK = [15, 23, 42];
const GREY = [100, 116, 139];
const LINE = [203, 213, 225];
const RED = [220, 38, 38];

// Letterhead colours
const NAVY = [31, 56, 100];
const MAROON = [153, 27, 52];
const GOLD = [176, 124, 18];

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

// Attendance percentage of one month cell
export const monthPercentage = (value) =>
  value && value.eligible > 0
    ? Math.round(
        (value.attended / value.eligible) * 1000
      ) / 10
    : null;

// Image format for jsPDF, from a data URL
const imageFormat = (dataUrl) =>
  dataUrl.startsWith("data:image/png")
    ? "PNG"
    : "JPEG";

// Draws an image inside a box, keeping its shape.
// Returns the height used.
const drawImageInBox = (
  doc,
  dataUrl,
  x,
  y,
  maxWidth,
  maxHeight,
  align = "left"
) => {
  const { width, height } =
    doc.getImageProperties(dataUrl);

  const scale = Math.min(
    maxWidth / width,
    maxHeight / height
  );

  const drawWidth = width * scale;
  const drawHeight = height * scale;

  const left =
    align === "center"
      ? x + (maxWidth - drawWidth) / 2
      : x;

  doc.addImage(
    dataUrl,
    imageFormat(dataUrl),
    left,
    y,
    drawWidth,
    drawHeight
  );

  return drawHeight;
};

export function buildProgressReportPdf(
  report,
  photoDataUrl,
  letterhead = {}
) {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const contentWidth = pageWidth - MARGIN * 2;

  const { student } = report;

  // Space kept free at the bottom for the footer
  const footerHeight = 24;

  const contentBottom = pageHeight - footerHeight - 2;

  // ---------------------------------------------------
  // LETTERHEAD
  //
  // Emblem of Karnataka in the middle, the college logos
  // on the left and right, the name and address between.
  // ---------------------------------------------------

  if (letterhead.centerLogo) {
    drawImageInBox(
      doc,
      letterhead.centerLogo,
      pageWidth / 2 - 8,
      5,
      16,
      13,
      "center"
    );
  }

  if (letterhead.leftLogo) {
    drawImageInBox(
      doc,
      letterhead.leftLogo,
      MARGIN,
      13,
      24,
      24,
      "center"
    );
  }

  if (letterhead.rightLogo) {
    drawImageInBox(
      doc,
      letterhead.rightLogo,
      pageWidth - MARGIN - 24,
      13,
      24,
      24,
      "center"
    );
  }

  const centered = (text, top, size, color) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, pageWidth / 2, top, {
      align: "center",
    });
  };

  centered("GOVERNMENT OF KARNATAKA", 22, 10.5, NAVY);

  centered(
    "DEPARTMENT OF TECHNICAL EDUCATION",
    26.3,
    8.5,
    NAVY
  );

  centered(
    "KARNATAKA (GOVT.) POLYTECHNIC, MANGALURU",
    32.5,
    14,
    MAROON
  );

  centered(
    "(First Autonomous Polytechnic in India from AICTE New Delhi)",
    36.8,
    8,
    GOLD
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);

  doc.text(
    "Kadri Hills, Mangaluru \u2013 575004, Dakshina Kannada, Karnataka",
    pageWidth / 2,
    40.8,
    { align: "center" }
  );

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 43.5, pageWidth - MARGIN, 43.5);

  let y = 49;

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  doc.text(
    "STUDENT PROGRESS REPORT",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);

  doc.text(
    `Academic Year ${report.academicYear}  |  Semester ${student.semester}  |  As on ${formatDate(
      report.generatedAt
    )}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 3;

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);

  // ---------------------------------------------------
  // STUDENT DETAILS + PHOTO
  // ---------------------------------------------------

  const photoWidth = 21;
  const photoHeight = 26;

  const photoX = pageWidth - MARGIN - photoWidth;
  const photoY = y + 3;

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

  doc.setDrawColor(...LINE);
  doc.rect(photoX, photoY, photoWidth, photoHeight);

  // Two columns of details to the left of the photo
  const detailColumns = [
    [
      ["Name", student.name],
      ["Register No.", student.registerNumber],
      [
        "Department",
        getDepartmentName(student.department),
      ],
      [
        "Semester / Batch",
        `Semester ${student.semester} / Batch ${student.batchNumber}`,
      ],
    ],
    [
      ["Father's Name", student.fatherName],
      ["Parent's Phone", student.parentPhone],
      ["Mentor", student.mentorName || "Not assigned"],
    ],
  ];

  const detailsWidth = photoX - MARGIN - 4;
  const columnWidth = detailsWidth / 2;

  doc.setFontSize(8.5);

  let detailsBottom = photoY;

  detailColumns.forEach((rows, columnIndex) => {
    const x = MARGIN + columnWidth * columnIndex;

    let rowY = photoY + 3.5;

    rows.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GREY);
      doc.text(label, x, rowY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);

      doc.text(String(value || "-"), x + 26, rowY, {
        maxWidth: columnWidth - 28,
      });

      rowY += 5.4;
    });

    detailsBottom = Math.max(detailsBottom, rowY);
  });

  y = Math.max(detailsBottom, photoY + photoHeight) + 5;

  // ---------------------------------------------------
  // ATTENDANCE + INTERNAL ASSESSMENT
  //
  // Each attendance cell: classes attended / held and
  // the percentage. Each IA cell: marks / maximum.
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

  // With running totals each month column shows the
  // total from the start of the semester.
  const runningTotal = report.attendanceIsRunningTotal;

  // Month headings carry the year only when the
  // report runs across two calendar years.
  const sameYear = report.months.every(
    (month) => month.year === report.months[0].year
  );

  const monthHeading = (month) => {
    const name = sameYear
      ? MONTH_NAMES[month.month - 1]
      : `${MONTH_NAMES[month.month - 1]} ${String(
          month.year
        ).slice(-2)}`;

    return runningTotal ? `Up to ${name}` : name;
  };

  const attendanceHead = hasAttendance
    ? report.months.map(monthHeading)
    : ["Not entered yet"];

  const iaHead = hasIA
    ? report.iaNumbers.map(
        (iaNumber) => `IA ${iaNumber}`
      )
    : ["Not entered yet"];

  const monthCount = hasAttendance
    ? report.months.length
    : 0;

  // First column of the IA part
  const iaStartColumn = 1 + attendanceHead.length;

  const attendanceCells = (row) =>
    hasAttendance
      ? report.months.map((month) => {
          const value = row.attendance[month.key];

          return value
            ? `${value.attended} / ${value.eligible}\n${formatPercent(
                monthPercentage(value)
              )}`
            : "-";
        })
      : ["-"];

  const iaCells = (row) =>
    hasIA
      ? report.iaNumbers.map((iaNumber) => {
          const value = row.ia[iaNumber];

          if (!value) {
            return "-";
          }

          return value.absent
            ? `AB / ${formatMarks(value.maxMarks)}`
            : `${formatMarks(
                value.marks
              )} / ${formatMarks(value.maxMarks)}`;
        })
      : ["-"];

  autoTable(doc, {
    startY: y,

    margin: {
      left: MARGIN,
      right: MARGIN,
      bottom: pageHeight - contentBottom,
    },

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 0.9,
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

    columnStyles: {
      0: {
        halign: "left",
        cellWidth: 56,
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
            "Internal Assessment (marks / max)",
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

    didParseCell: (cell) => {
      if (cell.section !== "body") {
        return;
      }

      // A slightly heavier line between the two parts
      if (cell.column.index === iaStartColumn) {
        cell.cell.styles.lineWidth = {
          left: 0.5,
          top: 0.2,
          right: 0.2,
          bottom: 0.2,
        };
      }

      // Low attendance in red
      if (
        cell.column.index >= 1 &&
        cell.column.index <= monthCount
      ) {
        const month =
          report.months[cell.column.index - 1];

        const value =
          report.rows[cell.row.index]?.attendance[
            month.key
          ];

        const percent = monthPercentage(value);

        if (percent !== null && percent < minimum) {
          cell.cell.styles.textColor = RED;
          cell.cell.styles.fontStyle = "bold";
        }
      }

      // Absent in red
      if (String(cell.cell.raw).startsWith("AB")) {
        cell.cell.styles.textColor = RED;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ---------------------------------------------------
  // DECLARATION + SIGNATURES
  //
  // Kept together. Moves to a new page only if the
  // table has left no room for it.
  // ---------------------------------------------------

  const declaration = [
    `1. I have seen the attendance and internal assessment marks of my ward shown above, as on ${formatDate(
      report.generatedAt
    )}.`,
    `2. I understand that a minimum of ${report.minimumAttendance}% attendance in every subject is required to be eligible for the semester end examination, and that internal assessment marks are counted towards the final result.`,
    "3. I will advise my ward to attend classes regularly and to improve wherever the performance is low.",
    "4. I understand that this report shows only what has been entered up to the above date, and that the records kept by the college are final.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);

  const declarationLines = declaration.map((line) =>
    doc.splitTextToSize(line, contentWidth)
  );

  const declarationHeight =
    6 +
    declarationLines.reduce(
      (total, lines) => total + lines.length * 3.7 + 0.8,
      0
    );

  const signaturesHeight = 46;

  if (
    y + declarationHeight + signaturesHeight >
    contentBottom
  ) {
    doc.addPage();
    y = MARGIN + 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text("Declaration by Parent / Guardian", MARGIN, y);

  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.setTextColor(...DARK);

  declarationLines.forEach((lines) => {
    doc.text(lines, MARGIN, y);
    y += lines.length * 3.7 + 0.8;
  });

  // ---------------------------------------------------
  // SIGNATURES
  //
  // Row 1: Student, Parent / Guardian
  // Row 2: Mentor, HOD, Principal
  //
  // A signature image, when provided, is placed just
  // above its line.
  // ---------------------------------------------------

  const signatureBlock = (
    x,
    width,
    lineY,
    title,
    below,
    image
  ) => {
    if (image) {
      drawImageInBox(
        doc,
        image,
        x + 2,
        lineY - 13,
        width - 6,
        12,
        "center"
      );
    }

    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.25);
    doc.line(x + 2, lineY, x + width - 4, lineY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(title, x + 2, lineY + 4);

    if (below) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text(below, x + 2, lineY + 8, {
        maxWidth: width - 6,
      });
    }
  };

  // Row 1
  y += 13;

  const half = contentWidth / 2;

  signatureBlock(
    MARGIN,
    half,
    y,
    "Signature of Student",
    "Date:"
  );

  signatureBlock(
    MARGIN + half,
    half,
    y,
    "Signature of Parent / Guardian",
    "Name:                                       Date:"
  );

  // Row 2
  y += 21;

  const third = contentWidth / 3;

  signatureBlock(
    MARGIN,
    third,
    y,
    "Signature of Mentor",
    student.mentorName || ""
  );

  signatureBlock(
    MARGIN + third,
    third,
    y,
    "Signature of HOD",
    getDepartmentName(student.department)
  );

  signatureBlock(
    MARGIN + third * 2,
    third,
    y,
    "Signature of Principal",
    ""
  );

  // ---------------------------------------------------
  // FOOTER ON EVERY PAGE
  //
  // Line, college name and address in Kannada, phone
  // and e-mail. Above the line, a small note of when
  // and for whom the report was made.
  // ---------------------------------------------------

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    const lineY = pageHeight - footerHeight + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GREY);

    doc.text(
      `${student.registerNumber}  |  Generated from ia.kptmangaluru.in on ${formatDate(
        report.generatedAt
      )}${pageCount > 1 ? `  |  Page ${page} of ${pageCount}` : ""}`,
      pageWidth / 2,
      lineY - 1.5,
      { align: "center" }
    );

    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, lineY, pageWidth - MARGIN, lineY);

    // Kannada lines, drawn by the browser as an image
    // because PDF fonts cannot join Kannada letters.
    let textY = lineY + 4.5;

    if (letterhead.kannadaFooter) {
      const used = drawImageInBox(
        doc,
        letterhead.kannadaFooter,
        MARGIN,
        lineY + 1.8,
        contentWidth,
        9,
        "center"
      );

      textY = lineY + 1.8 + used + 3;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);

    doc.text(
      "Phone No. 0824 \u2013 3516910 / 2211636, E-Mail: kptmng@gmail.com",
      pageWidth / 2,
      textY,
      { align: "center" }
    );
  }

  return doc;
}
