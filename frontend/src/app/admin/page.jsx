"use client";

import Link from "next/link";

const dashboardItems = [
  {
    title: "Faculty",
    description: "Manage faculty members and their academic details.",
    href: "/admin/faculty",
    value: "—",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Subjects",
    description: "Manage subjects, departments, semesters and credits.",
    href: "/admin/subjects",
    value: "—",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    ),
  },
  {
    title: "Students",
    description: "View and manage registered students and records.",
    href: "/admin/students",
    value: "—",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0" />
        <path d="M19 8v6" />
        <path d="M22 11h-6" />
      </svg>
    ),
  },
  {
    title: "Attendance",
    description: "Monitor monthly attendance across subjects.",
    href: "/admin/attendance",
    value: "—",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
        <path d="m8 15 2 2 5-5" />
      </svg>
    ),
  },
  {
    title: "IA Marks",
    description: "Manage internal assessment marks and records.",
    href: "/admin/ia-marks",
    value: "—",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V7" />
        <path d="M16 16v-8" />
        <path d="M20 16V4" />
      </svg>
    ),
  },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* Header */}
      <div className="mb-8">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Administration
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage faculty, subjects, students, attendance and internal
              assessment from one place.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-400">
              System
            </p>

            <div className="mt-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-sm font-semibold text-slate-700">
                Operational
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Overview */}
      <div className="mb-4">

        <h2 className="text-sm font-semibold text-slate-900">
          Academic Overview
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Quick access to major academic modules
        </p>

      </div>

      {/* Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

        {dashboardItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
          >

            {/* Top */}
            <div className="flex items-start justify-between">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white">
                {item.icon}
              </div>

              <span className="text-2xl font-bold text-slate-900">
                {item.value}
              </span>

            </div>

            {/* Content */}
            <div className="mt-6">

              <h3 className="text-base font-semibold text-slate-900">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.description}
              </p>

            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center text-sm font-semibold text-slate-600 transition group-hover:text-slate-950">

              <span>
                Open module
              </span>

              <span className="ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>

            </div>

          </Link>
        ))}

      </div>

      {/* Quick Information */}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Academic Management
          </p>

          <h2 className="mt-3 text-xl font-bold text-slate-900">
            Centralized academic records
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Manage academic information in a structured system covering
            faculty, subjects, students, attendance and internal assessment.
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            KPT IA
          </p>

          <h2 className="mt-3 text-xl font-bold">
            Attendance & IA Management
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            A unified platform for maintaining academic records and
            streamlining internal assessment workflows.
          </p>

        </div>

      </div>

    </div>
  );
}