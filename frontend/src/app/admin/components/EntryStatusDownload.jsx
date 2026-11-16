"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { Download, FileSpreadsheet } from "lucide-react";
import { departments } from "./EntryStatusGrid";

// =====================================================
// DOWNLOAD THE ENTRY STATUS GRID AS PDF OR EXCEL
// (the Excel sheet has the same content as the PDF)
//
// The PDF code and the letterhead are loaded only when
// the button is clicked.
//
// IA marks / attendance -> subjects
// Study material        -> materialRows
// =====================================================

export default function EntryStatusDownload({
  title,
  subtitle,
  fileName,
  subjects,
  materialRows,
  semesters,
  disabled,
}) {
  // "" | "pdf" | "excel"
  const [downloading, setDownloading] = useState("");

  const handleDownload = async (format = "pdf") => {
    if (downloading) {
      return;
    }

    try {
      setDownloading(format);

      const [reports, { loadLetterhead }] =
        await Promise.all([
          import("../../utils/entryStatusPdf"),
          import("../../utils/letterheadAssets"),
        ]);

      const letterhead =
        format === "excel" ? {} : await loadLetterhead();

      const doc = materialRows
        ? reports.buildStudyMaterialStatusPdf(
            {
              title,
              subtitle,
              rows: materialRows,
              semesters,
              departments,
            },
            letterhead
          )
        : reports.buildEntryStatusPdf(
            {
              title,
              subtitle,
              subjects,
              semesters,
              departments,
            },
            letterhead
          );

      if (format === "excel") {
        const { downloadPdfAsExcel } = await import(
          "../../utils/pdfToExcel"
        );

        await downloadPdfAsExcel(doc, fileName, "Entry Status");
      } else {
        doc.save(fileName);
      }
    } catch (err) {
      console.error("Entry status PDF error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Download",
        text: "The file could not be prepared. Please try again.",
        confirmButtonColor: "#283618",
      });
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleDownload("excel")}
        disabled={disabled || Boolean(downloading)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileSpreadsheet size={16} />
        {downloading === "excel" ? "Preparing Excel..." : "Download Excel"}
      </button>

      <button
        type="button"
        onClick={() => handleDownload("pdf")}
        disabled={disabled || Boolean(downloading)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download size={16} />
        {downloading === "pdf" ? "Preparing PDF..." : "Download PDF"}
      </button>
    </div>
  );
}
