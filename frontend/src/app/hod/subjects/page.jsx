"use client";

import { useEffect, useMemo, useState } from "react";
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

// =====================================================
// MASTER DATA
// Same values as the admin subject page.
// =====================================================

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

const marksFields = [
  ["iaMax", "IA Max"],
  ["iaMin", "IA Min"],
  ["theoryExamMax", "Theory Exam Max"],
  ["theoryExamMin", "Theory Exam Min"],
  ["practicalExamMax", "Practical Exam Max"],
  ["practicalExamMin", "Practical Exam Min"],
  ["totalMax", "Total Max"],
  ["totalMin", "Total Min"],
  ["credit", "Credit"],
];

// Department is not part of the form.
// It is always the HOD's own department.

const emptyForm = {
  subjectId: "",
  code: "",
  name: "",
  sequence: "",
  semester: "",

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

const getDepartmentName = (value) => {
  return (
    departments.find(
      (department) =>
        department.value ===
        value?.trim().toLowerCase()
    )?.label || value || "—"
  );
};

export default function HODSubjectsPage() {
  const { getToken } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [hodDepartment, setHodDepartment] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // =====================================================
  // FETCH HOD + SUBJECTS
  // =====================================================

  const fetchSubjects = async () => {
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
        meResponse.data?.data ||
        meResponse.data;

      const department =
        me?.department
          ?.trim()
          .toLowerCase() || "";

      if (!department) {
        setError(
          "Your department is not configured."
        );
        return;
      }

      setHodDepartment(department);

      // Get subjects
      const response = await axios.get(
        `${API_URL}/api/subjects/getsubjects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        response.data?.subjects  || [];

      const departmentSubjects =
  data.filter(
    (subject) =>
      subject.department
        ?.trim()
        .toLowerCase() ===
      department.trim().toLowerCase()
  );
      setSubjects(departmentSubjects);
    } catch (err) {
      console.error(
        "Failed to fetch subjects:",
        err
      );

      setError(
        err.response?.data?.message ||
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
  // FORM
  // =====================================================

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,

      // Regular / Bridge should not retain
      // an elective group.
      ...(name === "subjectCategory" &&
      value !== "ELECTIVE"
        ? { electiveGroup: "" }
        : {}),
    }));
  };

  const openAddModal = () => {
    setEditingSubject(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);

    setForm({
      subjectId: subject.subjectId || "",
      code: subject.code || "",
      name: subject.name || "",
      sequence: subject.sequence || "",
      semester: subject.semester || "",

      subjectCategory:
        subject.subjectCategory || "REGULAR",
      electiveGroup: subject.electiveGroup || "",

      subjectType: subject.subjectType || "",
      board: subject.board || "",

      iaMax: subject.iaMax ?? "",
      iaMin: subject.iaMin ?? "",

      theoryExamMax: subject.theoryExamMax ?? "",
      theoryExamMin: subject.theoryExamMin ?? "",

      practicalExamMax:
        subject.practicalExamMax ?? "",
      practicalExamMin:
        subject.practicalExamMin ?? "",

      totalMax: subject.totalMax ?? "",
      totalMin: subject.totalMin ?? "",

      credit: subject.credit ?? "",

      schemeYear: subject.schemeYear || "2025",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingSubject(null);
    setForm({ ...emptyForm });
  };

  // =====================================================
  // ADD / UPDATE SUBJECT
  // =====================================================

  const handleSaveSubject = async (e) => {
    e.preventDefault();

    if (!hodDepartment) {
      alert(
        "Your department is not available."
      );
      return;
    }

    const departmentCode =
      hodDepartment.trim().toUpperCase();

    const category = String(
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
        `Invalid Sequence. Use format like 1${departmentCode}01 or 3${departmentCode}05.`
      );
      return;
    }

    if (
      Number(sequence.substring(0, 1)) !==
      Number(form.semester)
    ) {
      alert(
        `Sequence ${sequence} does not belong to Semester ${form.semester}.`
      );
      return;
    }

    if (sequence.substring(1, 3) !== departmentCode) {
      alert(
        `Sequence ${sequence} does not belong to department ${departmentCode}.`
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      // IMPORTANT:
      // Department is always the HOD's department.
      const payload = {
        subjectId:
          form.subjectId.trim().toUpperCase(),

        code: form.code.trim().toUpperCase(),

        name: form.name.trim(),

        sequence,

        semester: Number(form.semester),

        department: departmentCode,

        subjectCategory: category,

        electiveGroup:
          category === "ELECTIVE"
            ? form.electiveGroup
                .trim()
                .toUpperCase()
            : "",

        subjectType:
          form.subjectType.trim().toUpperCase(),

        board: form.board.trim().toUpperCase(),

        iaMax: numberValue(form.iaMax),
        iaMin: numberValue(form.iaMin),

        theoryExamMax:
          numberValue(form.theoryExamMax),
        theoryExamMin:
          numberValue(form.theoryExamMin),

        practicalExamMax:
          numberValue(form.practicalExamMax),
        practicalExamMin:
          numberValue(form.practicalExamMin),

        totalMax: numberValue(form.totalMax),
        totalMin: numberValue(form.totalMin),

        credit: numberValue(form.credit),

        schemeYear:
          numberValue(form.schemeYear) || 2025,
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

      closeModal();
      await fetchSubjects();
    } catch (err) {
      console.error(
        "Save subject error:",
        err
      );

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to save subject."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE SUBJECT
  // =====================================================

  const handleDelete = async (subject) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${subject.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(subject._id);

      const token = await getToken();

      await axios.delete(
        `${API_URL}/api/subjects/deletesubject/${subject._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSubjects((prev) =>
        prev.filter(
          (item) =>
            item._id !== subject._id
        )
      );
    } catch (err) {
      console.error(
        "Delete subject error:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to delete subject."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // FILTER
  // =====================================================

  const filteredSubjects = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    return subjects.filter((subject) => {
      const matchesSearch =
        !searchText ||
        subject.code
          ?.toLowerCase()
          .includes(searchText) ||
        subject.name
          ?.toLowerCase()
          .includes(searchText);

      const matchesSemester =
        !semesterFilter ||
        String(subject.semester) ===
          String(semesterFilter);

      return (
        matchesSearch &&
        matchesSemester
      );
    });
  }, [
    subjects,
    search,
    semesterFilter,
  ]);


  const handleDownloadExcel = () => {
  if (filteredSubjects.length === 0) {
    alert("No subjects available to download.");
    return;
  }

  const excelData = filteredSubjects.map((subject, index) => ({
    "Sl. No.": index + 1,
    "Subject Code": subject.code || "",
    "Subject Name": subject.name || "",
    "Semester": subject.semester
      ? `Semester ${subject.semester}`
      : "",
    "Department": getDepartmentName(subject.department),
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 40 },
    { wch: 15 },
    { wch: 35 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Subjects"
  );

  const departmentName = getDepartmentName(hodDepartment)
    .replace(/[^a-zA-Z0-9]/g, "_");

  XLSX.writeFile(
    workbook,
    `${departmentName}_Subjects.xlsx`
  );
};
  // =====================================================
  // UI
  // =====================================================

  const formInputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400";

  const formLabelClass =
    "mb-1.5 block text-xs font-semibold text-slate-600";

  return (
    <div className="min-h-screen p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <p className="text-sm font-semibold text-slate-500">
            Academic Management
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Subjects
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage subjects offered by your department.
          </p>

        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <span className="text-lg leading-none">
            +
          </span>

          Add Subject
        </button>

      </div>

      {/* DEPARTMENT BADGE */}

      {hodDepartment && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            📚
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">
              Your Department
            </p>

            <p className="mt-0.5 text-sm font-semibold text-blue-900">
              {getDepartmentName(
                hodDepartment
              )}
            </p>
          </div>

        </div>
      )}

      {/* FILTERS */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid gap-3 md:grid-cols-2">

          {/* SEARCH */}

          <div className="relative">

            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                setSearch(e.target.value)
              }
              placeholder="Search code or subject..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
            />

          </div>

          {/* SEMESTER */}

          <select
            value={semesterFilter}
            onChange={(e) =>
              setSemesterFilter(
                e.target.value
              )
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

        </div>

      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-6 py-4">

      <div className="border-b border-slate-100 px-6 py-4">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

    <div>
      <h2 className="font-semibold text-slate-900">
        Subject List
      </h2>

      <p className="mt-1 text-xs text-slate-500">
        {filteredSubjects.length} subject
        {filteredSubjects.length !== 1 ? "s" : ""}
      </p>
    </div>

    <button
      onClick={handleDownloadExcel}
      disabled={filteredSubjects.length === 0}
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

  </div>
</div>

        </div>

        {loading ? (

          <div className="flex h-64 items-center justify-center">

            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

          </div>

        ) : error ? (

          <div className="flex h-64 flex-col items-center justify-center text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
              !
            </div>

            <p className="mt-4 font-semibold text-slate-800">
              Unable to load subjects
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {error}
            </p>

            <button
              onClick={fetchSubjects}
              className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Try Again
            </button>

          </div>

        ) : filteredSubjects.length === 0 ? (

          <div className="flex h-64 flex-col items-center justify-center text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              📚
            </div>

            <p className="mt-4 font-semibold text-slate-800">
              No subjects found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Add a subject to your department.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[750px]">

              <thead>

                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="w-16 px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
  Sl. No.
</th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Code
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Subject
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Semester
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Department
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredSubjects.map(
                 (subject, index) => (
                    <tr
                      key={subject._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4 text-center text-sm font-medium text-slate-500">
  {index + 1}
</td>

                      {/* CODE */}

                      <td className="px-6 py-4">

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                          {subject.code}
                        </span>

                      </td>

                      {/* NAME */}

                      <td className="px-6 py-4">

                        <p className="font-medium text-slate-900">
                          {subject.name}
                        </p>

                      </td>

                      {/* SEMESTER */}

                      <td className="px-6 py-4 text-sm text-slate-600">
                        Semester{" "}
                        {subject.semester}
                      </td>

                      {/* DEPARTMENT */}

                      <td className="px-6 py-4">

                        <span className="text-sm text-slate-600">
                          {getDepartmentName(
                            subject.department
                          )}
                        </span>

                      </td>

                      {/* ACTIONS */}

                      <td className="px-6 py-4">

                        <div className="flex justify-end gap-2">

                          <button
                            onClick={() =>
                              openEditModal(
                                subject
                              )
                            }
                            disabled={
                              deletingId ===
                              subject._id
                            }
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                subject
                              )
                            }
                            disabled={
                              deletingId ===
                              subject._id
                            }
                            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId ===
                            subject._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ================================================= */}
      {/* ADD / EDIT MODAL */}
      {/* ================================================= */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">

          <div
            className="absolute inset-0"
            onClick={closeModal}
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
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                ✕
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSaveSubject}
              className="max-h-[calc(94vh-74px)] overflow-y-auto p-5"
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

                  <div>
                    <label className={formLabelClass}>
                      Subject ID *
                    </label>

                    <input
                      name="subjectId"
                      value={form.subjectId}
                      onChange={handleFormChange}
                      placeholder={`25${hodDepartment.toUpperCase()}340PA`}
                      required
                      className={`${formInputClass} uppercase`}
                    />
                  </div>

                  <div>
                    <label className={formLabelClass}>
                      Subject Code *
                    </label>

                    <input
                      name="code"
                      value={form.code}
                      onChange={handleFormChange}
                      placeholder={`25${hodDepartment.toUpperCase()}340`}
                      required
                      className={`${formInputClass} uppercase`}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-amber-700">
                      Sequence *
                    </label>

                    <input
                      name="sequence"
                      value={form.sequence}
                      onChange={handleFormChange}
                      placeholder={`3${hodDepartment.toUpperCase()}05`}
                      required
                      className={`${formInputClass} uppercase`}
                    />

                    <p className="mt-1 text-[11px] text-slate-400">
                      Semester + {hodDepartment.toUpperCase()} + two digits.
                    </p>
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className={formLabelClass}>
                      Subject Name *
                    </label>

                    <input
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      placeholder="Data Structures"
                      required
                      className={formInputClass}
                    />
                  </div>

                </div>
              </div>

              {/* ACADEMIC */}

              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">

                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-800">
                    Academic Details
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Semester, category, type, board and scheme.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                  <div>
                    <label className={formLabelClass}>
                      Semester *
                    </label>

                    <select
                      name="semester"
                      value={form.semester}
                      onChange={handleFormChange}
                      required
                      className={formInputClass}
                    >
                      <option value="">
                        Select semester
                      </option>

                      {semesters.map((semester) => (
                        <option
                          key={semester}
                          value={semester}
                        >
                          Semester {semester}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={formLabelClass}>
                      Department
                    </label>

                    <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-600">
                      {getDepartmentName(hodDepartment)}
                    </div>

                    <p className="mt-1 text-[11px] text-slate-400">
                      HOD can manage subjects only for their department.
                    </p>
                  </div>

                  <div>
                    <label className={formLabelClass}>
                      Subject Category *
                    </label>

                    <select
                      name="subjectCategory"
                      value={form.subjectCategory}
                      onChange={handleFormChange}
                      required
                      className={formInputClass}
                    >
                      {subjectCategories.map(
                        (category) => (
                          <option
                            key={category.value}
                            value={category.value}
                          >
                            {category.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className={formLabelClass}>
                      Elective Group
                      {form.subjectCategory ===
                      "ELECTIVE"
                        ? " *"
                        : ""}
                    </label>

                    <input
                      name="electiveGroup"
                      value={form.electiveGroup}
                      onChange={handleFormChange}
                      placeholder="A / B / C"
                      disabled={
                        form.subjectCategory !==
                        "ELECTIVE"
                      }
                      className={`${formInputClass} uppercase disabled:bg-slate-100 disabled:text-slate-400`}
                    />
                  </div>

                  <div>
                    <label className={formLabelClass}>
                      Subject Type *
                    </label>

                    <select
                      name="subjectType"
                      value={form.subjectType}
                      onChange={handleFormChange}
                      required
                      className={formInputClass}
                    >
                      <option value="">
                        Select type
                      </option>

                      {subjectTypes.map((type) => (
                        <option
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={formLabelClass}>
                      Board *
                    </label>

                    <select
                      name="board"
                      value={form.board}
                      onChange={handleFormChange}
                      required
                      className={formInputClass}
                    >
                      <option value="">
                        Select board
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
                  </div>

                  <div>
                    <label className={formLabelClass}>
                      Scheme Year
                    </label>

                    <select
                      name="schemeYear"
                      value={form.schemeYear}
                      onChange={handleFormChange}
                      className={formInputClass}
                    >
                      {schemeYears.map((year) => (
                        <option
                          key={year}
                          value={year}
                        >
                          {year}
                        </option>
                      ))}
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

                  {marksFields.map(
                    ([field, label]) => (
                      <div key={field}>
                        <label className={formLabelClass}>
                          {label}
                          {[
                            "totalMax",
                            "totalMin",
                            "credit",
                          ].includes(field)
                            ? " *"
                            : ""}
                        </label>

                        <input
                          type="number"
                          min="0"
                          name={field}
                          value={form[field]}
                          onChange={handleFormChange}
                          required={[
                            "totalMax",
                            "totalMin",
                            "credit",
                          ].includes(field)}
                          className={formInputClass}
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
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
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

    </div>
  );
}