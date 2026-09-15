"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const departments = [
  { code: "at", name: "Automobile Engineering" },
  { code: "ch", name: "Chemical Engineering" },
  { code: "ce", name: "Civil Engineering" },
  { code: "cs", name: "Computer Science Engineering" },
  { code: "ec", name: "Electronics & Communication" },
  { code: "ee", name: "Electrical & Electronics" },
  { code: "me", name: "Mechanical Engineering" },
  { code: "ps", name: "Polymer Engineering" },
];

export default function PrincipalIAMarksPage() {
  const { getToken } = useAuth();

  const currentYear = new Date().getFullYear();

  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [academicYear, setAcademicYear] = useState(
    `${currentYear}-${String(currentYear + 1).slice(-2)}`
  );

  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [iaMarks, setIaMarks] = useState(null);

  const [loadingSubjects, setLoadingSubjects] =
    useState(false);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [loadingIA, setLoadingIA] =
    useState(false);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load Subjects
  // --------------------------------------------------

  useEffect(() => {
    if (!department || !semester) {
      setSubjects([]);
      setSubjectId("");
      return;
    }

    loadSubjects();
  }, [department, semester]);

  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);
      setError("");
      setSubjectId("");
      setIaMarks(null);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/subjects/getsubjects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const allSubjects =
        response.data?.data || [];

      const filteredSubjects =
        allSubjects.filter(
          (subject) =>
            subject.department?.toLowerCase() ===
              department.toLowerCase() &&
            Number(subject.semester) ===
              Number(semester)
        );

      setSubjects(filteredSubjects);
    } catch (error) {
      console.error(
        "Failed to load subjects:",
        error
      );

      setSubjects([]);

      setError(
        error.response?.data?.message ||
          "Failed to load subjects."
      );
    } finally {
      setLoadingSubjects(false);
    }
  };

  // --------------------------------------------------
  // Load Students
  // --------------------------------------------------

  useEffect(() => {
    if (!department || !semester) {
      setStudents([]);
      return;
    }

    loadStudents();
  }, [department, semester]);

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/students/getstudents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department,
            semester,
            academicYear,
          },
        }
      );

      setStudents(
        response.data?.data || []
      );
    } catch (error) {
      console.error(
        "Failed to load students:",
        error
      );

      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // --------------------------------------------------
  // Reload students when academic year changes
  // --------------------------------------------------

  useEffect(() => {
    if (!department || !semester || !academicYear) {
      return;
    }

    loadStudents();
  }, [academicYear]);

  // --------------------------------------------------
  // Load IA Marks
  // --------------------------------------------------

  useEffect(() => {
    if (
      !department ||
      !semester ||
      !subjectId ||
      !academicYear
    ) {
      setIaMarks(null);
      return;
    }

    loadIAMarks();
  }, [
    department,
    semester,
    subjectId,
    academicYear,
  ]);

  const loadIAMarks = async () => {
    try {
      setLoadingIA(true);
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/ia`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department,
            semester,
            subjectId,
            academicYear,
          },
        }
      );

      setIaMarks(
        response.data?.data || null
      );
    } catch (error) {
      console.error(
        "Failed to load IA marks:",
        error
      );

      setIaMarks(null);

      setError(
        error.response?.data?.message ||
          "Failed to load IA marks."
      );
    } finally {
      setLoadingIA(false);
    }
  };

  // --------------------------------------------------
  // Create Student IA Map
  // --------------------------------------------------

  const studentIAMap = useMemo(() => {
    const map = {};

    iaMarks?.students?.forEach(
      (student) => {
        const studentId =
          typeof student.studentId === "object"
            ? student.studentId?._id
            : student.studentId;

        if (studentId) {
          map[String(studentId)] = student;
        }
      }
    );

    return map;
  }, [iaMarks]);

  // --------------------------------------------------
  // Test Information
  // --------------------------------------------------

  const tests = useMemo(() => {
    if (!iaMarks?.students?.length) {
      return [];
    }

    const firstStudent =
      iaMarks.students[0];

    return firstStudent?.tests || [];
  }, [iaMarks]);

  const totalMaxMarks = useMemo(() => {
    return tests.reduce(
      (sum, test) =>
        sum + Number(test.maxMarks || 0),
      0
    );
  }, [tests]);

  // --------------------------------------------------
  // Statistics
  // --------------------------------------------------

  const statistics = useMemo(() => {
    if (!iaMarks?.students?.length) {
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        totalStudents: 0,
      };
    }

    const totals = iaMarks.students.map(
      (student) =>
        Number(student.totalMarks) || 0
    );

    const total = totals.reduce(
      (sum, value) => sum + value,
      0
    );

    return {
      average:
        totals.length > 0
          ? total / totals.length
          : 0,

      highest:
        totals.length > 0
          ? Math.max(...totals)
          : 0,

      lowest:
        totals.length > 0
          ? Math.min(...totals)
          : 0,

      totalStudents: totals.length,
    };
  }, [iaMarks]);

  const selectedSubject = subjects.find(
    (subject) =>
      String(subject._id) ===
      String(subjectId)
  );

  const selectedDepartment =
    departments.find(
      (item) => item.code === department
    );

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 md:px-8">
          <h1 className="text-2xl font-bold text-slate-950">
            IA Marks Monitoring
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View internal assessment marks by department,
            semester and subject.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-950">
              Select Class
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose the department, semester and subject
              you want to monitor.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {/* Department */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Department
              </label>

              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setSemester("");
                  setSubjectId("");
                  setIaMarks(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">
                  Select Department
                </option>

                {departments.map((item) => (
                  <option
                    key={item.code}
                    value={item.code}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Semester
              </label>

              <select
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setSubjectId("");
                  setIaMarks(null);
                }}
                disabled={!department}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">
                  Select Semester
                </option>

                {[1, 2, 3, 4, 5, 6, 7, 8].map(
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
            </div>

            {/* Subject */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Subject
              </label>

              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setIaMarks(null);
                }}
                disabled={
                  !department ||
                  !semester ||
                  loadingSubjects
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">
                  {loadingSubjects
                    ? "Loading subjects..."
                    : "Select Subject"}
                </option>

                {subjects.map((subject) => (
                  <option
                    key={subject._id}
                    value={subject._id}
                  >
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Academic Year
              </label>

              <select
                value={academicYear}
                onChange={(e) =>
                  setAcademicYear(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                {[
                  currentYear - 2,
                  currentYear - 1,
                  currentYear,
                  currentYear + 1,
                ].map((startYear) => {
                  const value = `${startYear}-${String(
                    startYear + 1
                  ).slice(-2)}`;

                  return (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </section>

        {/* Loading */}
        {loadingIA && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

            <p className="mt-3 text-sm text-slate-500">
              Loading IA marks...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loadingIA && (
          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* No Selection */}
        {!department ||
        !semester ||
        !subjectId ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📝
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-800">
              Select a class to view IA marks
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Choose department, semester and subject above.
            </p>
          </div>
        ) : null}

        {/* No IA */}
        {!loadingIA &&
          department &&
          semester &&
          subjectId &&
          !iaMarks && (
            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl">
                ℹ️
              </div>

              <h3 className="mt-4 font-bold text-slate-800">
                IA marks not entered
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                No IA record was found for the selected
                subject and academic year.
              </p>
            </div>
          )}

        {/* IA Report */}
        {!loadingIA && iaMarks && (
          <>
            {/* Selected Information */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    IA Report
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    {selectedSubject?.code} —{" "}
                    {selectedSubject?.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedDepartment?.name} ·{" "}
                    Semester {semester} ·{" "}
                    {academicYear}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold text-emerald-600">
                    Status
                  </p>

                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    🔒 Locked
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Tests */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-600">
                  Total Tests
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {tests.length}
                </p>
              </div>

              {/* Maximum Marks */}
              <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
                <p className="text-sm font-medium text-violet-600">
                  Maximum Marks
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {totalMaxMarks}
                </p>
              </div>

              {/* Average */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-sm font-medium text-emerald-600">
                  Average Marks
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {statistics.average.toFixed(1)}
                </p>
              </div>

              {/* Students */}
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
                <p className="text-sm font-medium text-orange-600">
                  Students
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {statistics.totalStudents}
                </p>
              </div>
            </div>

            {/* Test Information */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5 md:px-8">
                <h2 className="text-lg font-bold text-slate-950">
                  Tests
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Tests included in this IA record.
                </p>
              </div>

              <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4 md:p-8">
                {tests.map((test, index) => (
                  <div
                    key={`${test.testName}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Test {index + 1}
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {test.testName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Maximum:{" "}
                      <span className="font-semibold">
                        {test.maxMarks}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Student IA Table */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5 md:px-8">
                <h2 className="text-lg font-bold text-slate-950">
                  Student-wise IA Marks
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Marks obtained by each student in every test.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        #
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Register Number
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Student
                      </th>

                      {tests.map(
                        (test, index) => (
                          <th
                            key={`${test.testName}-${index}`}
                            className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
                          >
                            <div>
                              {test.testName}
                            </div>

                            <div className="mt-1 font-normal normal-case text-slate-400">
                              / {test.maxMarks}
                            </div>
                          </th>
                        )
                      )}

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map(
                      (student, index) => {
                        const studentIA =
                          studentIAMap[
                            String(student._id)
                          ];

                        return (
                          <tr
                            key={student._id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-5 py-4 text-sm text-slate-400">
                              {index + 1}
                            </td>

                            <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                              {student.registerNumber ||
                                "—"}
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-800">
                                {student.name ||
                                  "—"}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {student.email ||
                                  ""}
                              </p>
                            </td>

                            {tests.map(
                              (
                                test,
                                testIndex
                              ) => {
                                const savedTest =
                                  studentIA?.tests?.find(
                                    (item) =>
                                      item.testName ===
                                      test.testName
                                  );

                                return (
                                  <td
                                    key={`${student._id}-${test.testName}-${testIndex}`}
                                    className="px-5 py-4 text-center"
                                  >
                                    <span className="text-sm font-semibold text-slate-700">
                                      {savedTest?.marks ??
                                        "—"}
                                    </span>
                                  </td>
                                );
                              }
                            )}

                            <td className="px-5 py-4 text-right">
                              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                {studentIA?.totalMarks ??
                                  "—"}{" "}
                                / {totalMaxMarks}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {students.length === 0 && (
                <div className="p-10 text-center">
                  <p className="text-sm text-slate-500">
                    No students found for this department
                    and semester.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}