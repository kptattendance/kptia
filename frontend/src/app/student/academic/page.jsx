"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import { roundUpMark } from "../../utils/iaLabels";
import { photoUrl } from "../../utils/photoUrl";
import {
  ATTENDANCE_MINIMUM,
  AttendanceCell,
  AttendanceLegend,
  MarkCell,
  MarksLegend,
  assessmentHead,
  assessmentName,
} from "../components/AcademicBadges";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const monthLabel = (month) =>
  `${SHORT_MONTHS[month.month - 1] || month.month} ${month.year}`;

const byCode = (a, b) => String(a.code).localeCompare(String(b.code));

export default function StudentAcademicPage() {
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [student, setStudent] = useState(null);
  const [academic, setAcademic] = useState(null);

  const [attendance, setAttendance] = useState([]);
  const [iaMarks, setIaMarks] = useState([]);
  const [finalCIE, setFinalCIE] = useState([]);

  const [activeTab, setActiveTab] = useState("attendance");

  const [selectedSemester, setSelectedSemester] =
    useState("all");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadAcademicData = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/students/me/academic`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data;

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Failed to load academic information."
        );
      }

      setStudent(result.data?.student || null);
      setAcademic(result.data?.academic || null);

      setAttendance(
        Array.isArray(result.data?.attendance)
          ? result.data.attendance
          : []
      );

      setIaMarks(
        Array.isArray(result.data?.iaMarks)
          ? result.data.iaMarks
          : []
      );

      setFinalCIE(
        Array.isArray(result.data?.finalCIE)
          ? result.data.finalCIE
          : []
      );
    } catch (err) {
      console.error(
        "Student academic data error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load academic information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAcademicData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // FILTERS
  // ==========================================================

  const filteredAttendance = useMemo(() => {
    if (selectedSemester === "all") {
      return attendance;
    }

    return attendance.filter(
      (item) =>
        Number(item.subjectId?.semester) ===
        Number(selectedSemester)
    );
  }, [attendance, selectedSemester]);

  const filteredIA = useMemo(() => {
    if (selectedSemester === "all") {
      return iaMarks;
    }

    return iaMarks.filter(
      (item) =>
        Number(item.semester) === Number(selectedSemester)
    );
  }, [iaMarks, selectedSemester]);

  const semesters = useMemo(() => {
    const values = new Set();

    attendance.forEach((item) => {
      if (item.subjectId?.semester) {
        values.add(Number(item.subjectId.semester));
      }
    });

    iaMarks.forEach((item) => {
      if (item.semester) {
        values.add(Number(item.semester));
      }
    });

    if (academic?.semester) {
      values.add(Number(academic.semester));
    }

    return [...values].sort((a, b) => a - b);
  }, [attendance, iaMarks, academic]);

  // ==========================================================
  // ATTENDANCE TABLES
  //
  // One table per semester: subjects down the side, months
  // across. Attendance is entered as a running total, so
  // each month is "from the start of the semester up to the
  // end of that month" and the latest month of a subject is
  // its semester figure.
  // ==========================================================

  const attendanceTables = useMemo(() => {
    const tables = new Map();

    filteredAttendance.forEach((item) => {
      const semester = Number(item.subjectId?.semester) || 0;

      if (!tables.has(semester)) {
        tables.set(semester, {
          semester,
          months: new Map(),
          subjects: new Map(),
        });
      }

      const table = tables.get(semester);

      const monthKey = Number(item.year) * 100 + Number(item.month);

      table.months.set(monthKey, {
        key: monthKey,
        month: Number(item.month),
        year: Number(item.year),
      });

      const subjectKey = String(item.subjectId?._id || item.subjectId);

      if (!table.subjects.has(subjectKey)) {
        table.subjects.set(subjectKey, {
          key: subjectKey,
          name: item.subjectId?.name || item.subjectId?.code || "Subject",
          code: item.subjectId?.code || "",
          months: {},
        });
      }

      table.subjects.get(subjectKey).months[monthKey] = {
        attended: Number(item.classesAttended || 0),
        eligible: Number(item.classesConducted || 0),
      };
    });

    return [...tables.values()]
      .sort((a, b) => b.semester - a.semester)
      .map((table) => {
        const months = [...table.months.values()].sort(
          (a, b) => a.key - b.key
        );

        let attended = 0;
        let eligible = 0;

        const subjects = [...table.subjects.values()]
          .map((subject) => {
            const latestKey = Object.keys(subject.months)
              .map(Number)
              .sort((a, b) => a - b)
              .pop();

            const latest = subject.months[latestKey] || {
              attended: 0,
              eligible: 0,
            };

            attended += latest.attended;
            eligible += latest.eligible;

            return { ...subject, latest };
          })
          .sort(byCode);

        return {
          ...table,
          months,
          subjects,
          overall: { attended, eligible },
        };
      });
  }, [filteredAttendance]);

  // ==========================================================
  // IA TABLES
  //
  // One table per academic year + semester: subjects down
  // the side, IA 1-4, CIE 5 and the improvement test
  // across, then the Final CIE (from the backend, same
  // rule as the progress report).
  // ==========================================================

  const finalOf = useMemo(() => {
    const map = new Map();

    finalCIE.forEach((item) => {
      map.set(`${item.academicYear}|${item.subjectId}`, item);
    });

    return map;
  }, [finalCIE]);

  const iaTables = useMemo(() => {
    const tables = new Map();

    filteredIA.forEach((ia) => {
      const tableKey = `${ia.academicYear}_${ia.semester}`;

      if (!tables.has(tableKey)) {
        tables.set(tableKey, {
          key: tableKey,
          academicYear: ia.academicYear,
          semester: Number(ia.semester),
          iaNumbers: new Set(),
          subjects: new Map(),
        });
      }

      const table = tables.get(tableKey);

      const subjectKey = String(ia.subjectId?._id || ia.subjectId);

      if (!table.subjects.has(subjectKey)) {
        table.subjects.set(subjectKey, {
          key: subjectKey,
          name:
            ia.subjectId?.name ||
            ia.subjectId?.code ||
            "Unknown Subject",
          code: ia.subjectId?.code || "",
          ias: {},
          final: finalOf.get(`${ia.academicYear}|${subjectKey}`) || null,
        });
      }

      const tests = ia.tests || [];

      table.subjects.get(subjectKey).ias[ia.iaNumber] = {
        marks: roundUpMark(ia.totalMarks),
        max: Number(ia.totalMaxMarks || 0),
        // Absent for every test of the IA
        absent:
          tests.length > 0 &&
          tests.every((test) => test.status === "ABSENT"),
      };

      table.iaNumbers.add(Number(ia.iaNumber));
    });

    return [...tables.values()]
      .sort(
        (a, b) =>
          String(b.academicYear).localeCompare(
            String(a.academicYear)
          ) || b.semester - a.semester
      )
      .map((table) => ({
        ...table,
        iaNumbers: [...table.iaNumbers].sort((a, b) => a - b),
        subjects: [...table.subjects.values()].sort(byCode),
      }));
  }, [filteredIA, finalOf]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen p-3 sm:p-4 lg:p-5">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-32 rounded-3xl bg-white" />
            <div className="h-96 rounded-3xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="min-h-screen p-3 sm:p-4 lg:p-5">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
              !
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Unable to Load Academic Data
            </h2>

            <p className="mt-2 text-sm text-slate-500">{error}</p>

            <button
              onClick={loadAcademicData}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const headCell =
    "px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider";

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ================= PROFILE ================= */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-white/10 sm:h-24 sm:w-24">
                {student?.imageUrl ? (
                  <img
                    src={photoUrl(student.imageUrl, 240)}
                    alt={student?.name || "Student"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold">
                    {student?.name?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-blue-300">
                  Student Academic Portal
                </p>

                <h1 className="mt-1 truncate text-2xl font-bold">
                  {student?.name || "Student"}
                </h1>

                <p className="mt-1 text-sm text-slate-300">
                  {student?.registerNumber || "—"}
                  {student?.department
                    ? ` • ${student.department.toUpperCase()}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-slate-200">
                Semester {academic?.semester || "—"}
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-slate-200">
                {academic?.academicYear || "—"}
              </span>

              {student?.batchNumber && (
                <span className="rounded-full bg-blue-500/20 px-4 py-2 text-xs font-semibold text-blue-200">
                  Batch {student.batchNumber}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ================= TABS + FILTER ================= */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 sm:flex">
              {[
                ["attendance", "Attendance"],
                ["ia", "IA Marks"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
            >
              <option value="all">All Semesters</option>
              {semesters.map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </div>

          {/* ================= ATTENDANCE TAB ================= */}
          {activeTab === "attendance" && (
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Attendance</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Each month shows the classes attended / held from the start of the semester up to the end of that month. Semester = latest month.
                  </p>
                </div>
                <AttendanceLegend minimum={ATTENDANCE_MINIMUM} />
              </div>

              {attendanceTables.length === 0 ? (
                <EmptyState
                  icon="✓"
                  title="No Attendance Records"
                  text="Attendance has not been entered for the selected semester."
                />
              ) : (
                <div className="space-y-6">
                  {attendanceTables.map((table) => (
                    <div
                      key={table.semester}
                      className="overflow-hidden rounded-2xl border border-slate-200"
                    >
                      <TableTitle
                        semester={table.semester}
                        right={
                          <span className="text-xs font-medium text-slate-500">
                            Overall{" "}
                            <AttendanceCell
                              attended={table.overall.attended}
                              eligible={table.overall.eligible}
                            />
                          </span>
                        }
                      />

                      {/* phone: one card per subject */}
                      <div className="divide-y divide-slate-100 md:hidden">
                        {table.subjects.map((subject) => (
                          <div key={subject.key} className="px-4 py-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <SubjectName subject={subject} />
                              <AttendanceCell
                                attended={subject.latest.attended}
                                eligible={subject.latest.eligible}
                                large
                              />
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {table.months.map((month) => {
                                const value = subject.months[month.key];
                                return (
                                  <div key={month.key} className="rounded-lg bg-slate-50 px-1.5 py-2 text-center">
                                    <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                                      {monthLabel(month)}
                                    </p>
                                    <AttendanceCell
                                      attended={value?.attended}
                                      eligible={value?.eligible}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* larger screens: table */}
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[640px]">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                              <th className={`${headCell} sticky left-0 z-10 bg-slate-50 text-left text-slate-500`}>
                                Subject
                              </th>
                              {table.months.map((month) => (
                                <th key={month.key} className={`${headCell} text-slate-500`}>
                                  Up to {monthLabel(month)}
                                </th>
                              ))}
                              <th className={`${headCell} bg-slate-800 text-white`}>
                                Semester
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {table.subjects.map((subject) => (
                              <tr key={subject.key} className="hover:bg-slate-50/60">
                                <td className="sticky left-0 z-10 bg-white px-4 py-3">
                                  <SubjectName subject={subject} />
                                </td>
                                {table.months.map((month) => {
                                  const value = subject.months[month.key];
                                  return (
                                    <td key={month.key} className="px-3 py-3 text-center">
                                      <AttendanceCell
                                        attended={value?.attended}
                                        eligible={value?.eligible}
                                      />
                                    </td>
                                  );
                                })}
                                <td className="bg-slate-50 px-3 py-3 text-center">
                                  <AttendanceCell
                                    attended={subject.latest.attended}
                                    eligible={subject.latest.eligible}
                                    large
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>

                          <tfoot>
                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                              <td
                                colSpan={table.months.length + 1}
                                className="sticky left-0 bg-slate-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600"
                              >
                                Overall (all subjects)
                              </td>
                              <td className="bg-slate-100 px-3 py-3 text-center">
                                <AttendanceCell
                                  attended={table.overall.attended}
                                  eligible={table.overall.eligible}
                                  large
                                />
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= IA TAB ================= */}
          {activeTab === "ia" && (
            <div className="p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Internal Assessment Marks</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Final CIE = average of the IAs and CIE 5, each scaled to the subject maximum, with the improvement test when higher. Red = below the subject minimum.
                  </p>
                </div>
                <MarksLegend />
              </div>

              {iaTables.length === 0 ? (
                <EmptyState
                  icon="★"
                  title="No IA Marks"
                  text="IA marks have not been entered for the selected semester."
                />
              ) : (
                <div className="space-y-6">
                  {iaTables.map((table) => (
                    <div
                      key={table.key}
                      className="overflow-hidden rounded-2xl border border-slate-200"
                    >
                      <TableTitle
                        semester={table.semester}
                        academicYear={table.academicYear}
                      />

                      {/* phone: one card per subject */}
                      <div className="divide-y divide-slate-100 md:hidden">
                        {table.subjects.map((subject) => (
                          <div key={subject.key} className="px-4 py-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <SubjectName subject={subject} />
                              <div className="text-center">
                                <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                                  Final CIE
                                </p>
                                <FinalCIE final={subject.final} />
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {table.iaNumbers.map((iaNumber) => (
                                <div key={iaNumber} className="rounded-lg bg-slate-50 px-1.5 py-2 text-center">
                                  <p className={`mx-auto mb-1 w-fit rounded px-1.5 text-[10px] font-bold uppercase ${assessmentHead(iaNumber)}`}>
                                    {assessmentName(iaNumber)}
                                  </p>
                                  <MarkCell {...subject.ias[iaNumber]} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* larger screens: table */}
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[640px]">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className={`${headCell} sticky left-0 z-10 bg-slate-50 text-left text-slate-500`}>
                                Subject
                              </th>
                              {table.iaNumbers.map((iaNumber) => (
                                <th key={iaNumber} className={`${headCell} ${assessmentHead(iaNumber)}`}>
                                  {assessmentName(iaNumber)}
                                </th>
                              ))}
                              <th className={`${headCell} bg-slate-800 text-white`}>
                                Final CIE
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {table.subjects.map((subject) => (
                              <tr key={subject.key} className="hover:bg-slate-50/60">
                                <td className="sticky left-0 z-10 bg-white px-4 py-3">
                                  <SubjectName subject={subject} />
                                </td>
                                {table.iaNumbers.map((iaNumber) => (
                                  <td key={iaNumber} className="px-3 py-3 text-center">
                                    <MarkCell {...subject.ias[iaNumber]} />
                                  </td>
                                ))}
                                <td className="bg-slate-50 px-3 py-3 text-center">
                                  <FinalCIE final={subject.final} />
                                  {subject.final && (
                                    <p className="mt-0.5 text-[10px] text-slate-400">
                                      min {subject.final.minMarks}
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <div className="pb-4 text-center text-xs text-slate-400">
          Academic information is displayed from the official college records.
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// SMALL PIECES
// ==========================================================

function TableTitle({ semester, academicYear, right = null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
          {semester ? `Semester ${semester}` : "Semester —"}
        </span>
        {academicYear && (
          <span className="text-xs font-medium text-slate-500">
            Academic Year {academicYear}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

function SubjectName({ subject }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold leading-snug text-slate-900">
        {subject.name}
      </p>
      {subject.code && (
        <p className="font-mono text-[11px] text-slate-400">{subject.code}</p>
      )}
    </div>
  );
}

function FinalCIE({ final }) {
  if (!final || final.final === null || final.final === undefined) {
    return <span className="text-sm text-slate-300">—</span>;
  }

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <MarkCell
        marks={final.final}
        max={final.maxMarks}
        minimum={final.minMarks}
        large
      />
      {final.improvement && (
        <span className="text-[10px] font-semibold text-teal-700">
          Improved IA {final.improvement.replacesIA}
        </span>
      )}
    </span>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
        {icon}
      </div>

      <h3 className="text-base font-bold text-slate-800">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{text}</p>
    </div>
  );
}
