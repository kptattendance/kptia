"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const menuItems = [
  {
    name: "Dashboard",
    href: "/hod",
    icon: "⌂",
  },
  {
    name: "Students",
    href: "/hod/students",
    icon: "👨‍🎓",
  },
  {
    name: "Faculty",
    href: "/hod/faculty",
    icon: "👨‍🏫",
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
  {
    name: "Subjects",
    href: "/hod/subjects",
    icon: "📚",
  },
  {
    name: "Profile",
    href: "/hod/profile",
    icon: "👤",
  },
];

export default function HODSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-slate-200 bg-white">

      {/* LOGO / HEADER */}

      <div className="border-b border-slate-100 px-6 py-6">
        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white">
            K
          </div>

          <div>
            <h1 className="font-bold text-slate-950">
              KPT IA
            </h1>

            <p className="text-xs text-slate-500">
              HOD Portal
            </p>
          </div>

        </div>
      </div>

      {/* NAVIGATION */}

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

      {/* USER */}

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
  );
}