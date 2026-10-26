"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { Download, FileSpreadsheet, X } from "lucide-react";
import {
  batchLabel,
  getIACells,
} from "../../utils/iaSheet";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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

// July of the academic year up to this month (or up to
// June for a past year): [{ key: "2026-07", label }]
const getMonthsSoFar = (academicYear) => {
  const startYear = Number(academicYear.slice(0, 4));

  const today = new Date();

  const months = [];

  for (let offset = 0; offset < 12; offset++) {
    const date = new Date(startYear, 6 + offset, 1);

    if (date > today) {
      break;
    }

    months.push({
      key: `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`,
      label: MONTH_NAMES[date.getMonth()],
    });
  }

  return months;
};

// Status of one IA or month over the allocated batches:
// "done" | "partial" | "missing"
const getStatus = (entry = {}, batchNumbers) => {
  const entered = batchNumbers.filter(
    (batch) => entry[batch]?.entered
  );

  if (entered.length === batchNumbers.length) {
    return "done";
  }

  return entered.length > 0 ? "partial" : "missing";
};

const chipClass = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-800",
  partial: "border-amber-200 bg-amber-50 text-amber-800",
  missing: "border-red-200 bg-red-50 text-red-700",
};

// "Batch 1 only" for a partly entered IA or month
const getPartialNote = (entry = {}, batchNumbers) => {
  const entered = batchNumbers.filter(
    (batch) => entry[batch]?.entered
  );

  return entered.length > 0 && entered.length < batchNumbers.length
    ? `Batch ${entered.join(" & ")} only`
    : "";
};

// =====================================================
// FACULTY ENTRY STATUS
//
// The subjects allocated to the faculty, with the IAs
// and the months of attendance entered for each, and a
// consolidated IA sheet (every IA side by side) that
// can be downloaded as PDF.
// =====================================================

export default function FacultyEntryStatusPage() {
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

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Consolidated IA sheet
  const [sheetSubject, setSheetSubject] = useState(null);
  const [sheetBatch, setSheetBatch] = useState("both");
  const [sheet, setSheet] = useState(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const months = useMemo(
    () => getMonthsSoFar(academicYear),
    [academicYear]
  );

  // =====================================================
  // LOAD STATUS
  // =====================================================

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        setError("");

        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/my-entries/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: { academicYear },
          }
        );

        setSubjects(response.data?.data || []);
      } catch (err) {
        console.error("Entry status error:", err);

        setSubjects([]);

        setError(
          err.response?.data?.message ||
            "Failed to load your entry status."
        );
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [academicYear, getToken]);

  // =====================================================
  // LOAD CONSOLIDATED IA SHEET
  // =====================================================

  useEffect(() => {
    const loadSheet = async () => {
      if (!sheetSubject) {
        setSheet(null);
        return;
      }

      try {
        setLoadingSheet(true);
        setSheetError("");

        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/my-entries/ia-sheet`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              subjectId: sheetSubject.subject._id,
              academicYear,
              batch: sheetBatch,
            },
          }
        );

        setSheet(response.data?.data || null);
      } catch (err) {
        console.error("IA sheet error:", err);

        setSheet(null);

        setSheetError(
          err.response?.data?.message ||
            "Failed to load the IA sheet."
        );
      } finally {
        setLoadingSheet(false);
      }
    };

    loadSheet();
  }, [sheetSubject, sheetBatch, academicYear, getToken]);

  const openSheet = (item) => {
    setSheetSubject(item);

    setSheetBatch(
      item.batchNumbers.length === 2
        ? "both"
        : String(item.batchNumbers[0])
    );
  };

  // =====================================================
  // SUMMARY
  // =====================================================

  const summary = useMemo(() => {
    let pendingMonths = 0;
    let iasEntered = 0;

    subjects.forEach((item) => {
      months.forEach((month) => {
        if (
          getStatus(
            item.attendance[month.key],
            item.batchNumbers
          ) !== "done"
        ) {
          pendingMonths += 1;
        }
      });

      iasEntered += Object.keys(item.ia).length;
    });

    return { pendingMonths, iasEntered };
  }, [subjects, months]);

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
          import("../../utils/iaSheetPdf"),
          import("../../utils/letterheadAssets"),
        ]);

      const letterhead = await loadLetterhead();

      reports
        .buildIASheetPdf(sheet, letterhead)
        .save(reports.iaSheetFileName(sheet));
    } catch (err) {
      console.error("IA sheet PDF error:", err);

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
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="min-h-screen p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Entry Status
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          The IA marks and attendance you have entered for the subjects allocated to you, and what is still pending.
        </p>
      </div>

      {/* SELECTION */}

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
                setSheetSubject(null);
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
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Loading your subjects...
        </div>
      )}

      {!loading && !error && subjects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No subjects are allocated to you for {academicYear}. Your HOD allocates subjects from the Course Allocation page.
        </div>
      )}

      {!loading && subjects.length > 0 && (
        <>

          {/* SUMMARY + LEGEND */}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {subjects.length} subject{subjects.length === 1 ? "" : "s"}
              {" · "}
              {summary.iasEntered} IA{summary.iasEntered === 1 ? "" : "s"} entered
              {" · "}
              {summary.pendingMonths === 0
                ? "attendance up to date"
                : `${summary.pendingMonths} month${
                    summary.pendingMonths === 1 ? "" : "s"
                  } of attendance pending`}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-emerald-200 bg-emerald-50" />
                Entered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-amber-200 bg-amber-50" />
                One batch only
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-red-200 bg-red-50" />
                Pending
              </span>
            </div>
          </div>

          {/* SUBJECTS */}

          <div className="space-y-4">
            {subjects.map((item) => {
              const iaNumbers = Object.keys(item.ia)
                .map(Number)
                .sort((a, b) => a - b);

              const selected =
                sheetSubject?.subject._id === item.subject._id;

              return (
                <div
                  key={item.subject._id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                    selected
                      ? "border-slate-900"
                      : "border-slate-200"
                  }`}
                >

                  {/* SUBJECT */}

                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-700">
                        {item.subject.code}
                        {item.subject.subjectCategory !== "REGULAR" && (
                          <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide text-slate-500">
                            {item.subject.subjectCategory}
                          </span>
                        )}
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {item.subject.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.subject.department.toUpperCase()}
                        {" · "}
                        Semester {item.subject.semester}
                        {" · "}
                        {batchLabel(item.batchNumbers)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openSheet(item)}
                      disabled={iaNumbers.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FileSpreadsheet size={16} />
                      View IA sheet
                    </button>
                  </div>

                  <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">

                    {/* IA MARKS */}

                    <div>
                      <p className={labelClass}>IA Marks</p>

                      {iaNumbers.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No IA entered yet.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {iaNumbers.map((iaNumber) => {
                            const entry = item.ia[iaNumber];

                            const status = getStatus(
                              entry,
                              item.batchNumbers
                            );

                            const note = getPartialNote(
                              entry,
                              item.batchNumbers
                            );

                            return (
                              <span
                                key={iaNumber}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${chipClass[status]}`}
                              >
                                IA {iaNumber}
                                {note && (
                                  <span className="font-medium">
                                    {" · "}
                                    {note}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ATTENDANCE */}

                    <div>
                      <p className={labelClass}>Attendance</p>

                      {item.subject.subjectCategory === "BRIDGE" ? (
                        <p className="text-sm text-slate-500">
                          Bridge courses have no attendance.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {months.map((month) => {
                            const entry =
                              item.attendance[month.key];

                            const status = getStatus(
                              entry,
                              item.batchNumbers
                            );

                            const note = getPartialNote(
                              entry,
                              item.batchNumbers
                            );

                            return (
                              <span
                                key={month.key}
                                title={note || undefined}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${chipClass[status]}`}
                              >
                                {month.label}
                                {note && (
                                  <span className="font-medium">
                                    {" · B"}
                                    {note.replace(/\D+/g, "")}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* CONSOLIDATED IA SHEET */}

          {sheetSubject && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    IA Sheet · {sheetSubject.subject.code}
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {sheetSubject.subject.name} · every IA side by side. Only the COs that carry marks are shown.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {sheetSubject.batchNumbers.length === 2 && (
                    <select
                      value={sheetBatch}
                      onChange={(e) =>
                        setSheetBatch(e.target.value)
                      }
                      className={`${selectClass} w-auto`}
                    >
                      <option value="both">Both Batches</option>
                      <option value="1">Batch 1</option>
                      <option value="2">Batch 2</option>
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={
                      !sheet ||
                      loadingSheet ||
                      downloading ||
                      sheet.students.length === 0
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={16} />
                    {downloading
                      ? "Preparing PDF..."
                      : "Download PDF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSheetSubject(null)}
                    aria-label="Close IA sheet"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {loadingSheet && (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  Loading IA sheet...
                </p>
              )}

              {!loadingSheet && sheetError && (
                <p className="px-5 py-6 text-sm font-medium text-red-700">
                  {sheetError}
                </p>
              )}

              {!loadingSheet &&
                sheet &&
                sheet.students.length === 0 && (
                  <p className="px-5 py-10 text-center text-sm text-slate-500">
                    No IA marks are entered for this selection yet.
                  </p>
                )}

              {!loadingSheet &&
                sheet &&
                sheet.students.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-sm">

                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          <th rowSpan={2} className="px-3 py-2 text-center">#</th>
                          <th rowSpan={2} className="px-3 py-2 text-left">Register No.</th>
                          <th rowSpan={2} className="px-3 py-2 text-left">Student</th>

                          {sheet.ias.map((ia) => (
                            <th
                              key={ia.iaNumber}
                              colSpan={ia.cos.length + 1}
                              className="border-l border-slate-200 px-3 py-2 text-center text-slate-800"
                            >
                              IA {ia.iaNumber}
                            </th>
                          ))}
                        </tr>

                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                          {sheet.ias.map((ia) => [
                            ...ia.cos.map(({ co, max }, index) => (
                              <th
                                key={`${ia.iaNumber}-${co}`}
                                className={`px-3 py-2 text-center ${
                                  index === 0
                                    ? "border-l border-slate-200"
                                    : ""
                                }`}
                              >
                                {co}
                                <span className="block font-normal text-slate-400">
                                  / {max}
                                </span>
                              </th>
                            )),
                            <th
                              key={`${ia.iaNumber}-total`}
                              className="bg-slate-100 px-3 py-2 text-center text-slate-700"
                            >
                              Total
                              <span className="block font-normal text-slate-400">
                                / {ia.totalMax}
                              </span>
                            </th>,
                          ])}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {sheet.students.map((student, index) => (
                          <tr key={student._id}>
                            <td className="px-3 py-2 text-center text-xs text-slate-400">
                              {index + 1}
                            </td>

                            <td className="px-3 py-2 font-mono text-xs text-slate-600">
                              {student.registerNumber}
                            </td>

                            <td className="px-3 py-2 text-slate-900">
                              {student.name}
                              {sheet.batchNumbers.length === 2 && (
                                <span className="ml-2 text-xs text-slate-400">
                                  B{student.batchNumber}
                                </span>
                              )}
                            </td>

                            {sheet.ias.map((ia) =>
                              getIACells(student, ia).map(
                                (value, cellIndex) => {
                                  const isTotal =
                                    cellIndex === ia.cos.length;

                                  return (
                                    <td
                                      key={`${ia.iaNumber}-${cellIndex}`}
                                      className={`px-3 py-2 text-center ${
                                        cellIndex === 0
                                          ? "border-l border-slate-200"
                                          : ""
                                      } ${
                                        isTotal
                                          ? "bg-slate-50 font-bold text-slate-900"
                                          : "text-slate-700"
                                      } ${
                                        value === "AB"
                                          ? "font-bold text-red-700"
                                          : ""
                                      }`}
                                    >
                                      {value}
                                    </td>
                                  );
                                }
                              )
                            )}
                          </tr>
                        ))}
                      </tbody>

                    </table>
                  </div>
                )}

            </div>
          )}

        </>
      )}

    </div>
  );
}
