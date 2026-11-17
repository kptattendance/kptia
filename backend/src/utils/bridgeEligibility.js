// =====================================================
// BRIDGE COURSE ELIGIBILITY
//
// A bridge subject is taken only by the student groups
// ticked for it on Admin -> Bridge Courses:
//
//   lateralPUC    PUC (lateral entry after PUC)
//   lateralITI    ITI, same trade
//   lateralCross  ITI, cross trade
//   branchChange  student who changed branch
//                 (Student.branchChange = true)
//
// A bridge subject with no groups saved yet goes to all
// lateral students (the rule before groups existed).
// =====================================================

export const BRIDGE_GROUPS = [
  "lateralPUC",
  "lateralITI",
  "lateralCross",
  "branchChange",
];

export const LATERAL_ADMISSION_TYPES = [
  "lateralPUC",
  "lateralITI",
  "lateralCross",
];

export const isBridgeSubject = (subject) =>
  String(subject?.subjectCategory || "").toUpperCase() === "BRIDGE";

// Groups saved for the subject, or null when not set
export const bridgeGroupsOf = (subject) =>
  Array.isArray(subject?.bridgeFor) && subject.bridgeFor.length > 0
    ? subject.bridgeFor
    : null;

// Does this student take this subject?
// (A regular or elective subject: always yes.)
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

// Only the valid group names, in the standard order
export const cleanBridgeGroups = (value) => {
  const list = Array.isArray(value) ? value.map(String) : [];
  return BRIDGE_GROUPS.filter((group) => list.includes(group));
};
