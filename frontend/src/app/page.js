"use client";

import { Show } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50">

      {/* Signed Out */}
      <Show when="signed-out">

        <section className="relative overflow-hidden">

          {/* Background decoration */}
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-slate-200/60 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-slate-200/50 blur-3xl" />

          <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-6 py-20">

            <div className="max-w-4xl">

              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">

                <span className="h-2 w-2 rounded-full bg-slate-900" />

                <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                  KPT College
                </span>

              </div>

              {/* Heading */}
              <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Attendance & Internal Assessment
                <span className="block text-slate-500">
                  Management System
                </span>
              </h1>

              {/* Description */}
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
                A centralized academic platform for managing monthly
                attendance, internal assessment, students, subjects and
                academic records efficiently.
              </p>

              {/* Buttons */}
              <div className="mt-9 flex flex-wrap items-center gap-4">

                <Link
                  href="/admin"
                  className="rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Admin Dashboard
                </Link>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                    ✓
                  </span>
                  Secure academic management
                </div>

              </div>

              {/* Feature cards */}
              <div className="mt-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">

                <FeatureCard
                  title="Attendance"
                  description="Monthly attendance tracking"
                  icon="✓"
                />

                <FeatureCard
                  title="IA Marks"
                  description="Internal assessment records"
                  icon="▤"
                />

                <FeatureCard
                  title="Academic Data"
                  description="Students & subjects"
                  icon="⌘"
                />

              </div>

            </div>

          </div>

        </section>

      </Show>

      {/* Signed In */}
      <Show when="signed-in">

        <section className="mx-auto max-w-7xl px-6 py-16">

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">

            <div className="max-w-2xl">

              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white">
                K
              </div>

              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                KPT IA
              </p>

              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
                Welcome back
              </h1>

              <p className="mt-4 text-lg leading-8 text-slate-600">
                You are successfully signed in. Access your administration
                dashboard to manage academic records.
              </p>

              <Link
                href="/admin"
                className="mt-8 inline-flex items-center rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open Dashboard
                <span className="ml-2">→</span>
              </Link>

            </div>

          </div>

        </section>

      </Show>

    </main>
  );
}


/* ---------------------------------
   Feature Card
---------------------------------- */

function FeatureCard({ title, description, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-900">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}