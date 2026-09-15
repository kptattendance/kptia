"use client";

import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";

const departments = [
  { value: "", label: "Select department" },
  { value: "at", label: "Automobile Engineering" },
  { value: "ch", label: "Chemical Engineering" },
  { value: "ce", label: "Civil Engineering" },
  { value: "cs", label: "Computer Science Engineering" },
  { value: "ec", label: "Electronics & Communication" },
  { value: "ee", label: "Electrical & Electronics" },
  { value: "me", label: "Mechanical Engineering" },
  { value: "ps", label: "Polymer Engineering" },
  { value: "sc", label: "Science & English" },
];

const getDepartmentName = (code) => {
  const department = departments.find((item) => item.value === code);
  return department?.label || code || "Not assigned";
};

export default function HODPage() {
  const { getToken } = useAuth();

  const [hods, setHods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingHOD, setEditingHOD] = useState(null);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "hod",
    image: null,
  });

  const [imagePreview, setImagePreview] = useState(null);

  // ---------------------------------------
  // LOAD HODs
  // ---------------------------------------

  const loadHODs = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/getusers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const users = response.data || [];

      const hodUsers = users.filter(
        (user) => user.role?.toLowerCase() === "hod"
      );

      setHods(hodUsers);
    } catch (error) {
      console.error("Failed to load HODs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHODs();
  }, []);

  // ---------------------------------------
  // FILTER
  // ---------------------------------------

  const filteredHODs = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return hods.filter((user) => {
      const matchesSearch =
        !searchValue ||
        user.name?.toLowerCase().includes(searchValue) ||
        user.email?.toLowerCase().includes(searchValue) ||
        user.phone?.toLowerCase().includes(searchValue);

      const matchesDepartment =
        !departmentFilter ||
        user.department === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [hods, search, departmentFilter]);

  // ---------------------------------------
  // FORM
  // ---------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    setForm((previous) => ({
      ...previous,
      image: file || null,
    }));

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  // ---------------------------------------
  // ADD
  // ---------------------------------------

  const openAddModal = () => {
    setEditingHOD(null);

    setForm({
      name: "",
      email: "",
      phone: "",
      department: "",
      role: "hod",
      image: null,
    });

    setImagePreview(null);
    setShowModal(true);
  };

  // ---------------------------------------
  // EDIT
  // ---------------------------------------

  const openEditModal = (user) => {
    setEditingHOD(user);

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      department: user.department || "",
      role: "hod",
      image: null,
    });

    setImagePreview(user.imageUrl || null);
    setShowModal(true);
  };

  // ---------------------------------------
  // CLOSE
  // ---------------------------------------

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingHOD(null);
    setImagePreview(null);
  };

  // ---------------------------------------
  // SAVE
  // ---------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.department) {
      alert("Please select a department.");
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("department", form.department);

      // Important: HOD role
      formData.append("role", "hod");

      if (form.image) {
        formData.append("image", form.image);
      }

      if (editingHOD) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/updateuser/${editingHOD._id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/adduser`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      await loadHODs();
      closeModal();
    } catch (error) {
      console.error("HOD save error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to save HOD."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------
  // DELETE
  // ---------------------------------------

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name} as HOD?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = await getToken();

      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/deleteuser/${user._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await loadHODs();
    } catch (error) {
      console.error("HOD delete error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to delete HOD."
      );
    }
  };

  // ---------------------------------------
  // UI
  // ---------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* =====================================
          HEADER
      ====================================== */}

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Administration
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Heads of Department
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage Heads of Department and their academic information.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
        >
          <span className="text-lg leading-none">+</span>
          Add HOD
        </button>

      </div>

      {/* =====================================
          STAT + SEARCH
      ====================================== */}

      <div className="mb-6 grid gap-4 lg:grid-cols-[240px_1fr]">

        {/* Total HOD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Total HODs
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {hods.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path d="M12 2 3 6l9 4 9-4-9-4Z" />
                <path d="M5 10v5c0 2 3.1 4 7 4s7-2 7-4v-5" />
                <path d="M21 6v6" />
              </svg>

            </div>

          </div>

          <p className="mt-3 text-xs text-slate-400">
            Registered Heads of Department
          </p>

        </div>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 md:flex-row">

            <div className="relative flex-1">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

              <input
                type="text"
                placeholder="Search HOD by name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />

            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            >
              {departments.map((department) => (
                <option
                  key={department.value}
                  value={department.value}
                >
                  {department.value
                    ? department.label
                    : "All Departments"}
                </option>
              ))}
            </select>

          </div>

        </div>

      </div>

      {/* =====================================
          TABLE
      ====================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Table Heading */}
        <div className="border-b border-slate-100 px-6 py-5">

          <h2 className="text-sm font-semibold text-slate-900">
            Heads of Department
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            {filteredHODs.length} HOD
            {filteredHODs.length !== 1 ? "s" : ""} displayed
          </p>

        </div>

        {loading ? (

          <div className="flex min-h-64 items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

              <p className="mt-4 text-sm text-slate-500">
                Loading HODs...
              </p>

            </div>

          </div>

        ) : filteredHODs.length === 0 ? (

          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-7 w-7"
              >
                <path d="M12 2 3 6l9 4 9-4-9-4Z" />
                <path d="M5 10v5c0 2 3.1 4 7 4s7-2 7-4v-5" />
              </svg>

            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No HOD found
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              {search || departmentFilter
                ? "Try changing your search or filter."
                : "Add a Head of Department to get started."}
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px]">

              <thead>

                <tr className="border-b border-slate-100 bg-slate-50/70">

                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    HOD
                  </th>

                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Contact
                  </th>

                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Department
                  </th>

                  <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredHODs.map((user) => (

                  <tr
                    key={user._id}
                    className="group transition hover:bg-slate-50/70"
                  >

                    {/* HOD */}
                    <td className="px-6 py-4">

                      <div className="flex items-center gap-3">

                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100">

                          <img
                            src={
                              user.imageUrl ||
                              "/default-avatar.png"
                            }
                            alt={user.name || "HOD"}
                            className="h-full w-full object-cover"
                          />

                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-slate-900">
                            {user.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Head of Department
                          </p>

                        </div>

                      </div>

                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">

                      <p className="max-w-[260px] truncate text-sm text-slate-600">
                        {user.email}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {user.phone || "No phone number"}
                      </p>

                    </td>

                    {/* Department */}
                    <td className="px-6 py-4">

                      <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                        {getDepartmentName(user.department)}
                      </span>

                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">

                      <div className="flex justify-end gap-2">

                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(user)}
                          className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600"
                        >
                          Delete
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* =====================================
          ADD / EDIT MODAL
      ====================================== */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={closeModal}
          />

          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-8">

              <div>

                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  HOD Management
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                  {editingHOD
                    ? "Edit HOD"
                    : "Add HOD"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingHOD
                    ? "Update Head of Department information."
                    : "Create a new Head of Department account."}
                </p>

              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>

            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6 sm:p-8"
            >

              {/* Name */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter HOD name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />

              </div>

              {/* Email */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="hod@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={!!editingHOD}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />

                {editingHOD && (
                  <p className="mt-2 text-xs text-slate-400">
                    Email cannot be changed for an existing account.
                  </p>
                )}

              </div>

              {/* Phone + Department */}
              <div className="grid gap-5 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Phone
                  </label>

                  <input
                    type="text"
                    name="phone"
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={handleChange}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Department
                  </label>

                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  >
                    {departments.map((department) => (
                      <option
                        key={department.value}
                        value={department.value}
                      >
                        {department.label}
                      </option>
                    ))}
                  </select>

                </div>

              </div>

              {/* Image */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Profile Photo
                </label>

                <div className="flex items-center gap-4">

                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">

                    {imagePreview ? (

                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />

                    ) : (

                      <div className="flex h-full w-full items-center justify-center text-slate-400">

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          className="h-7 w-7"
                        >
                          <circle cx="12" cy="8" r="3" />
                          <path d="M5 21a7 7 0 0 1 14 0" />
                        </svg>

                      </div>

                    )}

                  </div>

                  <label className="flex h-12 flex-1 cursor-pointer items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm text-slate-500 transition hover:border-slate-400 hover:bg-slate-100">

                    <span className="truncate">
                      {form.image
                        ? form.image.name
                        : "Choose a profile image"}
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />

                  </label>

                </div>

                <p className="mt-2 text-xs text-slate-400">
                  JPG, PNG or other image formats.
                </p>

              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="min-w-32 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingHOD
                    ? "Save Changes"
                    : "Add HOD"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}