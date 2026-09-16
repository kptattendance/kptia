"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";

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

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

export default function HODAttendancePage() {
  const { getToken } = useAuth();

  const currentYear = new Date().getFullYear();

  const [hod, setHod] = useState(null);

  const [year, setYear] = useState(currentYear);
  const [semester, setSemester] = useState("");
  const [month, setMonth] = useState(
    new Date().getMonth() + 1
  );

  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedSubject, setSelectedSubject] =
    useState("");

  const [attendanceRecords, setAttendanceRecords] =
    useState([]);

  const [selectedRecord, setSelectedRecord] =
    useState(null);

  const [detailStudents, setDetailStudents] =
    useState([]);

  const [activeView, setActiveView] =
    useState("overview");

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [loadingSubjects, setLoadingSubjects] =
    useState(false);

  const [loadingOverview, setLoadingOverview] =
    useState(false);

  const [loadingDetail, setLoadingDetail] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  // =====================================================
  // YEARS
  // =====================================================

  const years = useMemo(() => {
    return Array.from(
      { length: 5 },
      (_, index) =>
        currentYear - 2 + index
    );
  }, [currentYear]);

  // =====================================================
  // DEPARTMENT NAME
  // =====================================================

  const departmentName = useMemo(() => {
    return (
      departments.find(
        (item) =>
          item.value ===
          hod?.department?.toLowerCase()
      )?.label ||
      hod?.department ||
      "Department"
    );
  }, [hod]);

  // =====================================================
  // MONTH NAME
  // =====================================================

  const monthName = useMemo(() => {
    return (
      months.find(
        (item) =>
          item.value === Number(month)
      )?.label || ""
    );
  }, [month]);

  // =====================================================
  // SWEET ALERT
  // =====================================================

  const showError = async (
    title,
    text
  ) => {
    await Swal.fire({
      icon: "error",
      title,
      text,
      confirmButtonColor: "#0f172a",
    });
  };

  // =====================================================
  // LOAD HOD PROFILE
  // =====================================================

  const loadHOD = async () => {
    try {
      setLoadingProfile(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        response.data?.data ||
        response.data?.user ||
        response.data;

      setHod(data);
    } catch (error) {
      console.error(
        "Failed to load HOD profile:",
        error
      );

      await showError(
        "Unable to Load Profile",
        error.response?.data?.message ||
          "Unable to load HOD profile."
      );
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadHOD();
  }, []);

  // =====================================================
  // LOAD SUBJECTS
  // =====================================================

  const loadSubjects = async () => {
    if (!hod?.department || !semester) {
      setSubjects([]);
      setSelectedSubject("");
      return;
    }

    try {
      setLoadingSubjects(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/subjects/getsubjects`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department:
              hod.department.toLowerCase(),
            semester: Number(semester),
          },
        }
      );

      const result = response.data;

      const data = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.subjects)
        ? result.subjects
        : result?.subjects?.data || [];

      setSubjects(data);

      setSelectedSubject("");
    } catch (error) {
      console.error(
        "Failed to load subjects:",
        error
      );

      setSubjects([]);

      await showError(
        "Unable to Load Subjects",
        error.response?.data?.message ||
          "Unable to load subjects."
      );
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [hod, semester]);

  // =====================================================
  // LOAD STUDENTS
  // =====================================================

  const loadStudents = async () => {
    if (!hod?.department || !semester) {
      setStudents([]);
      return;
    }

    try {
      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/students/getstudents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department:
              hod.department.toLowerCase(),
            semester: Number(semester),
          },
        }
      );

      const result = response.data;

      const data = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.students)
        ? result.students
        : result?.students?.data || [];

      setStudents(data);
    } catch (error) {
      console.error(
        "Failed to load students:",
        error
      );

      setStudents([]);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [hod, semester]);

  // =====================================================
  // GET ONE ATTENDANCE RECORD
  // =====================================================

  const getAttendanceRecord = async (
    subjectId,
    targetMonth = month
  ) => {
    try {
      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/attendance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department:
              hod.department.toLowerCase(),
            semester: Number(semester),
            subjectId,
            month: Number(targetMonth),
            year: Number(year),
          },
        }
      );

      return response.data?.data || null;
    } catch (error) {
      console.error(
        "Attendance fetch error:",
        error
      );

      return null;
    }
  };

  // =====================================================
  // LOAD MONTHLY OVERVIEW
  // =====================================================

  const loadOverview = async () => {
    if (
      !hod?.department ||
      !semester ||
      subjects.length === 0
    ) {
      setAttendanceRecords([]);
      return;
    }

    try {
      setLoadingOverview(true);

      const records = await Promise.all(
        subjects.map(async (subject) => {
          const record =
            await getAttendanceRecord(
              subject._id,
              month
            );

          return {
            subject,
            record,
          };
        })
      );

      setAttendanceRecords(records);
    } catch (error) {
      console.error(
        "Failed to load overview:",
        error
      );

      setAttendanceRecords([]);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (
      activeView === "overview" &&
      hod?.department &&
      semester
    ) {
      loadOverview();
    }
  }, [
    hod,
    semester,
    month,
    year,
    subjects,
    activeView,
  ]);

  // =====================================================
  // LOAD SUBJECT DETAIL
  // =====================================================

  const loadSubjectDetail = async () => {
    if (
      !selectedSubject ||
      !hod?.department ||
      !semester
    ) {
      setSelectedRecord(null);
      setDetailStudents([]);
      return;
    }

    try {
      setLoadingDetail(true);

      const record =
        await getAttendanceRecord(
          selectedSubject,
          month
        );

      setSelectedRecord(record);

      if (!record) {
        setDetailStudents([]);
        return;
      }

      const studentsFromRecord =
        students.map((student) => {
          const attendanceItem =
            record.students?.find(
              (item) =>
                String(
                  item.studentId?._id ||
                    item.studentId
                ) ===
                String(student._id)
            );

          const attended =
            attendanceItem?.classesAttended ??
            null;

          const conducted =
            Number(
              record.classesConducted
            );

          const percentage =
            attended !== null &&
            conducted > 0
              ? (
                  (Number(attended) /
                    conducted) *
                  100
                ).toFixed(1)
              : null;

          return {
            ...student,
            classesAttended: attended,
            classesConducted: conducted,
            percentage,
          };
        });

      setDetailStudents(
        studentsFromRecord
      );
    } catch (error) {
      console.error(
        "Failed to load subject detail:",
        error
      );

      setSelectedRecord(null);
      setDetailStudents([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (
      activeView === "subject" &&
      selectedSubject
    ) {
      loadSubjectDetail();
    }
  }, [
    selectedSubject,
    month,
    year,
    semester,
    students,
    activeView,
  ]);

  // =====================================================
  // OVERVIEW STATISTICS
  // =====================================================

  const overviewStats = useMemo(() => {
    const entered =
      attendanceRecords.filter(
        (item) => item.record
      );

    let totalPercentage = 0;
    let percentageCount = 0;

    let studentsAbove75 = 0;
    let studentsBelow75 = 0;

    entered.forEach(
      ({ record }) => {
        const conducted =
          Number(
            record.classesConducted
          );

        if (!conducted) return;

        record.students?.forEach(
          (student) => {
            const attended =
              Number(
                student.classesAttended
              );

            const percentage =
              (attended /
                conducted) *
              100;

            totalPercentage +=
              percentage;

            percentageCount++;

            if (percentage >= 75) {
              studentsAbove75++;
            } else {
              studentsBelow75++;
            }
          }
        );
      }
    );

    return {
      totalSubjects:
        subjects.length,

      enteredSubjects:
        entered.length,

      pendingSubjects:
        subjects.length -
        entered.length,

      average:
        percentageCount > 0
          ? (
              totalPercentage /
              percentageCount
            ).toFixed(1)
          : "—",

      studentsAbove75,

      studentsBelow75,
    };
  }, [
    subjects,
    attendanceRecords,
  ]);

  // =====================================================
  // SUBJECT SUMMARY
  // =====================================================

  const getSubjectSummary = (
    record
  ) => {
    if (!record) {
      return {
        average: null,
        above75: 0,
        below75: 0,
      };
    }

    const conducted =
      Number(record.classesConducted);

    if (!conducted) {
      return {
        average: null,
        above75: 0,
        below75: 0,
      };
    }

    let total = 0;
    let count = 0;
    let above75 = 0;
    let below75 = 0;

    record.students?.forEach(
      (student) => {
        const percentage =
          (Number(
            student.classesAttended
          ) /
            conducted) *
          100;

        total += percentage;
        count++;

        if (percentage >= 75) {
          above75++;
        } else {
          below75++;
        }
      }
    );

    return {
      average:
        count > 0
          ? (total / count).toFixed(1)
          : null,

      above75,
      below75,
    };
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadSubjects();
    await loadStudents();

    if (
      activeView === "overview"
    ) {
      await loadOverview();
    }

    if (
      activeView === "subject"
    ) {
      await loadSubjectDetail();
    }

    setRefreshing(false);
  };

  // =====================================================
  // SELECT SUBJECT TO VIEW
  // =====================================================

  const handleViewSubject = (
    subjectId
  ) => {
    setSelectedSubject(subjectId);
    setActiveView("subject");
  };

  // =====================================================
  // BACK TO OVERVIEW
  // =====================================================

  const handleBackToOverview = () => {
    setActiveView("overview");
    setSelectedSubject("");
    setSelectedRecord(null);
    setDetailStudents([]);
  };

  // =====================================================
  // NO SEMESTER
  // =====================================================

  if (
    !loadingProfile &&
    !semester
  ) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-7">

        <div className="mb-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              ✓
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-950">
                Attendance
              </h1>

              <p className="text-xs text-slate-500">
                Consolidated attendance monitoring
              </p>
            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            📊
          </div>

          <h2 className="mt-4 text-base font-bold text-slate-900">
            Select a Semester
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select a semester below to view
            attendance for your department.
          </p>

          <select
            value={semester}
            onChange={(e) =>
              setSemester(
                e.target.value
              )
            }
            className="mx-auto mt-5 h-11 w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
          >
            <option value="">
              Select Semester
            </option>

            {semesters.map(
              (sem) => (
                <option
                  key={sem}
                  value={sem}
                >
                  Semester {sem}
                </option>
              )
            )}
          </select>

        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-5 lg:p-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              ✓
            </div>

            <div>

              <h1 className="text-xl font-bold tracking-tight text-slate-950">
                Attendance
              </h1>

              <p className="mt-0.5 text-xs text-slate-500">
                {departmentName}
                {" · "}
                {semester
                  ? `Semester ${semester}`
                  : "Select semester"}
                {" · "}
                {monthName} {year}
              </p>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            {/* REFRESH */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <svg
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h5M20 20v-5h-5M5.5 9A7 7 0 0 1 18 6.5M18.5 15A7 7 0 0 1 6 17.5"
                />
              </svg>

              Refresh
            </button>

          </div>

        </div>

      </div>

      {/* =================================================
          FILTER BAR
      ================================================= */}

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {/* YEAR */}
          <div>

            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Year
            </label>

            <select
              value={year}
              onChange={(e) =>
                setYear(
                  Number(
                    e.target.value
                  )
                )
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
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

          </div>

          {/* SEMESTER */}
          <div>

            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Semester
            </label>

            <select
              value={semester}
              onChange={(e) =>
                setSemester(
                  e.target.value
                )
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            >
              <option value="">
                Select Semester
              </option>

              {semesters.map(
                (sem) => (
                  <option
                    key={sem}
                    value={sem}
                  >
                    Semester {sem}
                  </option>
                )
              )}
            </select>

          </div>

          {/* MONTH */}
          <div>

            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Month
            </label>

            <select
              value={month}
              onChange={(e) =>
                setMonth(
                  Number(
                    e.target.value
                  )
                )
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
            >
              {months.map(
                (item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>

          </div>

          {/* SUBJECT */}
          <div>

            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Subject
            </label>

            <select
              value={selectedSubject}
              disabled={
                loadingSubjects ||
                !semester
              }
              onChange={(e) => {
                const value =
                  e.target.value;

                setSelectedSubject(
                  value
                );

                if (value) {
                  setActiveView(
                    "subject"
                  );
                }
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <option value="">
                {loadingSubjects
                  ? "Loading..."
                  : "All Subjects"}
              </option>

              {subjects.map(
                (subject) => (
                  <option
                    key={subject._id}
                    value={subject._id}
                  >
                    {subject.code} —{" "}
                    {subject.name}
                  </option>
                )
              )}

            </select>

          </div>

        </div>

      </div>

      {/* =================================================
          VIEW SWITCH
      ================================================= */}

      <div className="mb-4 flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-fit">

        <button
          onClick={
            handleBackToOverview
          }
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeView === "overview"
              ? "bg-slate-950 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          Monthly Overview
        </button>

        <button
          onClick={() => {
            if (selectedSubject) {
              setActiveView(
                "subject"
              );
            }
          }}
          disabled={!selectedSubject}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeView === "subject"
              ? "bg-slate-950 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          }`}
        >
          Subject Detail
        </button>

      </div>

      {/* =================================================
          OVERVIEW
      ================================================= */}

      {activeView === "overview" && (
        <>

          {/* SUMMARY CARDS */}

          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

            {/* SUBJECTS */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Subjects
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {
                      overviewStats.totalSubjects
                    }
                  </p>

                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm">
                  📚
                </div>

              </div>

              <p className="mt-2 text-xs text-slate-400">
                {
                  overviewStats.enteredSubjects
                }{" "}
                entered ·{" "}
                {
                  overviewStats.pendingSubjects
                }{" "}
                pending
              </p>

            </div>

            {/* AVERAGE */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Average Attendance
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {overviewStats.average}
                    {overviewStats.average !==
                    "—"
                      ? "%"
                      : ""}
                  </p>

                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm">
                  %
                </div>

              </div>

              <p className="mt-2 text-xs text-slate-400">
                Across entered subjects
              </p>

            </div>

            {/* ABOVE 75 */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    ≥ 75%
                  </p>

                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {
                      overviewStats.studentsAbove75
                    }
                  </p>

                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm">
                  ✓
                </div>

              </div>

              <p className="mt-2 text-xs text-slate-400">
                Student-subject records
              </p>

            </div>

            {/* BELOW 75 */}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Below 75%
                  </p>

                  <p className="mt-1 text-2xl font-bold text-red-600">
                    {
                      overviewStats.studentsBelow75
                    }
                  </p>

                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-sm">
                  !
                </div>

              </div>

              <p className="mt-2 text-xs text-slate-400">
                Needs attention
              </p>

            </div>

          </div>

          {/* MONTHLY REPORT */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="text-sm font-bold text-slate-900">
                  {monthName} {year} — Subject Attendance
                </h2>

                <p className="mt-0.5 text-[11px] text-slate-400">
                  Consolidated attendance status for Semester{" "}
                  {semester}
                </p>

              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">
                HOD VIEW · READ ONLY
              </span>

            </div>

            {loadingOverview ? (

              <div className="flex min-h-[300px] items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                  <p className="mt-3 text-xs text-slate-500">
                    Loading attendance...
                  </p>

                </div>

              </div>

            ) : subjects.length ===
              0 ? (

              <div className="p-12 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  📚
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  No subjects found
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  No subjects are configured for this semester.
                </p>

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full min-w-[850px]">

                  <thead>

                    <tr className="border-b border-slate-100 bg-slate-50">

                      <th className="w-12 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        #
                      </th>

                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Subject
                      </th>

                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Conducted
                      </th>

                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Average
                      </th>

                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        ≥75%
                      </th>

                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        &lt;75%
                      </th>

                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Status
                      </th>

                      <th className="w-24 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        View
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {attendanceRecords.map(
                      (
                        item,
                        index
                      ) => {

                        const summary =
                          getSubjectSummary(
                            item.record
                          );

                        return (
                          <tr
                            key={
                              item.subject
                                ._id
                            }
                            className="transition hover:bg-slate-50"
                          >

                            {/* # */}

                            <td className="px-4 py-3 text-center text-xs font-medium text-slate-400">
                              {index + 1}
                            </td>

                            {/* SUBJECT */}

                            <td className="px-4 py-3">

                              <div>

                                <p className="text-sm font-semibold text-slate-900">
                                  {
                                    item.subject
                                      .name
                                  }
                                </p>

                                <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                                  {
                                    item.subject
                                      .code
                                  }
                                </p>

                              </div>

                            </td>

                            {/* CONDUCTED */}

                            <td className="px-4 py-3 text-center">

                              {item.record ? (
                                <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                                  {
                                    item.record
                                      .classesConducted
                                  }
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">
                                  —
                                </span>
                              )}

                            </td>

                            {/* AVERAGE */}

                            <td className="px-4 py-3 text-center">

                              {summary.average !==
                              null ? (
                                <span
                                  className={`inline-flex min-w-16 justify-center rounded-full px-2.5 py-1.5 text-xs font-bold ${
                                    Number(
                                      summary.average
                                    ) >=
                                    75
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {
                                    summary.average
                                  }
                                  %
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">
                                  —
                                </span>
                              )}

                            </td>

                            {/* ABOVE */}

                            <td className="px-4 py-3 text-center">

                              {item.record ? (
                                <span className="text-sm font-semibold text-emerald-600">
                                  {
                                    summary.above75
                                  }
                                </span>
                              ) : (
                                "—"
                              )}

                            </td>

                            {/* BELOW */}

                            <td className="px-4 py-3 text-center">

                              {item.record ? (
                                <span
                                  className={`text-sm font-semibold ${
                                    summary.below75 >
                                    0
                                      ? "text-red-600"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {
                                    summary.below75
                                  }
                                </span>
                              ) : (
                                "—"
                              )}

                            </td>

                            {/* STATUS */}

                            <td className="px-4 py-3 text-center">

                              {item.record ? (

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">

                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                                  ENTERED

                                </span>

                              ) : (

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-700">

                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />

                                  PENDING

                                </span>

                              )}

                            </td>

                            {/* VIEW */}

                            <td className="px-4 py-3 text-right">

                              <button
                                disabled={
                                  !item.record
                                }
                                onClick={() =>
                                  handleViewSubject(
                                    item
                                      .subject
                                      ._id
                                  )
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                View
                              </button>

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

        </>
      )}

      {/* =================================================
          SUBJECT DETAIL
      ================================================= */}

      {activeView === "subject" && (
        <>

          {/* DETAIL HEADER */}

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-3">

                <button
                  onClick={
                    handleBackToOverview
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  ←
                </button>

                <div>

                  <div className="flex flex-wrap items-center gap-2">

                    <h2 className="text-base font-bold text-slate-950">
                      {
                        subjects.find(
                          (subject) =>
                            subject._id ===
                            selectedSubject
                        )?.name ||
                        "Subject"
                      }
                    </h2>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] font-semibold text-slate-500">
                      {
                        subjects.find(
                          (subject) =>
                            subject._id ===
                            selectedSubject
                        )?.code
                      }
                    </span>

                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {departmentName}
                    {" · "}
                    Semester {semester}
                    {" · "}
                    {monthName} {year}
                  </p>

                </div>

              </div>

              {selectedRecord && (
                <div className="flex flex-wrap gap-2">

                  <div className="rounded-xl bg-slate-50 px-4 py-2">

                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Classes Conducted
                    </p>

                    <p className="mt-0.5 text-lg font-bold text-slate-900">
                      {
                        selectedRecord.classesConducted
                      }
                    </p>

                  </div>

                  <div className="rounded-xl bg-emerald-50 px-4 py-2">

                    <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                      Average
                    </p>

                    <p className="mt-0.5 text-lg font-bold text-emerald-700">
                      {
                        getSubjectSummary(
                          selectedRecord
                        ).average
                      }
                      %
                    </p>

                  </div>

                </div>
              )}

            </div>

          </div>

          {/* NO RECORD */}

          {!loadingDetail &&
            !selectedRecord && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  !
                </div>

                <h3 className="mt-4 text-sm font-bold text-amber-900">
                  Attendance Not Entered
                </h3>

                <p className="mt-1 text-xs text-amber-700">
                  Attendance for{" "}
                  <strong>
                    {monthName} {year}
                  </strong>{" "}
                  has not been entered for this subject.
                </p>

                <button
                  onClick={
                    handleBackToOverview
                  }
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Back to Overview
                </button>

              </div>
            )}

          {/* LOADING */}

          {loadingDetail && (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">

              <div className="text-center">

                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                <p className="mt-3 text-xs text-slate-500">
                  Loading attendance...
                </p>

              </div>

            </div>
          )}

          {/* STUDENT DETAIL TABLE */}

          {!loadingDetail &&
            selectedRecord &&
            detailStudents.length >
              0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">

                  <div>

                    <h3 className="text-sm font-bold text-slate-900">
                      Student-wise Attendance
                    </h3>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Read-only attendance report
                    </p>

                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">
                    {
                      detailStudents.length
                    }{" "}
                    STUDENTS
                  </span>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[800px]">

                    <thead>

                      <tr className="border-b border-slate-100 bg-slate-50">

                        <th className="w-12 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          #
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Register No.
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Student
                        </th>

                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Conducted
                        </th>

                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Attended
                        </th>

                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Percentage
                        </th>

                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Status
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {detailStudents.map(
                        (
                          student,
                          index
                        ) => {

                          const percentage =
                            student.percentage !==
                            null
                              ? Number(
                                  student.percentage
                                )
                              : null;

                          return (
                            <tr
                              key={
                                student._id
                              }
                              className="transition hover:bg-slate-50"
                            >

                              <td className="px-4 py-3 text-center text-xs text-slate-400">
                                {index + 1}
                              </td>

                              <td className="px-4 py-3">

                                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700">
                                  {
                                    student.registerNumber
                                  }
                                </span>

                              </td>

                              <td className="px-4 py-3">

                                <div className="flex items-center gap-3">

                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                    {student.name
                                      ?.charAt(
                                        0
                                      )
                                      ?.toUpperCase()}
                                  </div>

                                  <div>

                                    <p className="text-sm font-semibold text-slate-900">
                                      {
                                        student.name
                                      }
                                    </p>

                                    <p className="text-[10px] text-slate-400">
                                      {
                                        student.email
                                      }
                                    </p>

                                  </div>

                                </div>

                              </td>

                              <td className="px-4 py-3 text-center text-sm font-medium text-slate-600">
                                {
                                  student.classesConducted
                                }
                              </td>

                              <td className="px-4 py-3 text-center">

                                <span className="inline-flex min-w-12 justify-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">
                                  {
                                    student.classesAttended
                                  }
                                </span>

                              </td>

                              <td className="px-4 py-3 text-center">

                                {percentage !==
                                null ? (
                                  <span
                                    className={`inline-flex min-w-20 justify-center rounded-full px-3 py-1.5 text-xs font-bold ${
                                      percentage >=
                                      75
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-50 text-red-700"
                                    }`}
                                  >
                                    {
                                      student.percentage
                                    }
                                    %
                                  </span>
                                ) : (
                                  "—"
                                )}

                              </td>

                              <td className="px-4 py-3 text-center">

                                {percentage !==
                                null ? (
                                  percentage >=
                                  75 ? (
                                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                      GOOD
                                    </span>
                                  ) : (
                                    <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">
                                      LOW
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-slate-300">
                                    —
                                  </span>
                                )}

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </div>
            )}

        </>
      )}

    </div>
  );
}