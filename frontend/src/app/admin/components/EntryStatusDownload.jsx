"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import { departments } from "./EntryStatusGrid";

// =====================================================
// DOWNLOAD THE ENTRY STATUS GRID AS PDF
//
// The PDF code and the letterhead are loaded only when
// the button is clicked.
// =====================================================

export default function EntryStatusDownload({
  title,
  subtitle,
  fileName,
  subjects,
  semesters,
  disabled,
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) {
      return;
    }

    try {
      setDownloading(true);

      const [{ buildEntryStatusPdf }, { loadLetterhead }] =
        await Promise.all([
          import("../../utils/entryStatusPdf"),
          import("../../utils/letterheadAssets"),
        ]);

      const letterhead = await loadLetterhead();

      buildEntryStatusPdf(
        {
          title,
          subtitle,
          subjects,
          semesters,
          departments,
        },
        letterhead
      ).save(fileName);
    } catch (err) {
      console.error("Entry status PDF error:", err);

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

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled || downloading}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download size={16} />
      {downloading ? "Preparing PDF..." : "Download PDF"}
    </button>
  );
}
