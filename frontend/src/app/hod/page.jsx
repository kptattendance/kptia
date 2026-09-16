"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import axios from "axios";
import {
  Users,
  GraduationCap,
  UserCog,
  ClipboardCheck,
  FileSpreadsheet,
  BookOpen,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  Pencil,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  UserRound,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL;

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

export default function HODDashboardPage() {
  const { getToken } = useAuth();

  const [profile, setProfile] =
    useState(null);

  const [studentCount, setStudentCount] =
    useState(0);

  const [facultyCount, setFacultyCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [editMode, setEditMode] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  useEffect(() => {
    loadDashboard();
  }, []);

 const loadDashboard = async () => {
  try {
    setLoading(true);
    setMessage("");

    const token = await getToken();

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    // =================================================
    // 1. GET CURRENT HOD
    // =================================================

    const profileResponse = await axios.get(
      `${API_URL}/api/users/me`,
      config
    );

    const profileData =
      profileResponse.data?.data ||
      profileResponse.data?.user;

    if (!profileData) {
      throw new Error(
        "HOD profile could not be loaded."
      );
    }

    setProfile(profileData);

    setForm({
      name: profileData.name || "",
      phone: profileData.phone || "",
    });

    // =================================================
    // HOD DEPARTMENT
    // =================================================

    const hodDepartment = String(
      profileData.department || ""
    )
      .trim()
      .toLowerCase();



    // =================================================
    // 2. GET ALL STUDENTS
    // =================================================

    try {
      const studentResponse = await axios.get(
        `${API_URL}/api/students/getstudents`,
        config
      );

      const students =
        Array.isArray(studentResponse.data)
          ? studentResponse.data
          : studentResponse.data?.data ||
            studentResponse.data?.students ||
            [];

      // -----------------------------------------------
      // Count students in HOD department
      // -----------------------------------------------

      const departmentStudents =
        students.filter((student) => {
          const studentDepartment =
            String(
              student.department || ""
            )
              .trim()
              .toLowerCase();

          return (
            studentDepartment ===
            hodDepartment
          );
        });

 

      setStudentCount(
        departmentStudents.length
      );
    } catch (error) {
      console.error(
        "Student count error:",
        error
      );

      setStudentCount(0);
    }

    // =================================================
    // 3. GET ALL USERS
    // =================================================

    try {
      const userResponse = await axios.get(
        `${API_URL}/api/users/getusers`,
        config
      );

      

      const users = Array.isArray(
        userResponse.data
      )
        ? userResponse.data
        : userResponse.data?.data ||
          userResponse.data?.users ||
          [];

     

      // =================================================
      // ONLY STAFF + SAME DEPARTMENT
      // =================================================

      const departmentFaculty =
        users.filter((user) => {
          const role = String(
            user.role || ""
          )
            .trim()
            .toLowerCase();

          const userDepartment =
            String(
              user.department || ""
            )
              .trim()
              .toLowerCase();

        
          return (
            role === "staff" &&
            userDepartment ===
              hodDepartment
          );
        });

    

      setFacultyCount(
        departmentFaculty.length
      );
    } catch (error) {
      console.error(
        "Faculty count error:",
        error
      );

      setFacultyCount(0);
    }
  } catch (error) {
    console.error(
      "Dashboard loading error:",
      error
    );

    setMessage(
      error.response?.data?.message ||
        error.message ||
        "Unable to load dashboard."
    );

    setMessageType("error");
  } finally {
    setLoading(false);
  }
};

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
      setRefreshing(true);

      await loadDashboard();

      setRefreshing(false);
    };

    // =====================================================
    // PROFILE DATA
    // =====================================================

    const department =
      profile?.department ||
      profile?.publicMetadata
        ?.department ||
      "";

    const departmentName =
      departmentNames[
      department.toLowerCase()
      ] ||
      department.toUpperCase() ||
      "Department not assigned";

    const email =
      profile?.email ||
      profile?.emailAddress ||
      profile?.emailAddresses?.[0]
        ?.emailAddress ||
      "";

    const name =
      profile?.name ||
      `${profile?.firstName || ""} ${profile?.lastName || ""
        }`.trim() ||
      "HOD";

    const imageUrl =
      profile?.imageUrl ||
      profile?.image_url ||
      profile?.profileImageUrl ||
      "";

    // =====================================================
    // HANDLE CHANGE
    // =====================================================

    const handleChange = (e) => {
      setForm({
        ...form,
        [e.target.name]:
          e.target.value,
      });
    };

    // =====================================================
    // SAVE PROFILE
    // =====================================================

    const handleSave = async (e) => {
      e.preventDefault();

      if (!form.name.trim()) {
        setMessage(
          "Name is required."
        );

        setMessageType("error");

        return;
      }

      try {
        setSaving(true);
        setMessage("");

        const token =
          await getToken();

        const response =
          await axios.put(
            `${API_URL}/api/users/update-profile`,
            {
              name:
                form.name.trim(),

              phone:
                form.phone.trim(),
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const updatedUser =
          response.data?.data ||
          response.data?.user;

        if (updatedUser) {
          setProfile(
            updatedUser
          );

          setForm({
            name:
              updatedUser.name ||
              "",

            phone:
              updatedUser.phone ||
              "",
          });
        } else {
          setProfile({
            ...profile,
            name:
              form.name.trim(),
            phone:
              form.phone.trim(),
          });
        }

        setMessage(
          response.data?.message ||
          "Profile updated successfully."
        );

        setMessageType("success");

        setEditMode(false);
      } catch (error) {
        console.error(
          "Profile update error:",
          error
        );

        setMessage(
          error.response?.data
            ?.message ||
          "Failed to update profile."
        );

        setMessageType("error");
      } finally {
        setSaving(false);
      }
    };

    // =====================================================
    // CANCEL EDIT
    // =====================================================

    const cancelEdit = () => {
      setForm({
        name:
          profile?.name || "",

        phone:
          profile?.phone || "",
      });

      setEditMode(false);

      setMessage("");
    };

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
      return (
        <div className="min-h-screen bg-[#f6f8fb] px-4 py-6 sm:px-6 lg:px-8">

          <div className="mx-auto max-w-7xl">

            <div className="animate-pulse">

              <div className="mb-6 h-8 w-64 rounded-lg bg-slate-200" />

              <div className="mb-8 h-4 w-96 max-w-full rounded bg-slate-200" />

              <div className="grid gap-5 md:grid-cols-2">

                <div className="h-32 rounded-2xl bg-white" />

                <div className="h-32 rounded-2xl bg-white" />

              </div>

              <div className="mt-6 h-80 rounded-3xl bg-white" />

            </div>

          </div>

        </div>
      );
    }

    // =====================================================
    // PAGE
    // =====================================================

    return (
      <div className="min-h-screen bg-[#f6f8fb]">

        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

          {/* =================================================
            TOP BAR
        ================================================= */}

          <div className="mb-7 flex items-center justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                HOD Portal
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Good morning,{" "}
                {name.split(" ")[0]}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Everything important for the department,
                in one place.
              </p>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>

              <div className="hidden sm:block">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox:
                        "h-10 w-10",
                    },
                  }}
                />
              </div>

            </div>

          </div>

          {/* =================================================
            MESSAGE
        ================================================= */}

          {message && (
            <div
              className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${messageType ===
                  "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
                }`}
            >
              {messageType ===
                "success" ? (
                <CheckCircle2
                  size={17}
                />
              ) : (
                <AlertCircle
                  size={17}
                />
              )}

              {message}
            </div>
          )}

          {/* =================================================
            PROFILE / WELCOME HERO
        ================================================= */}

          <section className="relative mb-6 overflow-hidden rounded-3xl bg-slate-950 shadow-xl">

            {/* Decorative shapes */}

            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative p-6 sm:p-8 lg:p-9">

              <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

                {/* PROFILE */}

                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">

                  {/* IMAGE */}

                  <div className="shrink-0">

                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={name}
                        className="h-24 w-24 rounded-3xl border-4 border-white/10 object-cover shadow-lg sm:h-28 sm:w-28"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white/10 bg-white/10 text-3xl font-bold text-white shadow-lg sm:h-28 sm:w-28">
                        {name
                          ?.charAt(
                            0
                          )
                          ?.toUpperCase() ||
                          "H"}
                      </div>
                    )}

                  </div>

                  {/* DETAILS */}

                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-2">

                      <h2 className="text-2xl font-bold text-white sm:text-3xl">
                        {name}
                      </h2>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>

                    </div>

                    <p className="mt-1 font-medium text-slate-300">
                      Head of Department
                    </p>

                    <div className="mt-4 flex flex-col gap-2 text-sm text-slate-300 sm:flex-row sm:flex-wrap sm:gap-x-5">

                      <span className="flex items-center gap-2">
                        <Building2
                          size={15}
                          className="text-blue-400"
                        />
                        {departmentName}
                      </span>

                      {email && (
                        <span className="flex items-center gap-2">
                          <Mail
                            size={15}
                            className="text-blue-400"
                          />
                          <span className="truncate">
                            {email}
                          </span>
                        </span>
                      )}

                      {profile?.phone && (
                        <span className="flex items-center gap-2">
                          <Phone
                            size={15}
                            className="text-blue-400"
                          />
                          {profile.phone}
                        </span>
                      )}

                    </div>

                  </div>

                </div>

                {/* EDIT */}

                {!editMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessage("");
                      setEditMode(
                        true
                      );
                    }}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 lg:self-center"
                  >
                    <Pencil
                      size={15}
                    />
                    Edit Profile
                  </button>
                )}

              </div>

            </div>

          </section>

          {/* =================================================
            EDIT PROFILE
        ================================================= */}

          {editMode && (
            <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">

                <div>

                  <h2 className="text-base font-bold text-slate-900">
                    Edit Personal Information
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Update the information that can be changed.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    cancelEdit
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>

              </div>

              <form
                onSubmit={
                  handleSave
                }
                className="p-5 sm:p-6"
              >

                <div className="grid gap-5 md:grid-cols-2">

                  {/* NAME */}

                  <div>

                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Full Name
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={
                        form.name
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      placeholder="Enter full name"
                    />

                  </div>

                  {/* PHONE */}

                  <div>

                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Phone Number
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={
                        form.phone
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      placeholder="Enter phone number"
                    />

                  </div>

                </div>

                <div className="mt-5 flex justify-end gap-3">

                  <button
                    type="button"
                    onClick={
                      cancelEdit
                    }
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <RefreshCw
                          size={15}
                          className="animate-spin"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save
                          size={15}
                        />
                        Save Changes
                      </>
                    )}
                  </button>

                </div>

              </form>

            </section>
          )}

          {/* =================================================
            DEPARTMENT OVERVIEW
        ================================================= */}

          <div className="mb-3 flex items-center justify-between">

            <div>

              <h2 className="text-base font-bold text-slate-900">
                Department Overview
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Current department strength
              </p>

            </div>

          </div>

          {/* =================================================
            COUNTS
        ================================================= */}

          <section className="mb-7 grid gap-5 sm:grid-cols-2">

            {/* STUDENTS */}

            <div className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6">

              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-50 transition group-hover:scale-125" />

              <div className="relative flex items-start justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Students
                  </p>

                  <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
                    {studentCount}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Students in the department
                  </p>

                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <GraduationCap
                    size={24}
                  />
                </div>

              </div>

            </div>

            {/* FACULTY */}

            <div className="group relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6">

              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-50 transition group-hover:scale-125" />

              <div className="relative flex items-start justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Faculty
                  </p>

                  <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
                    {facultyCount}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Faculty members
                  </p>

                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <UserCog
                    size={24}
                  />
                </div>

              </div>

            </div>

          </section>

          {/* =================================================
            QUICK ACCESS
        ================================================= */}

          <div className="mb-3">

            <h2 className="text-base font-bold text-slate-900">
              Quick Access
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Frequently used department functions
            </p>

          </div>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* ATTENDANCE */}

            <Link
              href="/hod/attendance"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >

              <div className="flex items-start justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <ClipboardCheck
                    size={21}
                  />
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500"
                />

              </div>

              <h3 className="mt-5 text-sm font-bold text-slate-900">
                Attendance
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                View monthly attendance for all subjects.
              </p>

            </Link>

            {/* IA MARKS */}

            <Link
              href="/hod/ia"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg"
            >

              <div className="flex items-start justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
                  <FileSpreadsheet
                    size={21}
                  />
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-500"
                />

              </div>

              <h3 className="mt-5 text-sm font-bold text-slate-900">
                IA Marks
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                View internal assessment marks.
              </p>

            </Link>

            {/* STUDENTS */}

            <Link
              href="/hod/students"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
            >

              <div className="flex items-start justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                  <Users
                    size={21}
                  />
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-500"
                />

              </div>

              <h3 className="mt-5 text-sm font-bold text-slate-900">
                Students
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                View students in the department.
              </p>

            </Link>

            {/* FACULTY */}

            <Link
              href="/hod/faculty"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg"
            >

              <div className="flex items-start justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-white">
                  <UserRound
                    size={21}
                  />
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-500"
                />

              </div>

              <h3 className="mt-5 text-sm font-bold text-slate-900">
                Faculty
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                View faculty members in the department.
              </p>

            </Link>

          </section>

          {/* =================================================
            ACCOUNT INFO - SMALL, NOT A SEPARATE PROFILE
        ================================================= */}

          <section className="mt-7 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <ShieldCheck
                    size={18}
                  />
                </div>

                <div>

                  <p className="text-xs font-bold text-slate-700">
                    Department Account
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {department
                      ? department.toUpperCase()
                      : "Department not assigned"}
                    {" · "}
                    HOD access
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                Account Active

              </div>

            </div>

          </section>

        </main>

      </div>
    );
  }