"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Link from "next/link";

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

export default function PrincipalDashboard() {
  const { getToken } = useAuth();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [iaMarks, setIaMarks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      // Students
      const studentsResponse = await axios.get(
        `${API_URL}/api/students/getstudents`,
        { headers }
      );

      setStudents(
        studentsResponse.data?.data || []
      );

      /*
       * Attendance and IA APIs may not yet have
       * dashboard summary endpoints.
       *
       * Keep these empty for now.
       * We will connect them properly when
       * Principal Attendance and IA pages are created.
       */
      setAttendance([]);
      setIaMarks([]);
    } catch (err) {
      console.error(
        "Principal Dashboard Error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  const departmentSummary = useMemo(() => {
    return departments.map((department) => {
      const departmentStudents = students.filter(
        (student) =>
          student.department?.toLowerCase() ===
          department.code
      );

      return {
        ...department,
        studentCount: departmentStudents.length,
      };
    });
  }, [students]);

  const totalStudents = students.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 w-56 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-80 rounded bg-slate-200" />

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <div className="h-32 rounded-2xl bg-white" />
              <div className="h-32 rounded-2xl bg-white" />
              <div className="h-32 rounded-2xl bg-white" />
            </div>

            <div className="mt-6 h-96 rounded-2xl bg-white" />
          </div>
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
            Principal Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            College-wide academic monitoring at a glance.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Students */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Total Students
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  {totalStudents}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Across all departments
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                👨‍🎓
              </div>
            </div>
          </div>

          {/* Attendance */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">
                  Attendance
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  —
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  View department-wise
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                ✓
              </div>
            </div>
          </div>

          {/* IA */}
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-violet-600">
                  IA Marks
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-950">
                  —
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  View department-wise
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                📝
              </div>
            </div>
          </div>
        </div>

        {/* Department Overview */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Department Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Student strength across departments.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {departments.length} Departments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 md:px-8">
                    Department
                  </th>

                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Students
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 md:px-8">
                    Monitoring
                  </th>
                </tr>
              </thead>

              <tbody>
                {departmentSummary.map(
                  (department) => (
                    <tr
                      key={department.code}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-6 py-4 md:px-8">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {department.name}
                          </p>

                          <p className="mt-0.5 text-xs uppercase text-slate-400">
                            {department.code}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                          {department.studentCount}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right md:px-8">
                        <Link
                          href={`/principal/attendance?department=${department.code}`}
                          className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                        >
                          View Attendance →
                        </Link>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Monitoring */}
        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <Link
            href="/principal/attendance"
            className="group rounded-2xl border border-emerald-100 bg-emerald-50 p-6 transition hover:border-emerald-200 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                  ✓
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-950">
                  Monitor Attendance
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Check attendance by department, semester and subject.
                </p>
              </div>

              <span className="text-xl text-slate-400 transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/principal/ia-marks"
            className="group rounded-2xl border border-violet-100 bg-violet-50 p-6 transition hover:border-violet-200 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                  📝
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-950">
                  Monitor IA Marks
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Check IA performance by department, semester and subject.
                </p>
              </div>

              <span className="text-xl text-slate-400 transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}