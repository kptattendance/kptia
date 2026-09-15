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

const months = [
  { value: 1, name: "January" },
  { value: 2, name: "February" },
  { value: 3, name: "March" },
  { value: 4, name: "April" },
  { value: 5, name: "May" },
  { value: 6, name: "June" },
  { value: 7, name: "July" },
  { value: 8, name: "August" },
  { value: 9, name: "September" },
  { value: 10, name: "October" },
  { value: 11, name: "November" },
  { value: 12, name: "December" },
];

export default function PrincipalAttendancePage() {
  const { getToken } = useAuth();

  const currentDate = new Date();

  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [month, setMonth] = useState(
    currentDate.getMonth() + 1
  );

  const [year, setYear] = useState(
    currentDate.getFullYear()
  );

  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState(null);

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAttendance, setLoadingAttendance] =
    useState(false);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load subjects when department + semester changes
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

      const filteredSubjects = allSubjects.filter(
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

      setError(
        error.response?.data?.message ||
          "Failed to load subjects."
      );
    } finally {
      setLoadingSubjects(false);
    }
  };

  // --------------------------------------------------
  // Load students when department + semester changes
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
  // Load attendance
  // --------------------------------------------------

  useEffect(() => {
    if (
      !department ||
      !semester ||
      !subjectId ||
      !month ||
      !year
    ) {
      setAttendance(null);
      return;
    }

    loadAttendance();
  }, [
    department,
    semester,
    subjectId,
    month,
    year,
  ]);

  const loadAttendance = async () => {
    try {
      setLoadingAttendance(true);
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/attendance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department,
            semester,
            subjectId,
            month,
            year,
          },
        }
      );

      setAttendance(
        response.data?.data || null
      );
    } catch (error) {
      console.error(
        "Failed to load attendance:",
        error
      );

      setAttendance(null);

      setError(
        error.response?.data?.message ||
          "Failed to load attendance."
      );
    } finally {
      setLoadingAttendance(false);
    }
  };

  // --------------------------------------------------
  // Attendance map
  // --------------------------------------------------

  const attendanceMap = useMemo(() => {
    const map = {};

    attendance?.students?.forEach(
      (student) => {
        const studentId =
          typeof student.studentId === "object"
            ? student.studentId?._id
            : student.studentId;

        if (studentId) {
          map[String(studentId)] =
            Number(student.classesAttended);
        }
      }
    );

    return map;
  }, [attendance]);

  // --------------------------------------------------
  // Statistics
  // --------------------------------------------------

  const statistics = useMemo(() => {
    if (!attendance || !attendance.students?.length) {
      return {
        average: 0,
        above75: 0,
        below75: 0,
      };
    }

    const conducted =
      Number(attendance.classesConducted) || 0;

    if (conducted === 0) {
      return {
        average: 0,
        above75: 0,
        below75: attendance.students.length,
      };
    }

    let totalPercentage = 0;
    let above75 = 0;
    let below75 = 0;

    attendance.students.forEach((student) => {
      const attended =
        Number(student.classesAttended) || 0;

      const percentage =
        (attended / conducted) * 100;

      totalPercentage += percentage;

      if (percentage >= 75) {
        above75++;
      } else {
        below75++;
      }
    });

    return {
      average:
        totalPercentage /
        attendance.students.length,

      above75,
      below75,
    };
  }, [attendance]);

  const selectedSubject = subjects.find(
    (subject) =>
      String(subject._id) === String(subjectId)
  );

  const selectedDepartment = departments.find(
    (item) => item.code === department
  );

  const getPercentage = (attended) => {
    const conducted =
      Number(attendance?.classesConducted) || 0;

    if (conducted === 0) return 0;

    return (Number(attended) / conducted) * 100;
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 md:px-8">
          <h1 className="text-2xl font-bold text-slate-950">
            Attendance Monitoring
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View attendance by department, semester, subject and month.
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
              Choose the department, semester and subject you want to monitor.
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
                  setAttendance(null);
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
                  setAttendance(null);
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
                  setAttendance(null);
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

            {/* Month */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Month
              </label>

              <select
                value={month}
                onChange={(e) =>
                  setMonth(Number(e.target.value))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              >
                {months.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Year */}
          <div className="mt-5 max-w-xs">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Year
            </label>

            <select
              value={year}
              onChange={(e) =>
                setYear(Number(e.target.value))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            >
              {[currentDate.getFullYear() - 1,
                currentDate.getFullYear(),
                currentDate.getFullYear() + 1].map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>
        </section>

        {/* Loading */}
        {loadingAttendance && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

            <p className="mt-3 text-sm text-slate-500">
              Loading attendance...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loadingAttendance && (
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
              ✓
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-800">
              Select a class to view attendance
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Choose department, semester and subject above.
            </p>
          </div>
        ) : null}

        {/* No Attendance */}
        {!loadingAttendance &&
          department &&
          semester &&
          subjectId &&
          !attendance && (
            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl">
                ℹ️
              </div>

              <h3 className="mt-4 font-bold text-slate-800">
                Attendance not entered
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                No attendance record was found for the selected subject and month.
              </p>
            </div>
          )}

        {/* Attendance */}
        {!loadingAttendance && attendance && (
          <>
            {/* Selected Information */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Attendance Report
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    {selectedSubject?.code} —{" "}
                    {selectedSubject?.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedDepartment?.name} · Semester{" "}
                    {semester} ·{" "}
                    {
                      months.find(
                        (m) =>
                          m.value === Number(month)
                      )?.name
                    }{" "}
                    {year}
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
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-600">
                  Classes Conducted
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {attendance.classesConducted}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-sm font-medium text-emerald-600">
                  Average Attendance
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {statistics.average.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                <p className="text-sm font-medium text-green-600">
                  75% & Above
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {statistics.above75}
                </p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <p className="text-sm font-medium text-red-600">
                  Below 75%
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {statistics.below75}
                </p>
              </div>
            </div>

            {/* Student Table */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5 md:px-8">
                <h2 className="text-lg font-bold text-slate-950">
                  Student-wise Attendance
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Attendance details for the selected subject and month.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 md:px-8">
                        #
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Register Number
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Student
                      </th>

                      <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Attended
                      </th>

                      <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Conducted
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 md:px-8">
                        Attendance
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map(
                      (student, index) => {
                        const attended =
                          attendanceMap[
                            String(student._id)
                          ] ?? 0;

                        const percentage =
                          getPercentage(
                            attended
                          );

                        return (
                          <tr
                            key={student._id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-6 py-4 text-sm text-slate-400 md:px-8">
                              {index + 1}
                            </td>

                            <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                              {student.registerNumber ||
                                "—"}
                            </td>

                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-slate-800">
                                {student.name ||
                                  "—"}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {student.email ||
                                  ""}
                              </p>
                            </td>

                            <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                              {attended}
                            </td>

                            <td className="px-6 py-4 text-center text-sm text-slate-500">
                              {
                                attendance.classesConducted
                              }
                            </td>

                            <td className="px-6 py-4 text-right md:px-8">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                  percentage >=
                                  75
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {percentage.toFixed(
                                  1
                                )}
                                %
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
                    No students found for this department and semester.
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