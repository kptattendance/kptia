"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

const getDepartmentName = (value) => {
  return (
    departments.find(
      (department) =>
        department.value === value?.trim().toLowerCase()
    )?.label || value || "—"
  );
};

export default function StudentTable({
  onAddStudent,
  onBulkUpload,
}) {
  const { getToken } = useAuth();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const [openMenu, setOpenMenu] = useState(null);

  // Edit
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState(null);

  // Multiple Delete
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  // Photo
  const photoInputRef = useRef(null);
  const [photoStudent, setPhotoStudent] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Message
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  // ==========================================
  // FETCH STUDENTS
  // ==========================================

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/students/getstudents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data;

      setStudents(
        Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.students)
          ? result.students
          : result?.students?.data || []
      );
    } catch (err) {
      console.error("Fetch students error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load students."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // ==========================================
  // BATCHES
  // ==========================================

  const batches = useMemo(() => {
    return [
      ...new Set(
        students
          .map((student) => student.batch)
          .filter(
            (batch) =>
              batch !== undefined &&
              batch !== null &&
              String(batch).trim() !== ""
          )
      ),
    ].sort();
  }, [students]);

  // ==========================================
  // FILTER
  // ==========================================

  const filteredStudents = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !searchText ||
        student.name
          ?.toLowerCase()
          .includes(searchText) ||
        student.registerNumber
          ?.toLowerCase()
          .includes(searchText) ||
        student.email
          ?.toLowerCase()
          .includes(searchText);

      const matchesDepartment =
        !departmentFilter ||
        student.department
          ?.trim()
          .toLowerCase() ===
          departmentFilter.toLowerCase();

      const matchesBatch =
        !batchFilter ||
        String(student.batch) ===
          String(batchFilter);

      const matchesSemester =
        !semesterFilter ||
        String(student.semester) ===
          String(semesterFilter);

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesBatch &&
        matchesSemester
      );
    });
  }, [
    students,
    search,
    departmentFilter,
    batchFilter,
    semesterFilter,
  ]);

  const clearFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    setBatchFilter("");
    setSemesterFilter("");
  };

  const hasFilters =
    search ||
    departmentFilter ||
    batchFilter ||
    semesterFilter;

  // ==========================================
  // MULTIPLE SELECTION
  // ==========================================

  const isAllSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) =>
      selectedStudents.includes(
        student._id || student.id
      )
    );

  const toggleSelectStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredStudents.map(
      (student) => student._id || student.id
    );

    if (isAllSelected) {
      setSelectedStudents((prev) =>
        prev.filter(
          (id) => !filteredIds.includes(id)
        )
      );
    } else {
      setSelectedStudents((prev) => [
        ...prev,
        ...filteredIds.filter(
          (id) => !prev.includes(id)
        ),
      ]);
    }
  };

  const clearSelection = () => {
    setSelectedStudents([]);
  };

  // ==========================================
  // EDIT STUDENT
  // ==========================================

  const handleEdit = async (student) => {
    setOpenMenu(null);

    try {
      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/students/getstudent/${student._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        response.data?.data || student;

      setEditingStudent(student);

      setEditForm({
        registerNumber:
          data.registerNumber || "",
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        department:
          data.department || "",
        admissionYear:
          data.admissionYear || "",
        semester: data.semester || "",
        batch: data.batch || "",
        batchNumber: data.batchNumber || "",
      });

      setActionMessage("");
      setActionError("");
    } catch (err) {
      console.error(
        "Fetch student for edit error:",
        err
      );

      setActionError(
        err.response?.data?.message ||
          "Failed to load student details."
      );
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();

    try {
      setSavingEdit(true);
      setActionError("");
      setActionMessage("");

      const token = await getToken();

      const formData = new FormData();

      formData.append(
        "registerNumber",
        editForm.registerNumber
          .trim()
          .toUpperCase()
      );

      formData.append(
        "name",
        editForm.name
          .trim()
          .toUpperCase()
      );

      formData.append(
        "email",
        editForm.email
          .trim()
          .toLowerCase()
      );

      formData.append(
        "phone",
        editForm.phone.trim()
      );

      formData.append(
        "department",
        editForm.department.toLowerCase()
      );

      formData.append(
        "admissionYear",
        editForm.admissionYear
      );

      formData.append(
        "semester",
        editForm.semester
      );

      formData.append(
        "batch",
        editForm.batch.trim()
      );

      formData.append(
        "batchNumber",
        editForm.batchNumber
      );

      await axios.put(
        `${API_URL}/api/students/updatestudent/${editingStudent._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEditingStudent(null);

      setActionMessage(
        "Student updated successfully."
      );

      await fetchStudents();
    } catch (err) {
      console.error(
        "Update student error:",
        err
      );

      setActionError(
        err.response?.data?.message ||
          "Failed to update student."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // ==========================================
  // DELETE SINGLE STUDENT
  // ==========================================

  const handleDelete = async (student) => {
    setOpenMenu(null);

    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name}?\n\nThis will permanently delete:\n• Student record\n• Clerk account\n• Cloudinary photo`
    );

    if (!confirmed) return;

    try {
      setDeletingId(student._id);
      setActionError("");
      setActionMessage("");

      const token = await getToken();

      await axios.delete(
        `${API_URL}/api/students/deletestudent/${student._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStudents((prev) =>
        prev.filter(
          (item) =>
            item._id !== student._id
        )
      );

      setSelectedStudents((prev) =>
        prev.filter(
          (id) => id !== student._id
        )
      );

      setActionMessage(
        `${student.name} deleted successfully.`
      );
    } catch (err) {
      console.error(
        "Delete student error:",
        err
      );

      setActionError(
        err.response?.data?.message ||
          "Failed to delete student."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ==========================================
  // MULTIPLE DELETE STUDENTS
  // ==========================================

  const handleDeleteSelected = async () => {
    if (selectedStudents.length === 0) {
      return;
    }

    const selected = students.filter(
      (student) =>
        selectedStudents.includes(
          student._id || student.id
        )
    );

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selected.length} selected student${
        selected.length !== 1
          ? "s"
          : ""
      }?\n\nThis will permanently delete:\n• Student record\n• Clerk account\n• Cloudinary photo`
    );

    if (!confirmed) return;

    try {
      setDeletingSelected(true);
      setActionError("");
      setActionMessage("");

      const token = await getToken();

      await Promise.all(
        selected.map((student) =>
          axios.delete(
            `${API_URL}/api/students/deletestudent/${
              student._id || student.id
            }`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );

      const deletedIds =
        new Set(selectedStudents);

      setStudents((prev) =>
        prev.filter(
          (student) =>
            !deletedIds.has(
              student._id || student.id
            )
        )
      );

      setSelectedStudents([]);

      setActionMessage(
        `${selected.length} student${
          selected.length !== 1
            ? "s"
            : ""
        } deleted successfully.`
      );
    } catch (err) {
      console.error(
        "Multiple student delete error:",
        err
      );

      setActionError(
        err.response?.data?.message ||
          "Failed to delete selected students."
      );
    } finally {
      setDeletingSelected(false);
    }
  };

  // ==========================================
  // UPDATE PHOTO
  // ==========================================

  const handlePhotoClick = (student) => {
    setOpenMenu(null);
    setPhotoStudent(student);

    setTimeout(() => {
      photoInputRef.current?.click();
    }, 100);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file || !photoStudent) return;

    if (!file.type.startsWith("image/")) {
      setActionError(
        "Please select a valid image."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setActionError(
        "Image size must be less than 5 MB."
      );
      return;
    }

    try {
      setUploadingPhoto(true);
      setActionError("");
      setActionMessage("");

      const token = await getToken();

      const formData = new FormData();

      formData.append("image", file);

      await axios.put(
        `${API_URL}/api/students/updatestudent/${photoStudent._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setActionMessage(
        "Student photo updated successfully."
      );

      await fetchStudents();
    } catch (err) {
      console.error(
        "Photo upload error:",
        err
      );

      setActionError(
        err.response?.data?.message ||
          "Failed to update student photo."
      );
    } finally {
      setUploadingPhoto(false);
      setPhotoStudent(null);

      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          <p className="mt-4 text-sm text-slate-500">
            Loading students...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
        <p className="font-semibold text-red-600">
          Unable to load students
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {error}
        </p>

        <button
          onClick={fetchStudents}
          className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="space-y-4">

      {/* HIDDEN PHOTO INPUT */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {/* ACTION MESSAGE */}
      {actionMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {actionError}
        </div>
      )}

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

        <div className="flex flex-col gap-3 lg:flex-row">

          {/* SEARCH */}
          <div className="relative min-w-0 flex-1">

            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search student, register no. or email..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
          </div>

          {/* DEPARTMENT */}
          <select
            value={departmentFilter}
            onChange={(e) =>
              setDepartmentFilter(
                e.target.value
              )
            }
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 lg:w-64"
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

          {/* BATCH */}
          <select
            value={batchFilter}
            onChange={(e) =>
              setBatchFilter(e.target.value)
            }
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 lg:w-44"
          >
            <option value="">
              All Batches
            </option>

            {batches.map((batch) => (
              <option
                key={batch}
                value={batch}
              >
                {batch}
              </option>
            ))}
          </select>

          {/* SEMESTER */}
          <select
            value={semesterFilter}
            onChange={(e) =>
              setSemesterFilter(e.target.value)
            }
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 lg:w-40"
          >
            <option value="">
              All Semesters
            </option>

            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>

          {/* DELETE SELECTED */}
          {selectedStudents.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deletingSelected}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                : `Delete ${selectedStudents.length}`}
            </button>
          )}
        </div>

        {hasFilters && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">

            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredStudents.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {students.length}
              </span>{" "}
              students
            </p>

            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Students
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              {filteredStudents.length} student
              {filteredStudents.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            {/* SELECTION COUNT */}
            {selectedStudents.length > 0 && (
              <button
                onClick={clearSelection}
                className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                {selectedStudents.length} selected
                <span className="ml-1 text-slate-400">
                  ×
                </span>
              </button>
            )}

            {/* BULK UPLOAD */}
            <button
              onClick={onBulkUpload}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M5 20h14" />
              </svg>

              Bulk Upload
            </button>

            {/* ADD */}
            <button
              onClick={onAddStudent}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <span className="text-lg leading-none">
                +
              </span>

              Add Student
            </button>

          </div>
        </div>

        {/* EMPTY */}
        {filteredStudents.length === 0 ? (
          <div className="flex min-h-[350px] items-center justify-center">

            <div className="text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">

                <svg
                  className="h-7 w-7 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1v6m3-3h-6"
                  />
                </svg>

              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No students found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Add a student or change your filters.
              </p>

            </div>
          </div>
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1200px]">

              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">

                  {/* SELECT ALL */}
                  <th className="w-12 px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      title="Select all"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
                    />
                  </th>

                  {/* SERIAL */}
                  <th className="w-12 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    #
                  </th>

                  {/* STUDENT */}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Student
                  </th>

                  {/* REGISTER */}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Register No.
                  </th>

                  {/* DEPARTMENT */}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Department
                  </th>

                  {/* ADMISSION */}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Admission Year
                  </th>

                  {/* SEMESTER */}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Semester
                  </th>

                  {/* BATCH */}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Batch
                  </th>

                  {/* PHONE */}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Phone
                  </th>

                  {/* ACTION */}
                  <th className="w-24 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredStudents.map(
                  (student, index) => {

                    const studentId =
                      student._id ||
                      student.id;

                    const isSelected =
                      selectedStudents.includes(
                        studentId
                      );

                    return (
                      <tr
                        key={studentId}
                        className={`transition ${
                          isSelected
                            ? "bg-slate-50"
                            : "hover:bg-slate-50"
                        }`}
                      >

                        {/* CHECKBOX */}
                        <td className="px-2 py-3 text-center">

                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleSelectStudent(
                                studentId
                              )
                            }
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
                          />

                        </td>

                        {/* SERIAL */}
                        <td className="px-2 py-3 text-center text-sm font-medium text-slate-400">
                          {index + 1}
                        </td>

                        {/* STUDENT */}
                        <td className="px-4 py-3">

                          <div className="flex items-center gap-3">

                            {student.imageUrl ? (
                              <img
                                src={
                                  student.imageUrl
                                }
                                alt={
                                  student.name
                                }
                                className="h-9 w-9 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                                {student.name
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                  "S"}
                              </div>
                            )}

                            <div className="min-w-0">

                              <p className="max-w-[190px] truncate text-sm font-semibold text-slate-900">
                                {student.name ||
                                  "—"}
                              </p>

                              <p className="max-w-[210px] truncate text-xs text-slate-400">
                                {student.email ||
                                  "—"}
                              </p>

                            </div>

                          </div>
                        </td>

                        {/* REGISTER */}
                        <td className="px-4 py-3">

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-medium text-slate-700">
                            {student.registerNumber ||
                              "—"}
                          </span>

                        </td>

                        {/* DEPARTMENT */}
                        <td className="px-4 py-3">

                          <span className="max-w-[180px] truncate text-sm text-slate-600">
                            {getDepartmentName(
                              student.department
                            )}
                          </span>

                        </td>

                        {/* ADMISSION YEAR */}
                        <td className="px-4 py-3">

                          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600">
                            {student.admissionYear ||
                              "—"}
                          </span>

                        </td>

                        {/* SEMESTER */}
                        <td className="px-4 py-3">

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                            {student.semester
                              ? `Sem ${student.semester}`
                              : "—"}
                          </span>

                        </td>

                        {/* BATCH */}
                        <td className="px-4 py-3">

                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                            {student.batch ||
                              "—"}
                          </span>

                        </td>

                        {/* PHONE */}
                        <td className="px-4 py-3">

                          <span className="text-sm text-slate-600">
                            {student.phone ||
                              "—"}
                          </span>

                        </td>

                        {/* ACTIONS */}
                        <td className="relative px-4 py-3 text-right">

                          <button
                            disabled={
                              deletingId ===
                                studentId ||
                              uploadingPhoto ||
                              deletingSelected
                            }
                            onClick={() =>
                              setOpenMenu(
                                openMenu ===
                                  studentId
                                  ? null
                                  : studentId
                              )
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                          >

                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeWidth="2"
                                d="M12 6h.01M12 12h.01M12 18h.01"
                              />
                            </svg>

                          </button>

                          {openMenu ===
                            studentId && (
                            <div className="absolute right-4 top-12 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">

                              {/* EDIT */}
                              <button
                                onClick={() =>
                                  handleEdit(
                                    student
                                  )
                                }
                                className="w-full px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                Edit Student
                              </button>

                              {/* PHOTO */}
                              <button
                                onClick={() =>
                                  handlePhotoClick(
                                    student
                                  )
                                }
                                className="w-full px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                Update Photo
                              </button>

                              {/* DELETE */}
                              <button
                                onClick={() =>
                                  handleDelete(
                                    student
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  studentId
                                }
                                className="w-full px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId ===
                                studentId
                                  ? "Deleting..."
                                  : "Delete Student"}
                              </button>

                            </div>
                          )}

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

      {/* SELECTION FOOTER */}
      {selectedStudents.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">

          <p className="text-xs font-medium text-slate-500">
            <span className="font-bold text-slate-800">
              {selectedStudents.length}
            </span>{" "}
            student
            {selectedStudents.length !== 1
              ? "s"
              : ""}{" "}
            selected
          </p>

          <div className="flex items-center gap-3">

            <button
              onClick={clearSelection}
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
            >
              Clear
            </button>

            <button
              onClick={handleDeleteSelected}
              disabled={deletingSelected}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deletingSelected ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Deleting...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>

                  Delete Selected
                </>
              )}
            </button>

          </div>
        </div>
      )}

      {/* ==========================================
          EDIT MODAL
      ========================================== */}

      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={() =>
              !savingEdit &&
              setEditingStudent(null)
            }
          />

          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Edit Student
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Update student details.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !savingEdit &&
                  setEditingStudent(null)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                ✕
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={
                handleUpdateStudent
              }
              className="space-y-4 p-5"
            >

              <div className="grid gap-4 sm:grid-cols-2">

                {/* REGISTER */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Register Number
                  </label>

                  <input
                    name="registerNumber"
                    value={
                      editForm.registerNumber
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {/* NAME */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Name
                  </label>

                  <input
                    name="name"
                    value={
                      editForm.name
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      editForm.email
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {/* PHONE */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Phone
                  </label>

                  <input
                    name="phone"
                    value={
                      editForm.phone
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {/* DEPARTMENT */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
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
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="">
                      Select Department
                    </option>

                    {departments.map(
                      (department) => (
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

                {/* ADMISSION YEAR */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Admission Year
                  </label>

                  <input
                    type="number"
                    name="admissionYear"
                    value={
                      editForm.admissionYear
                    }
                    onChange={
                      handleEditChange
                    }
                    min="2000"
                    max="2100"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {/* SEMESTER */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Current Semester
                  </label>

                  <select
                    name="semester"
                    value={
                      editForm.semester
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="">
                      Select Semester
                    </option>

                    {[
                      1, 2, 3, 4, 5, 6, 7, 8,
                    ].map(
                      (semester) => (
                        <option
                          key={semester}
                          value={semester}
                        >
                          Semester{" "}
                          {semester}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* BATCH */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Batch
                  </label>

                  <input
                    name="batch"
                    value={
                      editForm.batch
                    }
                    onChange={
                      handleEditChange
                    }
                    placeholder="2023-2026"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </div>

                {/* BATCH NUMBER */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Batch Number
                  </label>

                  <select
                    name="batchNumber"
                    value={
                      editForm.batchNumber
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="">
                      Select Batch
                    </option>
                    <option value="1">
                      Batch 1
                    </option>
                    <option value="2">
                      Batch 2
                    </option>
                  </select>
                </div>

              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">

                <button
                  type="button"
                  onClick={() =>
                    setEditingStudent(null)
                  }
                  disabled={savingEdit}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEdit
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