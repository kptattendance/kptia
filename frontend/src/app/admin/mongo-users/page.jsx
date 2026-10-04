
"use client";

import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ============================================================
// DEPARTMENTS
// ============================================================

const departments = [
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

const roles = [
  { value: "admin", label: "Admin" },
  { value: "principal", label: "Principal" },
  { value: "hod", label: "HOD" },
  { value: "staff", label: "Staff" },
  { value: "student", label: "Student" },
];

const getDepartmentName = (value) => {
  return (
    departments.find(
      (department) => department.value === value
    )?.label ||
    value ||
    "-"
  );
};

const getRoleLabel = (value) => {
  return (
    roles.find((role) => role.value === value)?.label ||
    value ||
    "Not assigned"
  );
};

const formatDate = (date) => {
  if (!date) return "-";

  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

// ============================================================
// MAIN PAGE
// ============================================================

export default function UsersPage() {
  const { getToken } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] =
    useState("");

  const [selectedUsers, setSelectedUsers] = useState([]);

  const [sortOrder, setSortOrder] = useState("name");

  // ==========================================================
  // EDIT STATE
  // ==========================================================

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
  });

  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] =
    useState("");

  const imageInputRef = useRef(null);

  // ==========================================================
  // FETCH MONGODB USERS
  // ==========================================================

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/users/getusers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      /*
       * Backend currently returns:
       *
       * res.json(users)
       *
       * therefore response.data itself is the array.
       */

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setUsers(data);
    } catch (error) {
      console.error(
        "Failed to fetch MongoDB users:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to fetch users from MongoDB."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ==========================================================
  // FILTER + SORT
  // ==========================================================

  const filteredUsers = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    let result = users.filter((user) => {
      const matchesSearch =
        !search ||
        user.name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.phone?.toLowerCase().includes(search) ||
        user.clerkId?.toLowerCase().includes(search);

      const matchesRole =
        !roleFilter || user.role === roleFilter;

      const matchesDepartment =
        !departmentFilter ||
        user.department === departmentFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesDepartment
      );
    });

    result.sort((a, b) => {
      if (sortOrder === "name") {
        return (a.name || "")
          .toLowerCase()
          .localeCompare(
            (b.name || "").toLowerCase()
          );
      }

      if (sortOrder === "role") {
        return (a.role || "")
          .toLowerCase()
          .localeCompare(
            (b.role || "").toLowerCase()
          );
      }

      if (sortOrder === "department") {
        return (a.department || "")
          .toLowerCase()
          .localeCompare(
            (b.department || "").toLowerCase()
          );
      }

      if (sortOrder === "newest") {
        return (
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
        );
      }

      if (sortOrder === "oldest") {
        return (
          new Date(a.createdAt || 0) -
          new Date(b.createdAt || 0)
        );
      }

      return 0;
    });

    return result;
  }, [
    users,
    searchText,
    roleFilter,
    departmentFilter,
    sortOrder,
  ]);

  // ==========================================================
  // CLEAR FILTERS
  // ==========================================================

  const clearFilters = () => {
    setSearchText("");
    setRoleFilter("");
    setDepartmentFilter("");
  };

  // ==========================================================
  // SELECT USER
  // ==========================================================

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // ==========================================================
  // SELECT ALL FILTERED USERS
  // ==========================================================

  const toggleSelectAll = () => {
    const visibleIds = filteredUsers.map(
      (user) => user._id
    );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedUsers.includes(id)
      );

    if (allSelected) {
      setSelectedUsers((prev) =>
        prev.filter(
          (id) => !visibleIds.includes(id)
        )
      );
    } else {
      setSelectedUsers((prev) => [
        ...new Set([...prev, ...visibleIds]),
      ]);
    }
  };

  // ==========================================================
  // OPEN EDIT
  // ==========================================================

  const handleEdit = (user) => {
    setEditingUser(user);

    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "",
      department: user.department || "",
    });

    setEditImage(null);
    setEditImagePreview(user.imageUrl || "");

    setShowEditModal(true);
  };

  // ==========================================================
  // CLOSE EDIT
  // ==========================================================

  const closeEditModal = () => {
    if (saving) return;

    setShowEditModal(false);
    setEditingUser(null);
    setEditImage(null);
    setEditImagePreview("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // ==========================================================
  // EDIT INPUT
  // ==========================================================

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================================
  // IMAGE CHANGE
  // ==========================================================

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setEditImage(file);

    const previewUrl = URL.createObjectURL(file);

    setEditImagePreview(previewUrl);
  };

  // ==========================================================
  // UPDATE USER
  // ==========================================================

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    if (!editingUser?._id) {
      return;
    }

    if (!editForm.name.trim()) {
      alert("Name is required.");
      return;
    }

    if (!editForm.role) {
      alert("Role is required.");
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      const formData = new FormData();

      formData.append(
        "name",
        editForm.name.trim()
      );

      /*
       * Email is intentionally not sent for editing.
       * This prevents MongoDB email and Clerk email
       * from becoming different.
       */

      formData.append(
        "phone",
        editForm.phone.trim()
      );

      formData.append(
        "role",
        editForm.role
      );

      formData.append(
        "department",
        editForm.department
      );

      if (editImage) {
        formData.append("image", editImage);
      }

      const response = await axios.put(
        `${API_URL}/api/users/updateuser/${editingUser._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        const updatedUser =
          response.data.data;

        setUsers((prev) =>
          prev.map((user) =>
            user._id === editingUser._id
              ? updatedUser
              : user
          )
        );

        alert("User updated successfully.");

        closeEditModal();
      } else {
        throw new Error(
          response.data?.message ||
            "Failed to update user."
        );
      }
    } catch (error) {
      console.error(
        "Update user error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to update user."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DELETE SINGLE USER
  // ==========================================================

  const handleDelete = async (user) => {
    if (!user?._id) return;

    const confirmed = window.confirm(
      `Are you sure you want to completely delete ${user.name || "this user"}?\n\nThis will remove the user from MongoDB, Clerk and Cloudinary.`
    );

    if (!confirmed) return;

    try {
      const token = await getToken();

      /*
       * Use the existing deleteuser route.
       *
       * Backend accepts MongoDB _id.
       */

      await axios.delete(
        `${API_URL}/api/users/deleteuser/${user._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUsers((prev) =>
        prev.filter(
          (item) => item._id !== user._id
        )
      );

      setSelectedUsers((prev) =>
        prev.filter(
          (id) => id !== user._id
        )
      );

      alert(
        "User completely deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to delete user."
      );
    }
  };

  // ==========================================================
  // DELETE SELECTED USERS
  // ==========================================================

  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) {
      return;
    }

    const selectedObjects = users.filter(
      (user) =>
        selectedUsers.includes(user._id)
    );

    const confirmed = window.confirm(
      `Are you sure you want to completely delete ${selectedObjects.length} selected user(s)?\n\nEach user will be removed from MongoDB, Clerk and Cloudinary.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const token = await getToken();

      const results = await Promise.allSettled(
        selectedObjects.map((user) =>
          axios.delete(
            `${API_URL}/api/users/deleteuser/${user._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );

      const successfulIds = [];

      const failedUsers = [];

      results.forEach((result, index) => {
        const user = selectedObjects[index];

        if (
          result.status === "fulfilled"
        ) {
          successfulIds.push(user._id);
        } else {
          failedUsers.push(
            user.name || user._id
          );
        }
      });

      setUsers((prev) =>
        prev.filter(
          (user) =>
            !successfulIds.includes(
              user._id
            )
        )
      );

      setSelectedUsers([]);

      if (failedUsers.length === 0) {
        alert(
          `${successfulIds.length} user(s) completely deleted successfully.`
        );
      } else {
        alert(
          `${successfulIds.length} user(s) deleted successfully.\n\nFailed: ${failedUsers.join(
            ", "
          )}`
        );
      }
    } catch (error) {
      console.error(
        "Bulk delete error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to delete selected users."
      );

      await fetchUsers();
      setSelectedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // DOWNLOAD EXCEL
  // ==========================================================

  const handleDownloadExcel = () => {
    if (filteredUsers.length === 0) {
      alert(
        "No users available to download."
      );
      return;
    }

    const excelData = filteredUsers.map(
      (user, index) => ({
        "Sl. No.": index + 1,
        Name: user.name || "",
        Email: user.email || "",
        Phone: user.phone || "",
        Role: getRoleLabel(user.role),
        Department: getDepartmentName(
          user.department
        ),
        "Clerk ID": user.clerkId || "",
        "MongoDB ID": user._id || "",
        "Created On": formatDate(
          user.createdAt
        ),
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 30 },
      { wch: 35 },
      { wch: 15 },
      { wch: 18 },
      { wch: 35 },
      { wch: 35 },
      { wch: 28 },
      { wch: 18 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Users"
    );

    let fileName = "Users";

    if (roleFilter) {
      fileName += `_${roleFilter}`;
    }

    if (departmentFilter) {
      fileName += `_${getDepartmentName(
        departmentFilter
      )}`;
    }

    fileName = fileName.replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );

    XLSX.writeFile(
      workbook,
      `${fileName}.xlsx`
    );
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="text-sm font-semibold text-amber-600">
            User Management
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-800">
            Users
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage users registered in the MongoDB users collection.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="w-fit rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
        >
          ↻ Refresh
        </button>

      </div>

      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total Users
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {users.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Showing
          </p>

          <p className="mt-1 text-2xl font-bold text-amber-600">
            {filteredUsers.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Admin
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {
              users.filter(
                (user) =>
                  user.role === "admin"
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            HOD
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {
              users.filter(
                (user) =>
                  user.role === "hod"
              ).length
            }
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Selected
          </p>

          <p className="mt-1 text-2xl font-bold text-red-600">
            {selectedUsers.length}
          </p>
        </div>

      </div>

      {/* ======================================================
          FILTER CARD
      ====================================================== */}

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex flex-col gap-3 lg:flex-row">

            {/* SEARCH */}

            <div className="relative w-full lg:w-80">

              <input
                type="text"
                value={searchText}
                onChange={(e) =>
                  setSearchText(
                    e.target.value
                  )
                }
                placeholder="Search name, email, phone or Clerk ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:bg-white"
              />

              {searchText && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchText("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}

            </div>

            {/* ROLE */}

            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(
                  e.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:bg-white"
            >
              <option value="">
                All Roles
              </option>

              {roles.map((role) => (
                <option
                  key={role.value}
                  value={role.value}
                >
                  {role.label}
                </option>
              ))}
            </select>

            {/* DEPARTMENT */}

            <select
              value={departmentFilter}
              onChange={(e) =>
                setDepartmentFilter(
                  e.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:bg-white"
            >
              <option value="">
                All Departments
              </option>

              {departments.map(
                (department) => (
                  <option
                    key={department.value}
                    value={department.value}
                  >
                    {department.label}
                  </option>
                )
              )}
            </select>

            {/* SORT */}

            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(
                  e.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:bg-white"
            >
              <option value="name">
                Sort by Name
              </option>

              <option value="role">
                Sort by Role
              </option>

              <option value="department">
                Sort by Department
              </option>

              <option value="newest">
                Newest First
              </option>

              <option value="oldest">
                Oldest First
              </option>
            </select>

            {/* CLEAR */}

            {(searchText ||
              roleFilter ||
              departmentFilter) && (
              <button
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear Filters
              </button>
            )}

          </div>

          <div className="flex flex-wrap gap-2">

            {/* DOWNLOAD */}

            <button
              onClick={
                handleDownloadExcel
              }
              disabled={
                filteredUsers.length ===
                0
              }
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download Excel
            </button>

            {/* DELETE SELECTED */}

            <button
              onClick={
                handleDeleteSelected
              }
              disabled={
                selectedUsers.length ===
                  0 || loading
              }
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete Selected
              {selectedUsers.length >
                0 &&
                ` (${selectedUsers.length})`}
            </button>

          </div>

        </div>
      </div>

      {/* ======================================================
          TABLE INFO
      ====================================================== */}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

        <p className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-800">
            {filteredUsers.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-800">
            {users.length}
          </span>{" "}
          users
        </p>

        {selectedUsers.length >
          0 && (
          <p className="text-sm font-semibold text-red-600">
            {selectedUsers.length} user(s)
            selected
          </p>
        )}

      </div>

      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
          </div>
        ) : filteredUsers.length ===
          0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
              👤
            </div>

            <p className="mt-4 font-semibold text-slate-800">
              No users found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing the search or filters.
            </p>

          </div>
        ) : (
          <div
            className="overflow-x-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >

            <table className="min-w-[1250px] w-full">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">

                  {/* SELECT */}

                  <th className="sticky left-0 z-20 w-14 bg-slate-50 px-5 py-4">

                    <input
                      type="checkbox"
                      checked={
                        filteredUsers.length >
                          0 &&
                        filteredUsers.every(
                          (user) =>
                            selectedUsers.includes(
                              user._id
                            )
                        )
                      }
                      onChange={
                        toggleSelectAll
                      }
                      className="h-4 w-4 cursor-pointer accent-amber-500"
                    />

                  </th>

                  {/* SL */}

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sl. No.
                  </th>

                  {/* USER */}

                  <th className="sticky left-14 z-10 min-w-[300px] bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    User
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Phone
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredUsers.map(
                  (user, index) => {
                    const isSelected =
                      selectedUsers.includes(
                        user._id
                      );

                    return (
                      <tr
                        key={user._id}
                        className={`border-b border-slate-100 last:border-0 ${
                          isSelected
                            ? "bg-amber-50/50"
                            : "hover:bg-slate-50"
                        }`}
                      >

                        {/* CHECKBOX */}

                        <td
                          className={`sticky left-0 z-10 px-5 py-4 ${
                            isSelected
                              ? "bg-amber-50"
                              : "bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              isSelected
                            }
                            onChange={() =>
                              toggleUserSelection(
                                user._id
                              )
                            }
                            className="h-4 w-4 cursor-pointer accent-amber-500"
                          />
                        </td>

                        {/* SL */}

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {index + 1}
                        </td>

                        {/* USER */}

                        <td
                          className={`sticky left-14 z-10 px-5 py-4 ${
                            isSelected
                              ? "bg-amber-50"
                              : "bg-white"
                          }`}
                        >

                          <div className="flex items-center gap-3">

                            {user.imageUrl ? (
                              <img
                                src={
                                  user.imageUrl
                                }
                                alt={
                                  user.name ||
                                  "User"
                                }
                                className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                                {user.name
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                  "?"}
                              </div>
                            )}

                            <div className="min-w-0">

                              <p className="truncate font-semibold text-slate-800">
                                {user.name ||
                                  "Unnamed User"}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {user.clerkId ||
                                  "-"}
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* EMAIL */}

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {user.email ||
                            "-"}
                        </td>

                        {/* PHONE */}

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {user.phone ||
                            "-"}
                        </td>

                        {/* ROLE */}

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              user.role ===
                              "admin"
                                ? "bg-amber-100 text-amber-700"
                                : user.role ===
                                  "principal"
                                ? "bg-purple-100 text-purple-700"
                                : user.role ===
                                  "hod"
                                ? "bg-blue-100 text-blue-700"
                                : user.role ===
                                  "staff"
                                ? "bg-emerald-100 text-emerald-700"
                                : user.role ===
                                  "student"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {getRoleLabel(
                              user.role
                            )}
                          </span>

                        </td>

                        {/* DEPARTMENT */}

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {getDepartmentName(
                            user.department
                          )}
                        </td>

                        {/* CREATED */}

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            user.createdAt
                          )}
                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-4">

                          <div className="flex justify-end gap-2">

                            <button
                              onClick={() =>
                                handleEdit(
                                  user
                                )
                              }
                              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(
                                  user
                                )
                              }
                              className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ======================================================
          EDIT MODAL
      ====================================================== */}

      {showEditModal &&
        editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">

            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    User Management
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-800">
                    Edit User
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeEditModal
                  }
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                >
                  ✕
                </button>

              </div>

              {/* FORM */}

              <form
                onSubmit={
                  handleUpdateUser
                }
                className="p-6"
              >

                {/* IMAGE */}

                <div className="mb-6 flex flex-col items-center">

                  <div className="relative">

                    {editImagePreview ? (
                      <img
                        src={
                          editImagePreview
                        }
                        alt="User preview"
                        className="h-28 w-28 rounded-full object-cover ring-4 ring-amber-50"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-amber-100 text-3xl font-bold text-amber-700 ring-4 ring-amber-50">
                        {editForm.name
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          "?"}
                      </div>
                    )}

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      imageInputRef.current?.click()
                    }
                    className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                  >
                    Change Photo
                  </button>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={
                      handleImageChange
                    }
                    className="hidden"
                  />

                </div>

                {/* GRID */}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  {/* NAME */}

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Name
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={
                        editForm.name
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white"
                    />
                  </div>

                  {/* EMAIL */}

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Email
                    </label>

                    <input
                      type="email"
                      value={
                        editForm.email
                      }
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500"
                    />

                    <p className="mt-1 text-xs text-slate-400">
                      Email is linked to the Clerk account and is not edited here.
                    </p>
                  </div>

                  {/* PHONE */}

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Phone
                    </label>

                    <input
                      type="text"
                      name="phone"
                      value={
                        editForm.phone
                      }
                      onChange={
                        handleEditChange
                      }
                      maxLength={10}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white"
                    />
                  </div>

                  {/* ROLE */}

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Role
                    </label>

                    <select
                      name="role"
                      value={
                        editForm.role
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white"
                    >
                      <option value="">
                        Select Role
                      </option>

                      {roles.map(
                        (role) => (
                          <option
                            key={
                              role.value
                            }
                            value={
                              role.value
                            }
                          >
                            {role.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* DEPARTMENT */}

                  <div className="md:col-span-2">

                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Department
                    </label>

                    <select
                      name="department"
                      value={
                        editForm.department
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white"
                    >
                      <option value="">
                        Select Department
                      </option>

                      {departments.map(
                        (
                          department
                        ) => (
                          <option
                            key={
                              department.value
                            }
                            value={
                              department.value
                            }
                          >
                            {
                              department.label
                            }
                          </option>
                        )
                      )}
                    </select>

                  </div>

                </div>

                {/* IDs */}

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        MongoDB ID
                      </p>

                      <p className="mt-1 break-all text-xs text-slate-600">
                        {editingUser._id ||
                          "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Clerk ID
                      </p>

                      <p className="mt-1 break-all text-xs text-slate-600">
                        {editingUser.clerkId ||
                          "-"}
                      </p>
                    </div>

                  </div>

                </div>

                {/* BUTTONS */}

                <div className="mt-6 flex justify-end gap-3">

                  <button
                    type="button"
                    onClick={
                      closeEditModal
                    }
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

    </div>
  );
}