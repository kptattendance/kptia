"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  BarChart3,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function HODIAMarksPage() {
  const { getToken } = useAuth();

  const [academicYear, setAcademicYear] =
    useState("2026-27");

  const [semester, setSemester] =
    useState("");

  const [selectedIA, setSelectedIA] =
    useState("");

  const [subjects, setSubjects] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================================
  // LOAD SEMESTER IA DATA
  // =====================================================

  const loadData = async () => {
    if (!semester) {
      setSubjects([]);
      setSelectedIA("");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/hod/ia/semester`,
        {
          params: {
            academicYear,
            semester,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result =
        response.data?.data || [];

      setSubjects(result);

      // Automatically select first available IA
      const allIANumbers = [
        ...new Set(
          result.flatMap(
            (subject) =>
              subject.iaNumbers || []
          )
        ),
      ].sort((a, b) => a - b);

      if (allIANumbers.length > 0) {
        setSelectedIA(
          String(allIANumbers[0])
        );
      } else {
        setSelectedIA("");
      }
    } catch (err) {
      console.error(
        "Load HOD IA error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load IA details."
      );

      setSubjects([]);
      setSelectedIA("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (semester) {
      loadData();
    } else {
      setSubjects([]);
      setSelectedIA("");
    }
  }, [semester, academicYear]);

  // =====================================================
  // AVAILABLE IA NUMBERS
  // =====================================================

  const availableIANumbers = useMemo(() => {
    const numbers = new Set();

    subjects.forEach((subject) => {
      (subject.iaNumbers || []).forEach(
        (ia) => numbers.add(ia)
      );
    });

    return Array.from(numbers).sort(
      (a, b) => a - b
    );
  }, [subjects]);

  // =====================================================
  // CREATE STUDENT-WISE TABLE DATA
  // =====================================================

  const tableData = useMemo(() => {
    const studentMap = new Map();

    subjects.forEach((subject) => {
      (subject.students || []).forEach(
        (student) => {
          const studentId =
            student.studentId;

          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              studentId,
              registerNumber:
                student.registerNumber,
              name: student.name,
              batchNumber:
                student.batchNumber,
              subjectMarks: {},
            });
          }

          const row =
            studentMap.get(studentId);

          const iaData =
            student.iaMarks?.[
              `IA${selectedIA}`
            ];

          if (iaData) {
            row.subjectMarks[
              subject.subjectId
            ] = {
              marks: iaData.marks,
              status: iaData.status,
            };
          }
        }
      );
    });

    return Array.from(
      studentMap.values()
    ).sort((a, b) =>
      String(
        a.registerNumber
      ).localeCompare(
        String(b.registerNumber)
      )
    );
  }, [subjects, selectedIA]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <BarChart3 size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                IA Marks
              </h1>

              <p className="text-sm text-slate-500">
                Semester-wise Internal Assessment
                details
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={
              loading || !semester
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

        </div>

        {/* =================================================
            FILTER SECTION
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            {/* ACADEMIC YEAR */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Academic Year
              </label>

              <div className="relative">

                <select
                  value={academicYear}
                  onChange={(e) =>
                    setAcademicYear(
                      e.target.value
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                >
                  <option value="2026-27">
                    2026-27
                  </option>

                  <option value="2025-26">
                    2025-26
                  </option>

                  <option value="2024-25">
                    2024-25
                  </option>
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

            {/* SEMESTER */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Semester
              </label>

              <div className="relative">

                <select
                  value={semester}
                  onChange={(e) =>
                    setSemester(
                      e.target.value
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-500"
                >
                  <option value="">
                    Select Semester
                  </option>

                  {semesters.map(
                    (sem) => (
                      <option
                        key={sem}
                        value={sem}
                      >
                        Semester {sem}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

            {/* IA */}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Internal Assessment
              </label>

              <div className="relative">

                <select
                  value={selectedIA}
                  onChange={(e) =>
                    setSelectedIA(
                      e.target.value
                    )
                  }
                  disabled={
                    !semester ||
                    availableIANumbers.length ===
                      0
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    Select IA
                  </option>

                  {availableIANumbers.map(
                    (ia) => (
                      <option
                        key={ia}
                        value={ia}
                      >
                        IA {ia}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

          </div>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <RefreshCw
              size={30}
              className="mx-auto mb-3 animate-spin text-slate-400"
            />

            <p className="text-sm text-slate-500">
              Loading IA marks...
            </p>

          </div>
        )}

        {/* =================================================
            NO SEMESTER
        ================================================= */}

        {!loading &&
          !semester && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

              <h2 className="font-semibold text-slate-700">
                Select a Semester
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Select a semester to view
                IA marks.
              </p>

            </div>
          )}

        {/* =================================================
            NO IA
        ================================================= */}

        {!loading &&
          semester &&
          availableIANumbers.length ===
            0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

              <h2 className="font-semibold text-slate-700">
                No IA Marks Available
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                No IA marks have been entered
                for Semester {semester}.
              </p>

            </div>
          )}

        {/* =================================================
            MARKS TABLE
        ================================================= */}

        {!loading &&
          semester &&
          selectedIA &&
          subjects.length > 0 &&
          tableData.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* TABLE HEADER */}

              <div className="border-b border-slate-100 px-5 py-4">

                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Semester {semester}
                      {" — "}
                      IA {selectedIA}
                    </h2>

                    <p className="text-xs text-slate-500">
                      Student-wise marks for all
                      subjects
                    </p>
                  </div>

                  <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {tableData.length} Students
                  </div>

                </div>

              </div>

              {/* TABLE */}

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] border-collapse text-sm">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50">

                      <th className="sticky left-0 z-20 whitespace-nowrap border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Register No.
                      </th>

                      <th className="sticky left-[130px] z-20 whitespace-nowrap border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Student
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Batch
                      </th>

                      {subjects.map(
                        (subject) => (
                          <th
                            key={
                              subject.subjectId
                            }
                            className="min-w-[150px] whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center"
                          >
                            <div className="font-semibold text-slate-700">
                            <Link
  href={`/hod/ia-marks/${subject.subjectId}?academicYear=${encodeURIComponent(
    academicYear
  )}&semester=${semester}`}
  className="font-semibold text-slate-700 transition hover:text-blue-600"
>
  {subject.name}
</Link>
                            </div>

                            <div className="mt-0.5 text-[11px] font-medium text-slate-400">
                              {
                                subject.code
                              }
                            </div>
                          </th>
                        )
                      )}

                    </tr>

                  </thead>

                  <tbody>

                    {tableData.map(
                      (student) => (
                        <tr
                          key={
                            student.studentId
                          }
                          className="border-b border-slate-100 transition hover:bg-slate-50"
                        >

                          {/* REGISTER NUMBER */}

                          <td className="sticky left-0 z-10 whitespace-nowrap border-r border-slate-100 bg-white px-4 py-3.5 font-medium text-slate-700">
                            {
                              student.registerNumber
                            }
                          </td>

                          {/* STUDENT NAME */}

                          <td className="sticky left-[130px] z-10 whitespace-nowrap border-r border-slate-100 bg-white px-4 py-3.5 font-semibold text-slate-900">
                            {
                              student.name
                            }
                          </td>

                          {/* BATCH */}

                          <td className="border-r border-slate-100 px-4 py-3.5 text-center">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Batch{" "}
                              {
                                student.batchNumber
                              }
                            </span>
                          </td>

                          {/* SUBJECT MARKS */}

                          {subjects.map(
                            (subject) => {
                              const mark =
                                student
                                  .subjectMarks[
                                  subject
                                    .subjectId
                                ];

                              return (
                                <td
                                  key={
                                    subject.subjectId
                                  }
                                  className="border-r border-slate-100 px-4 py-3.5 text-center"
                                >
                                  {mark ? (
                                    mark.status ===
                                    "ABSENT" ? (
                                      <span className="font-semibold text-red-500">
                                        AB
                                      </span>
                                    ) : (
                                      <span className="font-semibold text-slate-800">
                                        {
                                          mark.marks
                                        }
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-300">
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            }
                          )}

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

        {/* =================================================
            NO STUDENTS FOR SELECTED IA
        ================================================= */}

        {!loading &&
          semester &&
          selectedIA &&
          subjects.length > 0 &&
          tableData.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

              <h2 className="font-semibold text-slate-700">
                No Student Marks Found
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                No marks are available for IA{" "}
                {selectedIA} in Semester{" "}
                {semester}.
              </p>

            </div>
          )}

      </div>
    </div>
  );
}