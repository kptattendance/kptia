"use client";

import { useEffect, useMemo, useState } from "react";
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

  const [form, setForm] = useState({
    code: "",
    name: "",
    semester: "",
  });

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
        response.data?.data || [];

      // Extra frontend safety:
      // HOD should only see own department subjects.
      const departmentSubjects =
        data.filter(
          (subject) =>
            subject.department
              ?.trim()
              .toLowerCase() === department
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
    }));
  };

  const openAddModal = () => {
    setEditingSubject(null);

    setForm({
      code: "",
      name: "",
      semester: "",
    });

    setShowModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);

    setForm({
      code: subject.code || "",
      name: subject.name || "",
      semester: subject.semester || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingSubject(null);
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

    try {
      setSaving(true);

      const token = await getToken();

      // IMPORTANT:
      // Department is always the HOD's department.
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        semester: Number(form.semester),
        department: hodDepartment,
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
                  (subject) => (
                    <tr
                      key={subject._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >

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

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

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
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ✕
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSaveSubject}
              className="space-y-5 p-6"
            >

              <div className="grid gap-5 sm:grid-cols-2">

                {/* SUBJECT CODE */}

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

                {/* SEMESTER */}

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

                    {[1,2,3,4,5,6,7,8].map(
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

              {/* SUBJECT NAME */}

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

              {/* DEPARTMENT */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Department
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600">
                  {getDepartmentName(
                    hodDepartment
                  )}
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  HOD can manage subjects only for their department.
                </p>

              </div>

              {/* FOOTER */}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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
                    ? "Update Subject"
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