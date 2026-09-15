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

export default function HODFacultyPage() {
  const { getToken } = useAuth();

  const [faculty, setFaculty] = useState([]);
  const [hodDepartment, setHodDepartment] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);

  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "staff",
    image: null,
  });

  const [imagePreview, setImagePreview] = useState(null);

  // ---------------------------------------
  // LOAD HOD + FACULTY
  // ---------------------------------------

  const loadFaculty = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      // Get logged-in HOD details
      const meResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const me = meResponse.data?.data || meResponse.data;

      const department = me?.department?.toLowerCase() || "";

      setHodDepartment(department);

      // Load users
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/getusers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const users = response.data?.data || response.data || [];

      // Only staff
      const facultyUsers = users.filter(
        (user) => user.role?.toLowerCase() === "staff"
      );

      // HOD should see only own department
      const departmentFaculty = facultyUsers.filter(
        (user) =>
          user.department?.toLowerCase() === department
      );

      setFaculty(departmentFaculty);
    } catch (error) {
      console.error("Failed to load faculty:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaculty();
  }, []);

  // ---------------------------------------
  // FILTER
  // ---------------------------------------

  const filteredFaculty = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return faculty.filter((user) => {
      return (
        !searchValue ||
        user.name?.toLowerCase().includes(searchValue) ||
        user.email?.toLowerCase().includes(searchValue) ||
        user.phone?.toLowerCase().includes(searchValue)
      );
    });
  }, [faculty, search]);

  // ---------------------------------------
  // FORM HANDLING
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
  // OPEN ADD MODAL
  // ---------------------------------------

  const openAddModal = () => {
    setEditingFaculty(null);

    setForm({
      name: "",
      email: "",
      phone: "",
      department: hodDepartment,
      role: "staff",
      image: null,
    });

    setImagePreview(null);
    setShowModal(true);
  };

  // ---------------------------------------
  // OPEN EDIT MODAL
  // ---------------------------------------

  const openEditModal = (user) => {
    setEditingFaculty(user);

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      department: hodDepartment,
      role: "staff",
      image: null,
    });

    setImagePreview(user.imageUrl || null);
    setShowModal(true);
  };

  // ---------------------------------------
  // CLOSE MODAL
  // ---------------------------------------

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingFaculty(null);
    setImagePreview(null);
  };

  // ---------------------------------------
  // SAVE FACULTY
  // ---------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const token = await getToken();

      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);

      // Always use HOD's department
      formData.append("department", hodDepartment);

      formData.append("role", "staff");

      if (form.image) {
        formData.append("image", form.image);
      }

      if (editingFaculty) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/updateuser/${editingFaculty._id}`,
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

      await loadFaculty();
      closeModal();
    } catch (error) {
      console.error("Faculty save error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to save faculty."
      );
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------
  // DELETE FACULTY
  // ---------------------------------------

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`
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

      await loadFaculty();
    } catch (error) {
      console.error("Faculty delete error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to delete faculty."
      );
    }
  };

  // ---------------------------------------
  // RENDER
  // ---------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Department Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Faculty
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage faculty members in your department.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
        >
          <span className="text-lg leading-none">+</span>
          Add Faculty
        </button>
      </div>

      {/* STATS + SEARCH */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[240px_1fr]">

        {/* TOTAL FACULTY */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Total Faculty
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {faculty.length}
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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>

          </div>

          <p className="mt-3 text-xs text-slate-400">
            Faculty in your department
          </p>

        </div>

        {/* SEARCH */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="relative">

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
              placeholder="Search faculty by name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />

          </div>

        </div>

      </div>

      {/* FACULTY TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-1 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Faculty Members
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {filteredFaculty.length} faculty member
              {filteredFaculty.length !== 1 ? "s" : ""} displayed
            </p>
          </div>

          {hodDepartment && (
            <span className="inline-flex w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              {getDepartmentName(hodDepartment)}
            </span>
          )}

        </div>

        {loading ? (

          <div className="flex min-h-64 items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

              <p className="mt-4 text-sm text-slate-500">
                Loading faculty...
              </p>

            </div>

          </div>

        ) : filteredFaculty.length === 0 ? (

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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>

            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No faculty found
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              {search
                ? "Try changing your search."
                : "Add your first faculty member to get started."}
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px]">

              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">

                  <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Faculty
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

                {filteredFaculty.map((user) => (

                  <tr
                    key={user._id}
                    className="group transition hover:bg-slate-50/70"
                  >

                    {/* FACULTY */}
                    <td className="px-6 py-4">

                      <div className="flex items-center gap-3">

                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100">

                          <img
                            src={
                              user.imageUrl ||
                              "/default-avatar.png"
                            }
                            alt={user.name || "Faculty"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display =
                                "none";
                            }}
                          />

                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-slate-900">
                            {user.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            Faculty · Staff
                          </p>

                        </div>

                      </div>

                    </td>

                    {/* CONTACT */}
                    <td className="px-6 py-4">

                      <p className="max-w-[260px] truncate text-sm text-slate-600">
                        {user.email}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {user.phone || "No phone number"}
                      </p>

                    </td>

                    {/* DEPARTMENT */}
                    <td className="px-6 py-4">

                      <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                        {getDepartmentName(user.department)}
                      </span>

                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4">

                      <div className="flex justify-end gap-2">

                        <button
                          onClick={() =>
                            openEditModal(user)
                          }
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(user)
                          }
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

      {/* MODAL */}
      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={closeModal}
          />

          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">

            {/* MODAL HEADER */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-8">

              <div>

                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Department Faculty
                </p>

                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                  {editingFaculty
                    ? "Edit Faculty"
                    : "Add Faculty"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingFaculty
                    ? "Update faculty account information."
                    : "Create a new faculty account."}
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

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6 sm:p-8"
            >

              {/* NAME */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter faculty name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />

              </div>

              {/* EMAIL */}
              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="faculty@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={!!editingFaculty}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />

                {editingFaculty && (
                  <p className="mt-2 text-xs text-slate-400">
                    Email cannot be changed for an existing account.
                  </p>
                )}

              </div>

              {/* PHONE + DEPARTMENT */}
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

                  <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-600">
                    {getDepartmentName(hodDepartment)}
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Faculty will be added to your department.
                  </p>

                </div>

              </div>

              {/* IMAGE */}
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

              {/* BUTTONS */}
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
                  disabled={saving || !hodDepartment}
                  className="min-w-32 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingFaculty
                    ? "Save Changes"
                    : "Add Faculty"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}