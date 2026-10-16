"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { RefreshCw, UserCheck, UserX } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const semesters = [1, 2, 3, 4, 5, 6];

// The academic year starts in July.
const getCurrentAcademicStartYear = () => {
  const today = new Date();

  return today.getMonth() >= 6
    ? today.getFullYear()
    : today.getFullYear() - 1;
};

const formatAcademicYear = (startYear) =>
  `${startYear}-${String(startYear + 1).slice(-2)}`;

// =====================================================
// HOD: MENTORS
//
// Tick a group of students, choose a faculty and assign.
// The mentor's name is printed on the students'
// progress report.
// =====================================================

export default function HODMentorsPage() {
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

  // ---------------------------------------------------
  // FILTERS
  // ---------------------------------------------------

  const [academicYear, setAcademicYear] = useState(
    formatAcademicYear(currentStartYear)
  );

  const [semester, setSemester] = useState("");
  const [batch, setBatch] = useState("");
  const [onlyWithoutMentor, setOnlyWithoutMentor] =
    useState(false);

  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [department, setDepartment] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Student IDs ticked
  const [selected, setSelected] = useState(new Set());

  // For Shift + click range selection
  const lastClickedRef = useRef(null);

  const [mentorId, setMentorId] = useState("");

  // =====================================================
  // FACULTY LIST
  // =====================================================

  useEffect(() => {
    const loadFaculty = async () => {
      try {
        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/allocations/faculty-options`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setFaculty(response.data?.data || []);
      } catch (err) {
        console.error("Faculty list error:", err);
      }
    };

    loadFaculty();
  }, [getToken]);

  // =====================================================
  // STUDENTS WITH THEIR MENTOR
  // =====================================================

  const loadStudents = useCallback(async () => {
    if (!semester) {
      setStudents([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/mentors`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            academicYear,
            semester,
          },
        }
      );

      setStudents(response.data?.data || []);
      setDepartment(response.data?.department || "");
    } catch (err) {
      console.error("Mentors error:", err);

      setStudents([]);

      setError(
        err.response?.data?.message ||
          "Failed to load students."
      );
    } finally {
      setLoading(false);
    }
  }, [academicYear, semester, getToken]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // =====================================================
  // VISIBLE STUDENTS
  // =====================================================

  const visibleStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          (!batch ||
            Number(student.batchNumber) ===
              Number(batch)) &&
          (!onlyWithoutMentor || !student.mentor)
      ),
    [students, batch, onlyWithoutMentor]
  );

  // Mentors and how many students each has
  const mentorSummary = useMemo(() => {
    const counts = new Map();

    students.forEach((student) => {
      if (!student.mentor) {
        return;
      }

      const key = student.mentor._id;

      counts.set(key, {
        name: student.mentor.name,
        count: (counts.get(key)?.count || 0) + 1,
      });
    });

    return [...counts.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [students]);

  const withoutMentor = students.filter(
    (student) => !student.mentor
  ).length;

  // Faculty of the HOD's department first
  const facultyGroups = useMemo(() => {
    const groups = {};

    faculty.forEach((member) => {
      const key =
        String(member.department || "").toLowerCase() ||
        "other";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(member);
    });

    return Object.entries(groups).sort(([a], [b]) => {
      if (a === department) return -1;
      if (b === department) return 1;
      return a.localeCompare(b);
    });
  }, [faculty, department]);

  // =====================================================
  // SELECTION
  // =====================================================

  const toggleStudent = (index, event) => {
    const student = visibleStudents[index];

    setSelected((previous) => {
      const next = new Set(previous);

      const ticking = !next.has(student._id);

      // Shift + click ticks everything in between
      if (
        event.shiftKey &&
        lastClickedRef.current !== null
      ) {
        const from = Math.min(
          lastClickedRef.current,
          index
        );

        const to = Math.max(
          lastClickedRef.current,
          index
        );

        for (let i = from; i <= to; i++) {
          if (ticking) {
            next.add(visibleStudents[i]._id);
          } else {
            next.delete(visibleStudents[i]._id);
          }
        }
      } else if (ticking) {
        next.add(student._id);
      } else {
        next.delete(student._id);
      }

      return next;
    });

    lastClickedRef.current = index;
  };

  const allVisibleSelected =
    visibleStudents.length > 0 &&
    visibleStudents.every((student) =>
      selected.has(student._id)
    );

  const toggleAllVisible = () => {
    setSelected((previous) => {
      const next = new Set(previous);

      visibleStudents.forEach((student) => {
        if (allVisibleSelected) {
          next.delete(student._id);
        } else {
          next.add(student._id);
        }
      });

      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    lastClickedRef.current = null;
  };

  // =====================================================
  // ASSIGN / REMOVE
  // =====================================================

  const runAction = async (path, body, title) => {
    try {
      setSaving(true);

      const token = await getToken();

      const response = await axios.post(
        `${API_URL}/api/mentors/${path}`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      clearSelection();

      await loadStudents();

      await Swal.fire({
        icon: "success",
        title,
        text: response.data?.message,
        confirmButtonColor: "#0f172a",
      });
    } catch (err) {
      console.error("Mentor action error:", err);

      await Swal.fire({
        icon: "error",
        title: "Not Saved",
        text:
          err.response?.data?.message ||
          "Please try again.",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = () =>
    runAction(
      "assign",
      {
        academicYear,
        mentorId,
        studentIds: [...selected],
      },
      "Mentor Assigned"
    );

  const handleRemove = async () => {
    const confirmation = await Swal.fire({
      icon: "question",
      title: "Remove Mentor?",
      text: `The mentor will be removed for ${selected.size} selected ${
        selected.size === 1 ? "student" : "students"
      }.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#94a3b8",
      reverseButtons: true,
    });

    if (confirmation.isConfirmed) {
      runAction(
        "remove",
        {
          academicYear,
          studentIds: [...selected],
        },
        "Mentor Removed"
      );
    }
  };

  // =====================================================
  // UI
  // =====================================================

  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  // What the Assign button is waiting for
  const assignWaitingFor =
    selected.size === 0
      ? "Tick the students first."
      : !mentorId
      ? "Choose the mentor."
      : "";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Mentors
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Assign a faculty mentor to a group of students. The mentor&apos;s name is printed on each student&apos;s progress report.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStudents}
          disabled={!semester || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>

      </div>

      {/* FILTERS */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div>
            <label className={labelClass}>
              Academic Year
            </label>

            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                clearSelection();
              }}
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
            <label className={labelClass}>Semester</label>

            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                clearSelection();
              }}
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

          <div>
            <label className={labelClass}>Batch</label>

            <select
              value={batch}
              onChange={(e) => {
                setBatch(e.target.value);
                clearSelection();
              }}
              className={selectClass}
            >
              <option value="">Both batches</option>
              <option value="1">Batch 1</option>
              <option value="2">Batch 2</option>
            </select>
          </div>

          <label className="flex items-end gap-2 pb-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={onlyWithoutMentor}
              onChange={(e) => {
                setOnlyWithoutMentor(e.target.checked);
                clearSelection();
              }}
              className="h-4 w-4"
            />
            Only students without a mentor
          </label>

        </div>

      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!semester ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Select a semester to see its students.
        </div>
      ) : loading && students.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Loading students...
        </div>
      ) : (
        <>

          {/* SUMMARY */}

          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span
              className={`rounded-lg px-3 py-1.5 font-semibold ${
                withoutMentor > 0
                  ? "bg-amber-50 text-amber-800"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {withoutMentor} of {students.length} students without a mentor
            </span>

            {mentorSummary.map((mentor) => (
              <span
                key={mentor.name}
                className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
              >
                {mentor.name}: {mentor.count}
              </span>
            ))}
          </div>

          {/* ASSIGN BAR */}

          <div className="sticky top-16 z-10 mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:top-2">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

              <p className="text-sm font-semibold text-slate-900 lg:w-40">
                {selected.size} selected
              </p>

              <select
                value={mentorId}
                onChange={(e) =>
                  setMentorId(e.target.value)
                }
                className={`${selectClass} lg:max-w-sm`}
              >
                <option value="">Choose mentor</option>

                {facultyGroups.map(([dept, members]) => (
                  <optgroup
                    key={dept}
                    label={dept.toUpperCase()}
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
                ))}
              </select>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={
                    saving || Boolean(assignWaitingFor)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserCheck size={16} />
                  Assign mentor
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={saving || selected.size === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserX size={16} />
                  Remove mentor
                </button>
              </div>

            </div>

            <p className="mt-2 text-xs text-slate-500">
              {assignWaitingFor ||
                "Ready: the chosen mentor will replace any mentor these students have now."}{" "}
              Tip: hold Shift and click a second box to tick all the students in between.
            </p>

          </div>

          {/* STUDENTS */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[560px] text-sm">

                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        aria-label="Tick all students shown"
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-3 py-3">Roll No.</th>
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Batch</th>
                    <th className="px-3 py-3">Mentor</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {visibleStudents.map((student, index) => (
                    <tr
                      key={student._id}
                      className={
                        selected.has(student._id)
                          ? "bg-amber-50/60"
                          : ""
                      }
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(student._id)}
                          onChange={() => {}}
                          onClick={(event) =>
                            toggleStudent(index, event)
                          }
                          aria-label={`Tick ${student.name}`}
                          className="h-4 w-4"
                        />
                      </td>

                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                        {student.rollNumber}
                      </td>

                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-900">
                          {student.name}
                        </p>

                        <p className="text-xs text-slate-400">
                          {student.registerNumber}
                        </p>
                      </td>

                      <td className="px-3 py-2.5 text-slate-600">
                        {student.batchNumber}
                      </td>

                      <td className="px-3 py-2.5">
                        {student.mentor ? (
                          <span className="font-medium text-slate-900">
                            {student.mentor.name}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700">
                            Not assigned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {visibleStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        No students for this selection.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </>
      )}

    </div>
  );
}
