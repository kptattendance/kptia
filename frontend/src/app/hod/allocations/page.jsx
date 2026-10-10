"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { RefreshCw, UserPlus, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const semesters = [1, 2, 3, 4, 5, 6];

const batchOptions = [
  { value: "both", label: "Both Batches" },
  { value: "1", label: "Batch 1" },
  { value: "2", label: "Batch 2" },
];

// The academic year starts in July.
const getCurrentAcademicStartYear = () => {
  const today = new Date();

  return today.getMonth() >= 6
    ? today.getFullYear()
    : today.getFullYear() - 1;
};

const formatAcademicYear = (startYear) =>
  `${startYear}-${String(startYear + 1).slice(-2)}`;

const formatBatches = (batchNumbers = []) => {
  const batches = [...batchNumbers].map(Number).sort();

  return batches.length === 2
    ? "Both Batches"
    : `Batch ${batches[0]}`;
};

export default function HODCourseAllocationPage() {
  const { getToken } = useAuth();

  const currentStartYear = getCurrentAcademicStartYear();

  const academicYears = useMemo(
    () =>
      [
        currentStartYear - 1,
        currentStartYear,
        currentStartYear + 1,
      ].map(formatAcademicYear),
    [currentStartYear]
  );

  const [academicYear, setAcademicYear] = useState(
    formatAcademicYear(currentStartYear)
  );

  const [semester, setSemester] = useState("");
  const [hodDepartment, setHodDepartment] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [faculty, setFaculty] = useState([]);

  // { [subjectId]: number of COs defined }
  const [coCounts, setCoCounts] = useState({});

  // { [subjectId]: { facultyId, batch } }
  const [selection, setSelection] = useState({});

  const [loading, setLoading] = useState(false);
  const [savingSubjectId, setSavingSubjectId] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // LOAD HOD + FACULTY LIST
  // =====================================================

  useEffect(() => {
    const loadBasics = async () => {
      try {
        const token = await getToken();

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [userResponse, facultyResponse] =
          await Promise.all([
            axios.get(`${API_URL}/api/users/me`, {
              headers,
            }),
            axios.get(
              `${API_URL}/api/allocations/faculty-options`,
              { headers }
            ),
          ]);

        setHodDepartment(
          String(
            userResponse.data?.data?.department || ""
          )
            .trim()
            .toLowerCase()
        );

        setFaculty(facultyResponse.data?.data || []);
      } catch (err) {
        console.error(
          "Course allocation setup error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to load the faculty list."
        );
      }
    };

    loadBasics();
  }, [getToken]);

  // =====================================================
  // LOAD SUBJECTS + ALLOCATIONS
  // =====================================================

  const loadAllocations = useCallback(async () => {
    if (!hodDepartment || !semester) {
      setSubjects([]);
      setAllocations([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        subjectResponse,
        allocationResponse,
        coStatusResponse,
      ] =
        await Promise.all([
          axios.get(
            `${API_URL}/api/subjects/getsubjects`,
            {
              headers,
              params: {
                department: hodDepartment,
                semester: Number(semester),
              },
            }
          ),
          axios.get(`${API_URL}/api/allocations`, {
            headers,
            params: {
              academicYear,
              semester: Number(semester),
            },
          }),
          axios.get(
            `${API_URL}/api/course-outcomes/status`,
            {
              headers,
              params: {
                academicYear,
                semester: Number(semester),
              },
            }
          ),
        ]);

      const counts = {};

      (coStatusResponse.data?.data || []).forEach(
        (item) => {
          counts[String(item.subjectId)] =
            item.coCount;
        }
      );

      setCoCounts(counts);

      setSubjects(
        subjectResponse.data?.subjects || []
      );

      setAllocations(
        allocationResponse.data?.data || []
      );
    } catch (err) {
      console.error(
        "Load course allocations error:",
        err
      );

      setSubjects([]);
      setAllocations([]);

      setError(
        err.response?.data?.message ||
          "Failed to load course allocations."
      );
    } finally {
      setLoading(false);
    }
  }, [
    academicYear,
    semester,
    hodDepartment,
    getToken,
  ]);

  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  // =====================================================
  // ALLOCATIONS GROUPED BY SUBJECT
  // =====================================================

  const allocationsBySubject = useMemo(() => {
    const result = {};

    allocations.forEach((allocation) => {
      const subjectId = String(
        allocation.subjectId?._id ||
          allocation.subjectId
      );

      if (!result[subjectId]) {
        result[subjectId] = [];
      }

      result[subjectId].push(allocation);
    });

    return result;
  }, [allocations]);

  const allocatedCount = subjects.filter(
    (subject) =>
      allocationsBySubject[String(subject._id)]?.length
  ).length;

  // =====================================================
  // FACULTY GROUPED BY DEPARTMENT
  // Own department first.
  // =====================================================

  const facultyGroups = useMemo(() => {
    const groups = {};

    faculty.forEach((member) => {
      const department =
        String(member.department || "").toLowerCase() ||
        "other";

      if (!groups[department]) {
        groups[department] = [];
      }

      groups[department].push(member);
    });

    return Object.entries(groups).sort(
      ([a], [b]) => {
        if (a === hodDepartment) return -1;
        if (b === hodDepartment) return 1;
        return a.localeCompare(b);
      }
    );
  }, [faculty, hodDepartment]);

  // =====================================================
  // SELECTION
  // =====================================================

  const updateSelection = (subjectId, field, value) => {
    setSelection((prev) => ({
      ...prev,
      [subjectId]: {
        facultyId: "",
        batch: "both",
        ...prev[subjectId],
        [field]: value,
      },
    }));
  };

  // =====================================================
  // ALLOCATE
  // =====================================================

  const handleAllocate = async (subject) => {
    const subjectId = String(subject._id);

    const chosen = selection[subjectId] || {};

    if (!chosen.facultyId) {
      await Swal.fire({
        icon: "warning",
        title: "Select Faculty",
        text: `Please select a faculty for ${subject.code}.`,
        confirmButtonColor: "#0f172a",
      });

      return;
    }

    const batch = chosen.batch || "both";

    try {
      setSavingSubjectId(subjectId);

      const token = await getToken();

      await axios.post(
        `${API_URL}/api/allocations`,
        {
          academicYear,
          subjectId,
          facultyId: chosen.facultyId,
          batchNumbers:
            batch === "both"
              ? [1, 2]
              : [Number(batch)],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSelection((prev) => ({
        ...prev,
        [subjectId]: {
          facultyId: "",
          batch: "both",
        },
      }));

      await loadAllocations();
    } catch (err) {
      console.error("Allocate subject error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Allocate",
        text:
          err.response?.data?.message ||
          "Failed to save the course allocation.",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setSavingSubjectId("");
    }
  };

  // =====================================================
  // REMOVE
  // =====================================================

  const handleRemove = async (subject, allocation) => {
    const facultyName =
      allocation.facultyId?.name || "this faculty";

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Remove Allocation?",
      text: `${subject.code} will no longer be allocated to ${facultyName}. Attendance and IA marks already entered are not affected.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#94a3b8",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      const token = await getToken();

      await axios.delete(
        `${API_URL}/api/allocations/${allocation._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await loadAllocations();
    } catch (err) {
      console.error("Remove allocation error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Remove",
        text:
          err.response?.data?.message ||
          "Failed to remove the allocation.",
        confirmButtonColor: "#0f172a",
      });
    }
  };

  // =====================================================
  // UI
  // =====================================================

  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500";

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <p className="text-sm font-semibold text-slate-500">
            {hodDepartment
              ? `${hodDepartment.toUpperCase()} Department`
              : "HOD Portal"}
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Course Allocation
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Assign each subject to the faculty who teaches it this academic year.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAllocations}
          disabled={!semester || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>

      </div>

      {/* FILTERS */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Academic Year
            </label>

            <select
              value={academicYear}
              onChange={(e) =>
                setAcademicYear(e.target.value)
              }
              className={selectClass}
            >
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Semester
            </label>

            <select
              value={semester}
              onChange={(e) =>
                setSemester(e.target.value)
              }
              className={selectClass}
            >
              <option value="">Select semester</option>

              {semesters.map((item) => (
                <option key={item} value={item}>
                  Semester {item}
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* NOTE */}

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900">
        Once a subject is allocated, only the allocated faculty can enter its attendance and IA marks for {academicYear}. A subject with no allocation stays open to every faculty.
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* SUBJECTS */}

      {!semester ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Select a semester to allocate its subjects.
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Loading subjects...
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No subjects found for Semester {semester}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-slate-900">
              Semester {semester} · {academicYear}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              {allocatedCount} of {subjects.length} subjects allocated
            </p>
          </div>

          <div className="divide-y divide-slate-100">

            {subjects.map((subject) => {
              const subjectId = String(subject._id);

              const subjectAllocations =
                allocationsBySubject[subjectId] || [];

              const chosen =
                selection[subjectId] || {};

              return (
                <div
                  key={subjectId}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)] lg:items-start"
                >

                  {/* SUBJECT */}

                  <div>
                    <p className="font-mono text-xs font-bold text-slate-700">
                      {subject.code}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {subject.name}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {subject.subjectCategory &&
                        subject.subjectCategory !==
                          "REGULAR" && (
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            {subject.subjectCategory}
                          </span>
                        )}

                      {coCounts[subjectId] ? (
                        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {coCounts[subjectId]} COs defined
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          COs not defined
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ALLOCATED FACULTY */}

                  <div className="flex flex-wrap gap-2">
                    {subjectAllocations.length === 0 ? (
                      <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        Not allocated
                      </span>
                    ) : (
                      subjectAllocations.map(
                        (allocation) => (
                          <span
                            key={allocation._id}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 py-1.5 pl-3 pr-1.5 text-xs font-semibold text-emerald-800"
                          >
                            <span>
                              {allocation.facultyId
                                ?.name ||
                                "Deleted faculty"}
                              <span className="font-medium text-emerald-600">
                                {" · "}
                                {formatBatches(
                                  allocation.batchNumbers
                                )}
                              </span>
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemove(
                                  subject,
                                  allocation
                                )
                              }
                              aria-label="Remove allocation"
                              className="flex h-5 w-5 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        )
                      )
                    )}
                  </div>

                  {/* ALLOCATE */}

                  <div className="flex flex-col gap-2 sm:flex-row">

                    <select
                      value={chosen.facultyId || ""}
                      onChange={(e) =>
                        updateSelection(
                          subjectId,
                          "facultyId",
                          e.target.value
                        )
                      }
                      className={selectClass}
                    >
                      <option value="">
                        Select faculty
                      </option>

                      {facultyGroups.map(
                        ([department, members]) => (
                          <optgroup
                            key={department}
                            label={department.toUpperCase()}
                          >
                            {members.map((member) => (
                              <option
                                key={member._id}
                                value={member._id}
                              >
                                {member.name}
                                {member.role === "hod"
                                  ? " (HOD)"
                                  : ""}
                              </option>
                            ))}
                          </optgroup>
                        )
                      )}
                    </select>

                    <select
                      value={chosen.batch || "both"}
                      onChange={(e) =>
                        updateSelection(
                          subjectId,
                          "batch",
                          e.target.value
                        )
                      }
                      className={`${selectClass} sm:w-40`}
                    >
                      {batchOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        handleAllocate(subject)
                      }
                      disabled={
                        savingSubjectId === subjectId
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserPlus size={16} />
                      {savingSubjectId === subjectId
                        ? "Saving..."
                        : "Assign"}
                    </button>

                  </div>

                </div>
              );
            })}

          </div>

        </div>
      )}

    </div>
  );
}
