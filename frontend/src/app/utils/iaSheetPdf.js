import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawLetterheadFooter,
  drawLetterheadHeader,
  LETTERHEAD_FOOTER_HEIGHT,
  LETTERHEAD_MARGIN,
} from "./letterheadPdf.js";
import {
  batchLabel,
  formatMarks,
  getIACells,
} from "./iaSheet.js";

// =====================================================
// CONSOLIDATED IA SHEET (PDF)
//
// Every IA of a subject side by side: for each IA the
// COs that carry marks, then its total. The data comes
// from /api/my-entries/ia-sheet.
//
// Portrait when the columns fit, landscape otherwise.
// =====================================================

const MARGIN = LETTERHEAD_MARGIN;

const DARK = [15, 23, 42];
const GREY = [100, 116, 139];
const LINE = [148, 163, 184];
const HEAD = [216, 228, 188];
const TOTAL_FILL = [244, 247, 236];
const ABSENT_TEXT = [185, 28, 28];

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

export const iaSheetFileName = (data) =>
  `IA_Sheet_${data.subject.code}_Sem${data.subject.semester}_${data.academicYear}${
    data.batchNumbers.length === 2
      ? ""
      : `_Batch${data.batchNumbers[0]}`
  }.pdf`;

export function buildIASheetPdf(data, letterhead = {}) {
  const markColumns = data.ias.reduce(
    (count, ia) => count + ia.cos.length + 1,
    0
  );

  const landscape = markColumns > 12;

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: landscape ? "landscape" : "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  drawLetterheadHeader(doc, letterhead);

  // ---------------------------------------------------
  // TITLE
  // ---------------------------------------------------

  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...DARK);
  doc.text("CONSOLIDATED IA MARKS", pageWidth / 2, y, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  y += 5;
  doc.text(
    `${data.subject.code} - ${data.subject.name}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 4.6;
  doc.setTextColor(...GREY);
  doc.text(
    `${String(data.subject.department).toUpperCase()}  |  Semester ${
      data.subject.semester
    }  |  Academic Year ${data.academicYear}  |  ${batchLabel(
      data.batchNumbers
    )}  |  ${data.students.length} students`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 4;

  // ---------------------------------------------------
  // SHEET
  //
  // Row 1: IA 1 (spanning its COs + total), IA 2 ...
  // Row 2: CO1 (max), CO2 (max), Total (max) ...
  // ---------------------------------------------------

  const usableWidth = pageWidth - MARGIN * 2;

  const nameWidth = landscape ? 52 : 46;

  const markWidth = Math.min(
    16,
    (usableWidth - 8 - 24 - nameWidth) /
      Math.max(markColumns, 1)
  );

  const fontSize = markWidth < 10 ? 6.3 : 7.2;

  const columnStyles = {
    0: { cellWidth: 8 },
    1: { cellWidth: 24 },
    2: { cellWidth: nameWidth, halign: "left" },
  };

  let column = 3;

  data.ias.forEach((ia) => {
    ia.cos.forEach(() => {
      columnStyles[column] = { cellWidth: markWidth };
      column += 1;
    });

    columnStyles[column] = {
      cellWidth: markWidth,
      fillColor: TOTAL_FILL,
      fontStyle: "bold",
    };

    column += 1;
  });

  autoTable(doc, {
    theme: "grid",

    startY: y,

    margin: {
      left: MARGIN,
      right: MARGIN,
      bottom: LETTERHEAD_FOOTER_HEIGHT + 2,
    },

    rowPageBreak: "avoid",

    styles: {
      font: "helvetica",
      fontSize,
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

    columnStyles,

    head: [
      [
        { content: "#", rowSpan: 2 },
        { content: "Register No.", rowSpan: 2 },
        { content: "Student", rowSpan: 2 },
        ...data.ias.map((ia) => ({
          content: `IA ${ia.iaNumber}`,
          colSpan: ia.cos.length + 1,
        })),
      ],
      data.ias.flatMap((ia) => [
        ...ia.cos.map(
          ({ co, max }) => `${co}\n(${formatMarks(max)})`
        ),
        `Total\n(${formatMarks(ia.totalMax)})`,
      ]),
    ],

    body: data.students.map((student, index) => [
      index + 1,
      student.registerNumber,
      student.name,
      ...data.ias.flatMap((ia) =>
        getIACells(student, ia).map((value) =>
          value === "AB"
            ? {
                content: value,
                styles: {
                  textColor: ABSENT_TEXT,
                  fontStyle: "bold",
                },
              }
            : value
        )
      ),
    ]),
  });

  y = doc.lastAutoTable.finalY + 3.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GREY);
  doc.text(
    "Only the COs that carry marks in an IA are shown. Maximum marks in brackets. AB = absent for the IA.  - = no marks entered.",
    MARGIN,
    y
  );

  // ---------------------------------------------------
  // SIGNATURES
  // ---------------------------------------------------

  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + 24 > pageHeight - LETTERHEAD_FOOTER_HEIGHT - 2) {
    doc.addPage();
    y = MARGIN + 4;
  }

  y += 18;

  const lineWidth = 60;

  [
    { label: "Signature of Faculty", x: MARGIN },
    {
      label: "Signature of HOD",
      x: pageWidth - MARGIN - lineWidth,
    },
  ].forEach(({ label, x }) => {
    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.25);
    doc.line(x, y, x + lineWidth, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(label, x, y + 4);
  });

  drawLetterheadFooter(doc, letterhead, footerNote);

  return doc;
}
