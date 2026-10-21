"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";

import AdminSidebar from "./components/AdminSidebar";

export default function AdminLayout({ children }) {
  const { getToken } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const token = await getToken();

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const user = response.data?.data;

        if (user?.role !== "admin") {
          router.replace("/access-denied");
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Admin verification failed:", error);
        router.replace("/");
      }
    };

    verifyAdmin();
  }, [getToken, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="mt-4 text-sm text-slate-500">
            Verifying administrator...
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* Sidebar */}
      <AdminSidebar />

      {/* Page Content */}
      <main className="min-h-screen pt-16 lg:pl-72 lg:pt-0">
        {children}
      </main>

    </div>
  );
}