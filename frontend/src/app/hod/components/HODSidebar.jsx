"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    href: "/hod",
    icon: "⌂",
  },
  {
    name: "Subjects",
    href: "/hod/subjects",
    icon: "📚",
  },
  {
    name: "Faculty",
    href: "/hod/faculty",
    icon: "👨‍🏫",
  },
  {
    name: "Students",
    href: "/hod/students",
    icon: "👨‍🎓",
  },
  {
    name: "Attendance",
    href: "/hod/attendance",
    icon: "✓",
  },
  {
    name: "IA Marks",
    href: "/hod/ia-marks",
    icon: "📝",
  },
];

export default function HODSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* =====================================================
          MOBILE TOP BAR
      ====================================================== */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-sm font-bold text-amber-800">
            K
          </div>

          <div>
            <h1 className="text-base font-bold text-slate-900">
              KPT IA
            </h1>

            <p className="text-[10px] font-medium text-slate-500">
              HOD Portal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-amber-50 hover:text-amber-700"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* =====================================================
          MOBILE BACKDROP
      ====================================================== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* =====================================================
          SIDEBAR
      ====================================================== */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* =====================================================
            LOGO / HEADER
        ====================================================== */}
        <div className="border-b border-slate-100 px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-lg font-bold text-amber-800">
                K
              </div>

              <div>
                <h1 className="font-bold text-slate-900">
                  KPT IA
                </h1>

                <p className="text-xs text-slate-500">
                  HOD Portal
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={closeMobileMenu}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 lg:hidden"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* =====================================================
            NAVIGATION
        ====================================================== */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Department
          </p>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/hod" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-amber-100 text-amber-800"
                      : "text-slate-600 hover:bg-amber-50 hover:text-amber-800"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${
                      isActive
                        ? "bg-amber-200 text-amber-800"
                        : "bg-slate-100"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* =====================================================
            USER
        ====================================================== */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10",
                },
              }}
            />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                HOD Account
              </p>

              <p className="truncate text-xs text-slate-500">
                Department Head
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}