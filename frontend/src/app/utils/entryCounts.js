// =====================================================
// ENTRY COUNTS (IA marks / attendance)
//
// Counts entered subject-batches: a subject with
// Batch 1 and Batch 2 counts as two.
//
// Bridge courses are for lateral students only and
// are not counted.
//
// Electives of one elective group are alternatives,
// and the class takes only one of them. So the group
// counts as ONE subject: a batch is entered when it
// is entered in any elective of the group. The other
// electives of the group are "not taken" and are not
// counted.
//
// A subject is
// {
//   subjectId, department, semester,
//   subjectCategory (or category), electiveGroup,
//   batch1: { entered }, batch2: { entered }
// }
// =====================================================

const getCategory = (subject) =>
  String(
    subject.subjectCategory ||
      subject.category ||
      "REGULAR"
  ).toUpperCase();

export const isElective = (subject) =>
  getCategory(subject) === "ELECTIVE";

export const isBridge = (subject) =>
  getCategory(subject) === "BRIDGE";

export const getCellKey = (subject) =>
  `${String(subject.department || "").toLowerCase()}_${Number(
    subject.semester
  )}`;

// Electives without a group are treated as one
// group per department + semester.
const getGroupKey = (subject) =>
  `${getCellKey(subject)}_${String(
    subject.electiveGroup || "ELECTIVE"
  ).toUpperCase()}`;

const hasEntry = (subject) =>
  Boolean(
    subject.batch1?.entered || subject.batch2?.entered
  );

// =====================================================
// ELECTIVES NOT TAKEN
//
// An elective with nothing entered while another
// elective of its group has entries.
//
// Returns a Set of subjectIds.
// =====================================================

export const getElectivesNotTaken = (subjects = []) => {
  const groupsWithEntries = new Set();

  subjects.forEach((subject) => {
    if (isElective(subject) && hasEntry(subject)) {
      groupsWithEntries.add(getGroupKey(subject));
    }
  });

  const notTaken = new Set();

  subjects.forEach((subject) => {
    if (
      isElective(subject) &&
      !hasEntry(subject) &&
      groupsWithEntries.has(getGroupKey(subject))
    ) {
      notTaken.add(String(subject.subjectId));
    }
  });

  return notTaken;
};

// =====================================================
// GRID CELLS
//
// { "cs_3": { entered: 8, total: 14 } }
// =====================================================

export const buildEntryCells = (subjects = []) => {
  // One unit per regular subject and per elective
  // group: { cellKey, batch1, batch2 }
  const units = new Map();

  subjects.forEach((subject) => {
    if (isBridge(subject)) {
      return;
    }

    const unitKey = isElective(subject)
      ? getGroupKey(subject)
      : `${getCellKey(subject)}_${String(
          subject.subjectId
        )}`;

    const unit = units.get(unitKey) || {
      cellKey: getCellKey(subject),
      batch1: false,
      batch2: false,
    };

    unit.batch1 =
      unit.batch1 || Boolean(subject.batch1?.entered);

    unit.batch2 =
      unit.batch2 || Boolean(subject.batch2?.entered);

    units.set(unitKey, unit);
  });

  const cells = {};

  units.forEach((unit) => {
    if (!cells[unit.cellKey]) {
      cells[unit.cellKey] = {
        entered: 0,
        total: 0,
      };
    }

    cells[unit.cellKey].total += 2;

    cells[unit.cellKey].entered +=
      (unit.batch1 ? 1 : 0) + (unit.batch2 ? 1 : 0);
  });

  return cells;
};

// Totals of the cells of the given semesters.
export const sumEntryCells = (cells, semesters) => {
  let entered = 0;
  let total = 0;

  Object.entries(cells).forEach(([key, cell]) => {
    const semester = Number(key.split("_")[1]);

    if (!semesters || semesters.includes(semester)) {
      entered += cell.entered;
      total += cell.total;
    }
  });

  return { entered, total };
};
