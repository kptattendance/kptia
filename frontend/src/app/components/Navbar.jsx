"use client";

import {
  Show,
  SignInButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import { fetchCurrentUser } from "../utils/currentUser";

// The portals have their own navigation (PortalSidebar),
// so this bar is shown only on the public pages.
const PORTALS = [
  "/admin",
  "/principal",
  "/hod",
  "/faculty",
  "/student",
];

export default function Navbar() {
  const { getToken } = useAuth();
  const pathname = usePathname();

  const [dashboard, setDashboard] = useState("/auth/check");

  const inPortal = PORTALS.some(
    (portal) =>
      pathname === portal ||
      pathname.startsWith(`${portal}/`)
  );

  useEffect(() => {
    if (inPortal) {
      return;
    }

    const getDashboard = async () => {
      try {
        const token = await getToken();

        if (!token) return;

        const response = await fetchCurrentUser(token);

        const role = response.data?.data?.role;

        const dashboards = {
          admin: "/admin",
          principal: "/principal",
          hod: "/hod",
          staff: "/faculty",
          student: "/student",
        };

        setDashboard(dashboards[role] || "/auth/check");
      } catch (error) {
        console.error("Failed to determine dashboard:", error);
        setDashboard("/auth/check");
      }
    };

    getDashboard();
  }, [getToken, inPortal]);

  if (inPortal) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#dda15e] to-[#bc6c25] text-base font-extrabold text-white shadow-lg shadow-[#bc6c25]/30">
            K
          </div>

          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-tight text-slate-900">
              KPT IA
            </div>

            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Academic Portal
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">

          <Show when="signed-in">
            <Link
              href={dashboard}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Dashboard
              <ArrowRight size={15} />
            </Link>

            <div className="ml-2">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
              />
            </div>
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#bc6c25] to-[#dda15e] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#bc6c25]/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Login
                <ArrowRight size={15} />
              </button>
            </SignInButton>
          </Show>

        </div>
      </div>
    </nav>
  );
}
