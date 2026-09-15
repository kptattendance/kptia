"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const departments = [
  { value: "at", label: "Automobile Engineering" },
  { value: "ch", label: "Chemical Engineering" },
  { value: "ce", label: "Civil Engineering" },
  { value: "cs", label: "Computer Science Engineering" },
  { value: "ec", label: "Electronics & Communication" },
  { value: "ee", label: "Electrical & Electronics" },
  { value: "me", label: "Mechanical Engineering" },
  { value: "ps", label: "Polymer Engineering" },
  { value: "sc", label: "Science & English" },
];

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function FacultyAttendancePage() {
  const { getToken } = useAuth();

  const currentDate = new Date();

  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [classesConducted, setClassesConducted] = useState("");

  const [attendance, setAttendance] = useState({});

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const years = useMemo(() => {
    const list = [];

    for (let i = currentDate.getFullYear() - 2; i <= currentDate.getFullYear() + 1; i++) {
      list.push(i);
    }

    return list;
  }, []);

  // --------------------------------------------------
  // Load subjects
  // --------------------------------------------------

  useEffect(() => {
    const loadSubjects = async () => {
      if (!department || !semester) {
        setSubjects([]);
        setSubjectId("");
        return;
      }

      try {
        setLoadingSubjects(true);
        setSubjectId("");

        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/subjects/getsubjects`,
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

        const result = response.data;

        const data = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.subjects)
            ? result.subjects
            : result?.subjects?.data || [];

        setSubjects(data);
      } catch (error) {
        console.error("Failed to load subjects:", error);

        setSubjects([]);

        setMessage("Unable to load subjects.");
        setMessageType("error");
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [department, semester, getToken]);

  // --------------------------------------------------
  // Load students
  // --------------------------------------------------

  useEffect(() => {
    const loadStudents = async () => {
      if (!department || !semester || !subjectId) {
        setStudents([]);
        setAttendance({});
        return;
      }

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

        const result = response.data;

        const data = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.students)
            ? result.students
            : result?.students?.data || [];

        setStudents(data);

        const initialAttendance = {};

        data.forEach((student) => {
          initialAttendance[student._id] = "";
        });

        setAttendance(initialAttendance);
      } catch (error) {
        console.error("Failed to load students:", error);

        setStudents([]);

        setMessage("Unable to load students.");
        setMessageType("error");
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [department, semester, subjectId, getToken]);

  // --------------------------------------------------
  // Attendance percentage
  // --------------------------------------------------

  const getPercentage = (studentId) => {
    const conducted = Number(classesConducted);
    const attended = Number(attendance[studentId]);

    if (!conducted || attendance[studentId] === "") {
      return null;
    }

    return ((attended / conducted) * 100).toFixed(1);
  };

  // --------------------------------------------------
  // Save attendance
  // --------------------------------------------------

  const handleSave = async () => {
    if (!department || !semester || !subjectId) {
      setMessage("Please select department, semester and subject.");
      setMessageType("error");
      return;
    }

    if (!classesConducted || Number(classesConducted) < 0) {
      setMessage("Please enter valid classes conducted.");
      setMessageType("error");
      return;
    }

    for (const student of students) {
      const attended = Number(attendance[student._id]);

      if (
        attendance[student._id] === "" ||
        Number.isNaN(attended)
      ) {
        setMessage(
          `Please enter attendance for ${student.name}.`
        );
        setMessageType("error");
        return;
      }

      if (attended > Number(classesConducted)) {
        setMessage(
          `Attendance for ${student.name} cannot exceed classes conducted.`
        );
        setMessageType("error");
        return;
      }

      if (attended < 0) {
        setMessage(
          `Attendance for ${student.name} cannot be negative.`
        );
        setMessageType("error");
        return;
      }
    }

    try {
      setSaving(true);
      setMessage("");

      const token = await getToken();

      const payload = {
        department,
        semester: Number(semester),
        subjectId,
        month: Number(month),
        year: Number(year),
        classesConducted: Number(classesConducted),
        students: students.map((student) => ({
          studentId: student._id,
          classesAttended: Number(attendance[student._id]),
        })),
      };

      await axios.post(
        `${API_URL}/api/attendance/save`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage("Attendance saved successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Save attendance error:", error);

      setMessage(
        error.response?.data?.message ||
          "Failed to save attendance."
      );

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const selectedSubject = subjects.find(
    (subject) => subject._id === subjectId
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-xl text-white shadow-sm">
            ✓
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">
              Faculty Portal
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Monthly Attendance
            </h1>
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Enter the number of classes conducted and the classes attended
          by each student for the selected month.
        </p>
      </div>

      {/* Selection Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
              1
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Select Class
              </h2>

              <p className="text-xs text-slate-500">
                Choose the month, department, semester and subject.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2 lg:grid-cols-5">

          {/* Month */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Month
            </label>

            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
            >
              {months.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Year
            </label>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Department
            </label>

            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setSemester("");
                setSubjectId("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">Select department</option>

              {departments.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Semester
            </label>

            <select
              value={semester}
              disabled={!department}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select semester</option>

              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Subject
            </label>

            <select
              value={subjectId}
              disabled={!semester || loadingSubjects}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {loadingSubjects
                  ? "Loading subjects..."
                  : "Select subject"}
              </option>

              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Attendance Section */}
      {subjectId && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Section Header */}
          <div className="flex flex-col gap-5 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                  2
                </div>

                <h2 className="font-semibold text-slate-900">
                  Enter Attendance
                </h2>
              </div>

              {selectedSubject && (
                <div className="mt-3 ml-11">
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedSubject.code} — {selectedSubject.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {departments.find(
                      (d) => d.value === department
                    )?.label}{" "}
                    · Semester {semester} ·{" "}
                    {months.find((m) => m.value === month)?.label}{" "}
                    {year}
                  </p>
                </div>
              )}
            </div>

            {/* Classes Conducted */}
            <div className="w-full lg:w-64">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Classes Conducted
              </label>

              <input
                type="number"
                min="0"
                value={classesConducted}
                onChange={(e) => setClassesConducted(e.target.value)}
                placeholder="e.g. 24"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto">

            {loadingStudents ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-medium text-slate-700">
                  No students found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No students are available for this department and semester.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      #
                    </th>

                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Register No.
                    </th>

                    <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Classes Attended
                    </th>

                    <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Percentage
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {students.map((student, index) => {
                    const percentage = getPercentage(student._id);

                    return (
                      <tr
                        key={student._id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {index + 1}
                        </td>

                        <td className="px-4 py-4 text-sm font-medium text-slate-700">
                          {student.registerNumber}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {student.name?.charAt(0)?.toUpperCase()}
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {student.name}
                              </p>

                              <p className="text-xs text-slate-400">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max={classesConducted || undefined}
                            value={attendance[student._id] ?? ""}
                            onChange={(e) =>
                              setAttendance((prev) => ({
                                ...prev,
                                [student._id]: e.target.value,
                              }))
                            }
                            className="mx-auto w-28 rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                            placeholder="0"
                          />
                        </td>

                        <td className="px-4 py-4 text-center">
                          {percentage !== null ? (
                            <span
                              className={`inline-flex min-w-20 justify-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                                Number(percentage) >= 75
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {percentage}%
                            </span>
                          ) : (
                            <span className="text-sm text-slate-300">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          {students.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">
                  {students.length}
                </span>{" "}
                students
              </div>

              <button
                onClick={handleSave}
                disabled={saving || loadingStudents}
                className="rounded-xl bg-slate-950 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}