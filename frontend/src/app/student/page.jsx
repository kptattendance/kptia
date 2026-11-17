"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck,
  FileText,
  Library,
} from "lucide-react";
import { photoUrl } from "../utils/photoUrl";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const departmentNames = {
  at: "Automobile Engineering",
  ch: "Chemical Engineering",
  ce: "Civil Engineering",
  cs: "Computer Science and Engineering",
  ec: "Electronics and Communication Engineering",
  ee: "Electrical and Electronics Engineering",
  me: "Mechanical Engineering",
  ps: "Polymer Engineering",
  sc: "Science & English",
};

const getDepartmentName = (department) =>
  department
    ? departmentNames[String(department).toLowerCase()] ||
      String(department).toUpperCase()
    : "Not assigned";

// Every student page, from the dashboard
const LINKS = [
  {
    href: "/student/academic?tab=attendance",
    title: "My Attendance",
    text: "Subject-wise attendance month by month, with your semester percentage.",
    icon: CalendarCheck,
    tone: "border-emerald-200 bg-emerald-50 hover:border-emerald-300",
    iconTone: "bg-emerald-100 text-emerald-700",
  },
  {
    href: "/student/academic?tab=ia",
    title: "My IA Marks",
    text: "IA 1 to 4, CIE 5, improvement test and your Final CIE of every subject.",
    icon: BookOpenCheck,
    tone: "border-violet-200 bg-violet-50 hover:border-violet-300",
    iconTone: "bg-violet-100 text-violet-700",
  },
  {
    href: "/student/study-material",
    title: "Study Material",
    text: "Notes and material shared by your faculty, subject-wise.",
    icon: Library,
    tone: "border-sky-200 bg-sky-50 hover:border-sky-300",
    iconTone: "bg-sky-100 text-sky-700",
  },
  {
    href: "/student/progress-report",
    title: "Progress Report",
    text: "Attendance and IA on one page. Download the PDF, get it signed and submit it.",
    icon: FileText,
    tone: "border-amber-200 bg-amber-50 hover:border-amber-300",
    iconTone: "bg-amber-100 text-amber-700",
  },
];

export default function StudentDashboard() {
  const { getToken } = useAuth();

  const [student, setStudent] = useState(null);
  const [academic, setAcademic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The student's own record: register number, semester
  // and academic year are there (not on the login).
  const loadStudent = useCallback(async () => {
    try {
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/students/me/academic`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStudent(response.data?.data?.student || null);
      setAcademic(response.data?.data?.academic || null);
    } catch (err) {
      console.error("Failed to load student:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load student information."
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudent();
  }, [loadStudent]);

  if (loading) {
    return (
      <div className="min-h-screen p-3 sm:p-4 lg:p-5">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-48 rounded-2xl bg-white" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="h-36 rounded-2xl bg-white" />
            <div className="h-36 rounded-2xl bg-white" />
            <div className="h-36 rounded-2xl bg-white" />
            <div className="h-36 rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  const name = student?.name || "Student";
  const imageUrl = student?.imageUrl || "";

  const details = [
    ["Register Number", student?.registerNumber],
    ["Email", student?.email],
    ["Phone", student?.phone],
    ["Department", getDepartmentName(student?.department)],
  ];

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* ================= PROFILE ================= */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-950 to-slate-800 px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {imageUrl ? (
                <img
                  src={photoUrl(imageUrl, 240)}
                  alt={name}
                  className="h-24 w-24 rounded-2xl border-4 border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white/20 bg-white/10 text-3xl font-bold text-white">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold text-white">
                  {name}
                </h1>

                <p className="mt-1 font-mono text-sm text-slate-300">
                  {student?.registerNumber || "—"}
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {getDepartmentName(student?.department)}
                  {student?.batchNumber ? ` · Batch ${student.batchNumber}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex">
                <div className="rounded-xl bg-white/10 px-5 py-3 backdrop-blur">
                  <p className="text-xs font-medium text-slate-300">Semester</p>
                  <p className="mt-0.5 text-2xl font-bold text-white">
                    {academic?.semester || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 px-5 py-3 backdrop-blur">
                  <p className="text-xs font-medium text-slate-300">Academic Year</p>
                  <p className="mt-0.5 text-2xl font-bold text-white">
                    {academic?.academicYear || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
            {details.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= PAGES ================= */}
        <div className="grid gap-4 sm:grid-cols-2">
          {LINKS.map(({ href, title, text, icon: Icon, tone, iconTone }) => (
            <Link
              key={href}
              href={href}
              className={`group flex items-start gap-4 rounded-2xl border p-5 transition hover:shadow-sm sm:p-6 ${tone}`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
                <Icon size={22} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-slate-950">
                  {title}
                </span>
                <span className="mt-1 block text-sm text-slate-600">
                  {text}
                </span>
              </span>

              <ArrowRight
                size={20}
                className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700"
              />
            </Link>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
          Your attendance and IA marks are entered by your faculty. This portal shows your academic records; contact your mentor or HOD if anything looks wrong.
        </section>
      </div>
    </div>
  );
}
