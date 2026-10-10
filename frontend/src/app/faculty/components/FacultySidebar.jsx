"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    href: "/faculty",
    icon: "▦",
  },
  {
    name: "Attendance",
    href: "/faculty/attendance",
    icon: "✓",
  },
  {
    name: "IA Marks",
    href: "/faculty/ia-marks",
    icon: "▤",
  },
  {
    name: "Course Outcomes",
    href: "/faculty/course-outcomes",
    icon: "◎",
  },
];

export default function FacultySidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* =========================
          MOBILE TOP BAR
      ========================== */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            KPT IA
          </h1>

          <p className="text-[10px] font-medium text-slate-500">
            Faculty Portal
          </p>
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

      {/* =========================
          MOBILE OVERLAY
      ========================== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* =========================
          SIDEBAR
      ========================== */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* =========================
            LOGO
        ========================== */}
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              KPT IA
            </h1>

            <p className="text-xs font-medium text-slate-500">
              Faculty Portal
            </p>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={closeMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* =========================
            NAVIGATION
        ========================== */}
        <nav className="space-y-1 p-4">
          {menuItems.map((item) => {
            const active =
              item.href === "/faculty"
                ? pathname === "/faculty"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-amber-100 text-amber-800"
                    : "text-slate-600 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${
                    active
                      ? "bg-amber-200 text-amber-800"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.icon}
                </span>

                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* =========================
            BOTTOM USER
        ========================== */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <UserButton />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                Faculty
              </p>

              <p className="text-xs text-slate-500">
                Account
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}