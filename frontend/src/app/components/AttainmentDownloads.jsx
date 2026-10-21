"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { FileSpreadsheet, FileText } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// =====================================================
// CO ATTAINMENT DOWNLOADS
//
// Subject:  <AttainmentDownloads subjectId academicYear iaNumber />
//           Offers "this IA" or "all IAs" when iaNumber is given.
//
// Semester: <AttainmentDownloads scope="semester"
//             academicYear semester department />
//
// Each download asks the server for the attainment and
// builds the PDF (with the college letterhead) or the
// Excel file in the browser.
// =====================================================

export default function AttainmentDownloads({
  scope = "subject",
  subjectId,
  academicYear,
  iaNumber,
  semester,
  department,
}) {
  const { getToken } = useAuth();

  // "ia" = only this IA, "all" = all IAs of the year
  const [range, setRange] = useState(
    iaNumber ? "ia" : "all"
  );

  // "pdf" | "excel" | ""
  const [busy, setBusy] = useState("");

  const ready =
    scope === "semester"
      ? Boolean(academicYear && semester)
      : Boolean(subjectId && academicYear);

  const loadData = async () => {
    const token = await getToken();

    const response = await axios.get(
      `${API_URL}/api/attainment/${scope}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params:
          scope === "semester"
            ? {
                academicYear,
                semester,
                ...(department ? { department } : {}),
              }
            : {
                subjectId,
                academicYear,
                ...(range === "ia" && iaNumber
                  ? { iaNumber }
                  : {}),
              },
      }
    );

    return response.data;
  };

  const download = async (format) => {
    if (busy || !ready) {
      return;
    }

    try {
      setBusy(format);

      const data = await loadData();

      if (scope === "subject" && data.columns.length === 0) {
        await Swal.fire({
          icon: "info",
          title: "No IA Marks Yet",
          text: "CO attainment can be downloaded once IA marks have been saved for this subject.",
          confirmButtonColor: "#283618",
        });

        return;
      }

      const reports = await import(
        "../utils/attainmentReports.js"
      );

      if (format === "excel") {
        const XLSX = await import("xlsx-js-style");

        if (scope === "semester") {
          reports.exportSemesterAttainmentExcel(XLSX, data);
        } else {
          reports.exportSubjectAttainmentExcel(XLSX, data);
        }

        return;
      }

      const { loadLetterhead } = await import(
        "../utils/letterheadAssets"
      );

      const letterhead = await loadLetterhead();

      if (scope === "semester") {
        reports
          .buildSemesterAttainmentPdf(data, letterhead)
          .save(reports.semesterFileName(data, "pdf"));
      } else {
        reports
          .buildSubjectAttainmentPdf(data, letterhead)
          .save(reports.subjectFileName(data, "pdf"));
      }
    } catch (err) {
      console.error("CO attainment download error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Download",
        text:
          err.response?.data?.message ||
          "The CO attainment report could not be prepared. Please try again.",
        confirmButtonColor: "#283618",
      });
    } finally {
      setBusy("");
    }
  };

  const buttonClass =
    "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">

      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {scope === "semester"
          ? "Semester CO Attainment"
          : "CO Attainment"}
      </span>

      {scope === "subject" && iaNumber && (
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          aria-label="Which IA"
          className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
        >
          <option value="ia">IA {iaNumber}</option>
          <option value="all">All IAs</option>
        </select>
      )}

      <button
        type="button"
        onClick={() => download("pdf")}
        disabled={!ready || Boolean(busy)}
        className={`${buttonClass} bg-slate-900 text-white hover:bg-slate-700`}
      >
        <FileText size={16} />
        {busy === "pdf" ? "Preparing..." : "PDF"}
      </button>

      <button
        type="button"
        onClick={() => download("excel")}
        disabled={!ready || Boolean(busy)}
        className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
      >
        <FileSpreadsheet size={16} />
        {busy === "excel" ? "Preparing..." : "Excel"}
      </button>

    </div>
  );
}
