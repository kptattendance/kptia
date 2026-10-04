"use client";

import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";

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
  { value: "ot", label: "Others" },
];

const allowedDepartments = [
  "at",
  "ch",
  "ce",
  "cs",
  "ec",
  "ee",
  "me",
  "ps",
  "sc",
  "ot",
];

const getDepartmentName = (code) => {
  const department = departments.find((item) => item.value === code);

  return department?.label || code || "Not assigned";
};

export default function FacultyPage() {
  const { getToken } = useAuth();

  // =========================================================
  // MAIN DATA
  // =========================================================

  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // =========================================================
  // ADD / EDIT
  // =========================================================

  const [showModal, setShowModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "staff",
    image: null,
  });

  const [imagePreview, setImagePreview] = useState(null);

  // =========================================================
  // FILTER
  // =========================================================

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // =========================================================
  // SELECTION
  // =========================================================

  const [selectedFaculty, setSelectedFaculty] = useState([]);
  const [deletingSelected, setDeletingSelected] = useState(false);

  // =========================================================
  // BULK UPLOAD
  // =========================================================

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  const [bulkResult, setBulkResult] = useState(null);

  const bulkFileInputRef = useRef(null);

  // =========================================================
  // LOAD FACULTY
  // =========================================================

  const loadFaculty = async () => {
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

      const facultyUsers = users.filter(
        (user) => user.role?.toLowerCase() === "staff"
      );

      setFaculty(facultyUsers);
      setSelectedFaculty([]);
    } catch (error) {
      console.error("Failed to load faculty:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to load faculty."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaculty();
  }, []);

  // =========================================================
  // FILTER + SORT
  // =========================================================

  const filteredFaculty = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return faculty
      .filter((user) => {
        const matchesSearch =
          !searchValue ||
          user.name?.toLowerCase().includes(searchValue) ||
          user.email?.toLowerCase().includes(searchValue) ||
          user.phone?.toLowerCase().includes(searchValue);

        const matchesDepartment =
          !departmentFilter ||
          user.department === departmentFilter;

        return matchesSearch && matchesDepartment;
      })
      .sort((a, b) => {
        const departmentA = getDepartmentName(
          a.department
        ).toLowerCase();

        const departmentB = getDepartmentName(
          b.department
        ).toLowerCase();

        const departmentCompare =
          departmentA.localeCompare(departmentB);

        if (departmentCompare !== 0) {
          return departmentCompare;
        }

        const nameA = (a.name || "").trim();
        const nameB = (b.name || "").trim();

        return nameA.localeCompare(
          nameB,
          undefined,
          {
            sensitivity: "base",
          }
        );
      });
  }, [faculty, search, departmentFilter]);

  // =========================================================
  // DOWNLOAD CURRENT FILTERED FACULTY
  // =========================================================

  const handleDownloadExcel = () => {
    if (filteredFaculty.length === 0) {
      alert("No faculty available to download.");
      return;
    }

    const excelData = filteredFaculty.map((user, index) => ({
      "Sl. No.": index + 1,
      "Faculty Name": user.name || "",
      Email: user.email || "",
      Phone: user.phone || "",
      Department: getDepartmentName(user.department),
      "Department Code": user.department || "",
      Role: "Staff",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 30 },
      { wch: 35 },
      { wch: 16 },
      { wch: 35 },
      { wch: 18 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Faculty"
    );

    let fileName = "Faculty_List";

    if (departmentFilter) {
      fileName = `${getDepartmentName(
        departmentFilter
      )}_Faculty`;
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

  // =========================================================
  // DOWNLOAD BULK UPLOAD TEMPLATE
  // =========================================================

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();

    // -------------------------------------------------------
    // FACULTY UPLOAD SHEET
    // -------------------------------------------------------

    const templateData = [
      {
        Name: "Ravi Kumar",
        Email: "ravi.kumar@example.com",
        Phone: "9876543210",
        Department: "cs",
        Photo:
          "https://drive.google.com/file/d/FILE_ID/view?usp=sharing",
      },
      {
        Name: "Anita Rao",
        Email: "anita.rao@example.com",
        Phone: "9876543211",
        Department: "ec",
        Photo: "",
      },
    ];

    const worksheet =
      XLSX.utils.json_to_sheet(templateData);

    worksheet["!cols"] = [
      { wch: 30 },
      { wch: 38 },
      { wch: 18 },
      { wch: 16 },
      { wch: 70 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Faculty Upload"
    );

    // -------------------------------------------------------
    // INSTRUCTIONS SHEET
    // -------------------------------------------------------

    const instructions = [
      ["FACULTY BULK UPLOAD INSTRUCTIONS", ""],
      ["", ""],
      ["Column", "Instructions"],
      [
        "Name",
        "Required. Enter the full faculty name.",
      ],
      [
        "Email",
        "Required. Must be a valid email address. Email must not already exist.",
      ],
      [
        "Phone",
        "Optional. Enter faculty phone number.",
      ],
      [
        "Department",
        "Required. Use one of: at, ch, ce, cs, ec, ee, me, ps, sc, ot.",
      ],
      [
        "Photo",
        "Optional. Enter a Google Drive sharing link to the faculty photo.",
      ],
      [
        "Role",
        "Do NOT add Role column. Bulk upload automatically creates every faculty member as staff.",
      ],
      ["", ""],
      ["PHOTO REQUIREMENT", ""],
      [
        "Google Drive",
        "Set the image sharing permission to Anyone with the link → Viewer.",
      ],
      [
        "Example",
        "https://drive.google.com/file/d/FILE_ID/view?usp=sharing",
      ],
      ["", ""],
      ["PROCESS", ""],
      [
        "1",
        "Upload this Excel file through the Faculty page.",
      ],
      [
        "2",
        "The server validates every row.",
      ],
      [
        "3",
        "If a photo is supplied, it is downloaded from Google Drive and uploaded to Cloudinary.",
      ],
      [
        "4",
        "A Clerk account is created.",
      ],
      [
        "5",
        "The matching MongoDB User document is created.",
      ],
      [
        "6",
        "Role is automatically set to staff.",
      ],
      [
        "7",
        "Failed rows are reported without stopping successful rows.",
      ],
    ];

    const instructionSheet =
      XLSX.utils.aoa_to_sheet(instructions);

    instructionSheet["!cols"] = [
      { wch: 25 },
      { wch: 100 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      instructionSheet,
      "Instructions"
    );

    XLSX.writeFile(
      workbook,
      "Faculty_Bulk_Upload_Template.xlsx"
    );
  };

  // =========================================================
  // SELECTION
  // =========================================================

  const isAllSelected =
    filteredFaculty.length > 0 &&
    filteredFaculty.every((user) =>
      selectedFaculty.includes(user._id)
    );

  const toggleSelectFaculty = (id) => {
    setSelectedFaculty((previous) =>
      previous.includes(id)
        ? previous.filter(
            (item) => item !== id
          )
        : [...previous, id]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedFaculty((previous) =>
        previous.filter(
          (id) =>
            !filteredFaculty.some(
              (user) => user._id === id
            )
        )
      );
    } else {
      setSelectedFaculty((previous) => {
        const ids = filteredFaculty.map(
          (user) => user._id
        );

        return [
          ...previous,
          ...ids.filter(
            (id) => !previous.includes(id)
          ),
        ];
      });
    }
  };

  // =========================================================
  // FORM
  // =========================================================

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
      setImagePreview(
        URL.createObjectURL(file)
      );
    } else {
      setImagePreview(null);
    }
  };

  // =========================================================
  // OPEN ADD
  // =========================================================

  const openAddModal = () => {
    setEditingFaculty(null);

    setForm({
      name: "",
      email: "",
      phone: "",
      department: "",
      role: "staff",
      image: null,
    });

    setImagePreview(null);
    setShowModal(true);
  };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditModal = (user) => {
    setEditingFaculty(user);

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      department: user.department || "",
      role: "staff",
      image: null,
    });

    setImagePreview(
      user.imageUrl || null
    );

    setShowModal(true);
  };

  // =========================================================
  // CLOSE ADD / EDIT MODAL
  // =========================================================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingFaculty(null);
    setImagePreview(null);
  };

  // =========================================================
  // SAVE ADD / EDIT
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.department) {
      alert("Please select a department.");
      return;
    }

    if (!form.name.trim()) {
      alert("Please enter faculty name.");
      return;
    }

    if (!form.email.trim()) {
      alert("Please enter faculty email.");
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      const formData = new FormData();

      formData.append(
        "name",
        form.name.trim()
      );

      formData.append(
        "email",
        form.email.trim()
      );

      formData.append(
        "phone",
        form.phone.trim()
      );

      formData.append(
        "department",
        form.department
      );

      formData.append(
        "role",
        "staff"
      );

      if (form.image) {
        formData.append(
          "image",
          form.image
        );
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
      console.error(
        "Faculty save error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to save faculty."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE SINGLE
  // =========================================================

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`
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

      await loadFaculty();
    } catch (error) {
      console.error(
        "Faculty delete error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to delete faculty."
      );
    }
  };

  // =========================================================
  // DELETE SELECTED
  // =========================================================

  const handleDeleteSelected = async () => {
    if (selectedFaculty.length === 0) {
      return;
    }

    const selectedUsers = faculty.filter(
      (user) =>
        selectedFaculty.includes(user._id)
    );

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedUsers.length} selected faculty member${
        selectedUsers.length !== 1
          ? "s"
          : ""
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

      await loadFaculty();
    } catch (error) {
      console.error(
        "Bulk faculty delete error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to delete selected faculty."
      );
    } finally {
      setDeletingSelected(false);
    }
  };

  // =========================================================
  // BULK MODAL
  // =========================================================

  const openBulkModal = () => {
    setBulkFile(null);
    setBulkResult(null);
    setShowBulkModal(true);
  };

  const closeBulkModal = () => {
    if (bulkUploading) return;

    setShowBulkModal(false);
    setBulkFile(null);
    setBulkResult(null);

    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value =
        "";
    }
  };

  // =========================================================
  // BULK FILE CHANGE
  // =========================================================

  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setBulkFile(null);
      return;
    }

    const extension =
      file.name
        .substring(
          file.name.lastIndexOf(".")
        )
        .toLowerCase();

    if (
      extension !== ".xlsx" &&
      extension !== ".xls"
    ) {
      alert(
        "Please select an Excel file (.xlsx or .xls)."
      );

      e.target.value = "";
      setBulkFile(null);
      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      alert(
        "Excel file must be smaller than 10 MB."
      );

      e.target.value = "";
      setBulkFile(null);
      return;
    }

    setBulkFile(file);
    setBulkResult(null);
  };

  // =========================================================
  // BULK UPLOAD
  // =========================================================

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      alert("Please select an Excel file.");
      return;
    }

    try {
      setBulkUploading(true);
      setBulkResult(null);

      const token = await getToken();

      const formData = new FormData();

      formData.append(
        "file",
        bulkFile
      );

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/bulk-upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result =
        response.data?.data || {};

      setBulkResult(result);

      await loadFaculty();
    } catch (error) {
      console.error(
        "Faculty bulk upload error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Faculty bulk upload failed."
      );
    } finally {
      setBulkUploading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 lg:px-7">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Faculty
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {faculty.length} faculty member
            {faculty.length !== 1
              ? "s"
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          {/* DOWNLOAD EXCEL */}

          <button
            onClick={handleDownloadExcel}
            disabled={
              filteredFaculty.length === 0
            }
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

          {/* BULK UPLOAD */}

          <button
            onClick={openBulkModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M5 20h14" />
            </svg>

            Bulk Upload
          </button>

          {/* ADD FACULTY */}

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <span className="text-lg leading-none">
              +
            </span>

            Add Faculty
          </button>
        </div>
      </div>

      {/* =====================================================
          TOOLBAR
      ====================================================== */}

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
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-4-4" />
            </svg>

            <input
              type="text"
              placeholder="Search name, email or phone..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
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
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100 sm:w-64"
          >
            {departments.map(
              (department) => (
                <option
                  key={department.value}
                  value={
                    department.value
                  }
                >
                  {department.value
                    ? department.label
                    : "All Departments"}
                </option>
              )
            )}
          </select>

          {/* DELETE SELECTED */}

          {selectedFaculty.length >
            0 && (
            <button
              onClick={
                handleDeleteSelected
              }
              disabled={
                deletingSelected
              }
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
                : `Delete ${selectedFaculty.length}`}
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
          </div>
        ) : filteredFaculty.length ===
          0 ? (
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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle
                  cx="9"
                  cy="7"
                  r="4"
                />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>

            </div>

            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              No faculty found
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              {search ||
              departmentFilter
                ? "Try changing your search or filter."
                : "Add your first faculty member to get started."}
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            <table className="w-full min-w-[850px]">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">

                  <th className="w-12 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={
                        isAllSelected
                      }
                      onChange={
                        toggleSelectAll
                      }
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-amber-500"
                    />
                  </th>

                  <th className="w-12 px-2 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    #
                  </th>

                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Faculty
                  </th>

                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Contact
                  </th>

                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Department
                  </th>

                  <th className="w-28 px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredFaculty.map(
                  (user, index) => {
                    const selected =
                      selectedFaculty.includes(
                        user._id
                      );

                    return (
                      <tr
                        key={user._id}
                        className={`transition ${
                          selected
                            ? "bg-amber-50/40"
                            : "hover:bg-slate-50/70"
                        }`}
                      >

                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={
                              selected
                            }
                            onChange={() =>
                              toggleSelectFaculty(
                                user._id
                              )
                            }
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-amber-500"
                          />
                        </td>

                        <td className="px-2 py-3 text-sm font-medium text-slate-400">
                          {index + 1}
                        </td>

                        <td className="px-3 py-3">

                          <div className="flex items-center gap-3">

                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">

                              <img
                                src={
                                  user.imageUrl ||
                                  "/default-avatar.png"
                                }
                                alt={
                                  user.name ||
                                  "Faculty"
                                }
                                className="h-full w-full object-cover"
                                onError={(
                                  e
                                ) => {
                                  e.currentTarget.style.display =
                                    "none";
                                }}
                              />

                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-sm font-semibold text-slate-900">
                                {user.name}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                Faculty · Staff
                              </p>

                            </div>

                          </div>

                        </td>

                        <td className="px-3 py-3">

                          <div className="max-w-[250px]">

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

                        <td className="px-3 py-3">

                          <span className="inline-flex max-w-[220px] truncate rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
                            {getDepartmentName(
                              user.department
                            )}
                          </span>

                        </td>

                        <td className="px-3 py-3">

                          <div className="flex justify-end gap-1.5">

                            {/* EDIT */}

                            <button
                              onClick={() =>
                                openEditModal(
                                  user
                                )
                              }
                              title="Edit"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
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

                            {/* DELETE */}

                            <button
                              onClick={() =>
                                handleDelete(
                                  user
                                )
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
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =====================================================
          SELECTION FOOTER
      ====================================================== */}

      {selectedFaculty.length >
        0 && (
        <div className="mt-3 flex items-center justify-between px-1">

          <p className="text-xs font-medium text-slate-500">
            {selectedFaculty.length} faculty member
            {selectedFaculty.length !== 1
              ? "s"
              : ""}{" "}
            selected
          </p>

          <button
            onClick={() =>
              setSelectedFaculty([])
            }
            className="text-xs font-semibold text-slate-500 transition hover:text-amber-700"
          >
            Clear selection
          </button>

        </div>
      )}

      {/* =====================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={closeModal}
          />

          <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

              <div>

                <h2 className="text-lg font-bold text-slate-950">
                  {editingFaculty
                    ? "Edit Faculty"
                    : "Add Faculty"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  {editingFaculty
                    ? "Update account information."
                    : "Create a new faculty account."}
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
                  placeholder="Enter faculty name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
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
                  placeholder="faculty@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={
                    !!editingFaculty
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />

                {editingFaculty && (
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
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />

                </div>

                <div>

                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Department
                  </label>

                  <select
                    name="department"
                    value={
                      form.department
                    }
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  >

                    {departments
                      .filter(
                        (item) =>
                          item.value
                      )
                      .map(
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
                        src={
                          imagePreview
                        }
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

                  <label className="flex h-11 min-w-0 flex-1 cursor-pointer items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 text-sm text-slate-500 transition hover:border-amber-400 hover:bg-amber-50">

                    <span className="truncate">
                      {form.image
                        ? form.image.name
                        : "Choose profile image"}
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handleImageChange
                      }
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
                    : editingFaculty
                    ? "Save Changes"
                    : "Add Faculty"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =====================================================
          BULK UPLOAD MODAL
      ====================================================== */}

      {showBulkModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={closeBulkModal}
          />

          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {/* BULK HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

              <div>

                <h2 className="text-lg font-bold text-slate-950">
                  Bulk Faculty Upload
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Upload multiple faculty members using Excel.
                </p>

              </div>

              <button
                type="button"
                onClick={closeBulkModal}
                disabled={bulkUploading}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
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

            <div className="space-y-5 p-5">

              {/* DOWNLOAD TEMPLATE */}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <h3 className="text-sm font-bold text-amber-900">
                      Step 1 — Download Template
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      Use the supplied Excel structure. Do not rename the columns.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleDownloadTemplate
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
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

                    Download Template
                  </button>

                </div>

              </div>

              {/* FORMAT */}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <h3 className="text-sm font-bold text-slate-900">
                  Excel Columns
                </h3>

                <div className="mt-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                  <table className="w-full min-w-[650px] text-left text-xs">

                    <thead>
                      <tr className="border-b border-slate-200">

                        <th className="px-3 py-2 font-bold text-slate-500">
                          Column
                        </th>

                        <th className="px-3 py-2 font-bold text-slate-500">
                          Required
                        </th>

                        <th className="px-3 py-2 font-bold text-slate-500">
                          Example
                        </th>

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">

                      <tr>
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          Name
                        </td>

                        <td className="px-3 py-2 text-emerald-600">
                          Yes
                        </td>

                        <td className="px-3 py-2 text-slate-500">
                          Ravi Kumar
                        </td>
                      </tr>

                      <tr>
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          Email
                        </td>

                        <td className="px-3 py-2 text-emerald-600">
                          Yes
                        </td>

                        <td className="px-3 py-2 text-slate-500">
                          ravi@example.com
                        </td>
                      </tr>

                      <tr>
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          Phone
                        </td>

                        <td className="px-3 py-2 text-slate-500">
                          Optional
                        </td>

                        <td className="px-3 py-2 text-slate-500">
                          9876543210
                        </td>
                      </tr>

                      <tr>
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          Department
                        </td>

                        <td className="px-3 py-2 text-emerald-600">
                          Yes
                        </td>

                        <td className="px-3 py-2 text-slate-500">
                          cs
                        </td>
                      </tr>

                      <tr>
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          Photo
                        </td>

                        <td className="px-3 py-2 text-slate-500">
                          Optional
                        </td>

                        <td className="px-3 py-2 text-slate-500">
                          Google Drive link
                        </td>
                      </tr>

                    </tbody>

                  </table>

                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">

                  <p className="text-xs leading-5 text-blue-800">
                    <strong>Photo:</strong>{" "}
                    The Google Drive image must be shared as{" "}
                    <strong>
                      Anyone with the link → Viewer
                    </strong>
                    .
                  </p>

                  <p className="mt-1 break-all text-[11px] text-blue-600">
                    Example: https://drive.google.com/file/d/FILE_ID/view
                  </p>

                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">

                  <p className="text-xs leading-5 text-slate-600">
                    <strong>Important:</strong>{" "}
                    Do not add a Role column. The system automatically creates every uploaded faculty member with role{" "}
                    <strong>staff</strong>.
                  </p>

                </div>

              </div>

              {/* SELECT FILE */}

              <div>

                <h3 className="mb-2 text-sm font-bold text-slate-900">
                  Step 2 — Select Excel File
                </h3>

                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={
                    handleBulkFileChange
                  }
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() =>
                    bulkFileInputRef.current?.click()
                  }
                  disabled={bulkUploading}
                  className="flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-center transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-8 w-8 text-slate-400"
                  >
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M5 20h14" />
                  </svg>

                  {bulkFile ? (
                    <>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {bulkFile.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Click to choose another file
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        Choose Excel file
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        .xlsx or .xls · Maximum 10 MB
                      </p>
                    </>
                  )}

                </button>

              </div>

              {/* UPLOAD */}

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeBulkModal}
                  disabled={bulkUploading}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={
                    handleBulkUpload
                  }
                  disabled={
                    !bulkFile ||
                    bulkUploading
                  }
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkUploading
                    ? "Uploading..."
                    : "Upload Faculty"}
                </button>

              </div>

              {/* RESULT */}

              {bulkResult && (
                <div className="space-y-4 border-t border-slate-100 pt-5">

                  <h3 className="text-sm font-bold text-slate-900">
                    Upload Result
                  </h3>

                  {/* SUMMARY */}

                  <div className="grid grid-cols-3 gap-3">

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">

                      <p className="text-xl font-bold text-slate-900">
                        {
                          bulkResult.totalRows ??
                          0
                        }
                      </p>

                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Total
                      </p>

                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">

                      <p className="text-xl font-bold text-emerald-700">
                        {
                          bulkResult.successful ??
                          0
                        }
                      </p>

                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                        Created
                      </p>

                    </div>

                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">

                      <p className="text-xl font-bold text-red-600">
                        {
                          bulkResult.failed ??
                          0
                        }
                      </p>

                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
                        Failed
                      </p>

                    </div>

                  </div>

                  {/* SUCCESS */}

                  {bulkResult.created?.length >
                    0 && (
                    <div>

                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">
                        Successfully Created
                      </p>

                      <div className="max-h-52 overflow-auto rounded-xl border border-emerald-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                        <table className="w-full min-w-[550px] text-left text-xs">

                          <thead className="sticky top-0 bg-emerald-50">

                            <tr>

                              <th className="px-3 py-2 text-emerald-700">
                                Row
                              </th>

                              <th className="px-3 py-2 text-emerald-700">
                                Name
                              </th>

                              <th className="px-3 py-2 text-emerald-700">
                                Email
                              </th>

                              <th className="px-3 py-2 text-emerald-700">
                                Department
                              </th>

                            </tr>

                          </thead>

                          <tbody className="divide-y divide-emerald-100">

                            {bulkResult.created.map(
                              (item, index) => (
                                <tr
                                  key={`${item.row}-${index}`}
                                >
                                  <td className="px-3 py-2 text-slate-500">
                                    {item.row}
                                  </td>

                                  <td className="px-3 py-2 font-semibold text-slate-700">
                                    {item.name}
                                  </td>

                                  <td className="px-3 py-2 text-slate-500">
                                    {item.email}
                                  </td>

                                  <td className="px-3 py-2 text-slate-500">
                                    {getDepartmentName(
                                      item.department
                                    )}
                                  </td>
                                </tr>
                              )
                            )}

                          </tbody>

                        </table>

                      </div>

                    </div>
                  )}

                  {/* ERRORS */}

                  {bulkResult.errors?.length >
                    0 && (
                    <div>

                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">
                        Failed Rows
                      </p>

                      <div className="max-h-64 overflow-auto rounded-xl border border-red-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                        <table className="w-full min-w-[650px] text-left text-xs">

                          <thead className="sticky top-0 bg-red-50">

                            <tr>

                              <th className="px-3 py-2 text-red-700">
                                Row
                              </th>

                              <th className="px-3 py-2 text-red-700">
                                Name
                              </th>

                              <th className="px-3 py-2 text-red-700">
                                Email
                              </th>

                              <th className="px-3 py-2 text-red-700">
                                Error
                              </th>

                            </tr>

                          </thead>

                          <tbody className="divide-y divide-red-100">

                            {bulkResult.errors.map(
                              (item, index) => (
                                <tr
                                  key={`${item.row}-${index}`}
                                >

                                  <td className="px-3 py-2 font-semibold text-red-600">
                                    {item.row}
                                  </td>

                                  <td className="px-3 py-2 text-slate-700">
                                    {item.name ||
                                      "-"}
                                  </td>

                                  <td className="px-3 py-2 text-slate-500">
                                    {item.email ||
                                      "-"}
                                  </td>

                                  <td className="px-3 py-2 text-red-600">
                                    {Array.isArray(
                                      item.errors
                                    )
                                      ? item.errors.join(
                                          ", "
                                        )
                                      : item.errors ||
                                        "Failed"}
                                  </td>

                                </tr>
                              )
                            )}

                          </tbody>

                        </table>

                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}