"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";

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

const [attendanceLocked, setAttendanceLocked] = useState(false);
const [checkingAttendance, setCheckingAttendance] = useState(false);

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
// --------------------------------------------------
// Load students + check existing attendance
// --------------------------------------------------

useEffect(() => {
  const loadStudentsAndAttendance = async () => {
    if (!department || !semester || !subjectId) {
      setStudents([]);
      setAttendance({});
      setClassesConducted("");
      setAttendanceLocked(false);
      return;
    }

    try {
      setLoadingStudents(true);
      setCheckingAttendance(true);

      const token = await getToken();

      // ==============================================
      // LOAD STUDENTS
      // ==============================================

      const studentResponse = await axios.get(
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

      const studentResult = studentResponse.data;

      const studentData = Array.isArray(
        studentResult?.data
      )
        ? studentResult.data
        : Array.isArray(studentResult?.students)
        ? studentResult.students
        : studentResult?.students?.data || [];

      setStudents(studentData);

      // ==============================================
      // CHECK EXISTING ATTENDANCE
      // ==============================================

      const attendanceResponse = await axios.get(
        `${API_URL}/api/attendance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department,
            semester: Number(semester),
            subjectId,
            month: Number(month),
            year: Number(year),
          },
        }
      );

      const attendanceResult =
        attendanceResponse.data;

      const existingAttendance =
        attendanceResult?.data;

      // ==============================================
      // ATTENDANCE ALREADY EXISTS
      // ==============================================

      if (existingAttendance) {
        setAttendanceLocked(true);

        setClassesConducted(
          existingAttendance.classesConducted
        );

        const savedAttendance = {};

        studentData.forEach((student) => {
          const savedStudent =
            existingAttendance.students?.find(
              (item) =>
                String(
                  item.studentId?._id ||
                    item.studentId
                ) === String(student._id)
            );

          savedAttendance[student._id] =
            savedStudent?.classesAttended ?? "";
        });

        setAttendance(savedAttendance);

        const monthName =
          months.find(
            (item) =>
              item.value === Number(month)
          )?.label || month;

        await Swal.fire({
          icon: "info",
          title: "Attendance Already Entered",
          html: `
            <div style="font-size:14px;line-height:1.7;color:#64748b">
              Attendance for
              <strong style="color:#0f172a">
                ${monthName} ${year}
              </strong>
              has already been entered for this subject.
              <br><br>
              <strong style="color:#d97706">
                This attendance is locked and cannot be modified.
              </strong>
            </div>
          `,
          confirmButtonText: "View Attendance",
          confirmButtonColor: "#0f172a",
        });
      }

      // ==============================================
      // NO ATTENDANCE EXISTS
      // ==============================================

      else {
        setAttendanceLocked(false);
        setClassesConducted("");

        const initialAttendance = {};

        studentData.forEach((student) => {
          initialAttendance[student._id] = "";
        });

        setAttendance(initialAttendance);
      }
    } catch (error) {
      console.error(
        "Failed to load students/attendance:",
        error
      );

      setStudents([]);
      setAttendance({});
      setClassesConducted("");
      setAttendanceLocked(false);

      await Swal.fire({
        icon: "error",
        title: "Unable to Load Attendance",
        text:
          error.response?.data?.message ||
          "Unable to load students or attendance.",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setLoadingStudents(false);
      setCheckingAttendance(false);
    }
  };

  loadStudentsAndAttendance();
}, [
  department,
  semester,
  subjectId,
  month,
  year,
  getToken,
]);

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
  // ==============================================
  // SAFETY CHECK
  // ==============================================

  if (attendanceLocked) {
    await Swal.fire({
      icon: "warning",
      title: "Attendance Locked",
      text:
        "Attendance for this month and subject has already been entered and cannot be modified.",
      confirmButtonColor: "#0f172a",
    });

    return;
  }

  // ==============================================
  // VALIDATE SELECTION
  // ==============================================

  if (!department || !semester || !subjectId) {
    await Swal.fire({
      icon: "warning",
      title: "Incomplete Selection",
      text:
        "Please select department, semester and subject.",
      confirmButtonColor: "#0f172a",
    });

    return;
  }

  // ==============================================
  // VALIDATE CLASSES CONDUCTED
  // ==============================================

  if (
    classesConducted === "" ||
    Number(classesConducted) < 0
  ) {
    await Swal.fire({
      icon: "warning",
      title: "Invalid Classes Conducted",
      text:
        "Please enter a valid number of classes conducted.",
      confirmButtonColor: "#0f172a",
    });

    return;
  }

  // ==============================================
  // VALIDATE STUDENTS
  // ==============================================

  for (const student of students) {
    const value = attendance[student._id];
    const attended = Number(value);

    if (
      value === "" ||
      Number.isNaN(attended)
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Attendance Missing",
        text:
          `Please enter attendance for ${student.name}.`,
        confirmButtonColor: "#0f172a",
      });

      return;
    }

    if (
      attended > Number(classesConducted)
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid Attendance",
        text:
          `Attendance for ${student.name} cannot exceed classes conducted.`,
        confirmButtonColor: "#0f172a",
      });

      return;
    }

    if (attended < 0) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid Attendance",
        text:
          `Attendance for ${student.name} cannot be negative.`,
        confirmButtonColor: "#0f172a",
      });

      return;
    }
  }

  // ==============================================
  // CONFIRM
  // ==============================================

  const monthName =
    months.find(
      (item) =>
        item.value === Number(month)
    )?.label || month;

  const confirmation = await Swal.fire({
    icon: "question",
    title: "Save Attendance?",
    html: `
      <div style="font-size:14px;line-height:1.8;color:#64748b">
        You are entering attendance for
        <strong style="color:#0f172a">
          ${monthName} ${year}
        </strong>
        <br>
        <strong style="color:#0f172a">
          ${selectedSubject?.code || ""}
          — ${selectedSubject?.name || ""}
        </strong>
        <br><br>
        Once saved, the attendance will be
        <strong style="color:#dc2626">
          permanently locked
        </strong>
        and cannot be edited.
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Save & Lock",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#0f172a",
    cancelButtonColor: "#94a3b8",
    reverseButtons: true,
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  // ==============================================
  // SAVE
  // ==============================================

  try {
    setSaving(true);

    const token = await getToken();

    const payload = {
      department,
      semester: Number(semester),
      subjectId,
      month: Number(month),
      year: Number(year),
      classesConducted:
        Number(classesConducted),

      students: students.map(
        (student) => ({
          studentId: student._id,
          classesAttended:
            Number(
              attendance[student._id]
            ),
        })
      ),
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

    // Lock immediately
    setAttendanceLocked(true);

    await Swal.fire({
      icon: "success",
      title: "Attendance Saved",
      text:
        "Attendance has been saved successfully and is now locked.",
      confirmButtonColor: "#0f172a",
    });
  } catch (error) {
    console.error(
      "Save attendance error:",
      error
    );

    // ============================================
    // DUPLICATE RECORD
    // ============================================

    if (
      error.response?.status === 409
    ) {
      setAttendanceLocked(true);

      await Swal.fire({
        icon: "warning",
        title: "Attendance Already Entered",
        text:
          "Attendance for this month and subject has already been entered and is locked.",
        confirmButtonText:
          "OK",
        confirmButtonColor:
          "#0f172a",
      });

      return;
    }

    await Swal.fire({
      icon: "error",
      title: "Unable to Save Attendance",
      text:
        error.response?.data?.message ||
        "Failed to save attendance.",
      confirmButtonColor:
        "#0f172a",
    });
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
  disabled={
    attendanceLocked ||
    checkingAttendance
  }
  onChange={(e) =>
    setClassesConducted(e.target.value)
  }
                placeholder="e.g. 24"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
              {attendanceLocked && (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
    🔒 LOCKED
  </span>
)}
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
  disabled={
    attendanceLocked ||
    checkingAttendance
  }
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
           disabled={
  saving ||
  loadingStudents ||
  checkingAttendance ||
  attendanceLocked
}
                className="rounded-xl bg-slate-950 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
  ? "Saving..."
  : attendanceLocked
  ? "Attendance Locked"
  : "Save Attendance"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}