"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck,
  ClipboardList,
  FileText,
  ShieldCheck,
  Target,
} from "lucide-react";

const features = [
  {
    title: "Attendance",
    description: "Monthly attendance for every subject and batch.",
    icon: CalendarCheck,
  },
  {
    title: "IA Marks",
    description: "CO-wise internal assessment, frozen once saved.",
    icon: ClipboardList,
  },
  {
    title: "CO Attainment",
    description: "Attainment levels for NBA, ready to download.",
    icon: Target,
  },
  {
    title: "Study Material",
    description: "Notes approved by the HOD, read online.",
    icon: BookOpenCheck,
  },
  {
    title: "Progress Report",
    description: "One-page report for parents to sign.",
    icon: FileText,
  },
  {
    title: "Secure Access",
    description: "Each role sees only what it should.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden">

      {/* Background glow */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#7091e6]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-[#adbbda]/40 blur-3xl" />

      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:pt-24">

        <div className="max-w-3xl">

          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#7091e6]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3d52a0]">
              Karnataka (Govt.) Polytechnic, Mangaluru
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Attendance &amp; Internal Assessment,
            <span className="block bg-gradient-to-r from-[#3d52a0] via-[#7091e6] to-[#8697c4] bg-clip-text text-transparent">
              beautifully simple.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            One place for attendance, CO-wise IA marks, attainment, study material and student progress, built for KPT faculty, HODs, students and the administration.
          </p>

          {/* Action */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3d52a0] to-[#7091e6] px-7 py-4 text-sm font-bold text-white shadow-xl shadow-[#3d52a0]/30 transition hover:-translate-y-0.5 hover:shadow-2xl"
                >
                  Login to continue
                  <ArrowRight size={17} />
                </button>
              </SignInButton>
            </Show>

            <Show when="signed-in">
              <Link
                href="/auth/check"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3d52a0] to-[#7091e6] px-7 py-4 text-sm font-bold text-white shadow-xl shadow-[#3d52a0]/30 transition hover:-translate-y-0.5 hover:shadow-2xl"
              >
                Open my dashboard
                <ArrowRight size={17} />
              </Link>
            </Show>

            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <ShieldCheck size={17} className="text-[#7091e6]" />
              Secure college login
            </span>
          </div>

        </div>

        {/* Features */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-3xl border border-white bg-white/70 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7091e6] to-[#3d52a0] text-white shadow-lg shadow-[#3d52a0]/25 transition group-hover:scale-105">
                  <Icon size={22} />
                </div>

                <h2 className="mt-5 text-base font-bold text-slate-900">
                  {feature.title}
                </h2>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-14 text-center text-xs text-slate-400">
          <Link href="/privacy" className="hover:text-slate-600">
            Privacy Policy
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-slate-600">
            Terms of Service
          </Link>
        </p>

      </section>
    </main>
  );
}
