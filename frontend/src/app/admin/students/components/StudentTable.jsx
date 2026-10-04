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
  const [admissionTypeFilter, setAdmissionTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [openMenu, setOpenMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  // Table drag scrolling
  const tableScrollRef = useRef(null);
  const tableDragRef = useRef({
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
  });

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

  // Photo Preview
const [previewPhoto, setPreviewPhoto] = useState(null);

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
        `${API_URL}/api/students`,
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

  useEffect(() => {
    const closeMenu = () => {
      setOpenMenu(null);
      setMenuPosition(null);
    };

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
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

      const matchesAdmissionType =
        !admissionTypeFilter ||
        String(student.admissionType || "") ===
          String(admissionTypeFilter);

      const matchesStatus =
        !statusFilter ||
        String(student.status || "active") ===
          String(statusFilter);

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesBatch &&
        matchesSemester &&
        matchesAdmissionType &&
        matchesStatus
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
  departmentFilter,
  batchFilter,
  semesterFilter,
  admissionTypeFilter,
  statusFilter,
]);

  const clearFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    setBatchFilter("");
    setSemesterFilter("");
    setAdmissionTypeFilter("");
    setStatusFilter("");
  };

  const hasFilters =
    search ||
    departmentFilter ||
    batchFilter ||
    semesterFilter ||
    admissionTypeFilter ||
    statusFilter;


    // ==========================================
// DOWNLOAD EXCEL
// ==========================================

const handleDownloadExcel = () => {
  if (filteredStudents.length === 0) {
    alert("No students available to download.");
    return;
  }

  const excelData = filteredStudents.map(
    (student, index) => ({
      "Sl. No.": index + 1,
      "Student Name": student.name || "",
      "Register Number": student.registerNumber || "",
      "Roll Number": student.rollNumber || "",
      "Father Name": student.fatherName || "",
      "Mother Name": student.motherName || "",
      "DOB": student.dob
        ? new Date(student.dob).toLocaleDateString("en-GB")
        : "",
      "Gender": student.gender || "",
      "Email": student.email || "",
      "Phone": student.phone || "",
      "Parent Phone": student.parentPhone || "",
      "Caste": student.caste || "",
      "Category": student.category || "",
      "Aadhaar Number": student.aadhaarNumber || "",
      "SATS Number": student.satsNumber || "",
      "Department": getDepartmentName(student.department),
      "Admission Year": student.admissionYear || "",
      "Batch": student.batch || "",
      "Batch Number": student.batchNumber || "",
      "Admission Type": student.admissionType || "",
      "Semester": student.semester
        ? `Semester ${student.semester}`
        : "",
      "Status": student.status || "active",
    })
  );

  const worksheet =
    XLSX.utils.json_to_sheet(excelData);

  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 20 },
    { wch: 14 },
    { wch: 28 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 32 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 32 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
  ];

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Students"
  );

  let fileName = "Students";

  if (departmentFilter) {
    fileName =
      `${getDepartmentName(departmentFilter)}_Students`;
  } else {
    fileName = "All_Departments_Students";
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
        registerNumber:
          data.registerNumber || "",
        rollNumber:
          data.rollNumber || "",
        name: data.name || "",
        fatherName:
          data.fatherName || "",
        motherName:
          data.motherName || "",
        dob: data.dob
          ? String(data.dob).slice(0, 10)
          : "",
        gender:
          data.gender || "",
        email: data.email || "",
        phone: data.phone || "",
        parentPhone:
          data.parentPhone || "",
        caste: data.caste || "",
        category:
          data.category || "",
        aadhaarNumber:
          data.aadhaarNumber || "",
        satsNumber:
          data.satsNumber || "",
        department:
          data.department || "",
        admissionYear:
          data.admissionYear || "",
        batch: data.batch || "",
        batchNumber:
          data.batchNumber || "",
        admissionType:
          data.admissionType || "",
        semester: data.semester || "",
        status:
          data.status || "active",
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
        "rollNumber",
        editForm.rollNumber.trim()
      );

      formData.append(
        "name",
        editForm.name
          .trim()
          .toUpperCase()
      );

      formData.append(
        "fatherName",
        editForm.fatherName
          .trim()
          .toUpperCase()
      );

      formData.append(
        "motherName",
        editForm.motherName
          .trim()
          .toUpperCase()
      );

      formData.append(
        "dob",
        editForm.dob
      );

      formData.append(
        "gender",
        editForm.gender.toLowerCase()
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
        "parentPhone",
        editForm.parentPhone.trim()
      );

      formData.append(
        "caste",
        editForm.caste.trim()
      );

      formData.append(
        "category",
        editForm.category.trim()
      );

      formData.append(
        "aadhaarNumber",
        editForm.aadhaarNumber.trim()
      );

      formData.append(
        "satsNumber",
        editForm.satsNumber.trim()
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

      formData.append(
        "admissionType",
        editForm.admissionType
      );

      formData.append(
        "status",
        editForm.status
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
            `${API_URL}/api/students/${
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
  // TABLE HORIZONTAL DRAG SCROLL
  // ==========================================

  const handleTableMouseDown = (e) => {
    // Only start dragging with the main mouse button.
    if (e.button !== 0) return;

    // Do not start table dragging when clicking controls.
    if (
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest("select") ||
      e.target.closest("a")
    ) {
      return;
    }

    const container = tableScrollRef.current;
    if (!container) return;

    tableDragRef.current = {
      dragging: true,
      startX: e.clientX,
      startScrollLeft: container.scrollLeft,
    };

    container.classList.add("cursor-grabbing");
    container.classList.remove("cursor-grab");
    document.body.style.userSelect = "none";
  };

  const handleTableMouseMove = (e) => {
    const drag = tableDragRef.current;
    const container = tableScrollRef.current;

    if (!drag.dragging || !container) return;

    const distance = e.clientX - drag.startX;
    container.scrollLeft = drag.startScrollLeft - distance;
  };

  const stopTableDrag = () => {
    const container = tableScrollRef.current;

    tableDragRef.current.dragging = false;

    if (container) {
      container.classList.remove("cursor-grabbing");
      container.classList.add("cursor-grab");
    }

    document.body.style.userSelect = "";
  };

  // Keep the open modify menu positioned beside its button.
  const handleModifyMenu = (e, studentId) => {
    e.stopPropagation();

    if (openMenu === studentId) {
      setOpenMenu(null);
      setMenuPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    setOpenMenu(studentId);
    setMenuPosition({
      top: rect.bottom + 6,
      right: Math.max(12, window.innerWidth - rect.right),
    });
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

            {[1, 2, 3, 4, 5, 6].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>

          {/* ADMISSION TYPE */}
          <select
            value={admissionTypeFilter}
            onChange={(e) =>
              setAdmissionTypeFilter(e.target.value)
            }
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 lg:w-52"
          >
            <option value="">
              All Admission Types
            </option>
            <option value="regular">
              Regular
            </option>
            <option value="lateralPUC">
              Lateral - PUC
            </option>
            <option value="lateralITI">
              Lateral - ITI
            </option>
            <option value="lateralCross">
              Lateral - Cross
            </option>
            <option value="workingProfessional">
              Working Professional
            </option>
          </select>

          {/* STATUS */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 lg:w-40"
          >
            <option value="">
              All Status
            </option>
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
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* TABLE HEADER */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Students
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              {filteredStudents.length} student
              {filteredStudents.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

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

            <button
              onClick={handleDownloadExcel}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* TABLE HINT */}
        {filteredStudents.length > 0 && (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-400">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                d="M8 12h8m-3-3 3 3-3 3M3 5h18M3 19h18"
              />
            </svg>
            <span>
              Click and drag the table left or right to view more details.
              Student, register number and Modify remain fixed.
            </span>
          </div>
        )}

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

          <div
            ref={tableScrollRef}
            className="no-scrollbar cursor-grab overflow-x-auto select-none"
            onMouseDown={handleTableMouseDown}
            onMouseMove={handleTableMouseMove}
            onMouseUp={stopTableDrag}
            onMouseLeave={stopTableDrag}
            onDoubleClick={stopTableDrag}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >

            <table className="w-max min-w-full border-separate border-spacing-0">

              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">

                  {/* SELECT ALL */}
                  <th
                    className="sticky left-0 z-30 w-12 min-w-12 border-r border-slate-100 bg-slate-50 px-2 py-3 text-center"
                  >
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      title="Select all"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
                    />
                  </th>

                  {/* SERIAL */}
                  <th
                    className="sticky left-12 z-30 w-12 min-w-12 border-r border-slate-100 bg-slate-50 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    #
                  </th>

                  {/* STUDENT */}
                  <th
                    className="sticky left-24 z-30 w-64 min-w-64 border-r border-slate-100 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[4px_0_8px_-7px_rgba(0,0,0,0.35)]"
                  >
                    Student
                  </th>

                  {/* REGISTER */}
                  <th
                    className="sticky left-[352px] z-30 w-44 min-w-44 border-r border-slate-100 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[4px_0_8px_-7px_rgba(0,0,0,0.25)]"
                  >
                    Register No.
                  </th>

                  {/* ROLL */}
                  <th className="w-28 min-w-28 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Roll No.
                  </th>

                  {/* DEPARTMENT */}
                  <th className="w-48 min-w-48 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Department
                  </th>

                  {/* FATHER */}
                  <th className="w-52 min-w-52 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Father Name
                  </th>

                  {/* MOTHER */}
                  <th className="w-52 min-w-52 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Mother Name
                  </th>

                  {/* DOB */}
                  <th className="w-32 min-w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    DOB
                  </th>

                  {/* GENDER */}
                  <th className="w-28 min-w-28 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Gender
                  </th>

                  {/* ADMISSION YEAR */}
                  <th className="w-36 min-w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Admission Year
                  </th>

                  {/* BATCH */}
                  <th className="w-36 min-w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Batch
                  </th>

                  {/* BATCH NUMBER */}
                  <th className="w-32 min-w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Batch No.
                  </th>

                  {/* ADMISSION TYPE */}
                  <th className="w-48 min-w-48 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Admission Type
                  </th>

                  {/* SEMESTER */}
                  <th className="w-28 min-w-28 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Semester
                  </th>

                  {/* CATEGORY */}
                  <th className="w-32 min-w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Category
                  </th>

                  {/* PHONE */}
                  <th className="w-36 min-w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Phone
                  </th>

                  {/* PARENT PHONE */}
                  <th className="w-36 min-w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Parent Phone
                  </th>

                  {/* EMAIL */}
                  <th className="w-60 min-w-60 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Email
                  </th>

                  {/* STATUS */}
                  <th className="w-32 min-w-32 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  {/* MODIFY */}
                  <th
                    className="sticky right-0 z-30 w-28 min-w-28 border-l border-slate-100 bg-slate-50 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-[-4px_0_8px_-7px_rgba(0,0,0,0.35)]"
                  >
                    Modify
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

                    const dobDisplay = student.dob
                      ? new Date(
                          student.dob
                        ).toLocaleDateString(
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
                        className={`group transition ${
                          isSelected
                            ? "bg-slate-50"
                            : "bg-white hover:bg-slate-50/80"
                        }`}
                      >

                        {/* CHECKBOX */}
                        <td
                          className={`sticky left-0 z-20 w-12 min-w-12 border-r border-slate-100 px-2 py-3 text-center ${
                            isSelected
                              ? "bg-slate-50"
                              : "bg-white group-hover:bg-slate-50"
                          }`}
                        >
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
                        <td
                          className={`sticky left-12 z-20 w-12 min-w-12 border-r border-slate-100 px-2 py-3 text-center text-sm font-medium text-slate-400 ${
                            isSelected
                              ? "bg-slate-50"
                              : "bg-white group-hover:bg-slate-50"
                          }`}
                        >
                          {index + 1}
                        </td>

                        {/* STUDENT */}
                        <td
                          className={`sticky left-24 z-20 w-64 min-w-64 border-r border-slate-100 px-4 py-3 shadow-[4px_0_8px_-7px_rgba(0,0,0,0.35)] ${
                            isSelected
                              ? "bg-slate-50"
                              : "bg-white group-hover:bg-slate-50"
                          }`}
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
                                  src={
                                    student.imageUrl
                                  }
                                  alt={
                                    student.name
                                  }
                                  className="h-10 w-10 rounded-lg object-cover transition hover:scale-105"
                                />
                              </button>
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                                {student.name
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                  "S"}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {student.name ||
                                  "—"}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {student.email ||
                                  "No email"}
                              </p>
                            </div>

                          </div>
                        </td>

                        {/* REGISTER */}
                        <td
                          className={`sticky left-[352px] z-20 w-44 min-w-44 border-r border-slate-100 px-4 py-3 shadow-[4px_0_8px_-7px_rgba(0,0,0,0.25)] ${
                            isSelected
                              ? "bg-slate-50"
                              : "bg-white group-hover:bg-slate-50"
                          }`}
                        >
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700">
                            {student.registerNumber ||
                              "—"}
                          </span>
                        </td>

                        {/* ROLL */}
                        <td className="w-28 min-w-28 px-4 py-3">
                          <span className="text-sm font-medium text-slate-600">
                            {student.rollNumber ||
                              "—"}
                          </span>
                        </td>

                        {/* DEPARTMENT */}
                        <td className="w-48 min-w-48 px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {getDepartmentName(
                              student.department
                            )}
                          </span>
                        </td>

                        {/* FATHER */}
                        <td className="w-52 min-w-52 px-4 py-3">
                          <span className="block truncate text-sm text-slate-600">
                            {student.fatherName ||
                              "—"}
                          </span>
                        </td>

                        {/* MOTHER */}
                        <td className="w-52 min-w-52 px-4 py-3">
                          <span className="block truncate text-sm text-slate-600">
                            {student.motherName ||
                              "—"}
                          </span>
                        </td>

                        {/* DOB */}
                        <td className="w-32 min-w-32 px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {dobDisplay}
                          </span>
                        </td>

                        {/* GENDER */}
                        <td className="w-28 min-w-28 px-4 py-3">
                          <span className="capitalize text-sm text-slate-600">
                            {student.gender ||
                              "—"}
                          </span>
                        </td>

                        {/* ADMISSION YEAR */}
                        <td className="w-36 min-w-36 px-4 py-3">
                          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600">
                            {student.admissionYear ||
                              "—"}
                          </span>
                        </td>

                        {/* BATCH */}
                        <td className="w-36 min-w-36 px-4 py-3">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                            {student.batch ||
                              "—"}
                          </span>
                        </td>

                        {/* BATCH NUMBER */}
                        <td className="w-32 min-w-32 px-4 py-3">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                            {student.batchNumber
                              ? `Batch ${student.batchNumber}`
                              : "—"}
                          </span>
                        </td>

                        {/* ADMISSION TYPE */}
                        <td className="w-48 min-w-48 px-4 py-3">
                          <span className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                            {admissionTypeLabel}
                          </span>
                        </td>

                        {/* SEMESTER */}
                        <td className="w-28 min-w-28 px-4 py-3">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                            {student.semester
                              ? `Sem ${student.semester}`
                              : "—"}
                          </span>
                        </td>

                        {/* CATEGORY */}
                        <td className="w-32 min-w-32 px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {student.category ||
                              "—"}
                          </span>
                        </td>

                        {/* PHONE */}
                        <td className="w-36 min-w-36 px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {student.phone ||
                              "—"}
                          </span>
                        </td>

                        {/* PARENT PHONE */}
                        <td className="w-36 min-w-36 px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {student.parentPhone ||
                              "—"}
                          </span>
                        </td>

                        {/* EMAIL */}
                        <td className="w-60 min-w-60 px-4 py-3">
                          <span className="block truncate text-sm text-slate-600">
                            {student.email ||
                              "—"}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="w-32 min-w-32 px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                              student.status ===
                              "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : student.status ===
                                  "passed"
                                ? "bg-blue-50 text-blue-700"
                                : student.status ===
                                  "detained"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {student.status ||
                              "active"}
                          </span>
                        </td>

                        {/* MODIFY */}
                        <td
                          className={`sticky right-0 z-20 w-28 min-w-28 border-l border-slate-100 px-4 py-3 text-right shadow-[-4px_0_8px_-7px_rgba(0,0,0,0.35)] ${
                            isSelected
                              ? "bg-slate-50"
                              : "bg-white group-hover:bg-slate-50"
                          }`}
                        >

                          <button
                            disabled={
                              deletingId ===
                                studentId ||
                              uploadingPhoto ||
                              deletingSelected
                            }
                            onClick={(e) =>
                              handleModifyMenu(e, studentId)
                            }
                            className="relative z-10 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
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

                          {openMenu === studentId &&
                            menuPosition && (
                              <div
                                className="fixed z-[9999] w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-2xl"
                                style={{
                                  top: menuPosition.top,
                                  right: menuPosition.right,
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenu(null);
                                    setMenuPosition(null);
                                    handleEdit(student);
                                  }}
                                  className="w-full px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                >
                                  Edit Student
                                </button>

                                <button
                                  onClick={() => {
                                    setOpenMenu(null);
                                    setMenuPosition(null);
                                    handlePhotoClick(student);
                                  }}
                                  className="w-full px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                >
                                  Update Photo
                                </button>

                                <button
                                  onClick={() => {
                                    setOpenMenu(null);
                                    setMenuPosition(null);
                                    handleDelete(student);
                                  }}
                                  disabled={deletingId === studentId}
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
    PHOTO PREVIEW MODAL
========================================== */}

{previewPhoto && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    onClick={() => setPreviewPhoto(null)}
  >
    <div
      className="relative flex max-h-[95vh] max-w-[95vw] flex-col items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* CLOSE BUTTON */}
      <button
        type="button"
        onClick={() => setPreviewPhoto(null)}
        className="absolute -right-3 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-semibold text-slate-700 shadow-lg transition hover:bg-slate-100 hover:text-slate-950"
        aria-label="Close photo preview"
      >
        ✕
      </button>

      {/* PHOTO */}
      <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
        <img
          src={previewPhoto.imageUrl}
          alt={previewPhoto.name || "Student photo"}
          className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain"
        />
      </div>

      {/* STUDENT NAME */}
      {previewPhoto.name && (
        <div className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg">
          {previewPhoto.name}
        </div>
      )}
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

          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4">

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-950">
                    Edit Student
                  </h2>

                  {editForm.registerNumber && (
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600">
                      {editForm.registerNumber}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Update the student's complete academic and personal details.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !savingEdit &&
                  setEditingStudent(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                ✕
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={handleUpdateStudent}
              className="min-h-0 flex-1 overflow-y-auto"
            >

              <div className="space-y-6 p-6">

                {/* IDENTITY */}
                <section>

                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Identity Details
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Basic identification and parent details.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">

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
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 font-mono text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* ROLL */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Roll Number
                      </label>

                      <input
                        name="rollNumber"
                        value={
                          editForm.rollNumber
                        }
                        onChange={
                          handleEditChange
                        }
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* NAME */}
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Student Name
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
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* FATHER */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Father Name
                      </label>

                      <input
                        name="fatherName"
                        value={
                          editForm.fatherName
                        }
                        onChange={
                          handleEditChange
                        }
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* MOTHER */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Mother Name
                      </label>

                      <input
                        name="motherName"
                        value={
                          editForm.motherName
                        }
                        onChange={
                          handleEditChange
                        }
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* DOB */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Date of Birth
                      </label>

                      <input
                        type="date"
                        name="dob"
                        value={
                          editForm.dob
                        }
                        onChange={
                          handleEditChange
                        }
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* GENDER */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Gender
                      </label>

                      <select
                        name="gender"
                        value={
                          editForm.gender
                        }
                        onChange={
                          handleEditChange
                        }
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      >
                        <option value="">
                          Select Gender
                        </option>

                        <option value="male">
                          Male
                        </option>

                        <option value="female">
                          Female
                        </option>

                        <option value="other">
                          Other
                        </option>
                      </select>
                    </div>

                  </div>
                </section>

                {/* CONTACT */}
                <section className="border-t border-slate-100 pt-6">

                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Contact & Social Details
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Student and parent contact information.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">

                    {/* EMAIL */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Email
                      </label>

                      <input
                        type="email"
                        name="email"
                          readOnly
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
                        Student Phone
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
                        maxLength={10}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* PARENT PHONE */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Parent Phone
                      </label>

                      <input
                        name="parentPhone"
                        value={
                          editForm.parentPhone
                        }
                        onChange={
                          handleEditChange
                        }
                        maxLength={10}
                        placeholder="Optional"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* CATEGORY */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Category
                      </label>

                      <input
                        name="category"
                        value={
                          editForm.category
                        }
                        onChange={
                          handleEditChange
                        }
                        placeholder="e.g. GM, 2A, SC, ST"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* CASTE */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Caste
                      </label>

                      <input
                        name="caste"
                        value={
                          editForm.caste
                        }
                        onChange={
                          handleEditChange
                        }
                        placeholder="Optional"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* AADHAAR */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Aadhaar Number
                      </label>

                      <input
                        name="aadhaarNumber"
                        value={
                          editForm.aadhaarNumber
                        }
                        onChange={
                          handleEditChange
                        }
                        maxLength={12}
                        placeholder="Optional"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-mono outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    {/* SATS */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        SATS Number
                      </label>

                      <input
                        name="satsNumber"
                        value={
                          editForm.satsNumber
                        }
                        onChange={
                          handleEditChange
                        }
                        placeholder="Optional"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                  </div>
                </section>

                {/* ACADEMIC */}
                <section className="border-t border-slate-100 pt-6">

                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Academic Details
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Course, admission, batch and semester information.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">

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

                    {/* ADMISSION TYPE */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Admission Type
                      </label>

                      <select
                        name="admissionType"
                        value={
                          editForm.admissionType
                        }
                        onChange={
                          handleEditChange
                        }
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      >
                        <option value="">
                          Select Admission Type
                        </option>

                        <option value="regular">
                          Regular
                        </option>

                        <option value="lateralPUC">
                          Lateral Entry - PUC
                        </option>

                        <option value="lateralITI">
                          Lateral Entry - ITI
                        </option>

                        <option value="lateralCross">
                          Lateral Entry - Cross
                        </option>

                        <option value="workingProfessional">
                          Working Professional
                        </option>
                      </select>
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
                          1, 2, 3, 4, 5, 6,
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

                    {/* STATUS */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Student Status
                      </label>

                      <select
                        name="status"
                        value={
                          editForm.status
                        }
                        onChange={
                          handleEditChange
                        }
                        required
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
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
                </section>

              </div>

              {/* BUTTONS */}
              <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">

                <button
                  type="button"
                  onClick={() =>
                    setEditingStudent(null)
                  }
                  disabled={savingEdit}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {savingEdit && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}

                  {savingEdit
                    ? "Saving..."
                    : "Save Changes"}

                </button>

              </div>

            </form>
          </div>
        </div>
      )}


      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

    </div>
  );
}