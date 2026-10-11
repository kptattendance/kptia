"use client";

// =====================================================
// ENTRY STATUS GRID
//
// Departments down the side, semesters across the top.
// Each cell shows how many subject-batches have been
// entered out of the total, and can be clicked to see
// the subjects of that department and semester.
//
// cells: { "cs_3": { entered: 8, total: 14 } }
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

export default function EntryStatusGrid({
  cells,
  semesters,
  selectedKey,
  onSelect,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="overflow-x-auto">

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

            {departments.map((department) => (
              <tr key={department.value}>

                <td className="px-5 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {department.label}
                  </p>

                  <p className="text-xs text-slate-400">
                    {department.value.toUpperCase()}
                  </p>
                </td>

                {semesters.map((semester) => {
                  const key = `${department.value}_${semester}`;

                  const cell = cells[key];

                  const empty =
                    !cell || cell.total === 0;

                  return (
                    <td
                      key={key}
                      className="px-3 py-3 text-center"
                    >
                      <button
                        type="button"
                        disabled={empty}
                        onClick={() =>
                          onSelect(
                            department.value,
                            semester
                          )
                        }
                        className={`w-full min-w-[110px] rounded-xl border px-3 py-2.5 transition disabled:cursor-not-allowed ${getCellStyle(
                          cell,
                          selectedKey === key
                        )}`}
                      >
                        <span className="block text-base font-bold">
                          {empty
                            ? "-"
                            : `${cell.entered} / ${cell.total}`}
                        </span>

                        <span className="block text-[10px] font-semibold uppercase tracking-wide">
                          {empty
                            ? "No subjects"
                            : cell.entered === 0
                            ? "Not started"
                            : cell.entered < cell.total
                            ? "In progress"
                            : "Complete"}
                        </span>
                      </button>
                    </td>
                  );
                })}

              </tr>
            ))}

          </tbody>

        </table>

      </div>

      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        Each cell counts subject-batches: a subject with Batch 1 and Batch 2 counts as two. Click a cell to see its subjects.
      </p>

    </div>
  );
}
