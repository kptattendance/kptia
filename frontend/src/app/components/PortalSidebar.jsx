"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

// =====================================================
// PORTAL SIDEBAR
//
// The same navigation for every portal (Admin,
// Principal, HOD, Faculty, Student).
//
// Computers: a fixed panel on the left (w-72).
// Phones:    a top bar with a menu button; the panel
//            slides in over the page.
//
// The layout around it must leave room:
//   <main className="min-h-screen pt-16 lg:pl-72 lg:pt-0">
//
// items: [{ name, href, icon: LucideIcon }]
// =====================================================

export default function PortalSidebar({
  portal,
  homeHref,
  items,
}) {
  const pathname = usePathname();
  const { user } = useUser();

  const [open, setOpen] = useState(false);

  // Close with the Escape key
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);

    return () =>
      window.removeEventListener("keydown", handleKey);
  }, [open]);

  const isActive = (href) =>
    href === homeHref
      ? pathname === homeHref
      : pathname === href ||
        pathname.startsWith(`${href}/`);

  const userName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "";

  const brand = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#dda15e] to-[#bc6c25] text-base font-extrabold text-white shadow-lg shadow-[#bc6c25]/30 ring-1 ring-white/20">
        K
      </div>

      <div className="leading-tight">
        <p className="text-base font-extrabold tracking-tight">
          KPT IA
        </p>

        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
          {portal}
        </p>
      </div>
    </div>
  );

  return (
    <>

      {/* PHONE TOP BAR */}

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/60 bg-white/80 px-4 text-slate-900 shadow-sm backdrop-blur-xl lg:hidden">
        {brand}

        <div className="flex items-center gap-2">
          <UserButton />

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md transition active:scale-95"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* PHONE OVERLAY */}

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* PANEL */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden bg-gradient-to-b from-[#1a240e] via-[#283618] to-[#3d4a22] text-white shadow-2xl transition-transform duration-300 ease-out lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >

        {/* Soft light in the corner */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#dda15e]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#dda15e]/20 blur-3xl" />

        {/* BRAND */}

        <div className="relative flex h-20 shrink-0 items-center justify-between px-6">
          {brand}

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative mx-6 h-px bg-white/10" />

        {/* NAVIGATION */}

        <nav className="relative flex-1 space-y-1 overflow-y-auto px-4 py-5 scrollbar-hide">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-[#fefae0] text-[#283618] shadow-lg shadow-black/20"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                    active
                      ? "bg-gradient-to-br from-[#dda15e] to-[#bc6c25] text-white"
                      : "bg-white/10 text-white/80 group-hover:bg-white/15"
                  }`}
                >
                  <Icon size={17} strokeWidth={2} />
                </span>

                <span className="truncate">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* USER */}

        <div className="relative shrink-0 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10 backdrop-blur">
            <UserButton />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {userName || portal}
              </p>

              <p className="text-xs text-white/60">
                {portal}
              </p>
            </div>
          </div>
        </div>

      </aside>

    </>
  );
}
