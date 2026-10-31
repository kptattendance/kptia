"use client";

import { useMemo } from "react";
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
import { showSubjectStatusAlert } from "../utils/subjectStatusAlert";

// =====================================================
// ENTRY STATUS SECTION
//
// One titled department x semester grid. Clicking a cell
// opens a pop-up with its subjects and whether each
// batch is entered. Marks are never shown.
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

export default function EntryStatusSection({
  title,
  subjects,
  semesters,
  mode = "batches",
  onlyWithSubjects = false,
}) {
  const material = mode === "material";

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

  // { label, tone } of a subject's study material
  const getMaterialStatus = (subject) => {
    if (subject.materialStatus === "approved") {
      return { label: "Approved", tone: "done" };
    }

    if (notTaken.has(String(subject.subjectId))) {
      return { label: "Not taken", tone: "muted" };
    }

    return {
      label:
        MATERIAL_LABELS[subject.materialStatus] ||
        "Not uploaded",
      tone:
        subject.materialStatus === "pending"
          ? "warn"
          : "pending",
    };
  };

  // { label, tone } of one batch of a subject
  const getBatchStatus = (subject, batch) => {
    // Batch 1 of a bridge course
    if (!getCountedBatches(subject).includes(batch)) {
      return { label: "Not applicable", tone: "muted" };
    }

    if (subject[`batch${batch}`]?.entered) {
      return { label: "Entered", tone: "done" };
    }

    if (notTaken.has(String(subject.subjectId))) {
      return { label: "Not taken", tone: "muted" };
    }

    return { label: "Not entered", tone: "pending" };
  };

  const handleSelect = (department, semester) => {
    const rows = subjects
      .filter(
        (subject) =>
          subject.department === department &&
          Number(subject.semester) === semester
      )
      .sort((a, b) =>
        String(a.sequence || a.code).localeCompare(
          String(b.sequence || b.code)
        )
      )
      .map((subject) => ({
        code: subject.code,
        name: subject.name,
        tags: [
          ...(isElective(subject)
            ? [{ label: "Elective" }]
            : []),
          ...(isBridge(subject) ? [{ label: "Bridge" }] : []),
          ...(subject.myBatches?.length > 0
            ? [
                {
                  label:
                    subject.myBatches.length === 1
                      ? `Yours · Batch ${subject.myBatches[0]}`
                      : "Yours",
                  dark: true,
                },
              ]
            : []),
        ],
        cells: material
          ? [
              {
                heading: "Study material",
                ...getMaterialStatus(subject),
              },
            ]
          : [1, 2].map((batch) => ({
              heading: `Batch ${batch}`,
              ...getBatchStatus(subject, batch),
            })),
      }));

    showSubjectStatusAlert({
      title: `${getDepartmentLabel(department)} · Semester ${semester}`,
      subtitle: title,
      rows,
    });
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
        selectedKey=""
        onSelect={handleSelect}
        note={
          material
            ? "Each cell counts subjects whose study material the HOD has approved. Electives of a semester count as one subject, the one taken. Tap a cell to see its subjects."
            : "Each cell counts subject-batches. Electives of a semester count as one subject, the one taken. Bridge courses count Batch 2 only. Tap a cell to see its subjects."
        }
      />

    </section>
  );
}
