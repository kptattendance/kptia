"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const departmentNames = {
  at: "Automobile Engineering",
  ch: "Chemical Engineering",
  ce: "Civil Engineering",
  cs: "Computer Science Engineering",
  ec: "Electronics & Communication Engineering",
  ee: "Electrical & Electronics Engineering",
  me: "Mechanical Engineering",
  ps: "Polymer Engineering",
  sc: "Science & English",
};

export default function HODDashboard() {
  const { getToken } = useAuth();

  const [user, setUser] = useState(null);
  const [studentCount, setStudentCount] = useState(0);

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

      // -----------------------------------------
      // GET HOD PROFILE
      // -----------------------------------------

      const userResponse = await axios.get(
        `${API_URL}/api/users/me`,
        {
          headers,
        }
      );

      const currentUser = userResponse.data?.data;

      setUser(currentUser);

      // -----------------------------------------
      // GET STUDENTS
      // -----------------------------------------

      const studentResponse = await axios.get(
        `${API_URL}/api/students/getstudents`,
        {
          headers,
        }
      );

      const students = studentResponse.data?.data || [];

      setStudentCount(students.length);
    } catch (err) {
      console.error("HOD dashboard error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  const departmentCode =
    user?.department?.toLowerCase() || "";

  const departmentName =
    departmentNames[departmentCode] ||
    departmentCode.toUpperCase() ||
    "Department";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* ========================================= */}
      {/* HEADER */}
      {/* ========================================= */}

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">

          <div>
            <p className="text-sm font-medium text-slate-500">
              Head of Department Portal
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Welcome, {user?.name || "HOD"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage and monitor your department's
              academic activities.
            </p>
          </div>

          {/* Department badge */}

          <div className="hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:block">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Department
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {departmentName}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* ERROR */}
      {/* ========================================= */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ========================================= */}
      {/* MOBILE DEPARTMENT CARD */}
      {/* ========================================= */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:hidden">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Department
        </p>

        <p className="mt-1 font-semibold text-slate-900">
          {departmentName}
        </p>
      </div>

      {/* ========================================= */}
      {/* STAT CARDS */}
      {/* ========================================= */}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* Students */}

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm font-medium text-blue-700">
                Students
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-950">
                {studentCount}
              </p>

              <p className="mt-1 text-xs text-blue-600">
                Students in your department
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
              👨‍🎓
            </div>

          </div>
        </div>

        {/* Faculty */}

        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5">
          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm font-medium text-purple-700">
                Faculty
              </p>

              <p className="mt-2 text-3xl font-bold text-purple-950">
                —
              </p>

              <p className="mt-1 text-xs text-purple-600">
                Department faculty
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
              👨‍🏫
            </div>

          </div>
        </div>

        {/* Attendance */}

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm font-medium text-emerald-700">
                Attendance
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-950">
                Monthly
              </p>

              <p className="mt-1 text-xs text-emerald-600">
                Manage monthly attendance
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
              ✓
            </div>

          </div>
        </div>

        {/* IA */}

        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm font-medium text-orange-700">
                IA Marks
              </p>

              <p className="mt-2 text-xl font-bold text-orange-950">
                Assessment
              </p>

              <p className="mt-1 text-xs text-orange-600">
                Manage internal assessment
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
              📝
            </div>

          </div>
        </div>

      </div>

      {/* ========================================= */}
      {/* QUICK ACTIONS */}
      {/* ========================================= */}

      <div className="mt-8">

        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Access commonly used department functions.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* Students */}

          <a
            href="/hod/students"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
                👨‍🎓
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Students
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  View and manage department students
                </p>
              </div>

            </div>
          </a>

          {/* Faculty */}

          <a
            href="/hod/faculty"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
          >
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-xl">
                👨‍🏫
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Faculty
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Manage department faculty
                </p>
              </div>

            </div>
          </a>

          {/* Attendance */}

          <a
            href="/hod/attendance"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                ✓
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Attendance
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Enter and review monthly attendance
                </p>
              </div>

            </div>
          </a>

          {/* IA */}

          <a
            href="/hod/ia-marks"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
          >
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-xl">
                📝
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  IA Marks
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Enter and review IA marks
                </p>
              </div>

            </div>
          </a>

          {/* Subjects */}

          <a
            href="/hod/subjects"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                📚
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Subjects
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  View department subjects
                </p>
              </div>

            </div>
          </a>

          {/* Profile */}

          <a
            href="/hod/profile"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                👤
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  My Profile
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  View your HOD profile
                </p>
              </div>

            </div>
          </a>

        </div>
      </div>

      {/* ========================================= */}
      {/* INFORMATION CARD */}
      {/* ========================================= */}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-start gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
            ℹ️
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              Department Dashboard
            </h3>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              This dashboard provides access to students,
              faculty, attendance, internal assessment and
              subject information for your department.
              Access to department data is controlled by your
              HOD permissions.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}