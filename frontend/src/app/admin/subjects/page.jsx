"use client";

import { useEffect, useState } from "react";
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
      (department) => department.value === value
    )?.label || value
  );
};
export default function SubjectsPage() {
  const { getToken } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [editingSubject, setEditingSubject] = useState(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    semester: "",
    department: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

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

      setSubjects(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
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
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const openAddModal = () => {
    setEditingSubject(null);

    setForm({
      code: "",
      name: "",
      semester: "",
      department: "",
    });

    setShowAddModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);

    setForm({
      code: subject.code,
      name: subject.name,
      semester: subject.semester,
      department: subject.department,
    });

    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingSubject(null);
  };

  // =====================================================
  // ADD / UPDATE SUBJECT
  // =====================================================

  const handleSaveSubject = async (e) => {
    e.preventDefault();

    try {
      const token = await getToken();

      if (editingSubject) {
        await axios.put(
          `${API_URL}/api/subjects/updatesubject/${editingSubject._id}`,
          form,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        await axios.post(
          `${API_URL}/api/subjects/addsubject`,
          form,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      closeAddModal();
      fetchSubjects();
    } catch (error) {
      console.error("Save subject error:", error);

      alert(
        error.response?.data?.message ||
          "Failed to save subject."
      );
    }
  };

  // =====================================================
  // DELETE SUBJECT
  // =====================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this subject?"
    );

    if (!confirmed) return;

    try {
      const token = await getToken();

      await axios.delete(
        `${API_URL}/api/subjects/deletesubject/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchSubjects();
    } catch (error) {
      console.error("Delete subject error:", error);

      alert(
        error.response?.data?.message ||
          "Failed to delete subject."
      );
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

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please select a CSV file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      alert("Please select a CSV file first.");
      return;
    }

    try {
      setUploading(true);
      setUploadResult(null);

      const token = await getToken();

      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await axios.post(
        `${API_URL}/api/subjects/bulk-upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUploadResult(response.data);

      // Refresh subject table
      await fetchSubjects();

      // Don't immediately close modal.
      // User should be able to see the result.
    } catch (error) {
      console.error("Bulk upload error:", error);

      setUploadResult({
        success: false,
        message:
          error.response?.data?.message ||
          "Bulk upload failed.",
      });
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // DOWNLOAD CSV TEMPLATE
  // =====================================================

  const downloadTemplate = () => {
    const csv =
      "code,name,semester,department\n" +
      "CS301,Data Structures,3,cs\n" +
      "CS302,Database Management Systems,3,cs\n" +
      "EC301,Digital Electronics,3,ec\n";

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "subjects_template.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

  // =====================================================
  // FILTER
  // =====================================================

  const filteredSubjects = subjects.filter((subject) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      subject.code.toLowerCase().includes(searchText) ||
      subject.name.toLowerCase().includes(searchText);

    const matchesDepartment =
      !departmentFilter ||
      subject.department === departmentFilter;

    const matchesSemester =
      !semesterFilter ||
      String(subject.semester) === semesterFilter;

    return (
      matchesSearch &&
      matchesDepartment &&
      matchesSemester
    );
  });

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
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
            Manage subjects offered across departments and semesters.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={openBulkModal}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M5 20h14" />
            </svg>

            Bulk Upload
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <span className="text-lg leading-none">+</span>
            Add Subject
          </button>
        </div>
      </div>

      {/* FILTERS */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          {/* SEARCH */}

          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or subject..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>

          {/* DEPARTMENT */}
<select
  value={departmentFilter}
  onChange={(e) => setDepartmentFilter(e.target.value)}
  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
>
  <option value="">All Departments</option>

  {departments.map((department) => (
    <option
      key={department.value}
      value={department.value}
    >
      {department.label}
    </option>
  ))}
</select>

          {/* SEMESTER */}

          <select
            value={semesterFilter}
            onChange={(e) =>
              setSemesterFilter(e.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="">All Semesters</option>

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
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Subject List
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredSubjects.length} subject
                {filteredSubjects.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
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
              Add a subject or upload them in bulk.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
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
                {filteredSubjects.map((subject) => (
                  <tr
                    key={subject._id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {subject.code}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {subject.name}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      Semester {subject.semester}
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {getDepartmentName(
                          subject.department
                        )}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            openEditModal(subject)
                          }
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(subject._id)
                          }
                          className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
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

      {/* ================================================= */}
      {/* ADD / EDIT MODAL */}
      {/* ================================================= */}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingSubject
                    ? "Edit Subject"
                    : "Add Subject"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Enter subject details below.
                </p>
              </div>

              <button
                onClick={closeAddModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveSubject}
              className="space-y-5 p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Subject Code
                  </label>

                  <input
                    name="code"
                    value={form.code}
                    onChange={handleFormChange}
                    placeholder="CS301"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm uppercase outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Semester
                  </label>

                  <select
                    name="semester"
                    value={form.semester}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">
                      Select semester
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
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Subject Name
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Data Structures"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                />
              </div>

         <div>
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Department
  </label>

  <select
    name="department"
    value={form.department}
    onChange={handleFormChange}
    required
    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
  >
    <option value="">
      Select department
    </option>

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

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {editingSubject
                    ? "Update Subject"
                    : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* BULK UPLOAD MODAL */}
      {/* ================================================= */}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Bulk Upload Subjects
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Import multiple subjects using a CSV file.
                </p>
              </div>

              <button
                onClick={closeBulkModal}
                disabled={uploading}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* INFORMATION */}

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 text-blue-600">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 11v5" />
                      <path d="M12 8h.01" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      CSV format required
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Your file must contain:
                      <span className="font-semibold">
                        {" "}
                        code, name, semester, department
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* FILE SELECT */}

              <label
                htmlFor="subject-csv"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  selectedFile
                    ? "border-slate-300 bg-slate-50"
                    : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <svg
                    className="h-6 w-6 text-slate-600"
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
                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      {selectedFile.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-sm font-semibold text-slate-800">
                      Click to select CSV file
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Maximum file size: 5 MB
                    </p>
                  </>
                )}

                <input
                  id="subject-csv"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* TEMPLATE */}

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Don't have a template?
                  </p>

                  <p className="text-xs text-slate-500">
                    Download the sample CSV format.
                  </p>
                </div>

                <button
                  onClick={downloadTemplate}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Download Template
                </button>
              </div>

              {/* RESULT */}

              {uploadResult && (
                <div
                  className={`rounded-xl border p-4 ${
                    uploadResult.success
                      ? "border-emerald-100 bg-emerald-50"
                      : "border-red-100 bg-red-50"
                  }`}
                >
                  {uploadResult.success ? (
                    <>
                      <p className="font-semibold text-emerald-800">
                        Upload completed
                      </p>

                      {uploadResult.summary && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-white p-2">
                            <p className="text-lg font-bold text-slate-900">
                              {
                                uploadResult.summary
                                  .totalRows
                              }
                            </p>

                            <p className="text-[10px] uppercase text-slate-500">
                              Total
                            </p>
                          </div>

                          <div className="rounded-lg bg-white p-2">
                            <p className="text-lg font-bold text-emerald-600">
                              {
                                uploadResult.summary
                                  .inserted
                              }
                            </p>

                            <p className="text-[10px] uppercase text-slate-500">
                              Added
                            </p>
                          </div>

                          <div className="rounded-lg bg-white p-2">
                            <p className="text-lg font-bold text-red-600">
                              {
                                uploadResult.summary
                                  .failed
                              }
                            </p>

                            <p className="text-[10px] uppercase text-slate-500">
                              Failed
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ERRORS */}

                      {uploadResult.errors?.length > 0 && (
                        <div className="mt-4 max-h-40 overflow-y-auto rounded-lg bg-white p-3">
                          <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                            Rows with errors
                          </p>

                          <div className="space-y-2">
                            {uploadResult.errors.map(
                              (error, index) => (
                                <div
                                  key={index}
                                  className="text-xs text-red-600"
                                >
                                  {error.row && (
                                    <span className="font-bold">
                                      Row {error.row}:{" "}
                                    </span>
                                  )}

                                  {error.message}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-red-700">
                      {uploadResult.message}
                    </p>
                  )}
                </div>
              )}

              {/* FOOTER */}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  onClick={closeBulkModal}
                  disabled={uploading}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {uploadResult?.success
                    ? "Close"
                    : "Cancel"}
                </button>

                {!uploadResult?.success && (
                  <button
                    onClick={handleBulkUpload}
                    disabled={!selectedFile || uploading}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 16V4" />
                          <path d="m7 9 5-5 5 5" />
                          <path d="M5 20h14" />
                        </svg>

                        Upload Subjects
                      </>
                    )}
                  </button>
                )}

                {uploadResult?.success && (
                  <button
                    onClick={closeBulkModal}
                    className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}