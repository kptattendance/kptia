"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const departmentNames = {
  at: "Automobile Engineering",
  ch: "Chemical Engineering",
  ce: "Civil Engineering",
  cs: "Computer Science Engineering",
  ec: "Electronics & Communication",
  ee: "Electrical & Electronics",
  me: "Mechanical Engineering",
  ps: "Polymer Engineering",
  sc: "Science & English",
};

export default function StudentDashboard() {
  const { getToken } = useAuth();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudent();
  }, []);

  const loadStudent = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        response.data?.data ||
        response.data?.user;

      setStudent(data);
    } catch (error) {
      console.error(
        "Failed to load student:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load student information."
      );
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (department) => {
    if (!department) return "Not assigned";

    return (
      departmentNames[
        department.toLowerCase()
      ] || department.toUpperCase()
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-8 w-56 rounded bg-slate-200" />

          <div className="mt-2 h-4 w-80 rounded bg-slate-200" />

          <div className="mt-8 h-52 rounded-2xl bg-white" />

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div className="h-32 rounded-2xl bg-white" />
            <div className="h-32 rounded-2xl bg-white" />
            <div className="h-32 rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm font-medium text-red-700">
            {error || "Student information not found."}
          </div>
        </div>
      </div>
    );
  }

  const name =
    student.name ||
    `${student.firstName || ""} ${
      student.lastName || ""
    }`.trim() ||
    "Student";

  const department =
    student.department ||
    student.publicMetadata?.department ||
    "";

  const semester =
    student.semester ||
    student.publicMetadata?.semester ||
    "";

  const registerNumber =
    student.registerNumber ||
    "";

  const email =
    student.email ||
    student.emailAddress ||
    student.emailAddresses?.[0]?.emailAddress ||
    "";

  const phone =
    student.phone ||
    "";

  const imageUrl =
    student.imageUrl ||
    student.image_url ||
    student.profileImageUrl ||
    "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 md:px-8">
          <h1 className="text-2xl font-bold text-slate-950">
            Student Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View your academic attendance and IA performance.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Student Profile Header */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-950 to-slate-800 px-6 py-8 md:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Photo */}
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="h-24 w-24 rounded-2xl border-4 border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white/20 bg-white/10 text-3xl font-bold text-white">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Student Details */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {name}
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  Register Number:{" "}
                  <span className="font-semibold text-white">
                    {registerNumber || "—"}
                  </span>
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  {getDepartmentName(department)}
                </p>
              </div>

              {/* Semester */}
              <div className="rounded-xl bg-white/10 px-5 py-4 backdrop-blur">
                <p className="text-xs font-medium text-slate-300">
                  Current Semester
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {semester
                    ? `Semester ${semester}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {email || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Phone
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {phone || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Department
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {getDepartmentName(department)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Register Number
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {registerNumber || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Academic Summary */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {/* Attendance */}
          <Link
            href="/student/attendance"
            className="group rounded-2xl border border-emerald-100 bg-emerald-50 p-6 transition hover:border-emerald-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  ✓
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-950">
                  My Attendance
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  View your subject-wise monthly attendance.
                </p>
              </div>

              <span className="text-xl text-slate-400 transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>

          {/* IA */}
          <Link
            href="/student/ia-marks"
            className="group rounded-2xl border border-violet-100 bg-violet-50 p-6 transition hover:border-violet-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  📝
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-950">
                  My IA Marks
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  View your internal assessment marks and totals.
                </p>
              </div>

              <span className="text-xl text-slate-400 transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>
        </div>

        {/* Important Notice */}
        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg">
              ℹ️
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                Academic Information
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Your attendance and IA marks are entered by
                authorized faculty members. This portal allows
                you to view your academic records only.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}