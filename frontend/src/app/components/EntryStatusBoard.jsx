"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import EntryStatusSection from "./EntryStatusSection";
import { isBridge } from "../utils/entryCounts";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// The academic year starts in July. July to December is
// the odd term, January to June the even term.
const getCurrentTerm = () => {
  const today = new Date();

  const startYear =
    today.getMonth() >= 6
      ? today.getFullYear()
      : today.getFullYear() - 1;

  return {
    academicYear: `${startYear}-${String(startYear + 1).slice(-2)}`,
    term: today.getMonth() >= 6 ? "odd" : "even",
  };
};

// Last month and this month, if they belong to this
// academic year: [{ key: "2026-10", label }]
const getAttendanceMonths = (academicYear) => {
  const startYear = Number(academicYear.slice(0, 4));

  const firstMonth = new Date(startYear, 6, 1);

  const today = new Date();

  return [-1, 0]
    .map(
      (offset) =>
        new Date(today.getFullYear(), today.getMonth() + offset, 1)
    )
    .filter((date) => date >= firstMonth)
    .map((date) => ({
      key: `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`,
      label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
    }));
};

// Subjects with batch1 / batch2 entered flags from a
// list of entered batches.
const withEntries = (subjects, getBatches) =>
  subjects.map((subject) => {
    const batches = getBatches(String(subject.subjectId)) || [];

    return {
      ...subject,
      batch1: { entered: batches.includes(1) },
      batch2: { entered: batches.includes(2) },
    };
  });

// =====================================================
// ENTRY STATUS BOARD
//
// The grids of the faculty and HOD Entry Status pages,
// one after the other, for the current term:
// each IA, then attendance of last month and this month.
//
// A faculty sees the subjects and batches allocated to
// them, and can download the consolidated IA sheet of
// each. A HOD sees every subject.
// =====================================================

export default function EntryStatusBoard({
  title = "Entry Status",
}) {
  const { getToken } = useAuth();

  const { academicYear, term } = useMemo(
    () => getCurrentTerm(),
    []
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");

  useEffect(() => {
    const loadGrid = async () => {
      try {
        setLoading(true);
        setError("");

        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/my-entries/grid`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: { academicYear, term },
          }
        );

        setData(response.data?.data || null);
      } catch (err) {
        console.error("Entry grid error:", err);

        setData(null);

        setError(
          err.response?.data?.message ||
            "Failed to load the entry status."
        );
      } finally {
        setLoading(false);
      }
    };

    loadGrid();
  }, [academicYear, term, getToken]);

  // =====================================================
  // SECTIONS
  // =====================================================

  const sections = useMemo(() => {
    if (!data) {
      return [];
    }

    const iaNumbers = [
      ...new Set(
        Object.values(data.ia).flatMap((byIA) =>
          Object.keys(byIA).map(Number)
        )
      ),
    ].sort((a, b) => a - b);

    const result = (iaNumbers.length > 0 ? iaNumbers : [1]).map(
      (iaNumber) => ({
        key: `ia-${iaNumber}`,
        title: `IA ${iaNumber}`,
        subjects: withEntries(
          data.subjects,
          (subjectId) => data.ia[subjectId]?.[iaNumber]
        ),
      })
    );

    // Bridge courses have no attendance.
    const attendanceSubjects = data.subjects.filter(
      (subject) => !isBridge(subject)
    );

    getAttendanceMonths(academicYear).forEach((month) => {
      result.push({
        key: `attendance-${month.key}`,
        title: `Attendance · ${month.label}`,
        subjects: withEntries(
          attendanceSubjects,
          (subjectId) => data.attendance[subjectId]?.[month.key]
        ),
      });
    });

    return result;
  }, [data, academicYear]);

  // Faculty: their subjects with at least one IA entered
  const sheetSubjects = useMemo(
    () =>
      data && !data.allSubjects
        ? data.subjects.filter(
            (subject) =>
              Object.keys(data.ia[String(subject.subjectId)] || {})
                .length > 0
          )
        : [],
    [data]
  );

  // =====================================================
  // DOWNLOAD CONSOLIDATED IA SHEET
  // =====================================================

  const handleDownloadSheet = async (subject) => {
    if (downloadingId) {
      return;
    }

    try {
      setDownloadingId(String(subject.subjectId));

      const token = await getToken();

      const [response, reports, { loadLetterhead }] =
        await Promise.all([
          axios.get(`${API_URL}/api/my-entries/ia-sheet`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              subjectId: subject.subjectId,
              academicYear,
              batch:
                subject.batchNumbers.length === 2
                  ? "both"
                  : subject.batchNumbers[0],
            },
          }),
          import("../utils/iaSheetPdf"),
          import("../utils/letterheadAssets"),
        ]);

      const sheet = response.data?.data;

      const letterhead = await loadLetterhead();

      reports
        .buildIASheetPdf(sheet, letterhead)
        .save(reports.iaSheetFileName(sheet));
    } catch (err) {
      console.error("IA sheet download error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Download",
        text:
          err.response?.data?.message ||
          "The IA sheet could not be prepared. Please try again.",
        confirmButtonColor: "#283618",
      });
    } finally {
      setDownloadingId("");
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {academicYear} · {term === "odd" ? "Odd" : "Even"} semesters.{" "}
          {data && !data.allSubjects
            ? "The subjects and batches allocated to you."
            : "Every subject of the term."}{" "}
          Shows only whether data is entered, never the marks.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Loading entry status...
        </div>
      )}

      {!loading && data && data.subjects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No subjects are allocated to you for this term yet. Your HOD allocates subjects from the Course Allocation page.
        </div>
      )}

      {!loading &&
        data &&
        data.subjects.length > 0 &&
        sections.map((section) => (
          <EntryStatusSection
            key={section.key}
            title={section.title}
            subjects={section.subjects}
            semesters={data.semesters}
            onlyWithSubjects={!data.allSubjects}
          />
        ))}

      {/* FACULTY: CONSOLIDATED IA SHEETS */}

      {!loading && sheetSubjects.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-bold text-slate-900">
            IA Sheets
          </h2>

          <p className="mb-3 text-sm text-slate-500">
            Every IA of a subject side by side, with only the COs that carry marks, as PDF.
          </p>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {sheetSubjects.map((subject) => (
              <div
                key={subject.subjectId}
                className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-xs font-bold text-slate-700">
                    {subject.code}
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {subject.name}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {subject.department.toUpperCase()} · Semester{" "}
                    {subject.semester} ·{" "}
                    {subject.batchNumbers.length === 2
                      ? "Batch 1 & Batch 2"
                      : `Batch ${subject.batchNumbers[0]}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadSheet(subject)}
                  disabled={Boolean(downloadingId)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  {downloadingId === String(subject.subjectId)
                    ? "Preparing PDF..."
                    : "Download IA sheet"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
