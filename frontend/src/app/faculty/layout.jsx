"use client";

import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import FacultySidebar from "./components/FacultySidebar";

export default function FacultyLayout({ children }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.replace("/");
      return;
    }

    const verifyFaculty = async () => {
      try {
        console.log("FACULTY LAYOUT: checking access");

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

        console.log(
          "FACULTY LAYOUT USER:",
          user
        );

        console.log(
          "FACULTY LAYOUT ROLE:",
          user?.role
        );

        if (!user || user.role !== "staff") {
          console.log(
            "FACULTY LAYOUT: ACCESS DENIED"
          );

          router.replace("/access-denied");
          return;
        }

        console.log(
          "FACULTY LAYOUT: ACCESS GRANTED"
        );

        setChecking(false);
      } catch (error) {
        console.error(
          "Faculty verification failed:",
          error
        );

        router.replace("/access-denied");
      }
    };

    verifyFaculty();
  }, [
    isLoaded,
    isSignedIn,
    getToken,
    router,
  ]);

  if (!isLoaded || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" />

          <p className="mt-4 text-sm text-gray-600">
            Verifying faculty access...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <FacultySidebar />

      <main className="min-h-screen ml-0 lg:ml-72">
        {children}
      </main>
    </div>
  );
}