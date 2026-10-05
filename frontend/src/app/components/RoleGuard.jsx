"use client";

import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RoleGuard({
  allowedRoles = [],
  children,
}) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  const allowedRolesKey = allowedRoles
    .map((role) => String(role).trim().toLowerCase())
    .join(",");

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    const checkRole = async () => {
      try {
        console.log("========== ROLE GUARD ==========");
        console.log("Allowed roles:", allowedRolesKey);

        const token = await getToken();

        if (!token) {
          console.log("No authentication token.");
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

        console.log("RoleGuard user:", user);
        console.log("RoleGuard user role:", user?.role);

        if (!user) {
          console.log("No user returned from backend.");
          router.replace("/access-denied");
          return;
        }

        const userRole = String(user.role || "")
          .trim()
          .toLowerCase();

        const permittedRoles = allowedRolesKey
          .split(",")
          .filter(Boolean);

        console.log(
          "RoleGuard normalized role:",
          userRole
        );

        console.log(
          "RoleGuard permitted roles:",
          permittedRoles
        );

        const hasAccess =
          permittedRoles.includes(userRole);

        console.log(
          "RoleGuard has access:",
          hasAccess
        );

        if (!hasAccess) {
          console.log(
            "ROLE MISMATCH → ACCESS DENIED"
          );

          router.replace("/access-denied");
          return;
        }

        console.log(
          "ROLE MATCH → ACCESS GRANTED"
        );

        if (!cancelled) {
          setChecking(false);
        }
      } catch (error) {
        console.error(
          "RoleGuard verification failed:",
          error
        );

        console.error(
          "RoleGuard response:",
          error?.response?.data
        );

        console.error(
          "RoleGuard status:",
          error?.response?.status
        );

        if (!cancelled) {
          router.replace("/access-denied");
        }
      }
    };

    checkRole();

    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isSignedIn,
    getToken,
    router,
    allowedRolesKey,
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