import realAutoTable from "jspdf-autotable";

// =====================================================
// PDF -> EXCEL CAPTURE
//
// The PDF builders draw their headings with doc.text
// and their tables with autoTable. While a PDF is
// built, the same headings and tables are recorded on
// the doc, in order, so pdfToExcel.js can write them
// to an Excel sheet. The Excel file then always has
// exactly what the PDF has.
//
// In a builder:
//   import { autoTable, startCapture, stopCapture } from "./pdfCapture.js";
//   startCapture(doc)   after the letterhead header
//   stopCapture(doc)    before signatures and footer
// =====================================================

const getCapture = (doc) => {
  if (!doc.__excelCapture) {
    doc.__excelCapture = { events: [], active: false };
  }

  return doc.__excelCapture;
};

const pageOf = (doc) =>
  doc.internal.getCurrentPageInfo?.().pageNumber || 1;

// Same call as jspdf-autotable; also records the table
export const autoTable = (doc, options) => {
  const capture = doc.__excelCapture;
  const wasActive = Boolean(capture?.active);

  // The table draws its cells with doc.text; those are
  // recorded as the table, not as loose text.
  if (capture) {
    capture.active = false;
  }

  try {
    realAutoTable(doc, options);
  } finally {
    if (capture) {
      capture.active = wasActive;
    }
  }

  if (wasActive) {
    capture.events.push({
      type: "table",
      head: options.head || [],
      body: options.body || [],
      foot: options.foot || [],
    });
  }
};

// Records every doc.text from now on
export const startCapture = (doc) => {
  const capture = getCapture(doc);

  if (capture.active) {
    return;
  }

  capture.active = true;

  const originalText = doc.text.bind(doc);

  capture.originalText = originalText;

  doc.text = (text, x, y, ...rest) => {
    if (capture.active) {
      const value = Array.isArray(text)
        ? text.join(" ")
        : String(text ?? "");

      if (value.trim()) {
        capture.events.push({
          type: "text",
          value: value.trim(),
          x: Number(x) || 0,
          y: Number(y) || 0,
          page: pageOf(doc),
          bold: doc.getFont?.().fontStyle === "bold",
        });
      }
    }

    return originalText(text, x, y, ...rest);
  };
};

export const stopCapture = (doc) => {
  const capture = getCapture(doc);
  capture.active = false;
};

export const getCapturedEvents = (doc) =>
  doc.__excelCapture?.events || [];
