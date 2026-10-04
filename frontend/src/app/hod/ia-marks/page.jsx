"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  BarChart3,
  RefreshCw,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const semesters = [1, 2, 3, 4, 5, 6];

export default function HODIAMarksPage() {
  const { getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  const tableScrollRef = useRef(null);

  const dragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
  });

  const [academicYear, setAcademicYear] =
    useState("2026-27");

  const [semester, setSemester] =
    useState("");

  const [selectedIA, setSelectedIA] =
    useState("");

  const [department, setDepartment] =
    useState("");

  const [subjects, setSubjects] =
    useState([]);

  const [allStudents, setAllStudents] =
    useState([]);

  const [iaSubjects, setIaSubjects] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // ---------------------------------------------------
  // HOD DEPARTMENT
  // ---------------------------------------------------

  useEffect(() => {
    if (!userLoaded || !user) return;

    const hodDepartment =
      user.publicMetadata?.department;

    if (hodDepartment) {
      setDepartment(
        String(hodDepartment)
          .trim()
          .toLowerCase()
      );
    }
  }, [user, userLoaded]);

  // ---------------------------------------------------
  // LOAD ALL SUBJECTS + IA DATA + STUDENTS
  // ---------------------------------------------------

  const loadData = async () => {
    if (!semester || !department) {
      setSubjects([]);
      setIaSubjects([]);
      setAllStudents([]);
      setSelectedIA("");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // ---------------------------------------------------
      // 1. ALL SUBJECTS
      // ---------------------------------------------------

      const subjectResponse = await axios.get(
        `${API_URL}/api/subjects/getsubjects`,
        {
          ...config,
          params: {
            department,
            semester: Number(semester),
          },
        }
      );

      const subjectResult =
        subjectResponse.data;

      const subjectList =
        Array.isArray(subjectResult?.data)
          ? subjectResult.data
          : Array.isArray(subjectResult?.subjects)
          ? subjectResult.subjects
          : Array.isArray(
              subjectResult?.subjects?.data
            )
          ? subjectResult.subjects.data
          : [];

      // Keep ALL subjects including BRIDGE.
      // Sort by sequence number.
      const sortedSubjects =
        [...subjectList].sort(
          (a, b) =>
            String(a.sequence || "").localeCompare(
              String(b.sequence || ""),
              undefined,
              { numeric: true }
            )
        );

      // ---------------------------------------------------
      // 2. EXISTING IA DATA
      // ---------------------------------------------------

      const iaResponse = await axios.get(
        `${API_URL}/api/hod/ia/semester`,
        {
          ...config,
          params: {
            academicYear,
            semester,
          },
        }
      );

      const iaResult =
        iaResponse.data?.data || [];

      setIaSubjects(iaResult);

      // ---------------------------------------------------
      // MERGE IA INFORMATION INTO ALL SUBJECTS
      // ---------------------------------------------------

      const mergedSubjects =
        sortedSubjects.map((subject) => {
          const id = String(
            subject._id ||
              subject.subjectId ||
              subject.code
          );

          const iaRecord =
            iaResult.find((item) => {
              const itemId = String(
                item._id ||
                  item.subjectId ||
                  item.code ||
                  ""
              );

              return (
                itemId === id ||
                String(item.subjectId || "") ===
                  String(subject.subjectId || "") ||
                String(item.code || "") ===
                  String(subject.code || "")
              );
            });

          return {
            ...subject,
            iaNumbers:
              iaRecord?.iaNumbers || [],
            students:
              iaRecord?.students || [],
          };
        });

      console.log(
        "HOD IA merged subjects:",
        mergedSubjects
      );

      setSubjects(mergedSubjects);

      // ---------------------------------------------------
      // 3. ALL STUDENTS
      // ---------------------------------------------------

      const studentResponse = await axios.get(
        `${API_URL}/api/students`,
        {
          ...config,
          params: {
            department,
            semester: Number(semester),
          },
        }
      );

      const studentResult =
        studentResponse.data;

      const studentList =
        Array.isArray(studentResult?.students)
          ? studentResult.students
          : Array.isArray(studentResult?.data)
          ? studentResult.data
          : Array.isArray(
              studentResult?.students?.data
            )
          ? studentResult.students.data
          : [];

      setAllStudents(
        [...studentList].sort((a, b) => {
          const rollA = Number(a.rollNumber);
          const rollB = Number(b.rollNumber);

          if (
            Number.isFinite(rollA) &&
            Number.isFinite(rollB)
          ) {
            return rollA - rollB;
          }

          return String(
            a.rollNumber || ""
          ).localeCompare(
            String(b.rollNumber || ""),
            undefined,
            { numeric: true }
          );
        })
      );

      // ---------------------------------------------------
      // AUTOMATICALLY SELECT FIRST IA
      // ---------------------------------------------------

      const allIANumbers = [
        ...new Set(
          iaResult.flatMap(
            (subject) =>
              subject.iaNumbers || []
          )
        ),
      ].sort((a, b) => a - b);

      setSelectedIA(
        allIANumbers.length
          ? String(allIANumbers[0])
          : ""
      );
    } catch (err) {
      console.error(
        "Load HOD IA error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load IA details."
      );

      setSubjects([]);
      setIaSubjects([]);
      setAllStudents([]);
      setSelectedIA("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (semester && department) {
      loadData();
    } else {
      setSubjects([]);
      setIaSubjects([]);
      setAllStudents([]);
      setSelectedIA("");
    }
  }, [
    semester,
    academicYear,
    department,
  ]);

  // ---------------------------------------------------
  // AVAILABLE IA NUMBERS
  // ---------------------------------------------------

  const availableIANumbers = useMemo(() => {
    const numbers = new Set();

    iaSubjects.forEach((subject) => {
      (subject.iaNumbers || []).forEach(
        (ia) => numbers.add(ia)
      );
    });

    return Array.from(numbers).sort(
      (a, b) => a - b
    );
  }, [iaSubjects]);

  // ---------------------------------------------------
  // STUDENT TABLE
  // ---------------------------------------------------

  const tableData = useMemo(() => {
    return allStudents.map((student) => {
      const studentId = String(
        student._id ||
          student.studentId ||
          ""
      );

      const row = {
        studentId,
        registerNumber:
          student.registerNumber || "",
        rollNumber:
          student.rollNumber || "",
        name: student.name || "",
        imageUrl:
          student.imageUrl ||
          student.photoUrl ||
          "",
        batchNumber:
          student.batchNumber,
        subjectMarks: {},
      };

      subjects.forEach((subject) => {
        const subjectStudent =
          (subject.students || []).find(
            (item) =>
              String(
                item.studentId?._id ||
                  item.studentId ||
                  ""
              ) === studentId
          );

        const iaData =
          subjectStudent?.iaMarks?.[
            `IA${selectedIA}`
          ];

        if (iaData) {
          row.subjectMarks[
            String(subject._id)
          ] = {
            marks: iaData.marks,
            status: iaData.status,
          };
        }
      });

      // IMPORTANT:
      // subjects.forEach() must close BEFORE return row.
      return row;
    });
  }, [
    allStudents,
    subjects,
    selectedIA,
  ]);

  // ---------------------------------------------------
  // MOUSE DRAG HORIZONTAL SCROLL
  // ---------------------------------------------------

  const startDrag = (e) => {
    if (e.button !== 0) return;

    const el = tableScrollRef.current;
    if (!el) return;

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
    };

    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };

  const dragTable = (e) => {
    if (!dragRef.current.active) return;

    const el = tableScrollRef.current;
    if (!el) return;

    const distance =
      e.clientX - dragRef.current.startX;

    el.scrollLeft =
      dragRef.current.startScroll -
      distance;
  };

  const stopDrag = () => {
    const el = tableScrollRef.current;

    dragRef.current.active = false;

    if (el) {
      el.style.cursor = "grab";
      el.style.userSelect = "auto";
    }
  };

  // ---------------------------------------------------
  // EXCEL DOWNLOAD
  // ---------------------------------------------------

  const downloadExcel = () => {
    if (!tableData.length || !selectedIA) {
      return;
    }

    try {
      const departmentName =
        subjects?.[0]?.department
          ? String(
              subjects[0].department
            ).toUpperCase()
          : department.toUpperCase();

      const subjectNames = subjects
        .map((subject) => subject.name)
        .filter(Boolean)
        .join(", ");

      const subjectCodes = subjects
        .map((subject) => subject.code)
        .filter(Boolean)
        .join(", ");

      const generatedOn =
        new Date().toLocaleString(
          "en-IN",
          {
            dateStyle: "medium",
            timeStyle: "short",
          }
        );

      const reportHeader = [
        ["GOVERNMENT OF KARNATAKA"],
        [
          "DEPARTMENT OF COLLEGIATE AND TECHNICAL EDUCATION",
        ],
        [
          "KARNATAKA GOVERNMENT POLYTECHNIC, MANGALURU",
        ],
        [
          "(First Autonomous Polytechnic in India from AICTE, New Delhi)",
        ],
        [
          "Kadri Hills, Mangaluru–575004, Dakshina Kannada, Karnataka",
        ],
        [],
        ["INTERNAL ASSESSMENT MARKS REPORT"],
        [],
        ["Academic Year", academicYear],
        ["Department", departmentName],
        ["Semester", `Semester ${semester}`],
        ["Internal Assessment", `IA ${selectedIA}`],
        ["Subjects", subjectNames],
        ["Subject Codes", subjectCodes],
        ["Generated On", generatedOn],
        [],
      ];

      const dataRows = tableData.map(
        (student, index) => {
          const row = {
            "S.No.": index + 1,
            "Register No.":
              student.registerNumber || "",
            "Student Name":
              student.name || "",
            Batch: student.batchNumber
              ? `Batch ${student.batchNumber}`
              : "",
          };

          subjects.forEach((subject) => {
            const key = String(subject._id);

            const mark =
              student.subjectMarks?.[key];

            row[
              `${subject.code || ""} - ${
                subject.name || ""
              }`
            ] = mark
              ? mark.status === "ABSENT"
                ? "AB"
                : mark.marks ?? ""
              : "—";
          });

          return row;
        }
      );

      const worksheet =
        XLSX.utils.aoa_to_sheet(
          reportHeader
        );

      XLSX.utils.sheet_add_json(
        worksheet,
        dataRows,
        {
          origin: "A17",
          skipHeader: false,
        }
      );

      const totalColumns =
        4 + subjects.length;

      const mergeEndColumn = Math.max(
        totalColumns - 1,
        3
      );

      worksheet["!merges"] = [
        0,
        1,
        2,
        3,
        4,
        6,
      ].map((row) => ({
        s: {
          r: row,
          c: 0,
        },
        e: {
          r: row,
          c: mergeEndColumn,
        },
      }));

      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 30 },
        { wch: 12 },
        ...subjects.map((subject) => ({
          wch: Math.max(
            20,
            Math.min(
              35,
              `${subject.code || ""} - ${
                subject.name || ""
              }`.length + 3
            )
          ),
        })),
      ];

      worksheet["!freeze"] = {
        xSplit: 4,
        ySplit: 17,
      };

      const lastColumn =
        XLSX.utils.encode_col(
          totalColumns - 1
        );

      worksheet["!autofilter"] = {
        ref: `A17:${lastColumn}${
          17 + dataRows.length
        }`,
      };

      XLSX.utils.sheet_add_aoa(
        worksheet,
        [[
          `Report: Semester ${semester} | IA ${selectedIA} | ${academicYear}`,
        ]],
        {
          origin: `A${
            19 + dataRows.length
          }`,
        }
      );

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "IA Marks Report"
      );

      const safeDepartment =
        departmentName.replace(
          /[\\/:*?"<>|]/g,
          ""
        );

      const safeSubject = String(
        subjects?.[0]?.name ||
          "Semester"
      )
        .replace(
          /[\\/:*?"<>|]/g,
          ""
        )
        .trim();

      XLSX.writeFile(
        workbook,
        `HOD_IA_Report_${safeDepartment}_Sem${semester}_IA${selectedIA}_${academicYear}_${safeSubject}.xlsx`
      );
    } catch (error) {
      console.error(
        "Excel download error:",
        error
      );
    }
  };

    return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <BarChart3 size={24} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                HOD Portal
              </p>

              <h1 className="mt-0.5 text-2xl font-bold text-slate-950 sm:text-3xl">
                Internal Assessment Marks
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                View semester-wise IA marks for all subjects.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={loadData}
              disabled={loading || !semester}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  loading ? "animate-spin" : ""
                }
              />
              Refresh
            </button>

            {selectedIA &&
              tableData.length > 0 && (
                <button
                  type="button"
                  onClick={downloadExcel}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <FileSpreadsheet size={16} />
                  Download Excel
                </button>
              )}
          </div>
        </div>

        {/* FILTERS */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Report Selection
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-950">
              Select Assessment
            </h2>
          </div>

          <div className="bg-slate-50/60 p-5">

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              {/* ACADEMIC YEAR */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Academic Year
                </label>

                <div className="relative">
                  <select
                    value={academicYear}
                    onChange={(e) =>
                      setAcademicYear(
                        e.target.value
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-slate-500"
                  >
                    <option value="2026-27">
                      2026-27
                    </option>

                    <option value="2025-26">
                      2025-26
                    </option>

                    <option value="2024-25">
                      2024-25
                    </option>
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              {/* SEMESTER */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Semester
                </label>

                <div className="relative">
                  <select
                    value={semester}
                    onChange={(e) =>
                      setSemester(
                        e.target.value
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-slate-500"
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

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              {/* IA */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Internal Assessment
                </label>

                <div className="relative">
                  <select
                    value={selectedIA}
                    onChange={(e) =>
                      setSelectedIA(
                        e.target.value
                      )
                    }
                    disabled={
                      !semester ||
                      availableIANumbers.length ===
                        0
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none disabled:bg-slate-50"
                  >
                    <option value="">
                      Select IA
                    </option>

                    {availableIANumbers.map(
                      (ia) => (
                        <option
                          key={ia}
                          value={ia}
                        >
                          IA {ia}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <RefreshCw
              size={30}
              className="mx-auto mb-3 animate-spin text-slate-400"
            />

            <p className="text-sm text-slate-500">
              Loading IA marks...
            </p>

          </div>
        )}

        {/* NO SEMESTER */}
        {!loading && !semester && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

            <BarChart3
              size={34}
              className="mx-auto mb-3 text-slate-300"
            />

            <h2 className="font-semibold text-slate-700">
              Select a Semester
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Select a semester to view IA marks.
            </p>

          </div>
        )}

        {/* NO IA */}
        {!loading &&
          semester &&
          availableIANumbers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

              <BarChart3
                size={34}
                className="mx-auto mb-3 text-slate-300"
              />

              <h2 className="font-semibold text-slate-700">
                No IA Marks Available
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                No IA marks have been entered for Semester{" "}
                {semester}.
              </p>

            </div>
          )}

        {/* TABLE */}
        {!loading &&
          semester &&
          selectedIA &&
          subjects.length > 0 &&
          tableData.length > 0 && (

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Assessment Overview
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-950">
                      Semester {semester} — IA{" "}
                      {selectedIA}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      All subjects are displayed. A dash means marks have not been entered.
                    </p>

                  </div>

                  <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {tableData.length} Students
                  </span>

                </div>
              </div>

              {/* DRAGGABLE TABLE */}
           <div
  ref={tableScrollRef}
  onMouseDown={startDrag}
  onMouseMove={dragTable}
  onMouseUp={stopDrag}
  onMouseLeave={stopDrag}
  className="relative cursor-grab select-none overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
>

                <table className="min-w-max border-collapse text-sm">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50">

                      <th className="sticky left-0 z-30 w-[55px] min-w-[55px] border-r border-slate-200 bg-slate-50 px-2 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        S.No.
                      </th>

                      <th className="sticky left-[55px] z-30 w-[70px] min-w-[70px] border-r border-slate-200 bg-slate-50 px-2 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Photo
                      </th>

                      <th className="sticky left-[125px] z-30 w-[125px] min-w-[125px] border-r border-slate-200 bg-slate-50 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Register No.
                      </th>

                      {/* FROZEN STUDENT NAME */}
                      <th className="sticky left-[250px] z-30 w-[220px] min-w-[220px] border-r border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Student
                      </th>

                      <th className="w-[100px] min-w-[100px] border-r border-slate-200 px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Batch
                      </th>

                      {subjects.map(
                        (subject) => (
                          <th
                            key={subject._id}
                            className="w-[160px] min-w-[160px] border-r border-slate-200 px-4 py-3.5 text-center"
                          >

                            <Link
                              href={`/hod/ia-marks/${subject._id}?academicYear=${encodeURIComponent(
                                academicYear
                              )}&semester=${semester}`}
                              onMouseDown={(e) =>
                                e.stopPropagation()
                              }
                              className="font-semibold text-slate-700 hover:text-blue-600"
                            >
                              {subject.name}
                            </Link>

                            <div className="mt-0.5 text-[11px] font-medium text-slate-400">
                              {subject.sequence
                                ? `${subject.sequence} • `
                                : ""}
                              {subject.code}
                            </div>

                          </th>
                        )
                      )}

                    </tr>

                  </thead>

                  <tbody>

                    {tableData.map(
                      (student, index) => (

                        <tr
                          key={
                            student.studentId ||
                            student.registerNumber
                          }
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >

                          <td className="sticky left-0 z-20 w-[55px] min-w-[55px] border-r border-slate-100 bg-white px-2 py-3.5 text-center font-semibold text-slate-500">
                            {index + 1}
                          </td>

                          <td className="sticky left-[55px] z-20 w-[70px] min-w-[70px] border-r border-slate-100 bg-white px-2 py-2.5">

                            <div className="flex justify-center">

                              {student.imageUrl ? (

                                <img
                                  src={student.imageUrl}
                                  alt={
                                    student.name ||
                                    "Student"
                                  }
                                  className="h-10 w-10 rounded-full bg-slate-100 object-cover ring-2 ring-slate-100"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />

                              ) : (

                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                                  {String(
                                    student.name ||
                                      "S"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                              )}

                            </div>

                          </td>

                          <td className="sticky left-[125px] z-20 w-[125px] min-w-[125px] whitespace-nowrap border-r border-slate-100 bg-white px-3 py-3.5 font-medium text-slate-700">
                            {student.registerNumber}
                          </td>

                          {/* FROZEN STUDENT NAME */}
                          <td className="sticky left-[250px] z-20 w-[220px] min-w-[220px] whitespace-nowrap border-r border-slate-100 bg-white px-4 py-3.5 font-semibold text-slate-900">
                            {student.name}
                          </td>

                          <td className="w-[100px] min-w-[100px] border-r border-slate-100 px-4 py-3.5 text-center">

                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Batch{" "}
                              {student.batchNumber}
                            </span>

                          </td>

                          {subjects.map(
                            (subject) => {

                              const key =
                                String(
                                  subject._id
                                );

                              const mark =
                                student
                                  .subjectMarks?.[
                                  key
                                ];

                              return (
                                <td
                                  key={key}
                                  className="w-[160px] min-w-[160px] border-r border-slate-100 px-4 py-3.5 text-center"
                                >

                                  {mark ? (

                                    mark.status ===
                                    "ABSENT" ? (

                                      <span className="font-semibold text-red-500">
                                        AB
                                      </span>

                                    ) : (

                                      <span className="font-semibold text-slate-800">
                                        {mark.marks}
                                      </span>

                                    )

                                  ) : (

                                    <span className="text-slate-300">
                                      —
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

            </section>
          )}

        {/* NO STUDENTS */}
        {!loading &&
          semester &&
          selectedIA &&
          subjects.length > 0 &&
          tableData.length === 0 && (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

              <BarChart3
                size={34}
                className="mx-auto mb-3 text-slate-300"
              />

              <h2 className="font-semibold text-slate-700">
                No Students Found
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                No students are available for Semester{" "}
                {semester}.
              </p>

            </div>
          )}

      </div>


    </div>
  );
}