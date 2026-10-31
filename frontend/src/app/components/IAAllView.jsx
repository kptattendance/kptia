"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import { departments } from "../admin/components/EntryStatusGrid";
import { getIACells } from "../utils/iaSheet";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const semesters = [1, 2, 3, 4, 5, 6];

// One colour per IA, repeating after five.
const IA_COLOURS = [
  { head: "bg-sky-100 text-sky-900", cell: "bg-sky-50/60", total: "bg-sky-100/70" },
  { head: "bg-amber-100 text-amber-900", cell: "bg-amber-50/60", total: "bg-amber-100/70" },
  { head: "bg-emerald-100 text-emerald-900", cell: "bg-emerald-50/60", total: "bg-emerald-100/70" },
  { head: "bg-violet-100 text-violet-900", cell: "bg-violet-50/60", total: "bg-violet-100/70" },
  { head: "bg-rose-100 text-rose-900", cell: "bg-rose-50/60", total: "bg-rose-100/70" },
];

const getColour = (index) => IA_COLOURS[index % IA_COLOURS.length];

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
// ALL IAs OF A SUBJECT, SIDE BY SIDE
//
// For each IA only the COs it actually uses, then its
// total, each IA in its own colour. A new IA appears as
// soon as it is saved. Read only; marks are entered on
// the Enter Marks tab.
//
// Data: /api/my-entries/ia-sheet
// =====================================================

export default function IAAllView() {
  const { getToken } = useAuth();

  const currentStartYear = getCurrentAcademicStartYear();

  const academicYears = useMemo(
    () =>
      [currentStartYear - 1, currentStartYear].map(
        formatAcademicYear
      ),
    [currentStartYear]
  );

  const [academicYear, setAcademicYear] = useState(
    formatAcademicYear(currentStartYear)
  );
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [batch, setBatch] = useState("both");

  const [subjects, setSubjects] = useState([]);

  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  // =====================================================
  // SUBJECTS OF THE SEMESTER
  // =====================================================

  useEffect(() => {
    const loadSubjects = async () => {
      if (!department || !semester) {
        setSubjects([]);
        return;
      }

      try {
        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/subjects/getsubjects`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              department,
              semester: Number(semester),
            },
          }
        );

        setSubjects(response.data?.subjects || []);
      } catch (err) {
        console.error("Load subjects error:", err);
        setSubjects([]);
      }
    };

    loadSubjects();
  }, [department, semester, getToken]);

  // =====================================================
  // IA SHEET
  // =====================================================

  useEffect(() => {
    const loadSheet = async () => {
      if (!subjectId) {
        setSheet(null);
        setError("");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/my-entries/ia-sheet`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              subjectId,
              academicYear,
              batch,
            },
          }
        );

        setSheet(response.data?.data || null);
      } catch (err) {
        console.error("IA view error:", err);

        setSheet(null);

        setError(
          err.response?.data?.message ||
            "Failed to load the IA marks."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSheet();
  }, [subjectId, academicYear, batch, getToken]);

  // =====================================================
  // DOWNLOAD PDF
  // =====================================================

  const handleDownload = async () => {
    if (!sheet || downloading) {
      return;
    }

    try {
      setDownloading(true);

      const [reports, { loadLetterhead }] =
        await Promise.all([
          import("../utils/iaSheetPdf"),
          import("../utils/letterheadAssets"),
        ]);

      const letterhead = await loadLetterhead();

      reports
        .buildIASheetPdf(sheet, letterhead)
        .save(reports.iaSheetFileName(sheet));
    } catch (err) {
      console.error("IA view PDF error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Download",
        text: "The PDF could not be prepared. Please try again.",
        confirmButtonColor: "#283618",
      });
    } finally {
      setDownloading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 disabled:bg-slate-50";

  const labelClass =
    "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500";

  return (
    <div>

      {/* SELECTION */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

          <div>
            <label className={labelClass}>Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
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
            <label className={labelClass}>Department</label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setSubjectId("");
              }}
              className={selectClass}
            >
              <option value="">Select department</option>
              {departments.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Semester</label>
            <select
              value={semester}
              disabled={!department}
              onChange={(e) => {
                setSemester(e.target.value);
                setSubjectId("");
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
            <label className={labelClass}>Subject</label>
            <select
              value={subjectId}
              disabled={!semester}
              onChange={(e) => setSubjectId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Batch</label>
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className={selectClass}
            >
              <option value="both">Both Batches</option>
              <option value="1">Batch 1</option>
              <option value="2">Batch 2</option>
            </select>
          </div>

        </div>
      </div>

      {/* RESULT */}

      {!subjectId && (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Select a subject to see all its IAs side by side.
        </div>
      )}

      {subjectId && loading && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Loading IA marks...
        </div>
      )}

      {subjectId && !loading && error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {subjectId &&
        !loading &&
        sheet &&
        sheet.students.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            No IA marks are saved for this subject and batch yet.
          </div>
        )}

      {subjectId &&
        !loading &&
        sheet &&
        sheet.students.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">
                {sheet.subject.code} · {sheet.students.length} students ·{" "}
                {sheet.ias.length} IA{sheet.ias.length === 1 ? "" : "s"}
              </p>

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download size={16} />
                {downloading ? "Preparing PDF..." : "Download PDF"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-sm">

                <thead>
                  {/* IA 1 | IA 2 | ... */}
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      Student
                    </th>

                    {sheet.ias.map((ia, index) => (
                      <th
                        key={ia.iaNumber}
                        colSpan={ia.cos.length + 1}
                        className={`border-b border-r border-white px-3 py-2 text-center text-xs font-bold ${getColour(index).head}`}
                      >
                        IA {ia.iaNumber}
                      </th>
                    ))}
                  </tr>

                  {/* CO1 | CO2 | Total ... */}
                  <tr>
                    {sheet.ias.map((ia, index) => [
                      ...ia.cos.map(({ co, max }) => (
                        <th
                          key={`${ia.iaNumber}-${co}`}
                          className={`border-b border-slate-200 px-3 py-1.5 text-center text-[11px] font-semibold text-slate-700 ${getColour(index).cell}`}
                        >
                          {co}
                          <span className="block font-normal text-slate-400">
                            /{max}
                          </span>
                        </th>
                      )),
                      <th
                        key={`${ia.iaNumber}-total`}
                        className={`border-b border-r border-slate-200 px-3 py-1.5 text-center text-[11px] font-bold text-slate-800 ${getColour(index).total}`}
                      >
                        Total
                        <span className="block font-normal text-slate-500">
                          /{ia.totalMax}
                        </span>
                      </th>,
                    ])}
                  </tr>
                </thead>

                <tbody>
                  {sheet.students.map((student) => (
                    <tr key={student._id} className="border-b border-slate-100">
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2">
                        <p className="max-w-[160px] truncate font-medium text-slate-900 sm:max-w-none">
                          {student.name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {student.registerNumber}
                          {sheet.batchNumbers.length === 2 &&
                            ` · B${student.batchNumber}`}
                        </p>
                      </td>

                      {sheet.ias.map((ia, index) =>
                        getIACells(student, ia).map((value, cellIndex) => {
                          const isTotal = cellIndex === ia.cos.length;

                          return (
                            <td
                              key={`${ia.iaNumber}-${cellIndex}`}
                              className={`px-3 py-2 text-center ${
                                isTotal
                                  ? `border-r border-slate-200 font-bold text-slate-900 ${getColour(index).total}`
                                  : `text-slate-700 ${getColour(index).cell}`
                              } ${value === "AB" ? "font-bold text-red-600" : ""}`}
                            >
                              {value}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              Each IA shows only the COs it uses, then its total. AB = absent, - = no marks entered. Scroll sideways on a phone; the student column stays in place.
            </p>

          </div>
        )}

    </div>
  );
}
