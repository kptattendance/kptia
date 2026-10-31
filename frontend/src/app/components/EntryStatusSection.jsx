"use client";

import { useMemo, useState } from "react";
import EntryStatusGrid, {
  getDepartmentLabel,
} from "../admin/components/EntryStatusGrid";
import {
  buildEntryCells,
  getCountedBatches,
  getElectivesNotTaken,
  isBridge,
  isElective,
  sumEntryCells,
} from "../utils/entryCounts";

// =====================================================
// ENTRY STATUS SECTION
//
// One titled department x semester grid. Clicking a cell
// lists its subjects with each batch entered or not.
// Marks are never shown.
//
// subjects: [{ subjectId, code, name, department,
//              semester, subjectCategory, myBatches,
//              batch1: { entered }, batch2: { entered } }]
//
// mode "material": one status per subject (study
// material) instead of Batch 1 / Batch 2.
// =====================================================

const MATERIAL_LABELS = {
  pending: "Waiting for HOD approval",
  rejected: "Rejected, to upload again",
};

const badge = {
  entered:
    "bg-emerald-50 text-emerald-700",
  pending:
    "bg-red-50 text-red-700",
  muted:
    "text-slate-400",
};

export default function EntryStatusSection({
  title,
  subjects,
  semesters,
  mode = "batches",
  onlyWithSubjects = false,
}) {
  const material = mode === "material";

  // { department, semester }
  const [selected, setSelected] = useState(null);

  const cells = useMemo(
    () => buildEntryCells(subjects),
    [subjects]
  );

  const notTaken = useMemo(
    () => getElectivesNotTaken(subjects),
    [subjects]
  );

  const summary = useMemo(
    () => sumEntryCells(cells, semesters),
    [cells, semesters]
  );

  const selectedSubjects = useMemo(
    () =>
      selected
        ? subjects
            .filter(
              (subject) =>
                subject.department === selected.department &&
                Number(subject.semester) === selected.semester
            )
            .sort((a, b) =>
              String(a.sequence || a.code).localeCompare(
                String(b.sequence || b.code)
              )
            )
        : [],
    [subjects, selected]
  );

  const renderMaterial = (subject) => {
    if (subject.materialStatus === "approved") {
      return (
        <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${badge.entered}`}>
          Approved
        </span>
      );
    }

    if (notTaken.has(String(subject.subjectId))) {
      return (
        <span className={`text-xs ${badge.muted}`}>
          Not taken
        </span>
      );
    }

    return (
      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${badge.pending}`}>
        {MATERIAL_LABELS[subject.materialStatus] ||
          "Not uploaded"}
      </span>
    );
  };

  const renderBatch = (subject, batch) => {
    // Batch 1 of a bridge course
    if (!getCountedBatches(subject).includes(batch)) {
      return (
        <span className={`text-xs ${badge.muted}`}>
          Not applicable
        </span>
      );
    }

    if (subject[`batch${batch}`]?.entered) {
      return (
        <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${badge.entered}`}>
          Entered
        </span>
      );
    }

    if (notTaken.has(String(subject.subjectId))) {
      return (
        <span className={`text-xs ${badge.muted}`}>
          Not taken
        </span>
      );
    }

    return (
      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${badge.pending}`}>
        Not entered
      </span>
    );
  };

  return (
    <section className="mb-10">

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="text-sm font-semibold text-slate-600">
          {material
            ? `${summary.entered} of ${summary.total} subjects approved`
            : `${summary.entered} of ${summary.total} subject-batches entered`}
        </p>
      </div>

      <EntryStatusGrid
        cells={cells}
        semesters={semesters}
        onlyWithSubjects={onlyWithSubjects}
        selectedKey={
          selected
            ? `${selected.department}_${selected.semester}`
            : ""
        }
        onSelect={(department, semester) =>
          setSelected((current) =>
            current?.department === department &&
            current?.semester === semester
              ? null
              : { department, semester }
          )
        }
        note={
          material
            ? "Each cell counts subjects whose study material the HOD has approved. Electives of a semester count as one subject, the one taken. Tap a cell to see its subjects."
            : "Each cell counts subject-batches. Electives of a semester count as one subject, the one taken. Bridge courses count Batch 2 only. Tap a cell to see its subjects."
        }
      />

      {/* SUBJECTS OF THE SELECTED CELL */}

      {selected && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {getDepartmentLabel(selected.department)} · Semester {selected.semester}
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {selectedSubjects.map((subject) => (
              <div
                key={subject.subjectId}
                className={`grid gap-2 px-5 py-3 sm:items-center ${
                  material
                    ? "sm:grid-cols-[minmax(0,1fr)_220px]"
                    : "sm:grid-cols-[minmax(0,1fr)_140px_140px]"
                } ${subject.myBatches?.length ? "bg-amber-50/40" : ""}`}
              >
                <div>
                  <p className="font-mono text-xs font-bold text-slate-700">
                    {subject.code}
                    {(isElective(subject) || isBridge(subject)) && (
                      <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide text-slate-500">
                        {isElective(subject) ? "Elective" : "Bridge"}
                      </span>
                    )}
                    {subject.myBatches?.length > 0 && (
                      <span className="ml-2 rounded-md bg-slate-900 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-white">
                        Yours
                        {subject.myBatches.length === 1 &&
                          ` · Batch ${subject.myBatches[0]}`}
                      </span>
                    )}
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {subject.name}
                  </p>
                </div>

                {material && (
                  <div className="flex items-center gap-2 sm:block">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:mb-1 sm:block">
                      Study material
                    </span>
                    {renderMaterial(subject)}
                  </div>
                )}

                {!material && (
                <>
                <div className="flex items-center gap-2 sm:block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:mb-1 sm:block">
                    Batch 1
                  </span>
                  {renderBatch(subject, 1)}
                </div>

                <div className="flex items-center gap-2 sm:block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:mb-1 sm:block">
                    Batch 2
                  </span>
                  {renderBatch(subject, 2)}
                </div>
                </>
                )}
              </div>
            ))}
          </div>

        </div>
      )}

    </section>
  );
}
