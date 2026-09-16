"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  RefreshCw,
  Search,
  Users,
  BookOpen,
  Lock,
  Building2,
  GraduationCap,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

// =====================================================
// DEPARTMENTS
// =====================================================

const departments = [
  {
    value: "at",
    label: "Automobile Engineering",
  },
  {
    value: "ch",
    label: "Chemical Engineering",
  },
  {
    value: "ce",
    label: "Civil Engineering",
  },
  {
    value: "cs",
    label: "Computer Science Engineering",
  },
  {
    value: "ec",
    label: "Electronics & Communication",
  },
  {
    value: "ee",
    label: "Electrical & Electronics",
  },
  {
    value: "me",
    label: "Mechanical Engineering",
  },
  {
    value: "ps",
    label: "Polymer Engineering",
  },
  {
    value: "sc",
    label: "Science & English",
  },
];

// =====================================================
// MONTHS
// =====================================================

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// =====================================================
// SEMESTERS
// =====================================================

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

// =====================================================
// HOD ATTENDANCE PAGE
// =====================================================

export default function HODAttendancePage() {
  const { getToken } = useAuth();

  const currentDate = new Date();

  // ---------------------------------------------------
  // FILTERS
  // ---------------------------------------------------

  const [month, setMonth] = useState(
    currentDate.getMonth() + 1
  );

  const [year, setYear] = useState(
    currentDate.getFullYear()
  );

  const [department, setDepartment] =
    useState("");

  const [semester, setSemester] =
    useState("");

  const [batchSelection, setBatchSelection] =
    useState("both");

  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  const [subjects, setSubjects] =
    useState([]);

  const [attendanceData, setAttendanceData] =
    useState({});

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  // =====================================================
  // YEARS
  // =====================================================

  const years = useMemo(() => {
    const result = [];

    for (
      let i =
        currentDate.getFullYear() - 2;
      i <=
      currentDate.getFullYear() + 1;
      i++
    ) {
      result.push(i);
    }

    return result;
  }, []);

  // =====================================================
  // LOAD SUBJECTS + ALL ATTENDANCE
  // =====================================================

  useEffect(() => {
    const loadSemesterAttendance =
      async () => {
        if (
          !department ||
          !semester
        ) {
          setSubjects([]);
          setAttendanceData({});
          return;
        }

        try {
          setLoading(true);
          setError("");

          const token =
            await getToken();

          // =================================================
          // 1. GET ALL SUBJECTS FOR SEMESTER
          // =================================================

          const subjectResponse =
            await axios.get(
              `${API_URL}/api/subjects/getsubjects`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                params: {
                  department,

                  semester:
                    Number(semester),
                },
              }
            );

          const subjectResult =
            subjectResponse.data;

          const subjectList =
            Array.isArray(
              subjectResult?.data
            )
              ? subjectResult.data
              : Array.isArray(
                  subjectResult?.subjects
                )
              ? subjectResult.subjects
              : subjectResult?.subjects
                    ?.data || [];

          setSubjects(subjectList);

          // =================================================
          // 2. LOAD ATTENDANCE FOR ALL SUBJECTS
          // =================================================

          const attendanceMap = {};

          await Promise.all(
            subjectList.map(
              async (subject) => {
                try {
                  const response =
                    await axios.get(
                      `${API_URL}/api/attendance`,
                      {
                        headers: {
                          Authorization:
                            `Bearer ${token}`,
                        },

                        params: {
                          department,

                          semester:
                            Number(
                              semester
                            ),

                          subjectId:
                            subject._id,

                          month:
                            Number(month),

                          year:
                            Number(year),

                          batchNumbers:
                            batchSelection ===
                            "both"
                              ? "1,2"
                              : batchSelection,
                        },
                      }
                    );

                  if (
                    response.data
                      ?.exists &&
                    response.data
                      ?.data
                  ) {
                    attendanceMap[
                      String(
                        subject._id
                      )
                    ] =
                      response.data.data;
                  } else {
                    attendanceMap[
                      String(
                        subject._id
                      )
                    ] = null;
                  }
                } catch (subjectError) {
                  console.error(
                    `Attendance load failed for ${subject.code}:`,
                    subjectError
                  );

                  attendanceMap[
                    String(
                      subject._id
                    )
                  ] = null;
                }
              }
            )
          );

          setAttendanceData(
            attendanceMap
          );
        } catch (err) {
          console.error(
            "HOD attendance loading error:",
            err
          );

          setSubjects([]);
          setAttendanceData({});

          setError(
            err.response?.data
              ?.message ||
              "Failed to load attendance."
          );
        } finally {
          setLoading(false);
        }
      };

    loadSemesterAttendance();
  }, [
    department,
    semester,
    month,
    year,
    batchSelection,
    getToken,
  ]);

  // =====================================================
  // STUDENT LIST
  // =====================================================

  const students = useMemo(() => {
    const studentMap =
      new Map();

    subjects.forEach(
      (subject) => {
        const attendance =
          attendanceData[
            String(
              subject._id
            )
          ];

        if (!attendance) {
          return;
        }

        (
          attendance.students ||
          []
        ).forEach(
          (entry) => {
            const student =
              entry.studentId;

            if (!student) {
              return;
            }

            const studentId =
              String(
                student._id ||
                  student
              );

            if (
              !studentMap.has(
                studentId
              )
            ) {
              studentMap.set(
                studentId,
                {
                  _id: studentId,

                  registerNumber:
                    student.registerNumber ||
                    "",

                  name:
                    student.name ||
                    "",

                  email:
                    student.email ||
                    "",

                  batchNumber:
                    student.batchNumber,

                  subjects: {},
                }
              );
            }
          }
        );
      }
    );

    // ---------------------------------------------------
    // Add subject attendance
    // ---------------------------------------------------

    subjects.forEach(
      (subject) => {
        const attendance =
          attendanceData[
            String(
              subject._id
            )
          ];

        if (!attendance) {
          return;
        }

        const conducted =
          Number(
            attendance.classesConducted ||
              0
          );

        (
          attendance.students ||
          []
        ).forEach(
          (entry) => {
            const student =
              entry.studentId;

            if (!student) {
              return;
            }

            const studentId =
              String(
                student._id ||
                  student
              );

            const target =
              studentMap.get(
                studentId
              );

            if (!target) {
              return;
            }

            target.subjects[
              String(
                subject._id
              )
            ] = {
              attended:
                Number(
                  entry.classesAttended ||
                    0
                ),

              conducted,
            };
          }
        );
      }
    );

    return Array.from(
      studentMap.values()
    ).sort((a, b) =>
      String(
        a.registerNumber
      ).localeCompare(
        String(
          b.registerNumber
        )
      )
    );
  }, [
    subjects,
    attendanceData,
  ]);

  // =====================================================
  // FILTER STUDENTS
  // =====================================================

  const filteredStudents =
    useMemo(() => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      return students.filter(
        (student) => {
          // ---------------------------------------------
          // Batch filter
          // ---------------------------------------------

          if (
            batchSelection !==
              "both" &&
            Number(
              student.batchNumber
            ) !==
              Number(
                batchSelection
              )
          ) {
            return false;
          }

          // ---------------------------------------------
          // Search
          // ---------------------------------------------

          if (!search) {
            return true;
          }

          return (
            String(
              student.name
            )
              .toLowerCase()
              .includes(search) ||
            String(
              student.registerNumber
            )
              .toLowerCase()
              .includes(search)
          );
        }
      );
    }, [
      students,
      searchText,
      batchSelection,
    ]);

  // =====================================================
  // GET ATTENDANCE
  // =====================================================

  const getAttendance =
    (
      student,
      subjectId
    ) => {
      const record =
        student.subjects[
          String(subjectId)
        ];

      if (!record) {
        return null;
      }

      if (
        !record.conducted ||
        record.conducted <= 0
      ) {
        return null;
      }

      return (
        (record.attended /
          record.conducted) *
        100
      );
    };

  // =====================================================
  // TOTAL LOW ATTENDANCE CELLS
  // =====================================================

  const lowAttendanceCount =
    useMemo(() => {
      let count = 0;

      filteredStudents.forEach(
        (student) => {
          subjects.forEach(
            (subject) => {
              const percentage =
                getAttendance(
                  student,
                  subject._id
                );

              if (
                percentage !==
                  null &&
                percentage < 75
              ) {
                count++;
              }
            }
          );
        }
      );

      return count;
    }, [
      filteredStudents,
      subjects,
    ]);

  // =====================================================
  // SUBJECTS WITH NO ATTENDANCE
  // =====================================================

  const subjectsWithoutAttendance =
    useMemo(() => {
      return subjects.filter(
        (subject) =>
          !attendanceData[
            String(
              subject._id
            )
          ]
      );
    }, [
      subjects,
      attendanceData,
    ]);

  // =====================================================
  // DEPARTMENT LABEL
  // =====================================================

  const departmentLabel =
    departments.find(
      (item) =>
        item.value ===
        department
    )?.label || "";

  // =====================================================
  // MONTH LABEL
  // =====================================================

  const monthLabel =
    months.find(
      (item) =>
        item.value ===
        Number(month)
    )?.label || "";

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-[1600px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <ClipboardCheck
                size={24}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                HOD Portal
              </p>

              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Semester Attendance
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                View attendance for all subjects in one place.
              </p>
            </div>

          </div>

          {department &&
            semester && (
              <button
                type="button"
                onClick={() => {
                  setAttendanceData(
                    (prev) => ({
                      ...prev,
                    })
                  );
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>
            )}

        </div>

        {/* =================================================
            FILTER CARD
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays
                  size={18}
                />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Attendance Selection
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Select month, department and semester.
                </p>
              </div>

            </div>

          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:p-6">

            {/* Month */}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Month
              </label>

              <div className="relative">

                <select
                  value={month}
                  onChange={(e) =>
                    setMonth(
                      Number(
                        e.target
                          .value
                      )
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                >
                  {months.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

            {/* Year */}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Year
              </label>

              <div className="relative">

                <select
                  value={year}
                  onChange={(e) =>
                    setYear(
                      Number(
                        e.target
                          .value
                      )
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                >
                  {years.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

            {/* Department */}

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Building2
                  size={13}
                />
                Department
              </label>

              <div className="relative">

                <select
                  value={
                    department
                  }
                  onChange={(e) => {
                    setDepartment(
                      e.target
                        .value
                    );

                    setSemester(
                      ""
                    );

                    setSubjects(
                      []
                    );

                    setAttendanceData(
                      {}
                    );
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="">
                    Select department
                  </option>

                  {departments.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

            {/* Semester */}

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <GraduationCap
                  size={13}
                />
                Semester
              </label>

              <div className="relative">

                <select
                  value={
                    semester
                  }
                  disabled={
                    !department
                  }
                  onChange={(e) => {
                    setSemester(
                      e.target
                        .value
                    );

                    setSubjects(
                      []
                    );

                    setAttendanceData(
                      {}
                    );
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    Select semester
                  </option>

                  {semesters.map(
                    (sem) => (
                      <option
                        key={sem}
                        value={sem}
                      >
                        Semester{" "}
                        {sem}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

            {/* Batch */}

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Users
                  size={13}
                />
                Student Batch
              </label>

              <div className="relative">

                <select
                  value={
                    batchSelection
                  }
                  onChange={(e) =>
                    setBatchSelection(
                      e.target
                        .value
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="both">
                    Batch 1 & Batch 2
                  </option>

                  <option value="1">
                    Batch 1
                  </option>

                  <option value="2">
                    Batch 2
                  </option>
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

          </div>

        </section>

        {/* =================================================
            CONTENT
        ================================================= */}

        {department &&
          semester && (
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* ---------------------------------------------
                  TITLE
              --------------------------------------------- */}

              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <h2 className="text-lg font-bold text-slate-950">
                        Semester{" "}
                        {semester}{" "}
                        Attendance
                      </h2>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                        {
                          subjects.length
                        }{" "}
                        Subjects
                      </span>

                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {departmentLabel}
                      {" · "}
                      {monthLabel}{" "}
                      {year}
                      {" · "}
                      {batchSelection ===
                      "both"
                        ? "Batch 1 & Batch 2"
                        : `Batch ${batchSelection}`}
                    </p>

                  </div>

                  {students.length >
                    0 && (
                    <div className="relative w-full lg:w-72">

                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="text"
                        value={
                          searchText
                        }
                        onChange={(e) =>
                          setSearchText(
                            e.target
                              .value
                          )
                        }
                        placeholder="Search student..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                      />

                    </div>
                  )}

                </div>

              </div>

              {/* ---------------------------------------------
                  LEGEND
              --------------------------------------------- */}

              {students.length >
                0 && (
                <div className="flex flex-wrap items-center gap-5 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:px-6">

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">

                    <span className="h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-inset ring-emerald-200" />

                    75% and above

                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">

                    <span className="h-3 w-3 rounded-sm bg-red-100 ring-1 ring-inset ring-red-200" />

                    Below 75%

                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">

                    <span className="h-3 w-3 rounded-sm bg-slate-100 ring-1 ring-inset ring-slate-200" />

                    Not entered

                  </div>

                  <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-400">

                    <Lock
                      size={13}
                    />

                    Read only

                  </div>

                </div>
              )}

              {/* ---------------------------------------------
                  LOADING
              --------------------------------------------- */}

              {loading ? (
                <div className="px-6 py-20 text-center">

                  <RefreshCw
                    size={28}
                    className="mx-auto mb-3 animate-spin text-slate-400"
                  />

                  <p className="text-sm font-semibold text-slate-700">
                    Loading semester attendance...
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Loading all subjects.
                  </p>

                </div>
              ) : subjects.length ===
                0 ? (
                /* -------------------------------------------
                   NO SUBJECTS
                ------------------------------------------- */

                <div className="px-6 py-20 text-center">

                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <BookOpen
                      size={26}
                    />
                  </div>

                  <h3 className="text-sm font-bold text-slate-700">
                    No Subjects Found
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    No subjects are configured
                    for this department and
                    semester.
                  </p>

                </div>
              ) : students.length ===
                0 ? (
                /* -------------------------------------------
                   NO ATTENDANCE
                ------------------------------------------- */

                <div className="px-6 py-20 text-center">

                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <ClipboardCheck
                      size={26}
                    />
                  </div>

                  <h3 className="text-sm font-bold text-slate-700">
                    No Attendance Available
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                    Attendance has not been
                    entered for the selected
                    semester and month.
                  </p>

                </div>
              ) : (
                <>
                  {/* -----------------------------------------
                      SUBJECT STATUS
                  ----------------------------------------- */}

                  {subjectsWithoutAttendance.length >
                    0 && (
                    <div className="border-b border-amber-100 bg-amber-50 px-5 py-3.5 sm:px-6">

                      <div className="flex items-start gap-3">

                        <AlertTriangle
                          size={17}
                          className="mt-0.5 shrink-0 text-amber-600"
                        />

                        <div>

                          <p className="text-xs font-bold text-amber-800">
                            Attendance not entered for:
                          </p>

                          <p className="mt-1 text-xs leading-5 text-amber-700">
                            {subjectsWithoutAttendance
                              .map(
                                (
                                  subject
                                ) =>
                                  subject.code
                              )
                              .join(
                                ", "
                              )}
                          </p>

                        </div>

                      </div>

                    </div>
                  )}

                  {/* -----------------------------------------
                      TABLE
                  ----------------------------------------- */}

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[1100px] border-collapse">

                      <thead>

                        <tr className="border-b border-slate-200 bg-slate-50">

                          <th className="sticky left-0 z-20 w-14 border-r border-slate-200 bg-slate-50 px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            #
                          </th>

                          <th className="sticky left-14 z-20 w-36 border-r border-slate-200 bg-slate-50 px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Register No.
                          </th>

                          <th className="sticky left-[194px] z-20 w-64 border-r border-slate-200 bg-slate-50 px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Student
                          </th>

                          {subjects.map(
                            (
                              subject
                            ) => (
                              <th
                                key={
                                  subject._id
                                }
                                className="min-w-[150px] border-r border-slate-200 px-4 py-4 text-center"
                              >

                                <div className="mx-auto max-w-[150px]">

                                  <p className="truncate text-xs font-bold text-slate-800">
                                    {
                                      subject.code
                                    }
                                  </p>

                                  <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-4 text-slate-400">
                                    {
                                      subject.name
                                    }
                                  </p>

                                </div>

                              </th>
                            )
                          )}

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-slate-100">

                        {filteredStudents.map(
                          (
                            student,
                            index
                          ) => (
                            <tr
                              key={
                                student._id
                              }
                              className="group transition hover:bg-slate-50/70"
                            >

                              {/* Number */}

                              <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-4 py-4 text-center text-sm font-medium text-slate-400 group-hover:bg-slate-50">
                                {index +
                                  1}
                              </td>

                              {/* Register Number */}

                              <td className="sticky left-14 z-10 border-r border-slate-100 bg-white px-4 py-4 group-hover:bg-slate-50">

                                <span className="font-mono text-xs font-bold text-slate-700">
                                  {
                                    student.registerNumber
                                  }
                                </span>

                              </td>

                              {/* Student */}

                              <td className="sticky left-[194px] z-10 border-r border-slate-200 bg-white px-4 py-4 group-hover:bg-slate-50">

                                <div className="flex items-center gap-3">

                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">

                                    {student.name
                                      ?.charAt(
                                        0
                                      )
                                      ?.toUpperCase()}

                                  </div>

                                  <div className="min-w-0">

                                    <p className="truncate text-sm font-semibold text-slate-900">
                                      {
                                        student.name
                                      }
                                    </p>

                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                      Batch{" "}
                                      {
                                        student.batchNumber
                                      }
                                    </p>

                                  </div>

                                </div>

                              </td>

                              {/* Subject Attendance */}

                              {subjects.map(
                                (
                                  subject
                                ) => {
                                  const attendance =
                                    getAttendance(
                                      student,
                                      subject._id
                                    );

                                  const isLow =
                                    attendance !==
                                      null &&
                                    attendance <
                                      75;

                                  const record =
                                    student
                                      .subjects[
                                      String(
                                        subject._id
                                      )
                                    ];

                                  const notEntered =
                                    !record;

                                  return (
                                    <td
                                      key={
                                        subject._id
                                      }
                                      className={`border-r border-slate-100 px-4 py-4 text-center ${
                                        isLow
                                          ? "bg-red-50"
                                          : attendance !==
                                              null
                                          ? "bg-emerald-50/50"
                                          : "bg-slate-50/50"
                                      }`}
                                    >

                                      {notEntered ? (
                                        <span className="inline-flex min-w-[70px] items-center justify-center rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-400">
                                          —
                                        </span>
                                      ) : isLow ? (
                                        <div className="inline-flex min-w-[82px] flex-col items-center rounded-lg bg-red-100 px-2.5 py-2 ring-1 ring-inset ring-red-200">

                                          <div className="flex items-center gap-1 text-sm font-bold text-red-700">

                                            <AlertTriangle
                                              size={
                                                13
                                              }
                                            />

                                            {attendance.toFixed(
                                              1
                                            )}
                                            %

                                          </div>

                                          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-red-500">
                                            Below 75%
                                          </span>

                                        </div>
                                      ) : (
                                        <span className="inline-flex min-w-[82px] items-center justify-center rounded-lg bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                          {attendance.toFixed(
                                            1
                                          )}
                                          %
                                        </span>
                                      )}

                                    </td>
                                  );
                                }
                              )}

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                  {/* -----------------------------------------
                      FOOTER
                  ----------------------------------------- */}

                  <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                    <div className="flex flex-wrap items-center gap-4">

                      <p className="text-xs text-slate-500">

                        <span className="font-semibold text-slate-700">
                          {
                            filteredStudents.length
                          }
                        </span>{" "}
                        students

                      </p>

                      <p className="text-xs text-red-600">

                        <span className="font-bold">
                          {
                            lowAttendanceCount
                          }
                        </span>{" "}
                        attendance entries below 75%

                      </p>

                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">

                      <Lock
                        size={13}
                      />

                      Attendance is read-only

                    </div>

                  </div>
                </>
              )}

            </section>
          )}

        {/* =================================================
            INITIAL STATE
        ================================================= */}

        {!department ||
          (!semester && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardCheck
                  size={26}
                />
              </div>

              <h2 className="text-sm font-bold text-slate-700">
                Select Department & Semester
              </h2>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                Select the department and semester
                above to view attendance for all
                subjects together.
              </p>

            </div>
          ))}

      </div>
    </div>
  );
}