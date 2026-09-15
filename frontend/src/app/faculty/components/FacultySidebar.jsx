"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

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
    name: "Profile",
    href: "/faculty/profile",
    icon: "○",
  },
];

export default function FacultySidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-72 border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-gray-200 px-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            KPT IA
          </h1>
          <p className="text-xs text-gray-500">
            Faculty Portal
          </p>
        </div>
      </div>

      {/* Navigation */}
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
              className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg text-base">
                {item.icon}
              </span>

              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom User */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <UserButton />

          <div>
            <p className="text-sm font-semibold text-gray-800">
              Faculty
            </p>
            <p className="text-xs text-gray-500">
              Account
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}