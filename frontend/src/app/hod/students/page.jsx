"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import * as XLSX from "xlsx";

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

const genders = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const getDepartmentName = (value) => {
  return (
    departments.find(
      (department) =>
        department.value === value?.trim().toLowerCase()
    )?.label || value || "—"
  );
};

export default function HODStudentsPage() {
  const { getToken } = useAuth();

  const [students, setStudents] = useState([]);
  const [hodDepartment, setHodDepartment] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");

  const [openMenu, setOpenMenu] = useState(null);

  // Add student
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Edit
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState(null);

  // Photo
  const photoInputRef = useRef(null);
  const [photoStudent, setPhotoStudent] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Messages
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  // ==========================================
  // FETCH HOD + STUDENTS
  // ==========================================

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      // Get logged-in HOD
      const meResponse = await axios.get(
        `${API_URL}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const me =
        meResponse.data?.data || meResponse.data;

      const department =
        me?.department?.trim().toLowerCase() || "";

      setHodDepartment(department);

      // Backend should already restrict HOD to own department.
      const response = await axios.get(
        `${API_URL}/api/students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data;

const data = Array.isArray(result?.students)
  ? result.students
  : Array.isArray(result?.data)
  ? result.data
  : result?.data?.students || [];

const departmentStudents = data.filter(
  (student) =>
    student.department?.trim().toLowerCase() ===
    department.trim().toLowerCase()
);

setStudents(departmentStudents);
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
  // FILTER + ALPHABETICAL SORT
  // ==========================================

  const filteredStudents = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return students
      .filter((student) => {
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

        const matchesSemester =
          !semesterFilter ||
          String(student.semester) ===
            String(semesterFilter);

        const matchesBatch =
          !batchFilter ||
          String(student.batch) ===
            String(batchFilter);

        return (
          matchesSearch &&
          matchesSemester &&
          matchesBatch
        );
      })
   .sort((a, b) => {
  const rollA = Number(a.rollNumber);
  const rollB = Number(b.rollNumber);

  if (!Number.isNaN(rollA) && !Number.isNaN(rollB)) {
    return rollA - rollB;
  }

  return String(a.rollNumber || "").localeCompare(
    String(b.rollNumber || ""),
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    }
  );
});
  }, [
    students,
    search,
    semesterFilter,
    batchFilter,
  ]);

  const clearFilters = () => {
    setSearch("");
    setSemesterFilter("");
    setBatchFilter("");
  };

  const hasFilters =
    search ||
    semesterFilter ||
    batchFilter;

  // ==========================================
  // DOWNLOAD FILTERED STUDENTS TO EXCEL
  // ==========================================

  const handleDownloadExcel = () => {
    if (filteredStudents.length === 0) {
      alert("No students available to download.");
      return;
    }

    const excelData = filteredStudents.map((student, index) => ({
      "Sl. No.": index + 1,
      "Student Name": student.name || "",
      "Register Number": student.registerNumber || "",
      "Gender": student.gender || "",
      "Admission Year": student.admissionYear || "",
      "Semester": student.semester
        ? `Semester ${student.semester}`
        : "",
      "Batch": student.batch || "",
      "Batch No.": student.batchNumber || "",
      "Email": student.email || "",
      "Phone": student.phone || "",
      "Department": getDepartmentName(student.department),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 30 },
      { wch: 20 },
      { wch: 12 },
      { wch: 16 },
      { wch: 15 },
      { wch: 16 },
      { wch: 12 },
      { wch: 35 },
      { wch: 16 },
      { wch: 35 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Students"
    );

    const departmentName = getDepartmentName(hodDepartment)
      .replace(/[^a-zA-Z0-9]/g, "_");

    XLSX.writeFile(
      workbook,
      `${departmentName}_Students.xlsx`
    );
  };

  // ==========================================
  // EDIT STUDENT
  // ==========================================

  const handleEdit = async (student) => {
    setOpenMenu(null);

    try {
      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/students/${student._id}`,
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
        registerNumber: data.registerNumber || "",
        name: data.name || "",
        gender: data.gender || "",
       
        phone: data.phone || "",
        department: data.department || hodDepartment,
        admissionYear: data.admissionYear || "",
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

  // ==========================================
  // UPDATE STUDENT
  // ==========================================

  const handleUpdateStudent = async (e) => {
    e.preventDefault();

    try {
      setSavingEdit(true);
      setActionError("");
      setActionMessage("");

      if (!editForm.gender) {
        setActionError("Please select gender.");
        setSavingEdit(false);
        return;
      }

      const validGenders = [
        "male",
        "female",
        "other",
      ];

      if (!validGenders.includes(editForm.gender)) {
        setActionError(
          "Invalid gender. Please select Male, Female or Other."
        );
        setSavingEdit(false);
        return;
      }

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
        editForm.name.trim().toUpperCase()
      );

      formData.append(
        "gender",
        editForm.gender.trim().toLowerCase()
      );

     

      formData.append(
        "phone",
        editForm.phone.trim()
      );

      // HOD's department only
      formData.append(
        "department",
        hodDepartment
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
        `${API_URL}/api/students/${editingStudent._id}`,
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
  // DELETE STUDENT
  // ==========================================

  const handleDelete = async (student) => {
    setOpenMenu(null);

    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name}?\n\nThis will permanently delete:\n• Student record\n• Clerk account\n• Student photo`
    );

    if (!confirmed) return;

    try {
      setDeletingId(student._id);
      setActionError("");
      setActionMessage("");

      const token = await getToken();

      await axios.delete(
        `${API_URL}/api/students/${student._id}`,
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
  // PHOTO
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
        `${API_URL}/api/students/${photoStudent._id}`,
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
    <div className="space-y-5">

      {/* HIDDEN PHOTO INPUT */}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {/* PAGE HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Department Management
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Students
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage students in your department.
          </p>
        </div>

        <button
          onClick={() => {
            setActionError("");
            setActionMessage("");
            setShowAddStudent(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <span className="text-lg leading-none">
            +
          </span>
          Add Student
        </button>

      </div>

      {/* MESSAGES */}

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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid gap-3 md:grid-cols-3">

          {/* SEARCH */}

          <div className="relative md:col-span-1">

            <svg
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
              placeholder="Search student..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:bg-white"
            />

          </div>

          {/* SEMESTER */}

          <select
            value={semesterFilter}
            onChange={(e) =>
              setSemesterFilter(e.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="">
              All Semesters
            </option>

            {[1, 2, 3, 4, 5, 6].map(
              (semester) => (
                <option
                  key={semester}
                  value={semester}
                >
                  Semester {semester}
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
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
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
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Clear filters
            </button>

          </div>
        )}

      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Student List
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {filteredStudents.length} students
            </p>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={filteredStudents.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Download Excel
          </button>

          {hodDepartment && (
            <span className="w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
              {getDepartmentName(hodDepartment)}
            </span>
          )}

        </div>

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
          <div
            className="no-scrollbar cursor-grab overflow-x-auto select-none"
            onMouseDown={(e) => {
              if (e.button !== 0) return;

              if (
                e.target.closest("button") ||
                e.target.closest("input") ||
                e.target.closest("select") ||
                e.target.closest("a")
              ) {
                return;
              }

              const container = e.currentTarget;

              container._drag = {
                dragging: true,
                startX: e.clientX,
                startScrollLeft: container.scrollLeft,
              };

              container.classList.add("cursor-grabbing");
              container.classList.remove("cursor-grab");
              document.body.style.userSelect = "none";
            }}
            onMouseMove={(e) => {
              const container = e.currentTarget;
              const drag = container._drag;

              if (!drag?.dragging) return;

              const distance = e.clientX - drag.startX;
              container.scrollLeft =
                drag.startScrollLeft - distance;
            }}
            onMouseUp={(e) => {
              const container = e.currentTarget;

              if (container._drag) {
                container._drag.dragging = false;
              }

              container.classList.remove("cursor-grabbing");
              container.classList.add("cursor-grab");
              document.body.style.userSelect = "";
            }}
            onMouseLeave={(e) => {
              const container = e.currentTarget;

              if (container._drag) {
                container._drag.dragging = false;
              }

              container.classList.remove("cursor-grabbing");
              container.classList.add("cursor-grab");
              document.body.style.userSelect = "";
            }}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <table className="w-max min-w-full border-separate border-spacing-0">

              {/* =====================================================
                  TABLE HEADER
              ====================================================== */}
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">

                  {/* SERIAL */}
                  <th
                    className="sticky left-0 z-30 w-14 min-w-14 border-r border-slate-100 bg-slate-50 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    #
                  </th>

                  {/* STUDENT */}
                  <th
                    className="sticky left-14 z-30 w-72 min-w-72 border-r border-slate-100 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[4px_0_8px_-7px_rgba(0,0,0,0.35)]"
                  >
                    Student
                  </th>

                  {/* REGISTER */}
                  <th
                    className="w-44 min-w-44 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Register No.
                  </th>

                  {/* ROLL */}
                  <th
                    className="w-28 min-w-28 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Roll No.
                  </th>

                  {/* FATHER */}
                  <th
                    className="w-56 min-w-56 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Father Name
                  </th>

                  {/* MOTHER */}
                  <th
                    className="w-56 min-w-56 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Mother Name
                  </th>

                  {/* DOB */}
                  <th
                    className="w-32 min-w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    DOB
                  </th>

                  {/* GENDER */}
                  <th
                    className="w-28 min-w-28 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Gender
                  </th>

                  {/* ADMISSION YEAR */}
                  <th
                    className="w-36 min-w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Admission Year
                  </th>

                  {/* BATCH */}
                  <th
                    className="w-36 min-w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Batch
                  </th>

                  {/* BATCH NUMBER */}
                  <th
                    className="w-32 min-w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Batch No.
                  </th>

                  {/* ADMISSION TYPE */}
                  <th
                    className="w-48 min-w-48 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Admission Type
                  </th>

                  {/* SEMESTER */}
                  <th
                    className="w-28 min-w-28 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Semester
                  </th>

                  {/* CATEGORY */}
                  <th
                    className="w-32 min-w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Category
                  </th>

                  {/* PHONE */}
                  <th
                    className="w-36 min-w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Phone
                  </th>

                  {/* PARENT PHONE */}
                  <th
                    className="w-36 min-w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Parent Phone
                  </th>

                  {/* EMAIL */}
                  <th
                    className="w-64 min-w-64 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Email
                  </th>

                  {/* STATUS */}
                  <th
                    className="w-32 min-w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Status
                  </th>

                  {/* ACTIONS */}
                  <th
                    className="sticky right-0 z-30 w-28 min-w-28 border-l border-slate-100 bg-slate-50 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[-4px_0_8px_-7px_rgba(0,0,0,0.35)]"
                  >
                    Modify
                  </th>

                </tr>
              </thead>

              {/* =====================================================
                  TABLE BODY
              ====================================================== */}
              <tbody className="divide-y divide-slate-100">

                {filteredStudents.map((student, index) => {

                  const studentId =
                    student._id || student.id;

                  const dobDisplay = student.dob
                    ? new Date(student.dob).toLocaleDateString(
                        "en-GB"
                      )
                    : "—";

                  const admissionTypeLabel = {
                    regular: "Regular",
                    lateralPUC: "Lateral - PUC",
                    lateralITI: "Lateral - ITI",
                    lateralCross: "Lateral - Cross",
                    workingProfessional:
                      "Working Professional",
                  }[
                    student.admissionType
                  ] || student.admissionType || "—";

                  return (
                    <tr
                      key={studentId}
                      className="group bg-white transition hover:bg-slate-50/80"
                    >

                      {/* =================================================
                          SERIAL
                      ================================================== */}
                      <td
                        className="sticky left-0 z-20 w-14 min-w-14 border-r border-slate-100 bg-white px-2 py-4 text-center text-sm font-medium text-slate-400 group-hover:bg-slate-50"
                      >
                        {index + 1}
                      </td>

                      {/* =================================================
                          STUDENT
                      ================================================== */}
                      <td
                        className="sticky left-14 z-20 w-72 min-w-72 border-r border-slate-100 bg-white px-4 py-3 shadow-[4px_0_8px_-7px_rgba(0,0,0,0.35)] group-hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">

                          {student.imageUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  imageUrl:
                                    student.imageUrl,
                                  name:
                                    student.name,
                                })
                              }
                              className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                              title="View photo"
                            >
                              <img
                                src={student.imageUrl}
                                alt={student.name}
                                className="h-11 w-11 rounded-lg object-cover transition hover:scale-105"
                              />
                            </button>
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                              {student.name
                                ?.charAt(0)
                                ?.toUpperCase() || "S"}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {student.name || "—"}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {student.email || "No email"}
                            </p>
                          </div>

                        </div>
                      </td>

                      {/* =================================================
                          REGISTER NUMBER
                      ================================================== */}
                      <td className="w-44 min-w-44 px-4 py-4">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700">
                          {student.registerNumber || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          ROLL NUMBER
                      ================================================== */}
                      <td className="w-28 min-w-28 px-4 py-4">
                        <span className="text-sm font-medium text-slate-600">
                          {student.rollNumber || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          FATHER NAME
                      ================================================== */}
                      <td className="w-56 min-w-56 px-4 py-4">
                        <span className="block truncate text-sm text-slate-600">
                          {student.fatherName || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          MOTHER NAME
                      ================================================== */}
                      <td className="w-56 min-w-56 px-4 py-4">
                        <span className="block truncate text-sm text-slate-600">
                          {student.motherName || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          DOB
                      ================================================== */}
                      <td className="w-32 min-w-32 px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {dobDisplay}
                        </span>
                      </td>

                      {/* =================================================
                          GENDER
                      ================================================== */}
                      <td className="w-28 min-w-28 px-4 py-4">
                        <span className="capitalize text-sm text-slate-600">
                          {student.gender || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          ADMISSION YEAR
                      ================================================== */}
                      <td className="w-36 min-w-36 px-4 py-4">
                        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600">
                          {student.admissionYear || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          BATCH
                      ================================================== */}
                      <td className="w-36 min-w-36 px-4 py-4">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                          {student.batch || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          BATCH NUMBER
                      ================================================== */}
                      <td className="w-32 min-w-32 px-4 py-4">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
                          {student.batchNumber
                            ? `Batch ${student.batchNumber}`
                            : "—"}
                        </span>
                      </td>

                      {/* =================================================
                          ADMISSION TYPE
                      ================================================== */}
                      <td className="w-48 min-w-48 px-4 py-4">
                        <span className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                          {admissionTypeLabel}
                        </span>
                      </td>

                      {/* =================================================
                          SEMESTER
                      ================================================== */}
                      <td className="w-28 min-w-28 px-4 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                          {student.semester
                            ? `Sem ${student.semester}`
                            : "—"}
                        </span>
                      </td>

                      {/* =================================================
                          CATEGORY
                      ================================================== */}
                      <td className="w-32 min-w-32 px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {student.category || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          PHONE
                      ================================================== */}
                      <td className="w-36 min-w-36 px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {student.phone || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          PARENT PHONE
                      ================================================== */}
                      <td className="w-36 min-w-36 px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {student.parentPhone || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          EMAIL
                      ================================================== */}
                      <td className="w-64 min-w-64 px-4 py-4">
                        <span className="block truncate text-sm text-slate-600">
                          {student.email || "—"}
                        </span>
                      </td>

                      {/* =================================================
                          STATUS
                      ================================================== */}
                      <td className="w-32 min-w-32 px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            student.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : student.status === "passed"
                              ? "bg-blue-50 text-blue-700"
                              : student.status === "detained"
                              ? "bg-amber-50 text-amber-700"
                              : student.status === "discontinued"
                              ? "bg-red-50 text-red-700"
                              : student.status === "transferred"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {student.status || "active"}
                        </span>
                      </td>

                      {/* =================================================
                          MODIFY / ACTIONS
                      ================================================== */}
                     <td
  className={`sticky right-0 ${
    openMenu === studentId ? "z-[100]" : "z-20"
  } w-28 min-w-28 border-l border-slate-100 bg-white px-4 py-4 text-right shadow-[-4px_0_8px_-7px_rgba(0,0,0,0.35)] group-hover:bg-slate-50`}
>

                        <button
                          disabled={
                            deletingId === studentId ||
                            uploadingPhoto
                          }
                          onClick={() =>
                            setOpenMenu(
                              openMenu === studentId
                                ? null
                                : studentId
                            )
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                        >
                          Modify

                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="m6 9 6 6 6-6"
                            />
                          </svg>
                        </button>

                        {openMenu === studentId && (
                       <div className="absolute right-4 top-14 z-[9999] w-48 overflow-hidden rounded-xl border border-slate-200 bg-amber-50 py-1 text-left shadow-2xl">

                            <button
                              onClick={() =>
                                handleEdit(student)
                              }
                              className="w-full px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              Edit Student
                            </button>

                            <button
                              onClick={() =>
                                handlePhotoClick(student)
                              }
                              className="w-full px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              Update Photo
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(student)
                              }
                              disabled={
                                deletingId === studentId
                              }
                              className="w-full px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === studentId
                                ? "Deleting..."
                                : "Delete Student"}
                            </button>

                          </div>
                        )}

                      </td>

                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ==========================================
          ADD STUDENT
      ========================================== */}

      {showAddStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">

          <div className="mx-auto my-6 w-full max-w-3xl">

            <div className="mb-3 flex justify-end">

              <button
                type="button"
                onClick={() =>
                  setShowAddStudent(false)
                }
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow hover:bg-slate-50"
              >
                ✕ Close
              </button>

            </div>

            <HODAddStudent
              department={hodDepartment}
              onSuccess={() => {
                setShowAddStudent(false);
                setActionMessage(
                  "Student added successfully."
                );
                fetchStudents();
              }}
              onCancel={() =>
                setShowAddStudent(false)
              }
            />

          </div>

        </div>
      )}

      {/* ==========================================
          EDIT MODAL
      ========================================== */}

      {editingStudent && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Edit Student
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update student academic and contact details.
                </p>
              </div>

              <button
                onClick={() =>
                  setEditingStudent(null)
                }
                className="rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={handleUpdateStudent}
              className="space-y-5 p-6"
            >

              <div className="grid gap-4 sm:grid-cols-2">

                {/* REGISTER NUMBER */}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Register Number
                  </label>

                  <input
                    name="registerNumber"
                    value={editForm.registerNumber}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                {/* NAME */}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Name
                  </label>

                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>


                {/* PHONE */}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone
                  </label>

                  <input
                    name="phone"
                    value={editForm.phone}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                {/* GENDER */}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Gender
                  </label>

                  <select
                    name="gender"
                    value={editForm.gender}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">
                      Select Gender
                    </option>

                    {genders.map((gender) => (
                      <option
                        key={gender.value}
                        value={gender.value}
                      >
                        {gender.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DEPARTMENT - LOCKED */}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Department
                  </label>

                  <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600">
                    {getDepartmentName(
                      hodDepartment
                    )}
                  </div>
                </div>

                {/* ADMISSION YEAR */}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Admission Year
                  </label>

                  <input
                    type="number"
                    name="admissionYear"
                    value={
                      editForm.admissionYear
                    }
                    onChange={handleEditChange}
                    min="2000"
                    max="2100"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  />
                </div>

                {/* SEMESTER */}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Current Semester
                  </label>

                  <select
                    name="semester"
                    value={
                      editForm.semester
                    }
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">
                      Select Semester
                    </option>

                    {[1, 2, 3, 4, 5, 6, 7, 8].map(
                      (semester) => (
                        <option
                          key={semester}
                          value={semester}
                        >
                          Semester {semester}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* BATCH NUMBER */}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Batch Number
                  </label>

                  <select
                    name="batchNumber"
                    value={editForm.batchNumber}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">
                      Select Batch Number
                    </option>

                    <option value="1">
                      Batch 1
                    </option>

                    <option value="2">
                      Batch 2
                    </option>
                  </select>
                </div>

                {/* BATCH */}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Batch
                  </label>

                  <select
                    name="batch"
                    value={editForm.batch}
                    onChange={handleEditChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Select Batch
                    </option>
                   
                    <option value="2025-2026">
                      2025-2026
                    </option>
                    <option value="2026-2027">
                      2026-2027
                    </option>
                    <option value="2027-2038">
                      2027-2028
                    </option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setEditingStudent(null)
                  }
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
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

/* =========================================================
   HOD ADD STUDENT
   Same logic and fields as ADMIN ADD STUDENT
   Department is locked to HOD's department
========================================================= */

function HODAddStudent({
  department,
  onSuccess,
  onCancel,
}) {
  const { getToken } = useAuth();

  const [form, setForm] = useState({
    rollNumber: "",
    registerNumber: "",
    name: "",
    fatherName: "",
    motherName: "",
    dob: "",
    gender: "",
    email: "",
    phone: "",
    parentPhone: "",
    caste: "",
    category: "",
    aadhaarNumber: "",
    satsNumber: "",
    admissionYear: "",
    batch: "",
    batchNumber: "",
    admissionType: "",
    semester: "",
    status: "active",
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     HANDLE CHANGE
  ========================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================================================
     IMAGE
  ========================================================= */

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setPreview("");
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    /* =======================================================
       REQUIRED FIELD VALIDATION
    ======================================================= */

    if (
      !form.rollNumber.trim() ||
      !form.registerNumber.trim() ||
      !form.name.trim() ||
      !form.fatherName.trim() ||
      !form.motherName.trim() ||
      !form.dob ||
      !form.gender ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !department ||
      !form.admissionYear ||
      !form.batch.trim() ||
      !form.batchNumber ||
      !form.admissionType ||
      !form.semester
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    /* =======================================================
       GENDER VALIDATION
    ======================================================= */

    if (
      !["male", "female", "other"].includes(form.gender)
    ) {
      setError("Please select a valid gender.");
      return;
    }

    /* =======================================================
       PHONE VALIDATION
    ======================================================= */

    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError(
        "Student phone number must contain exactly 10 digits."
      );
      return;
    }

    /* =======================================================
       PARENT PHONE VALIDATION
    ======================================================= */

    if (
      form.parentPhone.trim() &&
      !/^\d{10}$/.test(form.parentPhone.trim())
    ) {
      setError(
        "Parent phone number must contain exactly 10 digits."
      );
      return;
    }

    /* =======================================================
       AADHAAR VALIDATION
    ======================================================= */

    if (
      form.aadhaarNumber.trim() &&
      !/^\d{12}$/.test(form.aadhaarNumber.trim())
    ) {
      setError(
        "Aadhaar number must contain exactly 12 digits."
      );
      return;
    }

    /* =======================================================
       BATCH NUMBER VALIDATION
    ======================================================= */

    if (
      !["1", "2"].includes(
        String(form.batchNumber)
      )
    ) {
      setError("Batch number must be either 1 or 2.");
      return;
    }

    /* =======================================================
       SEMESTER VALIDATION
    ======================================================= */

    if (
      ![1, 2, 3, 4, 5, 6].includes(
        Number(form.semester)
      )
    ) {
      setError("Semester must be between 1 and 6.");
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      const formData = new FormData();

      /* =====================================================
         BASIC INFORMATION
      ===================================================== */

      formData.append(
        "rollNumber",
        form.rollNumber.trim()
      );

      formData.append(
        "registerNumber",
        form.registerNumber.trim()
      );

      formData.append(
        "name",
        form.name.trim()
      );

      formData.append(
        "fatherName",
        form.fatherName.trim()
      );

      formData.append(
        "motherName",
        form.motherName.trim()
      );

      formData.append(
        "dob",
        form.dob
      );

      formData.append(
        "gender",
        form.gender
      );

      /* =====================================================
         CONTACT INFORMATION
      ===================================================== */

      formData.append(
        "email",
        form.email.trim().toLowerCase()
      );

      formData.append(
        "phone",
        form.phone.trim()
      );

      formData.append(
        "parentPhone",
        form.parentPhone.trim()
      );

      /* =====================================================
         SOCIAL / RESERVATION INFORMATION
      ===================================================== */

      formData.append(
        "caste",
        form.caste.trim()
      );

      formData.append(
        "category",
        form.category.trim()
      );

      /* =====================================================
         GOVERNMENT / IDENTIFICATION
      ===================================================== */

      formData.append(
        "aadhaarNumber",
        form.aadhaarNumber.trim()
      );

      formData.append(
        "satsNumber",
        form.satsNumber.trim()
      );

      /* =====================================================
         ACADEMIC INFORMATION

         IMPORTANT:
         HOD cannot select/change department.
         The logged-in HOD's department is always submitted.
      ===================================================== */

      formData.append(
        "department",
        department
      );

      formData.append(
        "admissionYear",
        form.admissionYear
      );

      formData.append(
        "batch",
        form.batch.trim()
      );

      formData.append(
        "batchNumber",
        form.batchNumber
      );

      formData.append(
        "admissionType",
        form.admissionType
      );

      formData.append(
        "semester",
        form.semester
      );

      /* =====================================================
         STATUS
      ===================================================== */

      formData.append(
        "status",
        form.status
      );

      /* =====================================================
         PHOTO
      ===================================================== */

      if (image) {
        formData.append(
          "image",
          image
        );
      }

      /* =====================================================
         SUBMIT
      ===================================================== */

      await axios.post(
        `${API_URL}/api/students`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      onSuccess?.();

    } catch (err) {
      console.error(
        "Add student error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to add student."
      );

    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-base font-semibold text-slate-900">
          Student Information
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Enter the student's academic and personal details.
        </p>
      </div>

      {/* =====================================================
          FORM
      ===================================================== */}

      <div className="space-y-7 p-6">

        {/* ===================================================
            PHOTO
        =================================================== */}

        <div>
          <label className="text-sm font-medium text-slate-700">
            Student Photo
            <span className="ml-1 text-xs font-normal text-slate-400">
              (Optional)
            </span>
          </label>

          <div className="mt-3 flex items-center gap-5">

            <div className="relative">
              {preview ? (
                <img
                  src={preview}
                  alt="Student preview"
                  className="h-24 w-24 rounded-2xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  <svg
                    className="h-9 w-9 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M15 19a4 4 0 0 0-6 0m3-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 8v-2a4 4 0 0 0-3-3.87M18 3.13a3 3 0 0 1 0 5.74"
                    />
                  </svg>
                </div>
              )}
            </div>

            <div>
              <label className="inline-flex cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Choose Photo

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {preview && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="ml-2 text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}

              <p className="mt-2 text-xs text-slate-400">
                JPG, PNG or WebP. Maximum 5 MB.
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================
            BASIC INFORMATION
        =================================================== */}

        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Basic Information
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            {/* ROLL NUMBER */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Roll Number
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleChange}
                placeholder="Enter roll number"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* REGISTER NUMBER */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Register Number
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="registerNumber"
                value={form.registerNumber}
                onChange={handleChange}
                placeholder="e.g. 103CS26001"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* NAME */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Full Name
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter student's full name"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* FATHER NAME */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Father Name
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="fatherName"
                value={form.fatherName}
                onChange={handleChange}
                placeholder="Enter father's name"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* MOTHER NAME */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mother Name
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="motherName"
                value={form.motherName}
                onChange={handleChange}
                placeholder="Enter mother's name"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* DOB */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date of Birth
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* GENDER */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Gender
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  Select gender
                </option>

                {genders.map((gender) => (
                  <option
                    key={gender.value}
                    value={gender.value}
                  >
                    {gender.label}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* ===================================================
            CONTACT INFORMATION
        =================================================== */}

        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Contact Information
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            {/* EMAIL */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="student@example.com"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Student Phone
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10 digit mobile number"
                maxLength="10"
                inputMode="numeric"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* PARENT PHONE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Parent / Guardian Phone
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                type="tel"
                name="parentPhone"
                value={form.parentPhone}
                onChange={handleChange}
                placeholder="10 digit mobile number"
                maxLength="10"
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

          </div>
        </div>

        {/* ===================================================
            SOCIAL / RESERVATION INFORMATION
        =================================================== */}

        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Social / Reservation Information
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            {/* CASTE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Caste
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                name="caste"
                value={form.caste}
                onChange={handleChange}
                placeholder="Enter caste"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* CATEGORY */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. GM, SC, ST, OBC"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

          </div>
        </div>

        {/* ===================================================
            GOVERNMENT / IDENTIFICATION
        =================================================== */}

        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Government / Student Identification
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            {/* AADHAAR */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Aadhaar Number
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                type="text"
                name="aadhaarNumber"
                value={form.aadhaarNumber}
                onChange={handleChange}
                placeholder="12 digit Aadhaar number"
                maxLength="12"
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* SATS */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                SATS Number
                <span className="ml-1 text-xs font-normal text-slate-400">
                  (Optional)
                </span>
              </label>

              <input
                type="text"
                name="satsNumber"
                value={form.satsNumber}
                onChange={handleChange}
                placeholder="Enter SATS number"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

          </div>
        </div>

        {/* ===================================================
            ACADEMIC INFORMATION
        =================================================== */}

        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Academic Information
          </h3>

          <div className="grid gap-5 md:grid-cols-3">

            {/* DEPARTMENT - LOCKED */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Department
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
                {getDepartmentName(department)}
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                Student will be added to your department.
              </p>
            </div>

            {/* ADMISSION YEAR */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Admission Year
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="number"
                name="admissionYear"
                value={form.admissionYear}
                onChange={handleChange}
                placeholder="e.g. 2025"
                min="2000"
                max="2100"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Example: 2025
              </p>
            </div>

            {/* CURRENT SEMESTER */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Current Semester
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                name="semester"
                value={form.semester}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  Select semester
                </option>

                {[1, 2, 3, 4, 5, 6].map(
                  (semester) => (
                    <option
                      key={semester}
                      value={semester}
                    >
                      Semester {semester}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* BATCH */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Batch
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                name="batch"
                value={form.batch}
                onChange={handleChange}
                placeholder="e.g. 2025-2028"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Example: 2025-2028
              </p>
            </div>

            {/* BATCH NUMBER */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Batch Number
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                name="batchNumber"
                value={form.batchNumber}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  Select batch
                </option>

                <option value="1">
                  Batch 1
                </option>

                <option value="2">
                  Batch 2
                </option>
              </select>

              <p className="mt-1.5 text-xs text-slate-400">
                Select Batch 1 or Batch 2
              </p>
            </div>

            {/* ADMISSION TYPE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Admission Type
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                name="admissionType"
                value={form.admissionType}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="">
                  Select admission type
                </option>

                <option value="regular">
                  Regular
                </option>

                <option value="lateralPUC">
                  Lateral Entry – PUC
                </option>

                <option value="lateralITI">
                  Lateral Entry – ITI
                </option>

                <option value="lateralCross">
                  Lateral Entry – Cross
                </option>

                <option value="workingProfessional">
                  Working Professional
                </option>
              </select>
            </div>

          </div>
        </div>

        {/* ===================================================
            STUDENT STATUS
        =================================================== */}

        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            Student Status
          </h3>

          <div className="grid gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>

                <option value="passed">
                  Passed
                </option>

                <option value="detained">
                  Detained
                </option>

                <option value="discontinued">
                  Discontinued
                </option>

                <option value="transferred">
                  Transferred
                </option>
              </select>
            </div>

          </div>
        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">
              {error}
            </p>
          </div>
        )}

      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}

          {saving
            ? "Adding Student..."
            : "Add Student"}
        </button>

      </div>
    </form>
  );
}
