"use client";

// =====================================================
// ENTRY STATUS GRID
//
// Departments down the side, semesters across the top.
// Each cell shows how many subject-batches have been
// entered out of the total, and can be clicked to see
// the subjects of that department and semester.
//
// On a phone each department is a card with its
// semesters side by side.
//
// cells: { "cs_3": { entered: 8, total: 14 } }
//
// onlyWithSubjects: leave out departments that have no
// subjects in these semesters (a faculty's own grid).
// =====================================================

export const departments = [
  { value: "at", label: "Automobile Engineering" },
  { value: "ch", label: "Chemical Engineering" },
  { value: "ce", label: "Civil Engineering" },
  { value: "cs", label: "Computer Science Engineering" },
  { value: "ec", label: "Electronics & Communication" },
  { value: "ee", label: "Electrical & Electronics" },
  { value: "me", label: "Mechanical Engineering" },
  { value: "ps", label: "Polymer Engineering" },
];

export const getDepartmentLabel = (value) =>
  departments.find(
    (department) => department.value === value
  )?.label || String(value || "").toUpperCase();

const getCellStyle = (cell, selected) => {
  const ring = selected
    ? " ring-2 ring-slate-900 ring-offset-1"
    : "";

  if (!cell || cell.total === 0) {
    return `border-slate-200 bg-slate-50 text-slate-400${ring}`;
  }

  if (cell.entered === 0) {
    return `border-red-200 bg-red-50 text-red-700 hover:bg-red-100${ring}`;
  }

  if (cell.entered < cell.total) {
    return `border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100${ring}`;
  }

  return `border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100${ring}`;
};

const getCellLabel = (cell) => {
  if (!cell || cell.total === 0) {
    return "No subjects";
  }

  if (cell.entered === 0) {
    return "Not started";
  }

  return cell.entered < cell.total
    ? "In progress"
    : "Complete";
};

export default function EntryStatusGrid({
  cells,
  semesters,
  selectedKey,
  onSelect,
  onlyWithSubjects = false,
  note = "Each cell counts subject-batches: a subject with Batch 1 and Batch 2 counts as two. Click a cell to see its subjects.",
}) {
  const shownDepartments = onlyWithSubjects
    ? departments.filter((department) =>
        semesters.some(
          (semester) =>
            cells[`${department.value}_${semester}`]?.total > 0
        )
      )
    : departments;

  const renderCell = (department, semester, compact) => {
    const key = `${department}_${semester}`;

    const cell = cells[key];

    const empty = !cell || cell.total === 0;

    return (
      <button
        type="button"
        disabled={empty}
        onClick={() => onSelect(department, semester)}
        className={`w-full rounded-xl border transition disabled:cursor-not-allowed ${
          compact ? "px-2 py-2" : "min-w-[110px] px-3 py-2.5"
        } ${getCellStyle(cell, selectedKey === key)}`}
      >
        {compact && (
          <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">
            Sem {semester}
          </span>
        )}

        <span className="block text-base font-bold">
          {empty ? "-" : `${cell.entered} / ${cell.total}`}
        </span>

        <span className="block text-[10px] font-semibold uppercase tracking-wide">
          {getCellLabel(cell)}
        </span>
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {shownDepartments.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-slate-500">
          No subjects in these semesters.
        </p>
      )}

      {/* PHONE: one card per department */}

      {shownDepartments.length > 0 && (
        <div className="divide-y divide-slate-100 md:hidden">
          {shownDepartments.map((department) => (
            <div key={department.value} className="px-4 py-3">
              <p className="mb-2 text-sm font-semibold text-slate-900">
                {department.label}
                <span className="ml-1.5 text-xs font-normal text-slate-400">
                  {department.value.toUpperCase()}
                </span>
              </p>

              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${semesters.length}, minmax(0, 1fr))`,
                }}
              >
                {semesters.map((semester) => (
                  <div key={semester}>
                    {renderCell(department.value, semester, true)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LARGER SCREENS: table */}

      {shownDepartments.length > 0 && (
        <div className="hidden overflow-x-auto md:block">

          <table className="w-full min-w-[640px] text-sm">

            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Department
                </th>

                {semesters.map((semester) => (
                  <th
                    key={semester}
                    className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    Semester {semester}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {shownDepartments.map((department) => (
                <tr key={department.value}>

                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {department.label}
                    </p>

                    <p className="text-xs text-slate-400">
                      {department.value.toUpperCase()}
                    </p>
                  </td>

                  {semesters.map((semester) => (
                    <td
                      key={semester}
                      className="px-3 py-3 text-center"
                    >
                      {renderCell(department.value, semester, false)}
                    </td>
                  ))}

                </tr>
              ))}

            </tbody>

          </table>

        </div>
      )}

      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        {note}
      </p>

    </div>
  );
}
