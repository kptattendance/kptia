"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import EntryStatusGrid, {
  getDepartmentLabel,
} from "../components/EntryStatusGrid";
import EntryStatusDownload from "../components/EntryStatusDownload";
import { escapeHtml } from "../../utils/escapeHtml";
import {
  CELL_DETAILS_ID,
  showSubjectStatusAlert,
} from "../../utils/subjectStatusAlert";
import {
  buildEntryCells,
  getElectivesNotTaken,
  sumEntryCells,
} from "../../utils/entryCounts";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CO_NAMES = [
  "CO1",
  "CO2",
  "CO3",
  "CO4",
  "CO5",
  "CO6",
];

const iaNumbers = Array.from(
  { length: 10 },
  (_, index) => index + 1
);

const terms = {
  odd: [1, 3, 5],
  even: [2, 4, 6],
};

// The academic year starts in July.
const getCurrentAcademicStartYear = () => {
  const today = new Date();

  return today.getMonth() >= 6
    ? today.getFullYear()
    : today.getFullYear() - 1;
};

const formatAcademicYear = (startYear) =>
  `${startYear}-${String(startYear + 1).slice(-2)}`;

export default function AdminIAMarksPage() {
  const { getToken } = useAuth();

  const currentStartYear = getCurrentAcademicStartYear();

  const academicYears = useMemo(
    () =>
      [
        currentStartYear - 1,
        currentStartYear,
        currentStartYear + 1,
      ].map(formatAcademicYear),
    [currentStartYear]
  );

  // ---------------------------------------------------
  // FILTERS
  // ---------------------------------------------------

  const [academicYear, setAcademicYear] = useState(
    formatAcademicYear(currentStartYear)
  );

  const [iaNumber, setIaNumber] = useState(1);

  // Odd semesters run from July to December.
  const [term, setTerm] = useState(
    new Date().getMonth() >= 6 ? "odd" : "even"
  );

  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  // [{ department, semester, subjects: [...] }]
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // { department, semester }
  const [selected, setSelected] = useState(null);

  // Student-wise marks of one IA record
  const [detailTitle, setDetailTitle] = useState("");
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Record being corrected
  // { [studentId]: [{ absent, coMarks: { CO1: "" } }, ...one per test] }
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // =====================================================
  // LOAD STATUS OF EVERY SUBJECT
  // =====================================================

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        setError("");

        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/ia/admin-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              academicYear,
              iaNumber,
              semesterType: term,
            },
          }
        );

        setRows(response.data?.rows || []);
      } catch (err) {
        console.error("Admin IA status error:", err);

        setRows([]);

        setError(
          err.response?.data?.message ||
            "Failed to load IA status."
        );
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [
    academicYear,
    iaNumber,
    term,
    refreshKey,
    getToken,
  ]);

  // =====================================================
  // GRID CELLS
  //
  // Bridge courses are taught only to Batch 2, so they
  // count as one subject-batch.
  //
  // Electives of one group count as one subject, the
  // one the class has taken (see entryCounts.js).
  // =====================================================

  // The department and semester are on the row,
  // not on each subject.
  const allSubjects = useMemo(
    () =>
      rows.flatMap((row) =>
        (row.subjects || []).map((subject) => ({
          ...subject,
          department: row.department,
          semester: row.semester,
        }))
      ),
    [rows]
  );

  const cells = useMemo(
    () => buildEntryCells(allSubjects),
    [allSubjects]
  );

  const electivesNotTaken = useMemo(
    () => getElectivesNotTaken(allSubjects),
    [allSubjects]
  );

  const summary = useMemo(
    () => sumEntryCells(cells),
    [cells]
  );

  const selectedSubjects = useMemo(() => {
    if (!selected) {
      return [];
    }

    return (
      rows.find(
        (row) =>
          row.department === selected.department &&
          Number(row.semester) === selected.semester
      )?.subjects || []
    );
  }, [rows, selected]);

  // =====================================================
  // SELECT A DEPARTMENT + SEMESTER
  // =====================================================

  const closeDetail = () => {
    setDetailTitle("");
    setDetail(null);
    setDetailError("");
    setEditing(null);
  };

  // { label, tone } of one batch, for the pop-up
  const getBatchStatus = (subject, batchNumber) => {
    const batch = subject[`batch${batchNumber}`];

    if (batch?.entered) {
      return batch.locked
        ? { label: "Entered", tone: "done" }
        : { label: "Unlocked for correction", tone: "warn" };
    }

    if (
      subject.subjectCategory === "BRIDGE" &&
      batchNumber === 1
    ) {
      return { label: "Not applicable", tone: "muted" };
    }

    if (electivesNotTaken.has(String(subject.subjectId))) {
      return { label: "Not taken", tone: "muted" };
    }

    return { label: "Not entered", tone: "pending" };
  };

  const handleSelect = (department, semester) => {
    setSelected({ department, semester });
    closeDetail();

    const cellSubjects =
      rows.find(
        (row) =>
          row.department === department &&
          Number(row.semester) === semester
      )?.subjects || [];

    showSubjectStatusAlert({
      title: `${getDepartmentLabel(department)} · Semester ${semester}`,
      subtitle: `IA ${iaNumber}, ${academicYear}`,
      detailsText: "Show details",
      rows: cellSubjects.map((subject) => ({
        code: subject.code,
        name: subject.name,
        tags:
          subject.subjectCategory === "REGULAR"
            ? []
            : [
                {
                  label:
                    subject.subjectCategory === "BRIDGE"
                      ? "Bridge"
                      : "Elective",
                },
              ],
        cells: [1, 2].map((batchNumber) => ({
          heading: `Batch ${batchNumber}`,
          ...getBatchStatus(subject, batchNumber),
        })),
      })),
    });
  };

  // =====================================================
  // STUDENT-WISE MARKS OF ONE IA RECORD
  // =====================================================

  const handleViewRecord = async (
    subject,
    batchNumber,
    recordId
  ) => {
    try {
      setDetailTitle(
        `${subject.code} · ${subject.name} · Batch ${batchNumber}`
      );

      setDetail(null);
      setDetailError("");
      setEditing(null);
      setLoadingDetail(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/ia/${recordId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const record = response.data?.data;

      const students = [
        ...(record?.students || []),
      ].sort((a, b) =>
        String(
          a.studentId?.registerNumber || ""
        ).localeCompare(
          String(b.studentId?.registerNumber || "")
        )
      );

      setDetail({
        ...record,
        students,
      });
    } catch (err) {
      console.error("Admin IA detail error:", err);

      setDetailError(
        err.response?.data?.message ||
          "Failed to load IA marks."
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  // =====================================================
  // CORRECT THE RECORD
  // =====================================================

  const startEditing = () => {
    const students = {};

    detail.students.forEach((entry) => {
      students[entry.studentId?._id] = detail.tests.map(
        (_, testIndex) => {
          const studentTest =
            entry.tests?.[testIndex] || {};

          const coMarks = {};

          CO_NAMES.forEach((co) => {
            coMarks[co] =
              studentTest.coMarks?.[co] ?? 0;
          });

          return {
            absent: studentTest.status === "ABSENT",
            coMarks,
          };
        }
      );
    });

    setEditing(students);
  };

  const updateEditingTest = (
    studentId,
    testIndex,
    change
  ) => {
    setEditing((prev) => ({
      ...prev,
      [studentId]: prev[studentId].map(
        (test, index) =>
          index === testIndex
            ? { ...test, ...change }
            : test
      ),
    }));
  };

  const getEditingTotal = (test) =>
    test.absent
      ? 0
      : CO_NAMES.reduce(
          (total, co) =>
            total + Number(test.coMarks[co] || 0),
          0
        );

  const handleSaveCorrection = async () => {
    if (saving || !editing || !detail) {
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      await axios.put(
        `${API_URL}/api/ia/${detail._id}`,
        {
          academicYear: detail.academicYear,
          department: detail.department,
          semester: detail.semester,
          subjectId:
            detail.subjectId?._id || detail.subjectId,
          iaNumber: detail.iaNumber,
          batchNumber: detail.batchNumber,
          tests: detail.tests,
          students: Object.entries(editing).map(
            ([studentId, tests]) => ({
              studentId,
              tests: tests.map((test) => ({
                status: test.absent
                  ? "ABSENT"
                  : "PRESENT",
                coMarks: test.coMarks,
              })),
            })
          ),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Show the saved values.
      const response = await axios.get(
        `${API_URL}/api/ia/${detail._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const record = response.data?.data;

      setDetail({
        ...record,
        students: [...(record?.students || [])].sort(
          (a, b) =>
            String(
              a.studentId?.registerNumber || ""
            ).localeCompare(
              String(
                b.studentId?.registerNumber || ""
              )
            )
        ),
      });

      setEditing(null);

      setRefreshKey((prev) => prev + 1);

      await Swal.fire({
        icon: "success",
        title: "IA Marks Corrected",
        confirmButtonColor: "#283618",
      });
    } catch (err) {
      console.error("Correct IA error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Save",
        text:
          err.response?.data?.message ||
          "Failed to correct IA marks.",
        confirmButtonColor: "#283618",
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE THE RECORD
  // =====================================================

  const handleDelete = async () => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete IA Marks?",
      html: `
        <div style="font-size:14px;line-height:1.8;color:#6f6c52">
          <strong style="color:#283618">${escapeHtml(detailTitle)}</strong>
          <br>
          IA ${escapeHtml(detail.iaNumber)} · ${escapeHtml(detail.academicYear)}
          · ${escapeHtml(detail.students.length)} students
          <br><br>
          The whole record will be removed and the faculty can enter it again.
          <strong style="color:#dc2626">This cannot be undone from the website.</strong>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#9a9474",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      const token = await getToken();

      await axios.delete(
        `${API_URL}/api/ia/${detail._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      closeDetail();

      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Delete IA error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Delete",
        text:
          err.response?.data?.message ||
          "Failed to delete IA marks.",
        confirmButtonColor: "#283618",
      });
    }
  };

  // =====================================================
  // UI
  // =====================================================

  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  const renderBatch = (subject, batchNumber) => {
    const batch = subject[`batch${batchNumber}`];

    // Bridge courses are taught only to Batch 2.
    if (
      subject.subjectCategory === "BRIDGE" &&
      batchNumber === 1 &&
      !batch?.entered
    ) {
      return (
        <span className="text-xs text-slate-400">
          Not applicable
        </span>
      );
    }

    // Another elective of this semester has been taken.
    if (
      !batch?.entered &&
      electivesNotTaken.has(String(subject.subjectId))
    ) {
      return (
        <span className="text-xs text-slate-400">
          Not taken
        </span>
      );
    }

    if (!batch?.entered) {
      return (
        <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
          Not entered
        </span>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
            batch.locked
              ? "bg-emerald-50 text-emerald-700"
              : "bg-sky-50 text-sky-700"
          }`}
        >
          {batch.locked
            ? "Entered"
            : "Unlocked for correction"}
        </span>

        <button
          type="button"
          onClick={() =>
            handleViewRecord(
              subject,
              batchNumber,
              batch.recordId
            )
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          View marks
        </button>
      </div>
    );
  };

  // COs that carry marks in at least one test.
  const usedCOs = (test) =>
    CO_NAMES.filter(
      (co) => Number(test.coMarks?.[co] || 0) > 0
    );

  return (
    <div className="min-h-screen p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            IA Marks
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            See which departments have entered IA marks, then open a subject for student-wise marks.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setRefreshKey((prev) => prev + 1)
          }
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>

      </div>

      {/* FILTERS */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid gap-4 sm:grid-cols-3 lg:max-w-2xl">

          <div>
            <label className={labelClass}>
              Academic Year
            </label>

            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                closeDetail();
              }}
              className={selectClass}
            >
              {academicYears.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              IA Number
            </label>

            <select
              value={iaNumber}
              onChange={(e) => {
                setIaNumber(Number(e.target.value));
                closeDetail();
              }}
              className={selectClass}
            >
              {iaNumbers.map((item) => (
                <option key={item} value={item}>
                  IA {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Semesters
            </label>

            <select
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setSelected(null);
                closeDetail();
              }}
              className={selectClass}
            >
              <option value="odd">Odd (1, 3, 5)</option>
              <option value="even">Even (2, 4, 6)</option>
            </select>
          </div>

        </div>

      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      {!error && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">
            {loading
              ? "Loading IA status..."
              : `IA ${iaNumber}, ${academicYear}: ${summary.entered} of ${summary.total} subject-batches entered`}
          </p>

          <EntryStatusDownload
            title={`IA ${iaNumber} ENTRY STATUS`}
            subtitle={`Academic Year ${academicYear}  |  ${
              term === "odd" ? "Odd" : "Even"
            } semesters`}
            fileName={`IA${iaNumber}_Entry_Status_${academicYear}_${term}.pdf`}
            subjects={allSubjects}
            semesters={terms[term]}
            disabled={loading || allSubjects.length === 0}
          />
        </div>
      )}

      {/* GRID */}

      {!error && (
        <EntryStatusGrid
          cells={cells}
          semesters={terms[term]}
          selectedKey={
            selected
              ? `${selected.department}_${selected.semester}`
              : ""
          }
          onSelect={handleSelect}
        />
      )}

      {/* SUBJECTS OF THE SELECTED CELL */}

      {selected && (
        <div
          id={CELL_DETAILS_ID}
          className="mt-6 scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >

          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              {getDepartmentLabel(selected.department)} · Semester {selected.semester}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              IA {iaNumber}, {academicYear}. Bridge courses are taught only to Batch 2 and count as one subject-batch. Electives of one group count as one subject, the one that has marks entered.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[720px] text-sm">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-4 py-3">Batch 1</th>
                  <th className="px-4 py-3">Batch 2</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {selectedSubjects.map((subject) => (
                  <tr key={subject.subjectId}>
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs font-bold text-slate-700">
                        {subject.code}
                        {subject.subjectCategory ===
                          "BRIDGE" && (
                          <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide text-slate-500">
                            Bridge
                          </span>
                        )}
                        {subject.subjectCategory ===
                          "ELECTIVE" && (
                          <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide text-slate-500">
                            {electivesNotTaken.has(
                              String(subject.subjectId)
                            )
                              ? "Elective · not taken"
                              : "Elective"}
                          </span>
                        )}
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {subject.name}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {renderBatch(subject, 1)}
                    </td>

                    <td className="px-4 py-3">
                      {renderBatch(subject, 2)}
                    </td>
                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>
      )}

      {/* STUDENT-WISE MARKS */}

      {detailTitle && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {detailTitle}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                IA {iaNumber}, {academicYear}
                {detail
                  ? ` · Maximum ${detail.totalMaxMarks} marks`
                  : ""}
              </p>
            </div>

            {detail && (
              <div className="flex flex-wrap items-center gap-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveCorrection}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save size={14} />
                      {saving ? "Saving..." : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}

          </div>

          {loadingDetail && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Loading marks...
            </p>
          )}

          {detailError && (
            <p className="px-5 py-8 text-center text-sm font-medium text-red-700">
              {detailError}
            </p>
          )}

          {detail && (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[720px] text-sm">

                <thead>

                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th
                      rowSpan={2}
                      className="px-5 py-3 text-left"
                    >
                      #
                    </th>

                    <th
                      rowSpan={2}
                      className="px-4 py-3 text-left"
                    >
                      Register No.
                    </th>

                    <th
                      rowSpan={2}
                      className="px-4 py-3 text-left"
                    >
                      Student
                    </th>

                    {detail.tests.map((test) => (
                      <th
                        key={test.testName}
                        colSpan={usedCOs(test).length + 1}
                        className="border-l border-slate-200 px-3 py-2 text-center text-slate-600"
                      >
                        {test.testName} ({test.maxMarks})
                      </th>
                    ))}

                    <th
                      rowSpan={2}
                      className="border-l border-slate-200 px-4 py-3 text-right"
                    >
                      Total
                    </th>
                  </tr>

                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {detail.tests.map((test) => [
                      ...usedCOs(test).map((co, index) => (
                        <th
                          key={`${test.testName}-${co}`}
                          className={`px-2 py-2 text-center ${
                            index === 0
                              ? "border-l border-slate-200"
                              : ""
                          }`}
                        >
                          {co} ({test.coMarks[co]})
                        </th>
                      )),
                      <th
                        key={`${test.testName}-marks`}
                        className="px-2 py-2 text-center text-slate-600"
                      >
                        Marks
                      </th>,
                    ])}
                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {detail.students.map((entry, index) => (
                    <tr key={entry.studentId?._id || index}>
                      <td className="px-5 py-2.5 text-slate-400">
                        {index + 1}
                      </td>

                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">
                        {entry.studentId?.registerNumber}
                      </td>

                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {entry.studentId?.name}
                      </td>

                      {detail.tests.map(
                        (test, testIndex) => {
                          const studentTest =
                            entry.tests?.[testIndex] || {};

                          const editingTest =
                            editing?.[
                              entry.studentId?._id
                            ]?.[testIndex];

                          const absent = editingTest
                            ? editingTest.absent
                            : studentTest.status ===
                              "ABSENT";

                          return [
                            ...usedCOs(test).map(
                              (co, coIndex) => (
                                <td
                                  key={`${test.testName}-${co}`}
                                  className={`px-2 py-2.5 text-center text-slate-600 ${
                                    coIndex === 0
                                      ? "border-l border-slate-100"
                                      : ""
                                  }`}
                                >
                                  {editingTest ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max={test.coMarks[co]}
                                      step="0.01"
                                      disabled={absent}
                                      value={
                                        absent
                                          ? ""
                                          : editingTest
                                              .coMarks[co]
                                      }
                                      onChange={(e) =>
                                        updateEditingTest(
                                          entry.studentId._id,
                                          testIndex,
                                          {
                                            coMarks: {
                                              ...editingTest.coMarks,
                                              [co]: e.target
                                                .value,
                                            },
                                          }
                                        )
                                      }
                                      aria-label={`${co} marks of ${entry.studentId?.name} in ${test.testName}`}
                                      className="w-16 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-sm text-slate-900 outline-none focus:border-slate-600 disabled:bg-slate-100"
                                    />
                                  ) : absent ? (
                                    "-"
                                  ) : (
                                    studentTest.coMarks?.[
                                      co
                                    ] ?? 0
                                  )}
                                </td>
                              )
                            ),
                            <td
                              key={`${test.testName}-marks`}
                              className={`px-2 py-2.5 text-center font-semibold ${
                                absent
                                  ? "text-red-600"
                                  : "text-slate-900"
                              }`}
                            >
                              {editingTest ? (
                                <span className="flex flex-col items-center gap-1">
                                  <span>
                                    {absent
                                      ? "AB"
                                      : getEditingTotal(
                                          editingTest
                                        )}
                                  </span>

                                  <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                    <input
                                      type="checkbox"
                                      checked={absent}
                                      onChange={(e) =>
                                        updateEditingTest(
                                          entry.studentId._id,
                                          testIndex,
                                          {
                                            absent:
                                              e.target
                                                .checked,
                                          }
                                        )
                                      }
                                    />
                                    Absent
                                  </label>
                                </span>
                              ) : absent ? (
                                "AB"
                              ) : (
                                studentTest.marks ?? 0
                              )}
                            </td>,
                          ];
                        }
                      )}

                      <td className="border-l border-slate-100 px-4 py-2.5 text-right font-bold text-slate-900">
                        {editing?.[entry.studentId?._id]
                          ? editing[
                              entry.studentId._id
                            ].reduce(
                              (total, test) =>
                                total +
                                getEditingTotal(test),
                              0
                            )
                          : entry.totalMarks}
                      </td>
                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
