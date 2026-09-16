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

  const [selectedHODs, setSelectedHODs] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "hod",
    image: null,
  });

  const [imagePreview, setImagePreview] = useState(null);

  // --------------------------------------------------
  // LOAD HODS
  // --------------------------------------------------

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
      setSelectedHODs([]);
    } catch (error) {
      console.error("Failed to load HODs:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to load HODs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHODs();
  }, []);

  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

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

  // --------------------------------------------------
  // SELECTION
  // --------------------------------------------------

  const isAllSelected =
    filteredHODs.length > 0 &&
    filteredHODs.every((user) =>
      selectedHODs.includes(user._id)
    );

  const toggleSelectHOD = (id) => {
    setSelectedHODs((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedHODs((previous) =>
        previous.filter(
          (id) =>
            !filteredHODs.some(
              (user) => user._id === id
            )
        )
      );
    } else {
      setSelectedHODs((previous) => {
        const ids = filteredHODs.map((user) => user._id);

        return [
          ...previous,
          ...ids.filter(
            (id) => !previous.includes(id)
          ),
        ];
      });
    }
  };

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

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

  // --------------------------------------------------
  // ADD
  // --------------------------------------------------

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

  // --------------------------------------------------
  // EDIT
  // --------------------------------------------------

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

  // --------------------------------------------------
  // CLOSE MODAL
  // --------------------------------------------------

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingHOD(null);
    setImagePreview(null);
  };

  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

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

  // --------------------------------------------------
  // DELETE SINGLE
  // --------------------------------------------------

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name} as HOD?`
    );

    if (!confirmed) return;

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

  // --------------------------------------------------
  // DELETE SELECTED
  // --------------------------------------------------

  const handleDeleteSelected = async () => {
    if (selectedHODs.length === 0) return;

    const selectedUsers = hods.filter((user) =>
      selectedHODs.includes(user._id)
    );

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedUsers.length} selected HOD${
        selectedUsers.length !== 1 ? "s" : ""
      }?`
    );

    if (!confirmed) return;

    try {
      setDeletingSelected(true);

      const token = await getToken();

      await Promise.all(
        selectedUsers.map((user) =>
          axios.delete(
            `${process.env.NEXT_PUBLIC_API_URL}/api/users/deleteuser/${user._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );

      await loadHODs();
    } catch (error) {
      console.error("Bulk HOD delete error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to delete selected HODs."
      );
    } finally {
      setDeletingSelected(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-7">

      {/* HEADER */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Heads of Department
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {hods.length} registered HOD
            {hods.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <span className="text-lg leading-none">+</span>
          Add HOD
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">

          {/* SEARCH */}
          <div className="relative min-w-0 flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              type="text"
              placeholder="Search name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
          </div>

          {/* DEPARTMENT */}
          <select
            value={departmentFilter}
            onChange={(e) =>
              setDepartmentFilter(e.target.value)
            }
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 sm:w-64"
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

          {/* DELETE SELECTED */}
          {selectedHODs.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deletingSelected}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>

              {deletingSelected
                ? "Deleting..."
                : `Delete ${selectedHODs.length}`}
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          </div>
        ) : filteredHODs.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-6 w-6"
              >
                <path d="M12 2 3 6l9 4 9-4-9-4Z" />
                <path d="M5 10v5c0 2 3.1 4 7 4s7-2 7-4v-5" />
              </svg>
            </div>

            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              No HOD found
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              {search || departmentFilter
                ? "Try changing your search or filter."
                : "Add a Head of Department to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">

                  {/* SELECT */}
                  <th className="w-12 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
                    />
                  </th>

                  {/* SL NO */}
                  <th className="w-14 px-2 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    #
                  </th>

                  {/* HOD */}
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    HOD
                  </th>

                  {/* CONTACT */}
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Contact
                  </th>

                  {/* DEPARTMENT */}
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Department
                  </th>

                  {/* ACTION */}
                  <th className="w-28 px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredHODs.map((user, index) => {
                  const selected = selectedHODs.includes(
                    user._id
                  );

                  return (
                    <tr
                      key={user._id}
                      className={`group transition ${
                        selected
                          ? "bg-slate-50"
                          : "hover:bg-slate-50/70"
                      }`}
                    >

                      {/* CHECKBOX */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            toggleSelectHOD(user._id)
                          }
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
                        />
                      </td>

                      {/* SL NO */}
                      <td className="px-2 py-3 text-sm font-medium text-slate-400">
                        {index + 1}
                      </td>

                      {/* HOD */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">

                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
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

                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              Head of Department
                            </p>
                          </div>

                        </div>
                      </td>

                      {/* CONTACT */}
                      <td className="px-3 py-3">
                        <div className="max-w-[230px]">
                          <p className="truncate text-sm text-slate-600">
                            {user.email}
                          </p>

                          {user.phone ? (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {user.phone}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs text-slate-300">
                              No phone
                            </p>
                          )}
                        </div>
                      </td>

                      {/* DEPARTMENT */}
                      <td className="px-3 py-3">
                        <span className="inline-flex max-w-[190px] truncate rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                          {getDepartmentName(
                            user.department
                          )}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1.5">

                          <button
                            onClick={() =>
                              openEditModal(user)
                            }
                            title="Edit"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="h-4 w-4"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(user)
                            }
                            title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="h-4 w-4"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v5" />
                              <path d="M14 11v5" />
                            </svg>
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SELECTED INFO */}
      {selectedHODs.length > 0 && (
        <div className="mt-3 flex items-center justify-between px-1">
          <p className="text-xs font-medium text-slate-500">
            {selectedHODs.length} HOD
            {selectedHODs.length !== 1 ? "s" : ""} selected
          </p>

          <button
            onClick={() => setSelectedHODs([])}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={closeModal}
          />

          <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingHOD
                    ? "Edit HOD"
                    : "Add HOD"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  {editingHOD
                    ? "Update account information."
                    : "Create a new HOD account."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
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
              className="space-y-4 p-5"
            >

              {/* NAME */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter HOD name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />

                {editingHOD && (
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Email cannot be changed.
                  </p>
                )}
              </div>

              {/* PHONE + DEPARTMENT */}
              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Phone
                  </label>

                  <input
                    type="text"
                    name="phone"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Department
                  </label>

                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
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

              {/* IMAGE */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Profile Photo
                </label>

                <div className="flex items-center gap-3">

                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
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
                          className="h-6 w-6"
                        >
                          <circle
                            cx="12"
                            cy="8"
                            r="3"
                          />
                          <path d="M5 21a7 7 0 0 1 14 0" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <label className="flex h-11 min-w-0 flex-1 cursor-pointer items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-500 transition hover:border-slate-400 hover:bg-slate-100">
                    <span className="truncate">
                      {form.image
                        ? form.image.name
                        : "Choose profile image"}
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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