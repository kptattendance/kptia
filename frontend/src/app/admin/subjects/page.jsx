"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// =====================================================
// MASTER DATA
// =====================================================

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

const subjectCategories = [
  { value: "REGULAR", label: "Regular" },
  { value: "ELECTIVE", label: "Elective" },
  { value: "BRIDGE", label: "Bridge" },
];

const subjectTypes = [
  { value: "IT", label: "IT - Integrated Theory" },
  { value: "IP", label: "IP - Integrated Practical" },
  { value: "I", label: "I - Institutional" },
];

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

const boards = [
  "SC",
  "EG",
  "ME",
  "AT",
  "CE",
  "CS",
  "EE",
  "CH",
  "EC",
  "PO",
  "KA",
];

const schemeYears = [
  2025,
  2026,
  2027,
  2028,
  2029,
  2030,
];

// =====================================================
// HELPERS
// =====================================================

const getDepartmentName = (value) => {
  return (
    departments.find(
      (department) =>
        department.value ===
        String(value || "").trim().toLowerCase()
    )?.label || value || "—"
  );
};

const getDepartmentShortName = (value) =>
  String(value || "").trim().toUpperCase();

const getSubjectTypeName = (value) => {
  const found = subjectTypes.find(
    (item) =>
      item.value ===
      String(value || "").trim().toUpperCase()
  );

  return found?.label || value || "—";
};

const getCategoryName = (value) => {
  const found = subjectCategories.find(
    (item) =>
      item.value ===
      String(value || "").trim().toUpperCase()
  );

  return found?.label || value || "—";
};

const getSequence = (subject) =>
  String(
    subject?.sequenceNumber ||
      subject?.sequence ||
      ""
  ).trim();

const sequenceSort = (subject) =>
  getSequence(subject).toUpperCase();

const emptyForm = {
  subjectId: "",
  code: "",
  name: "",
  sequence: "",
  semester: "",
  department: "",

  subjectCategory: "REGULAR",
  electiveGroup: "",

  subjectType: "",
  board: "",

  iaMax: "",
  iaMin: "",

  theoryExamMax: "",
  theoryExamMin: "",

  practicalExamMax: "",
  practicalExamMin: "",

  totalMax: "",
  totalMin: "",

  credit: "",

  schemeYear: "2025",
};

const numericFields = [
  "iaMax",
  "iaMin",
  "theoryExamMax",
  "theoryExamMin",
  "practicalExamMax",
  "practicalExamMin",
  "totalMax",
  "totalMin",
  "credit",
  "schemeYear",
];

const numberValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  return Number(value);
};

// =====================================================
// MAIN PAGE
// =====================================================

export default function SubjectsPage() {
  const { getToken } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] =
    useState("");
  const [semesterFilter, setSemesterFilter] =
    useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("");
  const [subjectTypeFilter, setSubjectTypeFilter] =
    useState("");
  const [boardFilter, setBoardFilter] =
    useState("");
  const [schemeYearFilter, setSchemeYearFilter] =
    useState("");

  // Selection
  const [selectedSubjects, setSelectedSubjects] =
    useState([]);
  const [deletingSelected, setDeletingSelected] =
    useState(false);

  // Add / Edit
  const [showAddModal, setShowAddModal] =
    useState(false);
  const [editingSubject, setEditingSubject] =
    useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Details
  const [showDetailsModal, setShowDetailsModal] =
    useState(false);
  const [viewingSubject, setViewingSubject] =
    useState(null);

  // Bulk upload
  const [showBulkModal, setShowBulkModal] =
    useState(false);
  const [selectedFile, setSelectedFile] =
    useState(null);
  const [uploading, setUploading] =
    useState(false);
  const [uploadResult, setUploadResult] =
    useState(null);

  // =====================================================
  // FETCH SUBJECTS
  // =====================================================

  const fetchSubjects = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/subjects/getsubjects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSubjects(response.data?.subjects || []);
      setSelectedSubjects([]);

    } catch (error) {
      console.error(
        "Failed to fetch subjects:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to load subjects."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // =====================================================
  // FILTER + SORT
  // SORTING IS NOW BY SEQUENCE NUMBER
  // =====================================================

  const filteredSubjects = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    return subjects
      .filter((subject) => {
        const sequence =
          getSequence(subject).toLowerCase();

        const matchesSearch =
          !searchText ||
          sequence.includes(searchText) ||
          subject.sequence
            ?.toString()
            .toLowerCase()
            .includes(searchText) ||
          subject.subjectId
            ?.toString()
            .toLowerCase()
            .includes(searchText) ||
          subject.code
            ?.toString()
            .toLowerCase()
            .includes(searchText) ||
          subject.name
            ?.toString()
            .toLowerCase()
            .includes(searchText) ||
          subject.department
            ?.toString()
            .toLowerCase()
            .includes(searchText) ||
          subject.subjectCategory
            ?.toString()
            .toLowerCase()
            .includes(searchText) ||
          subject.electiveGroup
            ?.toString()
            .toLowerCase()
            .includes(searchText) ||
          subject.board
            ?.toString()
            .toLowerCase()
            .includes(searchText);

        const matchesDepartment =
          !departmentFilter ||
          String(subject.department || "")
            .trim()
            .toLowerCase() ===
            departmentFilter.toLowerCase();

        const matchesSemester =
          !semesterFilter ||
          String(subject.semester || "") ===
            semesterFilter;

        const matchesCategory =
          !categoryFilter ||
          String(
            subject.subjectCategory || ""
          ).toUpperCase() ===
            categoryFilter.toUpperCase();

        const matchesSubjectType =
          !subjectTypeFilter ||
          String(
            subject.subjectType || ""
          ).toUpperCase() ===
            subjectTypeFilter.toUpperCase();

        const matchesBoard =
          !boardFilter ||
          String(subject.board || "")
            .toUpperCase() ===
            boardFilter.toUpperCase();

        const matchesSchemeYear =
          !schemeYearFilter ||
          String(subject.schemeYear || "") ===
            schemeYearFilter;

        return (
          matchesSearch &&
          matchesDepartment &&
          matchesSemester &&
          matchesCategory &&
          matchesSubjectType &&
          matchesBoard &&
          matchesSchemeYear
        );
      })
      .sort((a, b) => {
        // FIRST: sequence number
        const sequenceCompare =
          sequenceSort(a).localeCompare(
            sequenceSort(b),
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          );

        if (sequenceCompare !== 0) {
          return sequenceCompare;
        }

        // SECOND: subject name
        return String(a.name || "").localeCompare(
          String(b.name || ""),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        );
      });
  }, [
    subjects,
    search,
    departmentFilter,
    semesterFilter,
    categoryFilter,
    subjectTypeFilter,
    boardFilter,
    schemeYearFilter,
  ]);

  // =====================================================
  // RESET FILTERS
  // =====================================================

  const resetFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    setSemesterFilter("");
    setCategoryFilter("");
    setSubjectTypeFilter("");
    setBoardFilter("");
    setSchemeYearFilter("");
  };

  const hasActiveFilters =
    search ||
    departmentFilter ||
    semesterFilter ||
    categoryFilter ||
    subjectTypeFilter ||
    boardFilter ||
    schemeYearFilter;

  // =====================================================
  // SELECTION
  // =====================================================

  const isAllSelected =
    filteredSubjects.length > 0 &&
    filteredSubjects.every((subject) =>
      selectedSubjects.includes(subject._id)
    );

  const toggleSelectSubject = (id) => {
    setSelectedSubjects((previous) =>
      previous.includes(id)
        ? previous.filter(
            (item) => item !== id
          )
        : [...previous, id]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSubjects((previous) =>
        previous.filter(
          (id) =>
            !filteredSubjects.some(
              (subject) =>
                subject._id === id
            )
        )
      );
    } else {
      setSelectedSubjects((previous) => {
        const ids = filteredSubjects.map(
          (subject) => subject._id
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

  // =====================================================
  // FORM
  // =====================================================

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Regular / Bridge should not retain
    // an elective group.
    if (
      name === "subjectCategory" &&
      value !== "ELECTIVE"
    ) {
      setForm((previous) => ({
        ...previous,
        subjectCategory: value,
        electiveGroup: "",
      }));
    }
  };

  const openAddModal = () => {
    setEditingSubject(null);
    setForm({ ...emptyForm });
    setShowAddModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);

    setForm({
      subjectId: subject.subjectId || "",
      code: subject.code || "",
      name: subject.name || "",
      sequence:
        subject.sequence ||
        subject.sequenceNumber ||
        "",
      semester: subject.semester || "",
      department:
        subject.department || "",

      subjectCategory:
        subject.subjectCategory ||
        "REGULAR",
      electiveGroup:
        subject.electiveGroup || "",

      subjectType:
        subject.subjectType || "",
      board: subject.board || "",

      iaMax: subject.iaMax ?? "",
      iaMin: subject.iaMin ?? "",

      theoryExamMax:
        subject.theoryExamMax ?? "",
      theoryExamMin:
        subject.theoryExamMin ?? "",

      practicalExamMax:
        subject.practicalExamMax ?? "",
      practicalExamMin:
        subject.practicalExamMin ?? "",

      totalMax:
        subject.totalMax ?? "",
      totalMin:
        subject.totalMin ?? "",

      credit: subject.credit ?? "",

      schemeYear:
        subject.schemeYear || "2025",
    });

    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (saving) return;

    setShowAddModal(false);
    setEditingSubject(null);
    setForm({ ...emptyForm });
  };

  // =====================================================
  // SAVE SUBJECT
  // =====================================================

  const handleSaveSubject = async (e) => {
    e.preventDefault();

    const category =
      String(
        form.subjectCategory || "REGULAR"
      ).toUpperCase();

    if (
      category === "ELECTIVE" &&
      !form.electiveGroup.trim()
    ) {
      alert(
        "Elective Group is required for an elective subject."
      );
      return;
    }

    if (
      !form.subjectId.trim() ||
      !form.code.trim() ||
      !form.name.trim() ||
      !form.sequence.trim() ||
      !form.semester ||
      !form.department ||
      !form.subjectType ||
      !form.board
    ) {
      alert(
        "Please fill all required subject details."
      );
      return;
    }

    // Sequence format used by backend:
    // 1AT01, 3CS05, etc.
    const sequence = form.sequence
      .trim()
      .toUpperCase();

    if (!/^[1-8][A-Z]{2}\d{2}$/.test(sequence)) {
      alert(
        "Invalid Sequence. Use format like 1AT01, 3CS05 or 5EC03."
      );
      return;
    }

    const sequenceSemester =
      Number(sequence.substring(0, 1));

    const sequenceDepartment =
      sequence.substring(1, 3);

    if (
      sequenceSemester !==
      Number(form.semester)
    ) {
      alert(
        `Sequence ${sequence} does not belong to Semester ${form.semester}.`
      );
      return;
    }

    if (
      sequenceDepartment !==
      form.department
        .trim()
        .toUpperCase()
    ) {
      alert(
        `Sequence ${sequence} does not belong to department ${form.department.toUpperCase()}.`
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      const payload = {
        subjectId:
          form.subjectId.trim().toUpperCase(),

        code:
          form.code.trim().toUpperCase(),

        name: form.name.trim(),

        sequence,

        semester: Number(form.semester),

        department:
          form.department
            .trim()
            .toUpperCase(),

        subjectCategory: category,

        electiveGroup:
          category === "ELECTIVE"
            ? form.electiveGroup
                .trim()
                .toUpperCase()
            : "",

        subjectType:
          form.subjectType
            .trim()
            .toUpperCase(),

        board:
          form.board
            .trim()
            .toUpperCase(),

        iaMax:
          numberValue(form.iaMax),

        iaMin:
          numberValue(form.iaMin),

        theoryExamMax:
          numberValue(
            form.theoryExamMax
          ),

        theoryExamMin:
          numberValue(
            form.theoryExamMin
          ),

        practicalExamMax:
          numberValue(
            form.practicalExamMax
          ),

        practicalExamMin:
          numberValue(
            form.practicalExamMin
          ),

        totalMax:
          numberValue(form.totalMax),

        totalMin:
          numberValue(form.totalMin),

        credit:
          numberValue(form.credit),

        schemeYear:
          numberValue(
            form.schemeYear
          ) || 2025,
      };

      if (editingSubject) {
        await axios.put(
          `${API_URL}/api/subjects/updatesubject/${editingSubject._id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        await axios.post(
          `${API_URL}/api/subjects/addsubject`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      closeAddModal();
      await fetchSubjects();
    } catch (error) {
      console.error(
        "Save subject error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to save subject."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DETAILS
  // =====================================================

  const openDetailsModal = (subject) => {
    setViewingSubject(subject);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setViewingSubject(null);
  };

  // =====================================================
  // DELETE SINGLE
  // =====================================================

  const handleDelete = async (subject) => {
    const confirmed = window.confirm(
      `Delete "${subject.code} - ${subject.name}"?`
    );

    if (!confirmed) return;

    try {
      const token = await getToken();

      await axios.delete(
        `${API_URL}/api/subjects/deletesubject/${subject._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchSubjects();
    } catch (error) {
      console.error(
        "Delete subject error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to delete subject."
      );
    }
  };

  // =====================================================
  // DELETE SELECTED
  // =====================================================

  const handleDeleteSelected = async () => {
    if (selectedSubjects.length === 0) return;

    const selected = subjects.filter(
      (subject) =>
        selectedSubjects.includes(
          subject._id
        )
    );

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selected.length} selected subject${
        selected.length !== 1
          ? "s"
          : ""
      }?`
    );

    if (!confirmed) return;

    try {
      setDeletingSelected(true);

      const token = await getToken();

      await Promise.all(
        selected.map((subject) =>
          axios.delete(
            `${API_URL}/api/subjects/deletesubject/${subject._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );

      await fetchSubjects();
    } catch (error) {
      console.error(
        "Bulk subject delete error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to delete selected subjects."
      );
    } finally {
      setDeletingSelected(false);
    }
  };

  // =====================================================
  // BULK UPLOAD
  // =====================================================

  const openBulkModal = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setShowBulkModal(true);
  };

  const closeBulkModal = () => {
    if (uploading) return;

    setShowBulkModal(false);
    setSelectedFile(null);
    setUploadResult(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      alert(
        "Please select a CSV file."
      );
      e.target.value = "";
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      alert(
        "File size must be less than 5 MB."
      );
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      alert(
        "Please select a CSV file first."
      );
      return;
    }

    try {
      setUploading(true);
      setUploadResult(null);

      const token = await getToken();

      const formData = new FormData();

      formData.append(
        "file",
        selectedFile
      );

      const response = await axios.post(
        `${API_URL}/api/subjects/bulk-upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUploadResult(
        response.data
      );

      await fetchSubjects();
    } catch (error) {
      console.error(
        "Bulk upload error:",
        error
      );

      setUploadResult({
        success: false,
        message:
          error.response?.data
            ?.message ||
          error.response?.data
            ?.error ||
          "Bulk upload failed.",
      });
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // DOWNLOAD FULL CSV TEMPLATE
  // =====================================================

  const downloadTemplate = () => {
    const headers = [
      "subjectId",
      "code",
      "name",
      "sequence",
      "semester",
      "department",
      "subjectCategory",
      "electiveGroup",
      "subjectType",
      "board",
      "iaMax",
      "iaMin",
      "theoryExamMax",
      "theoryExamMin",
      "practicalExamMax",
      "practicalExamMin",
      "totalMax",
      "totalMin",
      "credit",
      "schemeYear",
    ];

    const rows = [
      [
        "25CS101T",
        "25CS101T",
        "Engineering Mathematics-I",
        "1CS01",
        "1",
        "CS",
        "REGULAR",
        "",
        "IT",
        "SC",
        "50",
        "20",
        "50",
        "20",
        "0",
        "0",
        "100",
        "40",
        "6",
        "2025",
      ],
      [
        "25CS102P",
        "25CS102P",
        "Programming Fundamentals",
        "1CS02",
        "1",
        "CS",
        "REGULAR",
        "",
        "IP",
        "CS",
        "50",
        "20",
        "0",
        "0",
        "50",
        "20",
        "100",
        "40",
        "5",
        "2025",
      ],
      [
        "25CS301T",
        "25CS301T",
        "Professional Elective",
        "3CS05",
        "3",
        "CS",
        "ELECTIVE",
        "A",
        "IT",
        "CS",
        "50",
        "20",
        "50",
        "20",
        "0",
        "0",
        "100",
        "40",
        "5",
        "2025",
      ],
      [
        "25CSB01",
        "25CSB01",
        "Bridge Course",
        "3CS06",
        "3",
        "CS",
        "BRIDGE",
        "",
        "I",
        "CS",
        "50",
        "20",
        "0",
        "0",
        "0",
        "0",
        "50",
        "20",
        "2",
        "2025",
      ],
    ];

    const escapeCsv = (value) => {
      const text = String(
        value ?? ""
      );

      if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
      ) {
        return `"${text.replace(
          /"/g,
          '""'
        )}"`;
      }

      return text;
    };

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map(escapeCsv).join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      window.URL.createObjectURL(
        blob
      );

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "subjects_template.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

  // =====================================================
  // DOWNLOAD FILTERED EXCEL
  // =====================================================

  const handleDownloadExcel = () => {
    if (
      filteredSubjects.length === 0
    ) {
      alert(
        "No subjects available to download."
      );
      return;
    }

    const excelData =
      filteredSubjects.map(
        (subject, index) => ({
          "Sl. No.":
            index + 1,

          "Sequence Number":
            subject.sequenceNumber ||
            subject.sequence ||
            "",

          Sequence:
            subject.sequence || "",

          "Subject ID":
            subject.subjectId || "",

          "Subject Code":
            subject.code || "",

          "Subject Name":
            subject.name || "",

          Semester:
            subject.semester || "",

          "Department Code":
            getDepartmentShortName(
              subject.department
            ),

          Department:
            getDepartmentName(
              subject.department
            ),

          "Subject Category":
            subject.subjectCategory ||
            "",

          "Elective Group":
            subject.electiveGroup ||
            "",

          "Subject Type":
            subject.subjectType ||
            "",

          "Subject Type Name":
            getSubjectTypeName(
              subject.subjectType
            ),

          Board:
            subject.board || "",

          "IA Max":
            subject.iaMax ?? 0,

          "IA Min":
            subject.iaMin ?? 0,

          "Theory Exam Max":
            subject.theoryExamMax ??
            0,

          "Theory Exam Min":
            subject.theoryExamMin ??
            0,

          "Practical Exam Max":
            subject.practicalExamMax ??
            0,

          "Practical Exam Min":
            subject.practicalExamMin ??
            0,

          "Total Max":
            subject.totalMax ?? 0,

          "Total Min":
            subject.totalMin ?? 0,

          Credit:
            subject.credit ?? 0,

          "Scheme Year":
            subject.schemeYear || "",
        })
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 42 },
      { wch: 10 },
      { wch: 15 },
      { wch: 30 },
      { wch: 18 },
      { wch: 16 },
      { wch: 15 },
      { wch: 28 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Subjects"
    );

    let fileName =
      "Subjects_Sequence_Wise";

    if (departmentFilter) {
      fileName += `_${getDepartmentShortName(
        departmentFilter
      )}`;
    }

    if (semesterFilter) {
      fileName += `_Sem_${semesterFilter}`;
    }

    if (categoryFilter) {
      fileName += `_${categoryFilter}`;
    }

    fileName =
      fileName.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

    XLSX.writeFile(
      workbook,
      `${fileName}.xlsx`
    );
  };

  // =====================================================
  // SMALL REUSABLE UI HELPERS
  // =====================================================

  const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-50";

  const formInputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-50";

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-7">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M4 5h16v14H4z" />
                <path d="M8 9h8" />
                <path d="M8 13h8" />
                <path d="M8 17h5" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Subjects
              </h1>

              <p className="mt-0.5 text-sm text-slate-500">
                {subjects.length} subject
                {subjects.length !== 1
                  ? "s"
                  : ""}{" "}
                • sequence-wise
              </p>
            </div>

          </div>
        </div>

        <div className="flex flex-wrap gap-2">

          <button
            onClick={
              handleDownloadExcel
            }
            disabled={
              filteredSubjects.length ===
              0
            }
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>

            Excel
          </button>

          <button
            onClick={
              openBulkModal
            }
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50"
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
            onClick={
              openAddModal
            }
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            <span className="text-lg leading-none">
              +
            </span>

            Add Subject
          </button>

        </div>
      </div>

      {/* =================================================
          FILTER TOOLBAR
      ================================================= */}

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

        <div className="mb-3 flex items-center justify-between">

          <div>
            <p className="text-sm font-bold text-slate-800">
              Subject Filters
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              Subjects are always displayed in sequence order.
            </p>
          </div>

          {hasActiveFilters && (
            <button
              onClick={
                resetFilters
              }
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
            >
              Clear Filters
            </button>
          )}

        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">

          {/* SEARCH */}

          <div className="relative lg:col-span-2 xl:col-span-2">

            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />
              <path d="m20 20-4-4" />
            </svg>

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search sequence, ID, code or subject..."
              className={`${inputClass} pl-10`}
            />

          </div>

          {/* DEPARTMENT */}

          <select
            value={
              departmentFilter
            }
            onChange={(e) =>
              setDepartmentFilter(
                e.target.value
              )
            }
            className={inputClass}
          >
            <option value="">
              All Departments
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
                  {department.label}
                </option>
              )
            )}
          </select>

          {/* SEMESTER */}

          <select
            value={
              semesterFilter
            }
            onChange={(e) =>
              setSemesterFilter(
                e.target.value
              )
            }
            className={inputClass}
          >
            <option value="">
              All Semesters
            </option>

            {semesters.map(
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

          {/* CATEGORY */}

          <select
            value={
              categoryFilter
            }
            onChange={(e) =>
              setCategoryFilter(
                e.target.value
              )
            }
            className={inputClass}
          >
            <option value="">
              Regular / Elective / Bridge
            </option>

            {subjectCategories.map(
              (category) => (
                <option
                  key={
                    category.value
                  }
                  value={
                    category.value
                  }
                >
                  {category.label}
                </option>
              )
            )}
          </select>

          {/* SUBJECT TYPE */}

          <select
            value={
              subjectTypeFilter
            }
            onChange={(e) =>
              setSubjectTypeFilter(
                e.target.value
              )
            }
            className={inputClass}
          >
            <option value="">
              All Subject Types
            </option>

            {subjectTypes.map(
              (type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.value}
                </option>
              )
            )}
          </select>

          {/* BOARD */}

          <select
            value={boardFilter}
            onChange={(e) =>
              setBoardFilter(
                e.target.value
              )
            }
            className={inputClass}
          >
            <option value="">
              All Boards
            </option>

            {boards.map((board) => (
              <option
                key={board}
                value={board}
              >
                {board}
              </option>
            ))}
          </select>

          {/* SCHEME */}

          <select
            value={
              schemeYearFilter
            }
            onChange={(e) =>
              setSchemeYearFilter(
                e.target.value
              )
            }
            className={inputClass}
          >
            <option value="">
              All Schemes
            </option>

            {schemeYears.map(
              (year) => (
                <option
                  key={year}
                  value={year}
                >
                  Scheme {year}
                </option>
              )
            )}
          </select>

        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">

          <span>
            Showing{" "}
            <span className="font-bold text-slate-700">
              {
                filteredSubjects.length
              }
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-700">
              {subjects.length}
            </span>{" "}
            subjects
          </span>

          <span className="text-slate-300">
            •
          </span>

          <span className="font-medium text-amber-700">
            Sorted by Sequence Number
          </span>

        </div>
      </div>

      {/* =================================================
          BULK DELETE BAR
      ================================================= */}

      {selectedSubjects.length >
        0 && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">

          <p className="text-xs font-semibold text-red-700">
            {
              selectedSubjects.length
            }{" "}
            subject
            {selectedSubjects.length !==
            1
              ? "s"
              : ""}{" "}
            selected
          </p>

          <div className="flex gap-2">

            <button
              onClick={() =>
                setSelectedSubjects(
                  []
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>

            <button
              onClick={
                handleDeleteSelected
              }
              disabled={
                deletingSelected
              }
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deletingSelected
                ? "Deleting..."
                : `Delete ${selectedSubjects.length}`}
            </button>

          </div>
        </div>
      )}

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
          </div>
        ) : filteredSubjects.length ===
          0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-xl">
              📚
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-900">
              No subjects found
            </h3>

            <p className="mt-1 max-w-md text-xs text-slate-400">
              {hasActiveFilters
                ? "Try changing the filters."
                : "Add a subject or upload subjects in bulk."}
            </p>

          </div>
        ) : (
          <div
            className="no-scrollbar table-horizontal-scroll overflow-x-auto overflow-y-hidden"
            onWheel={(e) => {
              const container = e.currentTarget;

              // Move the table horizontally with the normal mouse wheel.
              // This keeps the visible scrollbar hidden while still allowing
              // easy horizontal movement.
              if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                container.scrollLeft += e.deltaY;
                e.preventDefault();
              }
            }}
          >

            <table className="w-max min-w-[1900px] border-collapse">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">

                  <th className="sticky left-0 z-30 w-12 border-r border-slate-200 bg-slate-50 px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={
                        isAllSelected
                      }
                      onChange={
                        toggleSelectAll
                      }
                      className="h-4 w-4 cursor-pointer accent-amber-500"
                    />
                  </th>

                  <th className="sticky left-12 z-30 w-14 border-r border-slate-200 bg-slate-50 px-2 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    #
                  </th>

                  <th className="sticky left-[104px] z-30 w-28 border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Sequence
                  </th>

                  <th className="sticky left-[216px] z-30 w-40 border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Subject ID
                  </th>

                  <th className="sticky left-[376px] z-30 w-32 border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Code
                  </th>

                  <th className="sticky left-[504px] z-30 w-72 border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Subject
                  </th>

                  <th className="w-24 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Sem
                  </th>

                  <th className="w-40 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Department
                  </th>

                  <th className="w-28 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Category
                  </th>

                  <th className="w-28 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Elective
                  </th>

                  <th className="w-28 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Type
                  </th>

                  <th className="w-20 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Board
                  </th>

                  <th className="w-20 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    IA Max
                  </th>

                  <th className="w-20 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    IA Min
                  </th>

                  <th className="w-24 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Theory Max
                  </th>

                  <th className="w-24 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Theory Min
                  </th>

                  <th className="w-24 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Practical Max
                  </th>

                  <th className="w-24 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Practical Min
                  </th>

                  <th className="w-20 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Total Max
                  </th>

                  <th className="w-20 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Total Min
                  </th>

                  <th className="w-20 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Credit
                  </th>

                  <th className="w-24 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Scheme
                  </th>

                  <th className="sticky right-0 z-30 w-28 border-l border-slate-200 bg-slate-50 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredSubjects.map(
                  (subject, index) => {
                    const selected =
                      selectedSubjects.includes(
                        subject._id
                      );

                    const sequence =
                      getSequence(
                        subject
                      );

                    return (
                      <tr
                        key={
                          subject._id
                        }
                        className={`transition ${
                          selected
                            ? "bg-amber-50/50"
                            : "hover:bg-slate-50"
                        }`}
                      >

                        <td className="sticky left-0 z-20 border-r border-slate-100 bg-white px-2 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={
                              selected
                            }
                            onChange={() =>
                              toggleSelectSubject(
                                subject._id
                              )
                            }
                            className="h-4 w-4 cursor-pointer accent-amber-500"
                          />
                        </td>

                        <td className="sticky left-12 z-20 border-r border-slate-100 bg-white px-2 py-3 text-sm font-medium text-slate-400">
                          {index + 1}
                        </td>

                        <td className="sticky left-[104px] z-20 border-r border-slate-100 bg-white px-3 py-3">
                          <span className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                            {sequence ||
                              "—"}
                          </span>
                        </td>

                        <td className="sticky left-[216px] z-20 border-r border-slate-100 bg-white px-3 py-3">
                          <span className="whitespace-nowrap text-xs font-semibold text-slate-700">
                            {subject.subjectId ||
                              "—"}
                          </span>
                        </td>

                        <td className="sticky left-[376px] z-20 border-r border-slate-100 bg-white px-3 py-3">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">
                            {subject.code ||
                              "—"}
                          </span>
                        </td>

                        <td className="sticky left-[504px] z-20 border-r border-slate-100 bg-white px-3 py-3">
                          <p className="max-w-[270px] truncate text-sm font-semibold text-slate-900">
                            {subject.name ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                            {subject.semester ||
                              "—"}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span className="whitespace-nowrap text-xs font-semibold text-slate-600">
                            {getDepartmentName(
                              subject.department
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                              String(
                                subject.subjectCategory ||
                                  ""
                              ).toUpperCase() ===
                              "BRIDGE"
                                ? "bg-blue-50 text-blue-700"
                                : String(
                                    subject.subjectCategory ||
                                      ""
                                  ).toUpperCase() ===
                                  "ELECTIVE"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {getCategoryName(
                              subject.subjectCategory
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-xs font-semibold text-slate-600">
                          {subject.electiveGroup ||
                            "—"}
                        </td>

                        <td className="px-3 py-3">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                            {subject.subjectType ||
                              "—"}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-xs font-semibold text-slate-600">
                          {subject.board ||
                            "—"}
                        </td>

                        <td className="px-3 py-3 text-xs text-slate-600">
                          {subject.iaMax ??
                            0}
                        </td>

                        <td className="px-3 py-3 text-xs text-slate-600">
                          {subject.iaMin ??
                            0}
                        </td>

                        <td className="px-3 py-3 text-xs text-slate-600">
                          {subject.theoryExamMax ??
                            0}
                        </td>

                        <td className="px-3 py-3 text-xs text-slate-600">
                          {subject.theoryExamMin ??
                            0}
                        </td>

                        <td className="px-3 py-3 text-xs text-slate-600">
                          {subject.practicalExamMax ??
                            0}
                        </td>

                        <td className="px-3 py-3 text-xs text-slate-600">
                          {subject.practicalExamMin ??
                            0}
                        </td>

                        <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                          {subject.totalMax ??
                            0}
                        </td>

                        <td className="px-3 py-3 text-xs text-slate-600">
                          {subject.totalMin ??
                            0}
                        </td>

                        <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                          {subject.credit ??
                            0}
                        </td>

                        <td className="px-3 py-3 text-xs font-semibold text-slate-600">
                          {subject.schemeYear ||
                            "—"}
                        </td>

                        <td className="sticky right-0 z-20 border-l border-slate-100 bg-white px-3 py-3">
                          <div className="flex justify-end gap-1.5">

                            <button
                              onClick={() =>
                                openDetailsModal(
                                  subject
                                )
                              }
                              title="View details"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                viewBox="0 0 24 24"
                              >
                                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="2.5"
                                />
                              </svg>
                            </button>

                            <button
                              onClick={() =>
                                openEditModal(
                                  subject
                                )
                              }
                              title="Edit"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                              </svg>
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(
                                  subject
                                )
                              }
                              title="Delete"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                viewBox="0 0 24 24"
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

      {/* =================================================
          TABLE SCROLL NOTE
      ================================================= */}

      {filteredSubjects.length >
        0 && (
        <div className="mt-2 flex items-center justify-between px-1">

          <p className="text-[11px] text-slate-400">
            Sequence, Subject ID, Code and
            Subject remain fixed while the
            remaining columns can be moved
            horizontally.
          </p>

          <p className="text-[11px] font-semibold text-amber-600">
            {filteredSubjects.length} shown
          </p>

        </div>
      )}

      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={
              closeAddModal
            }
          />

          <div className="relative max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  {editingSubject
                    ? "Edit Subject"
                    : "Add Subject"}
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Enter complete subject, sequence, category and marks details.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeAddModal
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              >
                ✕
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSaveSubject
              }
              className="no-scrollbar max-h-[calc(94vh-74px)] overflow-y-auto p-5"
            >

              {/* BASIC */}

              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">

                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-800">
                    Basic Subject Information
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Subject ID, code, name and sequence.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                  {/* SUBJECT ID */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Subject ID *
                    </label>

                    <input
                      name="subjectId"
                      value={
                        form.subjectId
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="25CS340PA"
                      required
                      className={
                        formInputClass
                      }
                    />
                  </div>

                  {/* CODE */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Subject Code *
                    </label>

                    <input
                      name="code"
                      value={
                        form.code
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="25CS340"
                      required
                      className={
                        formInputClass
                      }
                    />
                  </div>

                  {/* SEQUENCE */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">
                      Sequence Number *
                    </label>

                    <input
                      name="sequence"
                      value={
                        form.sequence
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="3CS05"
                      required
                      className={`${formInputClass} font-semibold uppercase`}
                    />

                    <p className="mt-1 text-[11px] text-slate-400">
                      Example: 1AT01, 3CS05, 5EC03
                    </p>
                  </div>

                  {/* NAME */}

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Subject Name *
                    </label>

                    <input
                      name="name"
                      value={
                        form.name
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Data Structures"
                      required
                      className={
                        formInputClass
                      }
                    />
                  </div>

                </div>
              </div>

              {/* ACADEMIC */}

              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">

                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-800">
                    Academic Classification
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Semester, department, regular/elective/bridge and subject type.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                  {/* SEMESTER */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Semester *
                    </label>

                    <select
                      name="semester"
                      value={
                        form.semester
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                      className={
                        formInputClass
                      }
                    >
                      <option value="">
                        Select semester
                      </option>

                      {semesters.map(
                        (
                          semester
                        ) => (
                          <option
                            key={
                              semester
                            }
                            value={
                              semester
                            }
                          >
                            Semester{" "}
                            {
                              semester
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* DEPARTMENT */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Department *
                    </label>

                    <select
                      name="department"
                      value={
                        form.department
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                      className={
                        formInputClass
                      }
                    >
                      <option value="">
                        Select department
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

                  {/* CATEGORY */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Subject Category *
                    </label>

                    <select
                      name="subjectCategory"
                      value={
                        form.subjectCategory
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                      className={
                        formInputClass
                      }
                    >
                      {subjectCategories.map(
                        (
                          category
                        ) => (
                          <option
                            key={
                              category.value
                            }
                            value={
                              category.value
                            }
                          >
                            {
                              category.label
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* ELECTIVE GROUP */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Elective Group
                      {form.subjectCategory ===
                        "ELECTIVE" && (
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      )}
                    </label>

                    <input
                      name="electiveGroup"
                      value={
                        form.electiveGroup
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        form.subjectCategory !==
                        "ELECTIVE"
                      }
                      placeholder="A / B / C"
                      className={`${formInputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                    />
                  </div>

                  {/* SUBJECT TYPE */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Subject Type *
                    </label>

                    <select
                      name="subjectType"
                      value={
                        form.subjectType
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                      className={
                        formInputClass
                      }
                    >
                      <option value="">
                        Select type
                      </option>

                      {subjectTypes.map(
                        (
                          type
                        ) => (
                          <option
                            key={
                              type.value
                            }
                            value={
                              type.value
                            }
                          >
                            {
                              type.label
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* BOARD */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Board *
                    </label>

                    <select
                      name="board"
                      value={
                        form.board
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                      className={
                        formInputClass
                      }
                    >
                      <option value="">
                        Select board
                      </option>

                      {boards.map(
                        (board) => (
                          <option
                            key={board}
                            value={board}
                          >
                            {board}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* SCHEME YEAR */}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                      Scheme Year *
                    </label>

                    <select
                      name="schemeYear"
                      value={
                        form.schemeYear
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                      className={
                        formInputClass
                      }
                    >
                      {schemeYears.map(
                        (year) => (
                          <option
                            key={year}
                            value={year}
                          >
                            {year}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                </div>
              </div>

              {/* MARKS */}

              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">

                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-800">
                    Marks & Credit
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Enter maximum and minimum marks as defined in the scheme.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                  {[
                    [
                      "iaMax",
                      "IA Max",
                    ],
                    [
                      "iaMin",
                      "IA Min",
                    ],
                    [
                      "theoryExamMax",
                      "Theory Exam Max",
                    ],
                    [
                      "theoryExamMin",
                      "Theory Exam Min",
                    ],
                    [
                      "practicalExamMax",
                      "Practical Exam Max",
                    ],
                    [
                      "practicalExamMin",
                      "Practical Exam Min",
                    ],
                    [
                      "totalMax",
                      "Total Max",
                    ],
                    [
                      "totalMin",
                      "Total Min",
                    ],
                    [
                      "credit",
                      "Credit",
                    ],
                  ].map(
                    ([field, label]) => (
                      <div
                        key={
                          field
                        }
                      >
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          {label}
                        </label>

                        <input
                          type="number"
                          min="0"
                          name={
                            field
                          }
                          value={
                            form[
                              field
                            ]
                          }
                          onChange={
                            handleFormChange
                          }
                          className={
                            formInputClass
                          }
                        />
                      </div>
                    )
                  )}

                </div>
              </div>

              {/* FOOTER */}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">

                <button
                  type="button"
                  onClick={
                    closeAddModal
                  }
                  disabled={
                    saving
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingSubject
                    ? "Save Changes"
                    : "Add Subject"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* =================================================
          DETAILS MODAL
      ================================================= */}

      {showDetailsModal &&
        viewingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">

            <div
              className="absolute inset-0"
              onClick={
                closeDetailsModal
              }
            />

            <div className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Subject Details
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {getSequence(
                      viewingSubject
                    )}{" "}
                    •{" "}
                    {viewingSubject.code ||
                      "—"}{" "}
                    •{" "}
                    {viewingSubject.name ||
                      "—"}
                  </p>
                </div>

                <button
                  onClick={
                    closeDetailsModal
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                >
                  ✕
                </button>

              </div>

              <div className="no-scrollbar max-h-[calc(92vh-75px)] overflow-y-auto p-5">

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  {[
                    [
                      "Sequence",
                      getSequence(
                        viewingSubject
                      ),
                    ],
                    [
                      "Subject ID",
                      viewingSubject.subjectId,
                    ],
                    [
                      "Code",
                      viewingSubject.code,
                    ],
                    [
                      "Name",
                      viewingSubject.name,
                    ],
                    [
                      "Semester",
                      viewingSubject.semester,
                    ],
                    [
                      "Department",
                      getDepartmentName(
                        viewingSubject.department
                      ),
                    ],
                    [
                      "Category",
                      getCategoryName(
                        viewingSubject.subjectCategory
                      ),
                    ],
                    [
                      "Elective Group",
                      viewingSubject.electiveGroup ||
                        "—",
                    ],
                    [
                      "Subject Type",
                      getSubjectTypeName(
                        viewingSubject.subjectType
                      ),
                    ],
                    [
                      "Board",
                      viewingSubject.board,
                    ],
                    [
                      "Scheme Year",
                      viewingSubject.schemeYear,
                    ],
                    [
                      "IA Max",
                      viewingSubject.iaMax ??
                        0,
                    ],
                    [
                      "IA Min",
                      viewingSubject.iaMin ??
                        0,
                    ],
                    [
                      "Theory Exam Max",
                      viewingSubject.theoryExamMax ??
                        0,
                    ],
                    [
                      "Theory Exam Min",
                      viewingSubject.theoryExamMin ??
                        0,
                    ],
                    [
                      "Practical Exam Max",
                      viewingSubject.practicalExamMax ??
                        0,
                    ],
                    [
                      "Practical Exam Min",
                      viewingSubject.practicalExamMin ??
                        0,
                    ],
                    [
                      "Total Max",
                      viewingSubject.totalMax ??
                        0,
                    ],
                    [
                      "Total Min",
                      viewingSubject.totalMin ??
                        0,
                    ],
                    [
                      "Credit",
                      viewingSubject.credit ??
                        0,
                    ],
                  ].map(
                    ([label, value]) => (
                      <div
                        key={
                          label
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {label}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {value ||
                            value ===
                              0
                            ? value
                            : "—"}
                        </p>
                      </div>
                    )
                  )}

                </div>

                <div className="mt-5 flex justify-end">

                  <button
                    onClick={() => {
                      closeDetailsModal();
                      openEditModal(
                        viewingSubject
                      );
                    }}
                    className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    Edit Subject
                  </button>

                </div>

              </div>
            </div>
          </div>
        )}

      {/* =================================================
          BULK UPLOAD MODAL
      ================================================= */}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={
              closeBulkModal
            }
          />

          <div className="relative max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Bulk Upload Subjects
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Upload the complete subject CSV with sequence, category and marks.
                </p>
              </div>

              <button
                onClick={
                  closeBulkModal
                }
                disabled={
                  uploading
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                ✕
              </button>

            </div>

            <div className="no-scrollbar max-h-[calc(94vh-75px)] overflow-y-auto p-5">

              {/* INFO */}

              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4">

                <p className="text-sm font-bold text-amber-900">
                  CSV format
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Required columns:
                </p>

                <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[11px] leading-5 text-amber-900">
                  subjectId, code, name, sequence,
                  semester, department,
                  subjectCategory, electiveGroup,
                  subjectType, board, iaMax, iaMin,
                  theoryExamMax, theoryExamMin,
                  practicalExamMax,
                  practicalExamMin, totalMax,
                  totalMin, credit, schemeYear
                </p>

                <div className="mt-3 grid gap-1 text-[11px] text-amber-800 sm:grid-cols-2">

                  <span>
                    • subjectCategory:
                    REGULAR / ELECTIVE / BRIDGE
                  </span>

                  <span>
                    • electiveGroup is required only for ELECTIVE
                  </span>

                  <span>
                    • sequence example: 1AT01 / 3CS05
                  </span>

                  <span>
                    • sequence must match semester and department
                  </span>

                  <span>
                    • subjectType: IT / IP / I
                  </span>

                  <span>
                    • subjects are displayed sequence-wise
                  </span>

                </div>

              </div>

              {/* FILE */}

              <label
                htmlFor="subject-csv"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  selectedFile
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/40"
                }`}
              >

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">

                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M5 20h14" />
                  </svg>

                </div>

                {selectedFile ? (
                  <>
                    <p className="mt-3 text-sm font-bold text-slate-900">
                      {
                        selectedFile.name
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {(
                        selectedFile.size /
                        1024
                      ).toFixed(
                        1
                      )}{" "}
                      KB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-sm font-bold text-slate-800">
                      Click to select CSV
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Maximum 5 MB
                    </p>
                  </>
                )}

                <input
                  id="subject-csv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={
                    handleFileChange
                  }
                  className="hidden"
                />

              </label>

              {/* TEMPLATE */}

              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Need a template?
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Download the complete template with regular, elective and bridge examples.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    downloadTemplate
                  }
                  disabled={
                    uploading
                  }
                  className="shrink-0 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  Download Template
                </button>

              </div>

              {/* RESULT */}

              {uploadResult && (
                <div
                  className={`mt-4 rounded-2xl border p-4 ${
                    uploadResult.success
                      ? "border-emerald-100 bg-emerald-50"
                      : "border-red-100 bg-red-50"
                  }`}
                >

                  {uploadResult.success ? (
                    <>
                      <p className="text-sm font-bold text-emerald-800">
                        Upload completed
                      </p>

                      {uploadResult.summary && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">

                          <div className="rounded-xl bg-white p-2">
                            <p className="text-lg font-bold text-slate-900">
                              {
                                uploadResult.summary.totalRows
                              }
                            </p>

                            <p className="text-[10px] uppercase text-slate-400">
                              Total
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-2">
                            <p className="text-lg font-bold text-emerald-600">
                              {
                                uploadResult.summary.inserted
                              }
                            </p>

                            <p className="text-[10px] uppercase text-slate-400">
                              Added
                            </p>
                          </div>

                          <div className="rounded-xl bg-white p-2">
                            <p className="text-lg font-bold text-red-600">
                              {
                                uploadResult.summary.failed
                              }
                            </p>

                            <p className="text-[10px] uppercase text-slate-400">
                              Failed
                            </p>
                          </div>

                        </div>
                      )}

                      {uploadResult.errors?.length >
                        0 && (
                        <div className="mt-3 max-h-40 overflow-y-auto rounded-xl bg-white p-3">

                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Errors
                          </p>

                          <div className="space-y-1.5">
                            {uploadResult.errors.map(
                              (
                                error,
                                index
                              ) => (
                                <p
                                  key={
                                    index
                                  }
                                  className="text-xs text-red-600"
                                >
                                  {error.row && (
                                    <span className="font-bold">
                                      Row{" "}
                                      {
                                        error.row
                                      }
                                      :{" "}
                                    </span>
                                  )}

                                  {
                                    error.message
                                  }
                                </p>
                              )
                            )}
                          </div>

                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-red-700">
                      {
                        uploadResult.message
                      }
                    </p>
                  )}

                </div>
              )}

              {/* FOOTER */}

              <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">

                <button
                  onClick={
                    closeBulkModal
                  }
                  disabled={
                    uploading
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Close
                </button>

                {!uploadResult?.success && (
                  <button
                    onClick={
                      handleBulkUpload
                    }
                    disabled={
                      !selectedFile ||
                      uploading
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Subjects"
                    )}
                  </button>
                )}

                {uploadResult?.success && (
                  <button
                    onClick={
                      closeBulkModal
                    }
                    className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    Done
                  </button>
                )}

              </div>

            </div>
          </div>
        </div>
      )}

      {/* =================================================
          HIDDEN SCROLLBAR
      ================================================= */}

      <style jsx global>{`
        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .table-horizontal-scroll {
          width: 100%;
          max-width: 100%;
          overscroll-behavior-x: contain;
          overscroll-behavior-y: none;
          cursor: grab;
          -webkit-overflow-scrolling: touch;
        }

        .table-horizontal-scroll:active {
          cursor: grabbing;
        }

        .table-horizontal-scroll table {
          width: max-content;
          min-width: 1900px;
        }
      `}</style>

    </div>
  );
}
