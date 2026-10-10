"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  CheckCircle2,
  ClipboardCheck,
  FileText,
} from "lucide-react";

export default function FacultyDashboard() {
  const { getToken } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subjects allocated to this faculty by the HOD
  const [courses, setCourses] = useState([]);

  // The academic year starts in July.
  const today = new Date();

  const academicStartYear =
    today.getMonth() >= 6
      ? today.getFullYear()
      : today.getFullYear() - 1;

  const academicYear =
    `${academicStartYear}-${String(academicStartYear + 1).slice(-2)}`;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await getToken();

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUser(response.data?.data);
      } catch (error) {
        console.error("Failed to load faculty:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [getToken]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const token = await getToken();

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/allocations/my`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              academicYear,
            },
          }
        );

        setCourses(response.data?.data || []);
      } catch (error) {
        console.error("Failed to load allocated subjects:", error);
      }
    };

    loadCourses();
  }, [getToken, academicYear]);

  const facultyName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    "Faculty";

  const facultyEmail =
    user?.email ||
    "";

  const facultyPhone =
    user?.phone ||
    user?.mobile ||
    user?.phoneNumber ||
    "";

  const facultyDepartment =
    user?.department ||
    "";

  const facultyRole =
    user?.role ||
    "staff";

  const facultyPhoto =
    user?.imageUrl ||
    user?.photoUrl ||
    user?.profileImage ||
    user?.image ||
    "";

  const getInitials = (name) => {
    if (!name) return "F";

    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  const formatRole = (role) => {
    if (!role) return "Faculty";

    return String(role)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  };

  const formatDepartment = (department) => {
    if (!department) return "Not assigned";

    return String(department).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-5 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px]">

        {/* ------------------------------------------------ */}
        {/* HEADER */}
        {/* ------------------------------------------------ */}

        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b58a00]">
            Faculty Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Welcome
            {user?.name
              ? `, ${user.name}`
              : ""}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage attendance and internal assessment marks.
          </p>
        </div>

        {/* ------------------------------------------------ */}
        {/* FACULTY PROFILE */}
        {/* ------------------------------------------------ */}

        <section className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Profile top */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-[#fff9df] via-white to-white px-5 py-6 sm:px-7">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

              {/* PHOTO */}
              <div className="shrink-0">

                {loading ? (
                  <div className="h-24 w-24 animate-pulse rounded-2xl bg-slate-200" />
                ) : facultyPhoto ? (
                  <img
                    src={facultyPhoto}
                    alt={facultyName}
                    className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#d4a900] text-2xl font-bold text-white ring-4 ring-white shadow-md">
                    {getInitials(facultyName)}
                  </div>
                )}

              </div>

              {/* NAME */}
              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <h2 className="text-2xl font-bold text-slate-900">
                    {loading
                      ? "Loading..."
                      : facultyName}
                  </h2>

                  {!loading && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4c2] px-3 py-1 text-xs font-bold text-[#8a6800]">
                      <CheckCircle2 size={13} />
                      Faculty
                    </span>
                  )}

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {loading
                    ? "Loading faculty information..."
                    : formatRole(facultyRole)}
                </p>

              </div>

            </div>
          </div>

          {/* Faculty information */}
          <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">

            {/* EMAIL */}
            <div className="bg-white px-5 py-5 sm:px-6">

              <div className="mb-2 flex items-center gap-2 text-slate-400">
                <Mail size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Email
                </span>
              </div>

              <p className="break-all text-sm font-semibold text-slate-800">
                {loading
                  ? "Loading..."
                  : facultyEmail || "Not available"}
              </p>

            </div>

            {/* PHONE */}
            <div className="bg-white px-5 py-5 sm:px-6">

              <div className="mb-2 flex items-center gap-2 text-slate-400">
                <Phone size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Phone
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-800">
                {loading
                  ? "Loading..."
                  : facultyPhone || "Not available"}
              </p>

            </div>

            {/* DEPARTMENT */}
            <div className="bg-white px-5 py-5 sm:px-6">

              <div className="mb-2 flex items-center gap-2 text-slate-400">
                <Building2 size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Department
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-800">
                {loading
                  ? "Loading..."
                  : formatDepartment(
                      facultyDepartment
                    )}
              </p>

            </div>

            {/* ROLE */}
            <div className="bg-white px-5 py-5 sm:px-6">

              <div className="mb-2 flex items-center gap-2 text-slate-400">
                <Shield size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Role
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-800">
                {loading
                  ? "Loading..."
                  : formatRole(facultyRole)}
              </p>

            </div>

          </div>
        </section>

        {/* ------------------------------------------------ */}
        {/* QUICK ACTIONS */}
        {/* ------------------------------------------------ */}

        <div className="mb-7">

          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Actions
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Faculty Work Area
            </h2>
          </div>

          {/* MY SUBJECTS */}

          <div className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
              <h2 className="text-base font-semibold text-slate-900">
                My Subjects · {academicYear}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Subjects allocated to you by the HOD.
              </p>
            </div>

            {courses.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 sm:px-7">
                No subjects have been allocated to you yet. You can still enter attendance and IA marks for subjects that are not allocated to anyone.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {courses.map((course) => (
                  <div
                    key={course._id}
                    className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {course.subjectId?.name || "Subject"}
                      </p>

                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        {course.subjectId?.code}
                      </p>
                    </div>

                    <p className="text-xs font-semibold text-slate-600">
                      {String(course.department || "").toUpperCase()}
                      {" · "}
                      Semester {course.semester}
                      {" · "}
                      {course.batchNumbers?.length === 2
                        ? "Both Batches"
                        : `Batch ${course.batchNumbers?.[0]}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {/* ATTENDANCE */}
            <a
              href="/faculty/attendance"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#d4a900] hover:shadow-md"
            >

              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#d4a900] text-white shadow-sm">
                <ClipboardCheck size={22} />
              </div>

              <h2 className="text-lg font-semibold text-slate-900">
                Enter Attendance
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Mark and submit monthly attendance for assigned subjects.
              </p>

              <div className="mt-5 text-sm font-bold text-[#a07800]">
                Open Attendance →
              </div>

            </a>

            {/* IA MARKS */}
            <a
              href="/faculty/ia-marks"
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#d4a900] hover:shadow-md"
            >

              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#d4a900] text-white shadow-sm">
                <FileText size={22} />
              </div>

              <h2 className="text-lg font-semibold text-slate-900">
                Enter IA Marks
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter and manage internal assessment marks for assigned subjects.
              </p>

              <div className="mt-5 text-sm font-bold text-[#a07800]">
                Open IA Marks →
              </div>

            </a>

          </div>
        </div>

      

      </div>
    </div>
  );
}

function BookOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}