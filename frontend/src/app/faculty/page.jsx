"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

export default function FacultyDashboard() {
  const { getToken } = useAuth();

  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
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

        setUser(response.data?.data);
      } catch (error) {
        console.error("Failed to load faculty:", error);
      }
    };

    loadUser();
  }, [getToken]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-medium text-gray-500">
          Faculty Portal
        </p>

        <h1 className="mt-1 text-3xl font-bold text-gray-900">
          Welcome{user?.name ? `, ${user.name}` : ""}
        </h1>

        <p className="mt-2 text-gray-500">
          Manage attendance and internal assessment marks.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-5 md:grid-cols-2">
        <a
          href="/faculty/attendance"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl text-white">
            ✓
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            Enter Attendance
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Mark and submit monthly attendance for your assigned subjects.
          </p>

          <div className="mt-5 text-sm font-semibold text-gray-900">
            Open Attendance →
          </div>
        </a>

        <a
          href="/faculty/ia-marks"
          className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl text-white">
            ▤
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            Enter IA Marks
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Enter and manage internal assessment marks for your subjects.
          </p>

          <div className="mt-5 text-sm font-semibold text-gray-900">
            Open IA Marks →
          </div>
        </a>
      </div>

      {/* Summary */}
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Assigned Subjects
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            —
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Attendance Entries
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            —
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            IA Entries
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            —
          </p>
        </div>
      </div>
    </div>
  );
}