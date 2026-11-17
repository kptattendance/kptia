// =====================================================
// BRIDGE COURSE ELIGIBILITY (same rule as the backend,
// backend/src/utils/bridgeEligibility.js)
//
// A bridge subject is taken only by the groups ticked
// for it on Admin -> Bridge Courses. Not set yet = all
// lateral students.
// =====================================================

export const BRIDGE_GROUPS = [
  { key: "lateralPUC", label: "PUC" },
  { key: "lateralITI", label: "ITI Same" },
  { key: "lateralCross", label: "ITI Cross" },
  { key: "branchChange", label: "Branch Change" },
];

export const LATERAL_ADMISSION_TYPES = [
  "lateralPUC",
  "lateralITI",
  "lateralCross",
];

export const isBridgeSubject = (subject) =>
  String(subject?.subjectCategory || "").toUpperCase() === "BRIDGE";

export const bridgeGroupsOf = (subject) =>
  Array.isArray(subject?.bridgeFor) && subject.bridgeFor.length > 0
    ? subject.bridgeFor
    : null;

export const takesSubject = (student, subject) => {
  if (!isBridgeSubject(subject)) {
    return true;
  }

  const admissionType = String(student?.admissionType || "").trim();
  const groups = bridgeGroupsOf(subject);

  if (!groups) {
    return LATERAL_ADMISSION_TYPES.includes(admissionType);
  }

  return (
    groups.includes(admissionType) ||
    (Boolean(student?.branchChange) && groups.includes("branchChange"))
  );
};
