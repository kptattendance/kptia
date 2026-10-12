"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const terms = {
  odd: [1, 3, 5],
  even: [2, 4, 6],
};

const formatPercent = (value) =>
  value === null || value === undefined
    ? "-"
    : `${Number(value).toFixed(1)}%`;

const formatBatches = (batchNumbers = []) =>
  batchNumbers.length === 2
    ? "Batch 1 & Batch 2"
    : `Batch ${batchNumbers[0]}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const sortByRegisterNumber = (students = []) =>
  [...students].sort((a, b) =>
    String(
      a.studentId?.registerNumber || ""
    ).localeCompare(
      String(b.studentId?.registerNumber || "")
    )
  );

export default function AdminAttendancePage() {
  const { getToken } = useAuth();

  const today = new Date();

  // ---------------------------------------------------
  // FILTERS
  // ---------------------------------------------------

  const [month, setMonth] = useState(
    today.getMonth() + 1
  );

  const [year, setYear] = useState(
    today.getFullYear()
  );

  // Odd semesters run from July to December.
  const [term, setTerm] = useState(
    today.getMonth() >= 6 ? "odd" : "even"
  );

  const years = useMemo(() => {
    const current = new Date().getFullYear();

    return [current - 1, current, current + 1];
  }, []);

  // Once the admin picks a month, it is not changed
  // automatically any more.
  const monthChosenRef = useRef(false);

  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  // { [month]: number of saved records }
  const [monthCounts, setMonthCounts] = useState({});

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // { department, semester }
  const [selected, setSelected] = useState(null);

  // Saved records of one subject
  const [detailSubject, setDetailSubject] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Record being corrected
  // { id, classesConducted, students: { [studentId]: { eligible, attended } } }
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const closeDetail = () => {
    setDetailSubject(null);
    setRecords([]);
    setDetailError("");
    setEditing(null);
  };

  // =====================================================
  // MONTHS THAT HAVE ATTENDANCE
  //
  // The page opens on the current month. When that month
  // has nothing yet, it moves to the latest month that has.
  // =====================================================

  useEffect(() => {
    const loadMonths = async () => {
      try {
        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/attendance/admin-months`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: { year },
          }
        );

        const counts = {};

        (response.data?.data || []).forEach((item) => {
          counts[item.month] = item.records;
        });

        setMonthCounts(counts);

        const monthsWithData = Object.keys(counts)
          .map(Number)
          .sort((a, b) => a - b);

        if (
          !monthChosenRef.current &&
          monthsWithData.length > 0
        ) {
          setMonth((current) =>
            counts[current]
              ? current
              : monthsWithData[
                  monthsWithData.length - 1
                ]
          );
        }
      } catch (err) {
        console.error(
          "Admin attendance months error:",
          err
        );

        setMonthCounts({});
      }
    };

    loadMonths();
  }, [year, refreshKey, getToken]);

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
          `${API_URL}/api/attendance/admin-statistics`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              year,
              month,
            },
          }
        );

        setSubjects(response.data?.data || []);
      } catch (err) {
        console.error(
          "Admin attendance status error:",
          err
        );

        setSubjects([]);

        setError(
          err.response?.data?.message ||
            "Failed to load attendance status."
        );
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [month, year, refreshKey, getToken]);

  // =====================================================
  // GRID CELLS
  // =====================================================

  const cells = useMemo(() => {
    const result = {};

    subjects.forEach((subject) => {
      const key = `${String(
        subject.department || ""
      ).toLowerCase()}_${subject.semester}`;

      if (!result[key]) {
        result[key] = {
          entered: 0,
          total: 0,
        };
      }

      result[key].total += 2;

      result[key].entered +=
        (subject.batch1?.entered ? 1 : 0) +
        (subject.batch2?.entered ? 1 : 0);
    });

    return result;
  }, [subjects]);

  const semesters = terms[term];

  const summary = useMemo(() => {
    let entered = 0;
    let total = 0;

    Object.entries(cells).forEach(([key, cell]) => {
      const semester = Number(key.split("_")[1]);

      if (semesters.includes(semester)) {
        entered += cell.entered;
        total += cell.total;
      }
    });

    return { entered, total };
  }, [cells, semesters]);

  const selectedSubjects = useMemo(() => {
    if (!selected) {
      return [];
    }

    return subjects.filter(
      (subject) =>
        String(
          subject.department || ""
        ).toLowerCase() === selected.department &&
        Number(subject.semester) === selected.semester
    );
  }, [subjects, selected]);

  // =====================================================
  // SELECT A DEPARTMENT + SEMESTER
  // =====================================================

  const handleSelect = (department, semester) => {
    setSelected({ department, semester });
    closeDetail();
  };

  // =====================================================
  // SAVED RECORDS OF A SUBJECT
  // =====================================================

  const loadRecords = async (subject) => {
    try {
      setDetailError("");
      setLoadingDetail(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/attendance/admin-records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            subjectId: subject.subjectId,
            month,
            year,
          },
        }
      );

      setRecords(
        (response.data?.data || []).map((record) => ({
          ...record,
          students: sortByRegisterNumber(
            record.students
          ),
        }))
      );
    } catch (err) {
      console.error(
        "Admin attendance records error:",
        err
      );

      setRecords([]);

      setDetailError(
        err.response?.data?.message ||
          "Failed to load student attendance."
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleViewSubject = (subject) => {
    setDetailSubject(subject);
    setRecords([]);
    setEditing(null);
    loadRecords(subject);
  };

  // =====================================================
  // CORRECT A RECORD
  // =====================================================

  const startEditing = (record) => {
    const students = {};

    record.students.forEach((entry) => {
      students[entry.studentId?._id] = {
        eligible: entry.classesEligible ?? "",
        attended: entry.classesAttended ?? "",
      };
    });

    setEditing({
      id: record._id,
      classesConducted: record.classesConducted,
      students,
    });
  };

  const updateEditingStudent = (
    studentId,
    field,
    value
  ) => {
    setEditing((prev) => ({
      ...prev,
      students: {
        ...prev.students,
        [studentId]: {
          ...prev.students[studentId],
          [field]: value,
        },
      },
    }));
  };

  const handleSaveCorrection = async () => {
    if (saving || !editing) {
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      await axios.put(
        `${API_URL}/api/attendance/${editing.id}`,
        {
          classesConducted: editing.classesConducted,
          students: Object.entries(
            editing.students
          ).map(([studentId, values]) => ({
            studentId,
            classesEligible: values.eligible,
            classesAttended: values.attended,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEditing(null);

      await loadRecords(detailSubject);

      setRefreshKey((prev) => prev + 1);

      await Swal.fire({
        icon: "success",
        title: "Attendance Corrected",
        confirmButtonColor: "#0f172a",
      });
    } catch (err) {
      console.error(
        "Correct attendance error:",
        err
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Save",
        text:
          err.response?.data?.message ||
          "Failed to correct attendance.",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE A RECORD
  // =====================================================

  const handleDelete = async (record) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete Attendance?",
      html: `
        <div style="font-size:14px;line-height:1.8;color:#64748b">
          <strong style="color:#0f172a">${detailSubject.code}</strong>
          · ${months[month - 1]} ${year}
          · ${formatBatches(record.batchNumbers)}
          <br>
          ${record.students.length} students
          <br><br>
          The whole record will be removed and the faculty can enter it again.
          <strong style="color:#dc2626">This cannot be undone from the website.</strong>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#94a3b8",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      const token = await getToken();

      await axios.delete(
        `${API_URL}/api/attendance/${record._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEditing(null);

      await loadRecords(detailSubject);

      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Delete attendance error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Delete",
        text:
          err.response?.data?.message ||
          "Failed to delete attendance.",
        confirmButtonColor: "#0f172a",
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

  const numberInputClass =
    "w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-right text-sm text-slate-900 outline-none focus:border-slate-600";

  const smallButtonClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  const renderBatch = (batch) =>
    batch?.entered ? (
      <div>
        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
          Entered
        </span>

        <p className="mt-1 text-xs text-slate-500">
          {batch.conducted} classes ·{" "}
          {formatPercent(batch.percentage)}
        </p>
      </div>
    ) : (
      <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
        Not entered
      </span>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Attendance
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            See which departments have entered attendance for the month, then open a subject to view, correct or delete it.
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
            <label className={labelClass}>Month</label>

            <select
              value={month}
              onChange={(e) => {
                monthChosenRef.current = true;
                setMonth(Number(e.target.value));
                closeDetail();
              }}
              className={selectClass}
            >
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                  {monthCounts[index + 1]
                    ? ` (${monthCounts[index + 1]} entered)`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Year</label>

            <select
              value={year}
              onChange={(e) => {
                monthChosenRef.current = false;
                setYear(Number(e.target.value));
                closeDetail();
              }}
              className={selectClass}
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
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
        <p className="mb-3 text-sm font-semibold text-slate-700">
          {loading
            ? "Loading attendance status..."
            : `${months[month - 1]} ${year}: ${summary.entered} of ${summary.total} subject-batches entered`}
        </p>
      )}

      {/* GRID */}

      {!error && (
        <EntryStatusGrid
          cells={cells}
          semesters={semesters}
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
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              {getDepartmentLabel(selected.department)} · Semester {selected.semester}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {months[month - 1]} {year}. Classes conducted and average attendance are shown for each batch.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[720px] text-sm">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-4 py-3">Batch 1</th>
                  <th className="px-4 py-3">Batch 2</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {selectedSubjects.map((subject) => (
                  <tr
                    key={subject.subjectId}
                    className={
                      detailSubject?.subjectId ===
                      subject.subjectId
                        ? "bg-slate-50"
                        : ""
                    }
                  >
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs font-bold text-slate-700">
                        {subject.code}
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {subject.subject}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {renderBatch(subject.batch1)}
                    </td>

                    <td className="px-4 py-3">
                      {renderBatch(subject.batch2)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {subject.overall?.entered && (
                        <button
                          type="button"
                          onClick={() =>
                            handleViewSubject(subject)
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View students
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>
      )}

      {/* SAVED RECORDS OF THE SUBJECT */}

      {detailSubject && (
        <div className="mt-6">

          <h2 className="text-base font-semibold text-slate-900">
            {detailSubject.code} · {detailSubject.subject}
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            {months[month - 1]} {year}. Each saved entry is shown separately.
          </p>

          {loadingDetail && records.length === 0 && (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
              Loading students...
            </p>
          )}

          {detailError && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              {detailError}
            </p>
          )}

          {!loadingDetail &&
            !detailError &&
            records.length === 0 && (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
                No attendance is saved for this subject in {months[month - 1]} {year}.
              </p>
            )}

          {records.map((record) => {
            const isEditing =
              editing?.id === record._id;

            return (
              <div
                key={record._id}
                className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >

                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatBatches(record.batchNumbers)}
                      {" · "}
                      {record.students.length} students
                      {record.isLocked === false && (
                        <span className="ml-2 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                          Unlocked for correction
                        </span>
                      )}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Entered
                      {record.enteredByName
                        ? ` by ${record.enteredByName}`
                        : ""}
                      {" on "}
                      {formatDate(record.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">

                    <span className="text-xs font-semibold text-slate-600">
                      Classes conducted:
                    </span>

                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editing.classesConducted}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            classesConducted:
                              e.target.value,
                          }))
                        }
                        aria-label="Classes conducted"
                        className={numberInputClass}
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-900">
                        {record.classesConducted}
                      </span>
                    )}

                    {isEditing ? (
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
                          className={smallButtonClass}
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            startEditing(record)
                          }
                          className={smallButtonClass}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(record)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </>
                    )}

                  </div>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[640px] text-sm">

                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3">#</th>
                        <th className="px-4 py-3">Register No.</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Batch</th>
                        <th className="px-4 py-3 text-right">Attended</th>
                        <th className="px-4 py-3 text-right">Out of</th>
                        <th className="px-4 py-3 text-right">%</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {record.students.map(
                        (entry, index) => {
                          const studentId =
                            entry.studentId?._id;

                          const values = isEditing
                            ? editing.students[studentId]
                            : null;

                          const attended = Number(
                            (isEditing
                              ? values?.attended
                              : entry.classesAttended) || 0
                          );

                          const eligible = Number(
                            (isEditing
                              ? values?.eligible
                              : entry.classesEligible) || 0
                          );

                          const percentage =
                            eligible > 0
                              ? (attended / eligible) * 100
                              : null;

                          return (
                            <tr key={studentId || index}>
                              <td className="px-5 py-2.5 text-slate-400">
                                {index + 1}
                              </td>

                              <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">
                                {entry.studentId?.registerNumber}
                              </td>

                              <td className="px-4 py-2.5 font-medium text-slate-900">
                                {entry.studentId?.name ||
                                  "Deleted student"}
                              </td>

                              <td className="px-4 py-2.5 text-slate-600">
                                {entry.studentId?.batchNumber}
                              </td>

                              <td className="px-4 py-2.5 text-right text-slate-700">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={values?.attended ?? ""}
                                    onChange={(e) =>
                                      updateEditingStudent(
                                        studentId,
                                        "attended",
                                        e.target.value
                                      )
                                    }
                                    aria-label={`Classes attended by ${entry.studentId?.name}`}
                                    className={numberInputClass}
                                  />
                                ) : (
                                  entry.classesAttended
                                )}
                              </td>

                              <td className="px-4 py-2.5 text-right text-slate-700">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={values?.eligible ?? ""}
                                    onChange={(e) =>
                                      updateEditingStudent(
                                        studentId,
                                        "eligible",
                                        e.target.value
                                      )
                                    }
                                    aria-label={`Maximum classes of ${entry.studentId?.name}`}
                                    className={numberInputClass}
                                  />
                                ) : (
                                  entry.classesEligible
                                )}
                              </td>

                              <td
                                className={`px-4 py-2.5 text-right font-bold ${
                                  percentage !== null &&
                                  percentage < 75
                                    ? "text-red-600"
                                    : "text-slate-900"
                                }`}
                              >
                                {formatPercent(percentage)}
                              </td>
                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}
