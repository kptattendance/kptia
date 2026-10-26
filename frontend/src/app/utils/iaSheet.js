// =====================================================
// CONSOLIDATED IA SHEET - shared by the page and the PDF
//
// The data comes from /api/my-entries/ia-sheet:
// ias:      [{ iaNumber, totalMax, cos: [{ co, max }] }]
// students: [{ ia: { "1": { coMarks, total, absent } } }]
// =====================================================

// 12.5 -> "12.5", 12 -> "12"
export const formatMarks = (value) =>
  Number.isInteger(value)
    ? String(value)
    : Number(value).toFixed(1);

export const batchLabel = (batchNumbers = []) =>
  batchNumbers.length === 2
    ? "Batch 1 & Batch 2"
    : `Batch ${batchNumbers[0]}`;

// One student's cells for one IA: a mark per CO, then
// the total. "AB" when absent for the whole IA, "-" when
// the student has no marks in that IA.
export const getIACells = (student, ia) => {
  const entry = student.ia?.[ia.iaNumber];

  if (!entry) {
    return [...ia.cos.map(() => "-"), "-"];
  }

  if (entry.absent) {
    return [...ia.cos.map(() => "AB"), "AB"];
  }

  return [
    ...ia.cos.map(({ co }) =>
      formatMarks(Number(entry.coMarks?.[co] || 0))
    ),
    formatMarks(Number(entry.total || 0)),
  ];
};
