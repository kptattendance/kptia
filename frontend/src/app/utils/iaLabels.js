// =====================================================
// IA NUMBERS
//
// Same numbering as backend/src/utils/ciTotal.js:
//   1 - 4    IA1 to IA4
//   5        CIE 5: up to 8 activities, each CO-wise;
//            its mark is the average of the activities
//   11 - 14  Improvement test replacing IA1 to IA4
// =====================================================

export const TEST_IA_NUMBERS = [1, 2, 3, 4];

export const CIE5_IA = 5;

export const CIE5_MAX_ACTIVITIES = 8;

// Older name, kept for existing imports
export const ACTIVITY_IA = CIE5_IA;

// What a faculty enters on the IA page
export const ENTRY_IA_NUMBERS = [...TEST_IA_NUMBERS, ACTIVITY_IA];

export const IMPROVEMENT_BASE = 10;

export const isImprovementIA = (iaNumber) =>
  TEST_IA_NUMBERS.includes(Number(iaNumber) - IMPROVEMENT_BASE);

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

// Short form for narrow table headings
export const iaShortLabel = (iaNumber) => {
  const number = Number(iaNumber);

  if (number === CIE5_IA) {
    return "CIE5";
  }

  if (isImprovementIA(number)) {
    return `Impr. IA${number - IMPROVEMENT_BASE}`;
  }

  return `IA${number}`;
};
