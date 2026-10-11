"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { RefreshCw } from "lucide-react";
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

  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // { department, semester }
  const [selected, setSelected] = useState(null);

  // Student-wise attendance of one subject
  const [detailSubject, setDetailSubject] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");

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

    setDetailSubject(null);
    setDetail(null);

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
    setDetailSubject(null);
    setDetail(null);
    setDetailError("");
  };

  // =====================================================
  // STUDENT-WISE ATTENDANCE OF A SUBJECT
  // =====================================================

  const handleViewSubject = async (subject) => {
    try {
      setDetailSubject(subject);
      setDetail(null);
      setDetailError("");
      setLoadingDetail(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/attendance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department: selected.department,
            semester: selected.semester,
            subjectId: subject.subjectId,
            month,
            year,
            batchNumbers: "1,2",
          },
        }
      );

      const students = [
        ...(response.data?.data?.students || []),
      ].sort((a, b) =>
        String(
          a.studentId?.registerNumber || ""
        ).localeCompare(
          String(b.studentId?.registerNumber || "")
        )
      );

      setDetail({
        ...response.data?.data,
        students,
      });
    } catch (err) {
      console.error(
        "Admin attendance detail error:",
        err
      );

      setDetailError(
        err.response?.data?.message ||
          "Failed to load student attendance."
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

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
            See which departments have entered attendance for the month, then open a subject for student-wise details.
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
              onChange={(e) =>
                setMonth(Number(e.target.value))
              }
              className={selectClass}
            >
              {months.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Year</label>

            <select
              value={year}
              onChange={(e) =>
                setYear(Number(e.target.value))
              }
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
                setDetailSubject(null);
                setDetail(null);
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

      {!loading && !error && (
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

      {selected && !loading && (
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

      {/* STUDENT-WISE ATTENDANCE */}

      {detailSubject && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              {detailSubject.code} · {detailSubject.subject}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Student-wise attendance, {months[month - 1]} {year}
              {detail?.isLocked === false
                ? " · Unlocked for correction"
                : ""}
            </p>
          </div>

          {loadingDetail && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Loading students...
            </p>
          )}

          {detailError && (
            <p className="px-5 py-8 text-center text-sm font-medium text-red-700">
              {detailError}
            </p>
          )}

          {detail && (
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

                  {detail.students.map((entry, index) => {
                    const eligible = Number(
                      entry.classesEligible || 0
                    );

                    const percentage =
                      eligible > 0
                        ? (Number(
                            entry.classesAttended || 0
                          ) /
                            eligible) *
                          100
                        : null;

                    return (
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

                        <td className="px-4 py-2.5 text-slate-600">
                          {entry.studentId?.batchNumber}
                        </td>

                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {entry.classesAttended}
                        </td>

                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {eligible}
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
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
