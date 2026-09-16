"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const MONTHS = [
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

export default function StudentAcademicPage() {
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [student, setStudent] = useState(null);
  const [academic, setAcademic] = useState(null);

  const [attendance, setAttendance] = useState([]);
  const [iaMarks, setIaMarks] = useState([]);

  const [activeTab, setActiveTab] = useState("attendance");

  const [selectedSemester, setSelectedSemester] =
    useState("all");

  const [selectedIA, setSelectedIA] =
    useState("all");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    loadAcademicData();
  }, []);

  const loadAcademicData = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/students/me/academic`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Failed to load academic information."
        );
      }

      setStudent(result.data?.student || null);

      setAcademic(
        result.data?.academic || null
      );

      setAttendance(
        Array.isArray(result.data?.attendance)
          ? result.data.attendance
          : []
      );

      setIaMarks(
        Array.isArray(result.data?.iaMarks)
          ? result.data.iaMarks
          : []
      );
    } catch (err) {
      console.error(
        "Student academic data error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load academic information."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // SUBJECT NAME
  // ==========================================================

  const getSubjectName = (subject) => {
    if (!subject) return "Unknown Subject";

    return (
      subject.name ||
      subject.code ||
      "Unknown Subject"
    );
  };

  const getSubjectCode = (subject) => {
    return subject?.code || "";
  };

  // ==========================================================
  // ATTENDANCE FILTER
  // ==========================================================

  const filteredAttendance = useMemo(() => {
    if (selectedSemester === "all") {
      return attendance;
    }

    return attendance.filter(
      (item) =>
        Number(item.subjectId?.semester) ===
        Number(selectedSemester)
    );
  }, [
    attendance,
    selectedSemester,
  ]);

  // ==========================================================
  // IA FILTER
  // ==========================================================

  const filteredIA = useMemo(() => {
    let result = iaMarks;

    if (selectedSemester !== "all") {
      result = result.filter(
        (item) =>
          Number(item.semester) ===
          Number(selectedSemester)
      );
    }

    if (selectedIA !== "all") {
      result = result.filter(
        (item) =>
          Number(item.iaNumber) ===
          Number(selectedIA)
      );
    }

    return result;
  }, [
    iaMarks,
    selectedSemester,
    selectedIA,
  ]);

  // ==========================================================
  // SEMESTERS
  // ==========================================================

  const semesters = useMemo(() => {
    const values = new Set();

    attendance.forEach((item) => {
      if (item.subjectId?.semester) {
        values.add(
          Number(item.subjectId.semester)
        );
      }
    });

    iaMarks.forEach((item) => {
      if (item.semester) {
        values.add(Number(item.semester));
      }
    });

    if (academic?.semester) {
      values.add(Number(academic.semester));
    }

    return [...values].sort(
      (a, b) => a - b
    );
  }, [
    attendance,
    iaMarks,
    academic,
  ]);

  // ==========================================================
  // IA NUMBERS
  // ==========================================================

  const iaNumbers = useMemo(() => {
    const values = new Set();

    iaMarks.forEach((item) => {
      if (item.iaNumber !== undefined) {
        values.add(Number(item.iaNumber));
      }
    });

    return [...values].sort(
      (a, b) => a - b
    );
  }, [iaMarks]);

  // ==========================================================
  // ATTENDANCE SUMMARY
  // ==========================================================

  const attendanceSummary = useMemo(() => {
    if (filteredAttendance.length === 0) {
      return {
        conducted: 0,
        attended: 0,
        percentage: 0,
      };
    }

    const conducted =
      filteredAttendance.reduce(
        (sum, item) =>
          sum +
          Number(item.classesConducted || 0),
        0
      );

    const attended =
      filteredAttendance.reduce(
        (sum, item) =>
          sum +
          Number(item.classesAttended || 0),
        0
      );

    const percentage =
      conducted > 0
        ? Number(
            ((attended / conducted) * 100).toFixed(
              2
            )
          )
        : 0;

    return {
      conducted,
      attended,
      percentage,
    };
  }, [filteredAttendance]);

  // ==========================================================
  // IA SUMMARY
  // ==========================================================

  const iaSummary = useMemo(() => {
    if (filteredIA.length === 0) {
      return {
        total: 0,
        max: 0,
        percentage: 0,
      };
    }

    const total = filteredIA.reduce(
      (sum, item) =>
        sum + Number(item.totalMarks || 0),
      0
    );

    const max = filteredIA.reduce(
      (sum, item) =>
        sum +
        Number(item.totalMaxMarks || 0),
      0
    );

    const percentage =
      max > 0
        ? Number(
            ((total / max) * 100).toFixed(2)
          )
        : 0;

    return {
      total,
      max,
      percentage,
    };
  }, [filteredIA]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-32 rounded-3xl bg-white" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="h-28 rounded-2xl bg-white" />
              <div className="h-28 rounded-2xl bg-white" />
              <div className="h-28 rounded-2xl bg-white" />
            </div>

            <div className="h-96 rounded-3xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
              !
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Unable to Load Academic Data
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {error}
            </p>

            <button
              onClick={loadAcademicData}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* ==================================================
            HEADER / STUDENT PROFILE
        ================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">

          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              {/* PHOTO */}

              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-white/10 sm:h-24 sm:w-24">

                {student?.imageUrl ? (
                  <img
                    src={student.imageUrl}
                    alt={student?.name || "Student"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold">
                    {student?.name
                      ?.charAt(0)
                      ?.toUpperCase() || "S"}
                  </div>
                )}

              </div>

              <div className="min-w-0">

                <p className="text-sm font-medium text-blue-300">
                  Student Academic Portal
                </p>

                <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">
                  {student?.name || "Student"}
                </h1>

                <p className="mt-1 text-sm text-slate-300">
                  {student?.registerNumber || "—"}
                  {student?.department
                    ? ` • ${student.department.toUpperCase()}`
                    : ""}
                </p>

              </div>
            </div>

            <div className="flex flex-wrap gap-2">

              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-slate-200">
                Semester{" "}
                {academic?.semester || "—"}
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-slate-200">
                {academic?.academicYear || "—"}
              </span>

              {student?.batchNumber && (
                <span className="rounded-full bg-blue-500/20 px-4 py-2 text-xs font-semibold text-blue-200">
                  Batch {student.batchNumber}
                </span>
              )}

            </div>

          </div>
        </section>

    

        {/* ==================================================
            TABS + FILTERS
        ================================================== */}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">

            {/* TABS */}

            <div className="flex rounded-xl bg-slate-100 p-1">

              <button
                onClick={() =>
                  setActiveTab("attendance")
                }
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === "attendance"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Attendance
              </button>

              <button
                onClick={() =>
                  setActiveTab("ia")
                }
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === "ia"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                IA Marks
              </button>

            </div>

            {/* FILTERS */}

            <div className="flex flex-wrap gap-3">

              <select
                value={selectedSemester}
                onChange={(e) =>
                  setSelectedSemester(
                    e.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
              >
                <option value="all">
                  All Semesters
                </option>

                {semesters.map((semester) => (
                  <option
                    key={semester}
                    value={semester}
                  >
                    Semester {semester}
                  </option>
                ))}
              </select>

              {activeTab === "ia" && (
                <select
                  value={selectedIA}
                  onChange={(e) =>
                    setSelectedIA(
                      e.target.value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                >
                  <option value="all">
                    All IAs
                  </option>

                  {iaNumbers.map((number) => (
                    <option
                      key={number}
                      value={number}
                    >
                      IA {number}
                    </option>
                  ))}
                </select>
              )}

            </div>

          </div>

          {/* ==================================================
              ATTENDANCE TAB
          ================================================== */}

          {activeTab === "attendance" && (
            <div className="p-4 sm:p-5">

              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Monthly Attendance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Attendance recorded subject-wise for
                  each month.
                </p>
              </div>

              {filteredAttendance.length === 0 ? (
                <EmptyState
                  icon="✓"
                  title="No Attendance Records"
                  text="Attendance has not been entered for the selected semester."
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200">

                  <div className="overflow-x-auto">

                    <table className="min-w-[850px] w-full text-left">

                      <thead className="bg-slate-50">

                        <tr>

                          <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Subject
                          </th>

                          <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Month
                          </th>

                          <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                            Conducted
                          </th>

                          <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                            Attended
                          </th>

                          <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                            Percentage
                          </th>

                          <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                            Status
                          </th>

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-slate-100">

                        {filteredAttendance.map(
                          (item) => {

                            const percentage =
                              Number(
                                item.percentage || 0
                              );

                            const good =
                              percentage >= 75;

                            return (
                              <tr
                                key={item._id}
                                className="transition hover:bg-slate-50"
                              >

                                <td className="px-4 py-4">

                                  <div className="font-semibold text-slate-900">
                                    {getSubjectName(
                                      item.subjectId
                                    )}
                                  </div>

                                  {getSubjectCode(
                                    item.subjectId
                                  ) && (
                                    <div className="mt-0.5 text-xs text-slate-400">
                                      {getSubjectCode(
                                        item.subjectId
                                      )}
                                    </div>
                                  )}

                                </td>

                                <td className="px-4 py-4 text-sm text-slate-600">
                                  {MONTHS[
                                    Number(item.month) - 1
                                  ] || item.month}{" "}
                                  {item.year}
                                </td>

                                <td className="px-4 py-4 text-center text-sm font-medium text-slate-700">
                                  {item.classesConducted}
                                </td>

                                <td className="px-4 py-4 text-center text-sm font-medium text-slate-700">
                                  {item.classesAttended}
                                </td>

                                <td className="px-4 py-4 text-center">

                                  <span
                                    className={`inline-flex min-w-[72px] justify-center rounded-lg px-3 py-1.5 text-sm font-bold ${
                                      good
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-50 text-red-700"
                                    }`}
                                  >
                                    {percentage}%
                                  </span>

                                </td>

                                <td className="px-4 py-4 text-center">

                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                      good
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {good
                                      ? "Good"
                                      : "Below 75%"}
                                  </span>

                                </td>

                              </tr>
                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}

              {/* ATTENDANCE NOTE */}

              {filteredAttendance.length > 0 && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">

                  <span className="mt-0.5">
                    ℹ
                  </span>

                  <p>
                    Attendance below{" "}
                    <strong>75%</strong> is highlighted
                    for attention.
                  </p>

                </div>
              )}

            </div>
          )}

          {/* ==================================================
              IA TAB
          ================================================== */}

          {activeTab === "ia" && (
            <div className="p-4 sm:p-5">

              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Internal Assessment Marks
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  View IA-wise marks and individual test
                  performance.
                </p>
              </div>

              {filteredIA.length === 0 ? (
                <EmptyState
                  icon="★"
                  title="No IA Marks"
                  text="IA marks have not been entered for the selected filters."
                />
              ) : (
                <div className="space-y-5">

                  {filteredIA.map((ia) => {

                    const percentage =
                      ia.totalMaxMarks > 0
                        ? Number(
                            (
                              (ia.totalMarks /
                                ia.totalMaxMarks) *
                              100
                            ).toFixed(2)
                          )
                        : 0;

                    const good =
                      percentage >= 50;

                    return (
                      <div
                        key={ia._id}
                        className="overflow-hidden rounded-2xl border border-slate-200"
                      >

                        {/* IA HEADER */}

                        <div className="flex flex-col gap-4 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">
                                IA {ia.iaNumber}
                              </span>

                              <span className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
                                Semester{" "}
                                {ia.semester}
                              </span>

                              <span className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                Batch{" "}
                                {ia.batchNumber}
                              </span>

                            </div>

                            <h3 className="mt-3 text-base font-bold text-slate-900">
                              {getSubjectName(
                                ia.subjectId
                              )}
                            </h3>

                            {getSubjectCode(
                              ia.subjectId
                            ) && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {getSubjectCode(
                                  ia.subjectId
                                )}
                              </p>
                            )}

                          </div>

                          <div className="flex items-center gap-3">

                            <div className="text-right">

                              <p className="text-xs font-medium text-slate-400">
                                Total
                              </p>

                              <p className="text-2xl font-bold text-slate-900">
                                {ia.totalMarks}
                                <span className="text-sm font-medium text-slate-400">
                                  {" "}
                                  /{" "}
                                  {ia.totalMaxMarks}
                                </span>
                              </p>

                            </div>

                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-bold ${
                                good
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {percentage}%
                            </div>

                          </div>

                        </div>

                        {/* TESTS */}

                        <div className="overflow-x-auto">

                          <table className="min-w-[700px] w-full text-left">

                            <thead>

                              <tr className="border-b border-slate-100">

                                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Test
                                </th>

                                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Maximum
                                </th>

                                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Marks
                                </th>

                                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Status
                                </th>

                              </tr>

                            </thead>

                            <tbody className="divide-y divide-slate-100">

                              {(ia.tests || []).map(
                                (test, index) => {

                                  const absent =
                                    test.status ===
                                      "ABSENT" ||
                                    test.marks === null;

                                  return (
                                    <tr
                                      key={`${ia._id}-${index}`}
                                      className="hover:bg-slate-50"
                                    >

                                      <td className="px-4 py-4">

                                        <div className="font-semibold text-slate-800">
                                          {test.testName ||
                                            `Test ${
                                              index + 1
                                            }`}
                                        </div>

                                      </td>

                                      <td className="px-4 py-4 text-center text-sm text-slate-500">
                                        {test.maxMarks}
                                      </td>

                                      <td className="px-4 py-4 text-center">

                                        <span
                                          className={`text-sm font-bold ${
                                            absent
                                              ? "text-slate-400"
                                              : "text-slate-900"
                                          }`}
                                        >
                                          {absent
                                            ? "—"
                                            : test.marks}
                                        </span>

                                      </td>

                                      <td className="px-4 py-4 text-center">

                                        <span
                                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                            absent
                                              ? "bg-red-50 text-red-600"
                                              : "bg-emerald-50 text-emerald-700"
                                          }`}
                                        >
                                          {absent
                                            ? "Absent"
                                            : "Present"}
                                        </span>

                                      </td>

                                    </tr>
                                  );
                                }
                              )}

                            </tbody>

                          </table>

                        </div>

                        {/* IA FOOTER */}

                        <div className="flex flex-col gap-2 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

                          <span className="text-xs text-slate-400">
                            Academic Year:{" "}
                            {ia.academicYear || "—"}
                          </span>

                          {ia.isLocked && (
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                              🔒 Frozen
                            </span>
                          )}

                        </div>

                      </div>
                    );
                  })}

                </div>
              )}

            </div>
          )}

        </section>

        {/* ==================================================
            FOOTER INFORMATION
        ================================================== */}

        <div className="pb-4 text-center text-xs text-slate-400">
          Academic information is displayed from the
          official college records.
        </div>

      </div>
    </div>
  );
}

// ==========================================================
// EMPTY STATE
// ==========================================================

function EmptyState({
  icon,
  title,
  text,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">

      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
        {icon}
      </div>

      <h3 className="text-base font-bold text-slate-800">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {text}
      </p>

    </div>
  );
}