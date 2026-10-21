// =====================================================
// COLLEGE LETTERHEAD FOR PDF REPORTS (jsPDF)
//
// Used by the student progress report and the CO
// attainment reports, in portrait or landscape.
//
// letterhead: { leftLogo, centerLogo, rightLogo,
//               kannadaFooter }, each a data URL made by
//               loadLetterhead() in letterheadAssets.js.
//               A missing image is simply left out.
// =====================================================

export const LETTERHEAD_MARGIN = 12;

// Height of the letterhead header; content starts below
export const LETTERHEAD_HEADER_BOTTOM = 43.5;

// Space the footer needs at the bottom of every page
export const LETTERHEAD_FOOTER_HEIGHT = 24;

const NAVY = [31, 56, 100];
const MAROON = [153, 27, 52];
const GOLD = [176, 124, 18];
const GREY = [100, 116, 139];

// Image format for jsPDF, from a data URL
const imageFormat = (dataUrl) =>
  dataUrl.startsWith("data:image/png")
    ? "PNG"
    : "JPEG";

// Draws an image inside a box, keeping its shape.
// Returns the height used.
export const drawImageInBox = (
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

// =====================================================
// HEADER (first page)
//
// Emblem of Karnataka in the middle, the college logos
// on the left and right, the name and address between,
// and a navy line under it.
// =====================================================

export const drawLetterheadHeader = (
  doc,
  letterhead = {}
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = LETTERHEAD_MARGIN;

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
      margin,
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
      pageWidth - margin - 24,
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
    "Kadri Hills, Mangaluru – 575004, Dakshina Kannada, Karnataka",
    pageWidth / 2,
    40.8,
    { align: "center" }
  );

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);

  doc.line(
    margin,
    LETTERHEAD_HEADER_BOTTOM,
    pageWidth - margin,
    LETTERHEAD_HEADER_BOTTOM
  );

  return LETTERHEAD_HEADER_BOTTOM;
};

// =====================================================
// FOOTER (every page)
//
// A small note above a navy line, then the college name
// and address in Kannada, then phone and e-mail.
//
// note(page, pageCount) returns the small note text.
// =====================================================

export const drawLetterheadFooter = (
  doc,
  letterhead = {},
  note
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = LETTERHEAD_MARGIN;

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    const lineY =
      pageHeight - LETTERHEAD_FOOTER_HEIGHT + 4;

    if (note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...GREY);

      doc.text(
        note(page, pageCount),
        pageWidth / 2,
        lineY - 1.5,
        { align: "center" }
      );
    }

    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.8);
    doc.line(margin, lineY, pageWidth - margin, lineY);

    // Kannada lines, drawn by the browser as an image
    // because PDF fonts cannot join Kannada letters.
    let textY = lineY + 4.5;

    if (letterhead.kannadaFooter) {
      const used = drawImageInBox(
        doc,
        letterhead.kannadaFooter,
        margin,
        lineY + 1.8,
        pageWidth - margin * 2,
        9,
        "center"
      );

      textY = lineY + 1.8 + used + 3;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);

    doc.text(
      "Phone No. 0824 – 3516910 / 2211636, E-Mail: kptmng@gmail.com",
      pageWidth / 2,
      textY,
      { align: "center" }
    );
  }
};
