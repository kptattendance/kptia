"use client";

import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RoleGuard({ allowedRoles, children }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/");
      return;
    }

    const checkRole = async () => {
      try {
        const token = await getToken();

        if (!token) {
          router.replace("/");
          return;
        }

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const user = response.data?.data;

        if (!user) {
          router.replace("/");
          return;
        }

        const role = String(user.role || "")
          .trim()
          .toLowerCase();

        const roles = allowedRoles.map((item) =>
          String(item).trim().toLowerCase()
        );

        if (!roles.includes(role)) {
          // User is logged in but does not have permission
          router.replace("/auth-check");
          return;
        }

        setChecking(false);
      } catch (error) {
        console.error("Role verification failed:", error);
        router.replace("/");
      }
    };

    checkRole();
  }, [
    isLoaded,
    isSignedIn,
    getToken,
    router,
    allowedRoles,
  ]);

  if (!isLoaded || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

          <p className="text-sm text-gray-600">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  return children;
}