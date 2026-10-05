"use client";

import { ShieldX, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <ShieldX className="h-8 w-8 text-red-600" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">
          Access Denied
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          You are not allowed to access this page.
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Please consult the administrator if you believe you should
          have access.
        </p>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-7 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>

      </div>
    </div>
  );
}