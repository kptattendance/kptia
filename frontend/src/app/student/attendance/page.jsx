"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

export default function StudentAttendancePage() {
  const { getToken } = useAuth();

  const currentDate = new Date();

  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);

  const [month, setMonth] = useState(
    currentDate.getMonth() + 1
  );

  const [year, setYear] = useState(
    currentDate.getFullYear()
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load Student + Attendance
  // --------------------------------------------------

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      // Get logged-in student
      const studentResponse = await axios.get(
        `${API_URL}/api/users/me`,
        { headers }
      );

      const studentData =
        studentResponse.data?.data ||
        studentResponse.data?.user;

      setStudent(studentData);

      if (!studentData) {
        throw new Error(
          "Student information not found."
        );
      }

      /*
       * Student attendance endpoint.
       *
       * The backend should identify the student
       * using req.user.id / Clerk ID.
       */
      const attendanceResponse =
        await axios.get(
          `${API_URL}/api/attendance/student`,
          {
            headers,
            params: {
              month,
              year,
            },
          }
        );

      setAttendance(
        attendanceResponse.data?.data || []
      );
    } catch (error) {
      console.error(
        "Student Attendance Error:",
        error
      );

      setAttendance([]);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load attendance."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Calculate Overall Attendance
  // --------------------------------------------------

  const overall = useMemo(() => {
    if (!attendance.length) {
      return {
        conducted: 0,
        attended: 0,
        percentage: 0,
      };
    }

    let conducted = 0;
    let attended = 0;

    attendance.forEach((record) => {
      conducted +=
        Number(record.classesConducted) || 0;

      attended +=
        Number(record.classesAttended) || 0;
    });

    const percentage =
      conducted > 0
        ? (attended / conducted) * 100
        : 0;

    return {
      conducted,
      attended,
      percentage,
    };
  }, [attendance]);

  const getPercentage = (
    attended,
    conducted
  ) => {
    if (!conducted) return 0;

    return (
      (Number(attended) /
        Number(conducted)) *
      100
    );
  };

  const getStatus = (percentage) => {
    if (percentage >= 75) {
      return {
        text: "Good",
        className:
          "bg-emerald-50 text-emerald-700",
      };
    }

    return {
      text: "Low",
      className:
        "bg-red-50 text-red-700",
    };
  };

  const name =
    student?.name ||
    `${student?.firstName || ""} ${
      student?.lastName || ""
    }`.trim() ||
    "Student";

  const semester =
    student?.semester ||
    student?.publicMetadata?.semester ||
    "";

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-8 w-64 rounded bg-slate-200" />

          <div className="mt-2 h-4 w-80 rounded bg-slate-200" />

          <div className="mt-8 h-32 rounded-2xl bg-white" />

          <div className="mt-6 h-96 rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 md:px-8">
          <h1 className="text-2xl font-bold text-slate-950">
            My Attendance
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View your subject-wise attendance.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        {/* Student Info + Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            {/* Student */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Student
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {student?.registerNumber || "—"}

                {semester && (
                  <>
                    {" "}
                    · Semester {semester}
                  </>
                )}
              </p>
            </div>

            {/* Filters */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Month
                </label>

                <select
                  value={month}
                  onChange={(e) =>
                    setMonth(
                      Number(e.target.value)
                    )
                  }
                  className="w-full min-w-[170px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
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

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Year
                </label>

                <select
                  value={year}
                  onChange={(e) =>
                    setYear(
                      Number(e.target.value)
                    )
                  }
                  className="w-full min-w-[140px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                >
                  {[
                    currentDate.getFullYear() - 1,
                    currentDate.getFullYear(),
                    currentDate.getFullYear() + 1,
                  ].map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <p className="text-sm font-medium text-blue-600">
              Classes Conducted
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
              {overall.conducted}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-6">
            <p className="text-sm font-medium text-violet-600">
              Classes Attended
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
              {overall.attended}
            </p>
          </div>

          <div
            className={`rounded-2xl border p-6 ${
              overall.percentage >= 75
                ? "border-emerald-100 bg-emerald-50"
                : "border-red-100 bg-red-50"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                overall.percentage >= 75
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              Overall Attendance
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
              {overall.percentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Attendance Table */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 md:px-8">
            <h2 className="text-lg font-bold text-slate-950">
              Subject-wise Attendance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Attendance for{" "}
              {
                months.find(
                  (item) =>
                    item.value ===
                    Number(month)
                )?.name
              }{" "}
              {year}.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 md:px-8">
                    Subject
                  </th>

                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Conducted
                  </th>

                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Attended
                  </th>

                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Percentage
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 md:px-8">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {attendance.map(
                  (record, index) => {
                    const conducted =
                      Number(
                        record.classesConducted
                      ) || 0;

                    const attended =
                      Number(
                        record.classesAttended
                      ) || 0;

                    const percentage =
                      getPercentage(
                        attended,
                        conducted
                      );

                    const status =
                      getStatus(
                        percentage
                      );

                    const subject =
                      record.subjectId;

                    return (
                      <tr
                        key={
                          record._id ||
                          `${subject?._id}-${index}`
                        }
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-6 py-5 md:px-8">
                          <p className="text-sm font-bold text-slate-800">
                            {subject?.code ||
                              record.subjectCode ||
                              "—"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {subject?.name ||
                              record.subjectName ||
                              "Subject"}
                          </p>
                        </td>

                        <td className="px-6 py-5 text-center text-sm font-semibold text-slate-700">
                          {conducted}
                        </td>

                        <td className="px-6 py-5 text-center text-sm font-semibold text-slate-700">
                          {attended}
                        </td>

                        <td className="px-6 py-5 text-center">
                          <span
                            className={`text-sm font-bold ${
                              percentage >=
                              75
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {percentage.toFixed(
                              1
                            )}
                            %
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right md:px-8">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                          >
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {attendance.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                ✓
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-800">
                No attendance records
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Attendance has not been entered for this month.
              </p>
            </div>
          )}
        </section>

        {/* Attendance Note */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
              ℹ️
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Attendance Information
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Attendance is entered by authorized faculty
                members. If you find any discrepancy, please
                contact your faculty member or department.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}