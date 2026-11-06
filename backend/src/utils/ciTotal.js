// ==========================================================
// FINAL CIE (CONTINUOUS INTERNAL EVALUATION)
//
// Curriculum 2025: every CIE is marked out of 50 and the
// final CIE is the average of all the CIEs, out of 50.
//
// IA numbers stored in IAMarks:
//   1 - 4    IA1 to IA4 (CIE tests)
//   5        CIE 5: up to 8 activities, each CO-wise; its
//            marks are the average of the activities
//   11 - 14  Improvement test replacing IA1 to IA4
//            (10 + the IA it replaces)
//
// Rules:
// - Each part is scaled to 50 from its own maximum.
// - The final CIE averages only the parts entered for
//   the student's batch, so a subject with 4 parts and
//   one with 5 are both handled.
// - Absent (or not on the list of an entered part) = 0.
// - The final CIE is rounded up to a whole number
//   (8.1 -> 9).
// - One improvement test per student. It replaces the
//   chosen IA only when its mark is higher; the old mark
//   is kept.
// ==========================================================

export const TEST_IA_NUMBERS = [1, 2, 3, 4];

export const CIE5_IA = 5;

export const CIE5_MAX_ACTIVITIES = 8;

// Older name, kept for existing imports
export const ACTIVITY_IA = CIE5_IA;

// IA numbers a faculty can enter on the IA page
export const ENTRY_IA_NUMBERS = [...TEST_IA_NUMBERS, ACTIVITY_IA];

export const IMPROVEMENT_BASE = 10;

export const CIE_MAX = 50;

export const isImprovementIA = (iaNumber) =>
  TEST_IA_NUMBERS.includes(Number(iaNumber) - IMPROVEMENT_BASE);

export const improvementIANumber = (replacesIA) =>
  IMPROVEMENT_BASE + Number(replacesIA);

export const iaLabel = (iaNumber) => {
  const number = Number(iaNumber);

  if (number === CIE5_IA) {
    return "CIE 5";
  }

  if (isImprovementIA(number)) {
    return `Improvement (IA ${number - IMPROVEMENT_BASE})`;
  }

  return `IA ${number}`;
};

const round2 = (value) => Math.round(value * 100) / 100;

const studentKey = (studentRecord) =>
  String(
    studentRecord.studentId?._id || studentRecord.studentId || ""
  );

// A student's score in one record, scaled to 50.
// null when the student is not on the record.
const scoreIn = (record, cieMax) => {
  const scores = new Map();

  const max = Number(record.totalMaxMarks || 0);

  for (const studentRecord of record.students || []) {
    const tests = studentRecord.tests || [];

    const absent =
      tests.length > 0 &&
      tests.every((test) => test.status === "ABSENT");

    const marks = absent ? 0 : Number(studentRecord.totalMarks || 0);

    scores.set(studentKey(studentRecord), {
      marks,
      maxMarks: max,
      absent,
      scaled: max > 0 ? round2((marks / max) * cieMax) : 0,
    });
  }

  return scores;
};

// ==========================================================
// COMPUTE
//
// records: IAMarks records of one subject and academic
// year (any batches, any IA numbers).
//
// Returns Map studentId -> {
//   batchNumber,
//   parts: { 1: {marks, maxMarks, absent, scaled} | null, ..., 5 },
//   partNumbers: IA numbers entered for the batch,
//   improvement: { replacesIA, marks, maxMarks, scaled, used } | null,
//   finalBeforeImprovement,
//   final,
// }
// ==========================================================

export const computeCIE = (records, cieMax = CIE_MAX) => {
  const byBatch = new Map();

  for (const record of records) {
    const batch = Number(record.batchNumber);

    if (!byBatch.has(batch)) {
      byBatch.set(batch, []);
    }

    byBatch.get(batch).push(record);
  }

  const result = new Map();

  for (const [batch, batchRecords] of byBatch) {
    const partRecords = batchRecords
      .filter((record) =>
        ENTRY_IA_NUMBERS.includes(Number(record.iaNumber))
      )
      .sort((a, b) => a.iaNumber - b.iaNumber);

    const improvementRecords = batchRecords.filter((record) =>
      isImprovementIA(record.iaNumber)
    );

    const partScores = new Map(
      partRecords.map((record) => [
        Number(record.iaNumber),
        scoreIn(record, cieMax),
      ])
    );

    const improvementScores = improvementRecords.map((record) => ({
      replacesIA: Number(record.iaNumber) - IMPROVEMENT_BASE,
      scores: scoreIn(record, cieMax),
    }));

    const studentIds = new Set();

    for (const record of batchRecords) {
      for (const studentRecord of record.students || []) {
        studentIds.add(studentKey(studentRecord));
      }
    }

    const partNumbers = [...partScores.keys()];

    for (const id of studentIds) {
      const parts = {};

      for (const number of partNumbers) {
        parts[number] = partScores.get(number).get(id) || null;
      }

      const improvementEntry = improvementScores.find((entry) =>
        entry.scores.has(id)
      );

      const scaledOf = (number) => parts[number]?.scaled || 0;

      // Rounded up to a whole number; rounding to 2
      // decimals first keeps 26.0000001 at 26.
      const average = (values) =>
        values.length > 0
          ? Math.ceil(
              round2(
                values.reduce((sum, value) => sum + value, 0) /
                  values.length
              )
            )
          : null;

      const finalBeforeImprovement = average(
        partNumbers.map(scaledOf)
      );

      let improvement = null;
      let final = finalBeforeImprovement;

      if (improvementEntry) {
        const score = improvementEntry.scores.get(id);

        const used =
          partNumbers.includes(improvementEntry.replacesIA) &&
          score.scaled > scaledOf(improvementEntry.replacesIA);

        improvement = {
          replacesIA: improvementEntry.replacesIA,
          ...score,
          used,
        };

        if (used) {
          final = average(
            partNumbers.map((number) =>
              number === improvementEntry.replacesIA
                ? score.scaled
                : scaledOf(number)
            )
          );
        }
      }

      result.set(id, {
        batchNumber: batch,
        parts,
        partNumbers,
        improvement,
        finalBeforeImprovement,
        final,
      });
    }
  }

  return result;
};

// The IA a student's improvement test replaces by
// default: the first IA they were absent for, otherwise
// their lowest IA.
export const defaultReplacedIA = (cie) => {
  const tests = cie.partNumbers.filter((number) =>
    TEST_IA_NUMBERS.includes(number)
  );

  const absent = tests.find(
    (number) => !cie.parts[number] || cie.parts[number].absent
  );

  if (absent) {
    return absent;
  }

  return tests.reduce(
    (lowest, number) =>
      lowest === null ||
      cie.parts[number].scaled < cie.parts[lowest].scaled
        ? number
        : lowest,
    null
  );
};
