// =====================================================
// DEPARTMENT NAMES
//
// The full name of every department, for headings,
// reports and printouts. Codes ("ee") stay in the data
// and in file names.
// =====================================================

export const DEPARTMENT_NAMES = {
  at: "Automobile Engineering",
  ch: "Chemical Engineering",
  ce: "Civil Engineering",
  cs: "Computer Science and Engineering",
  ec: "Electronics and Communication Engineering",
  ee: "Electrical and Electronics Engineering",
  me: "Mechanical Engineering",
  ps: "Polymer Engineering",
  sc: "Science & English",
};

// "ee" -> "Electrical and Electronics Engineering";
// an unknown code is shown in capitals
export const departmentFullName = (value) => {
  const code = String(value || "").trim().toLowerCase();

  if (!code) {
    return "";
  }

  return DEPARTMENT_NAMES[code] || code.toUpperCase();
};
