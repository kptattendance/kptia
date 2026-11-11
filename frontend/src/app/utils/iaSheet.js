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

// Final CIE: 23.4 -> "23.4", null -> "-"
export const formatCIE = (value) =>
  value === null || value === undefined
    ? "-"
    : formatMarks(Math.round(Number(value) * 10) / 10);

// =====================================================
// CO ATTAINMENT
//
// Decided in the department meeting: a student attains
// a CO in an IA when they score at least this share of
// that CO's maximum marks.
//   1st year (Sem 1, 2)  40%
//   2nd year (Sem 3, 4)  50%
//   3rd year (Sem 5, 6)  60%
//
// For each IA and CO: students attained / students who
// wrote it (absent and not entered are left out).
// A CO's attainment = average of its % across the IAs.
// =====================================================

export const coTargetPercent = (semester) => {
  const sem = Number(semester);

  if (sem <= 2) return 40;
  if (sem <= 4) return 50;

  return 60;
};

const round1 = (value) => Math.round(value * 10) / 10;

export const computeCOAttainment = (sheet) => {
  const targetPercent = coTargetPercent(sheet.subject?.semester);

  // key `${iaNumber}|${co}` -> { threshold, attained, counted, percent }
  const columns = {};

  const byCO = {};

  sheet.ias.forEach((ia) => {
    ia.cos.forEach(({ co, max }) => {
      const threshold = (Number(max) * targetPercent) / 100;

      let attained = 0;
      let counted = 0;

      sheet.students.forEach((student) => {
        const entry = student.ia?.[ia.iaNumber];

        if (!entry || entry.absent) {
          return;
        }

        counted += 1;

        if (Number(entry.coMarks?.[co] || 0) >= threshold - 1e-9) {
          attained += 1;
        }
      });

      const percent =
        counted > 0 ? round1((attained / counted) * 100) : null;

      columns[`${ia.iaNumber}|${co}`] = {
        threshold: round1(threshold),
        attained,
        counted,
        percent,
      };

      if (percent !== null) {
        if (!byCO[co]) byCO[co] = [];
        byCO[co].push(percent);
      }
    });
  });

  const summary = Object.keys(byCO)
    .sort()
    .map((co) => ({
      co,
      percent: round1(
        byCO[co].reduce((sum, value) => sum + value, 0) /
          byCO[co].length
      ),
      iaCount: byCO[co].length,
    }));

  return { targetPercent, columns, summary };
};
