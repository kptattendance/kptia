"use client";

import { useEffect, useState } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const departmentNames = {
  at: "Automobile Engineering",
  ch: "Chemical Engineering",
  ce: "Civil Engineering",
  cs: "Computer Science Engineering",
  ec: "Electronics & Communication",
  ee: "Electrical & Electronics",
  me: "Mechanical Engineering",
  ps: "Polymer Engineering",
  sc: "Science & English",
};

export default function HODProfilePage() {
  const { getToken } = useAuth();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data?.data || response.data?.user;

      if (!data) {
        throw new Error("Profile data not found.");
      }

      setProfile(data);

      setForm({
        name: data.name || "",
        phone: data.phone || "",
      });
    } catch (error) {
      console.error("Failed to load profile:", error);

      setMessage(
        error.response?.data?.message ||
          "Failed to load profile."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setMessage("Name is required.");
      setMessageType("error");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const token = await getToken();

      const response = await axios.put(
        `${API_URL}/api/users/update-profile`,
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser =
        response.data?.data || response.data?.user;

      if (updatedUser) {
        setProfile(updatedUser);

        setForm({
          name: updatedUser.name || "",
          phone: updatedUser.phone || "",
        });
      }

      setMessage(
        response.data?.message ||
          "Profile updated successfully."
      );
      setMessageType("success");
    } catch (error) {
      console.error("Failed to update profile:", error);

      setMessage(
        error.response?.data?.message ||
          "Failed to update profile."
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const getDepartmentName = (department) => {
    if (!department) return "Not assigned";

    return (
      departmentNames[department.toLowerCase()] ||
      department.toUpperCase()
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse">
            <div className="mb-2 h-8 w-48 rounded bg-slate-200" />
            <div className="mb-8 h-4 w-80 rounded bg-slate-200" />

            <div className="h-64 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
            Unable to load profile.
          </div>
        </div>
      </div>
    );
  }

  const department =
    profile.department ||
    profile.publicMetadata?.department ||
    "";

  const email =
    profile.email ||
    profile.emailAddress ||
    profile.emailAddresses?.[0]?.emailAddress ||
    "";

  const name =
    profile.name ||
    `${profile.firstName || ""} ${
      profile.lastName || ""
    }`.trim();

  const imageUrl =
    profile.imageUrl ||
    profile.image_url ||
    profile.profileImageUrl ||
    "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 md:px-8">
          <h1 className="text-2xl font-bold text-slate-950">
            Profile
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your personal information and account details.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8 md:px-8">
        {/* Profile Header Card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-950 to-slate-800 px-6 py-8 md:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Profile Image */}
              <div className="relative">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name || "Profile"}
                    className="h-24 w-24 rounded-2xl border-4 border-white/20 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white/20 bg-white/10 text-3xl font-bold text-white">
                    {name?.charAt(0)?.toUpperCase() || "H"}
                  </div>
                )}
              </div>

              {/* Basic Details */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">
                    {name || "HOD"}
                  </h2>

                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Active
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-300">
                  Head of Department
                </p>

                <p className="mt-2 text-sm font-medium text-slate-200">
                  {getDepartmentName(department)}
                </p>
              </div>

              {/* Clerk Account */}
              <div className="hidden sm:block">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-12 w-12",
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <form onSubmit={handleSave}>
            <div className="p-6 md:p-8">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-950">
                  Personal Information
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Update the information that can be changed from your
                  profile.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Name */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* Email */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>

                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-24 text-sm text-slate-500"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                      🔒 Locked
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-400">
                    Email is managed through your authentication account.
                  </p>
                </div>
              </div>
            </div>

            {/* Department Information */}
            <div className="border-t border-slate-100 bg-slate-50/60 p-6 md:p-8">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-950">
                  Department Information
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  These details are controlled by the administrator.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Department */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Department
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {getDepartmentName(department)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {department
                      ? department.toUpperCase()
                      : "Not assigned"}
                  </p>
                </div>

                {/* Designation */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Designation
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Head of Department
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Department Head
                  </p>
                </div>

                {/* Role */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    System Role
                  </p>

                  <p className="mt-2 text-sm font-semibold uppercase text-slate-900">
                    {profile.role || "hod"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Access level assigned by administrator
                  </p>
                </div>

                {/* Account Status */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Account Status
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                    <span className="text-sm font-semibold text-emerald-700">
                      Active
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    Account is currently active
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-4 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
              <div className="min-h-6">
                {message && (
                  <div
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      messageType === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {message}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* Account Security */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-950">
                Account Security
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your account authentication is securely managed by Clerk.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                🔐
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Secure Authentication
                </p>

                <p className="text-xs text-slate-500">
                  Clerk Authentication
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}