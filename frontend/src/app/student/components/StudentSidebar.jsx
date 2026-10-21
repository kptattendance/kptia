"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    href: "/student",
    icon: "⌂",
  },
  {
    name: "Academic",
    href: "/student/academic",
    icon: "✓",
  },

  {
    name: "Study Material",
    href: "/student/study-material",
    icon: "📖",
  },
  {
    name: "Progress Report",
    href: "/student/progress-report",
    icon: "📄",
  },
  
];

export default function StudentSidebar() {
  const pathname = usePathname();

  // Phones: the menu slides in from the left.
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  return (
    <>
    {/* MOBILE TOP BAR */}
    <div className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">
          K
        </div>

        <div>
          <p className="text-base font-bold text-slate-950">
            KPT IA
          </p>

          <p className="text-[10px] font-medium text-slate-500">
            Student Portal
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
    </div>

    {/* MOBILE OVERLAY */}
    {mobileOpen && (
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        onClick={closeMobileMenu}
      />
    )}

    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out ${
        mobileOpen
          ? "translate-x-0"
          : "-translate-x-full lg:translate-x-0"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white">
            K
          </div>

          <div>
            <h1 className="font-bold text-slate-950">
              KPT IA
            </h1>

            <p className="text-xs text-slate-500">
              Student Portal
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={closeMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          My Academics
        </p>

        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/student" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${
                    isActive
                      ? "bg-white/10"
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

      {/* User */}
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
              Student Account
            </p>

            <p className="truncate text-xs text-slate-500">
              Academic Portal
            </p>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}