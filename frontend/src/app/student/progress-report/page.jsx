"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import { loadLetterhead } from "../../utils/letterheadAssets";
import {
  formatDate,
  formatMarks,
  formatPercent,
  getDepartmentName,
  getMonthLabel,
  monthPercentage,
} from "./progressReportPdf";

const API_URL = process.env.NEXT_PUBLIC_API_URL;


// =====================================================
// PHOTO FOR THE PDF
//
// The photo is redrawn as a small JPEG, whatever format
// it was uploaded in. A photo that cannot be loaded
// leaves an empty box in the report.
// =====================================================

const loadPhoto = (url) =>
  new Promise((resolve) => {
    if (!url) {
      resolve("");
      return;
    }

    const image = new window.Image();

    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        // Same shape as the box in the report (4 : 5)
        const width = 240;
        const height = 300;

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);

        // Fill the box, cutting off the extra
        // instead of stretching the face.
        const scale = Math.max(
          width / image.width,
          height / image.height
        );

        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;

        context.drawImage(
          image,
          (width - drawWidth) / 2,
          (height - drawHeight) / 2,
          drawWidth,
          drawHeight
        );

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        resolve("");
      }
    };

    image.onerror = () => resolve("");

    image.src = url;
  });

export default function StudentProgressReportPage() {
  const { getToken } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  // =====================================================
  // LOAD
  // =====================================================

  useEffect(() => {
    const loadReport = async () => {
      try {
        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/students/me/progress-report`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setReport(response.data);
      } catch (err) {
        console.error("Progress report error:", err);

        setError(
          err.response?.data?.message ||
            "Failed to load the progress report."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [getToken]);

  // =====================================================
  // DOWNLOAD PDF
  // =====================================================

  const handleDownload = async () => {
    if (downloading || !report) {
      return;
    }

    try {
      setDownloading(true);

      // The PDF code is loaded only when it is needed.
      const [
        { buildProgressReportPdf },
        photo,
        letterhead,
      ] = await Promise.all([
        import("./progressReportPdf"),
        loadPhoto(report.student.imageUrl),
        loadLetterhead(),
      ]);

      buildProgressReportPdf(
        report,
        photo,
        letterhead
      ).save(
        `Progress_Report_${report.student.registerNumber}.pdf`
      );
    } catch (err) {
      console.error(
        "Progress report PDF error:",
        err
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Download",
        text: "The report could not be prepared. Please try again.",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setDownloading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500">
        Loading progress report...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error ||
            "Failed to load the progress report."}
        </div>
      </div>
    );
  }

  const {
    student,
    months,
    iaNumbers,
    rows,
    minimumAttendance,
    attendanceIsRunningTotal,
  } = report;

  const isLow = (value) =>
    value !== null &&
    value !== undefined &&
    value < minimumAttendance;

  const headClass =
    "px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500";

  const cellClass =
    "px-3 py-2.5 text-center text-sm text-slate-700 whitespace-nowrap";

  const subjectCell = (row) => (
    <td className="px-5 py-2.5">
      <p className="font-mono text-xs font-bold text-slate-500">
        {row.subject.code}
      </p>

      <p className="text-sm font-medium text-slate-900">
        {row.subject.name}
      </p>
    </td>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Progress Report
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {student.name} · {student.registerNumber} · {getDepartmentName(student.department)} · Semester {student.semester}, {report.academicYear}
            {student.mentorName
              ? ` · Mentor: ${student.mentorName}`
              : ""}
          </p>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            As on {formatDate(report.generatedAt)}. Download it, sign it, get it signed by your parent and submit it to your HOD.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={17} />
          {downloading
            ? "Preparing..."
            : "Download PDF"}
        </button>

      </div>

      {/* ATTENDANCE */}

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Attendance
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            {attendanceIsRunningTotal
              ? "Classes attended / classes held from the start of the semester up to the end of each month, with the percentage."
              : "Classes attended / classes held in each month, with the percentage."}{" "}
            Below {minimumAttendance}% is shown in red.
          </p>
        </div>

        {months.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Attendance has not been entered yet.
          </p>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[560px]">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={`${headClass} text-left`}>
                    Subject
                  </th>

                  {months.map((month) => (
                    <th
                      key={month.key}
                      className={headClass}
                    >
                      {attendanceIsRunningTotal
                        ? "Up to "
                        : ""}
                      {getMonthLabel(month)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {rows.map((row) => (
                  <tr key={row.subject._id}>
                    {subjectCell(row)}

                    {months.map((month) => {
                      const value =
                        row.attendance[month.key];

                      const percent =
                        monthPercentage(value);

                      return (
                        <td
                          key={month.key}
                          className={cellClass}
                        >
                          {value ? (
                            <>
                              <span className="block">
                                {value.attended} / {value.eligible}
                              </span>

                              <span
                                className={`block text-xs font-bold ${
                                  isLow(percent)
                                    ? "text-red-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {formatPercent(percent)}
                              </span>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* INTERNAL ASSESSMENT */}

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Internal Assessment
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Marks obtained / maximum marks. AB means absent.
          </p>
        </div>

        {iaNumbers.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            IA marks have not been entered yet.
          </p>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[480px]">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className={`${headClass} text-left`}>
                    Subject
                  </th>

                  {iaNumbers.map((iaNumber) => (
                    <th
                      key={iaNumber}
                      className={headClass}
                    >
                      IA {iaNumber}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {rows.map((row) => (
                  <tr key={row.subject._id}>
                    {subjectCell(row)}

                    {iaNumbers.map((iaNumber) => {
                      const value = row.ia[iaNumber];

                      return (
                        <td
                          key={iaNumber}
                          className={`${cellClass} ${
                            value?.absent
                              ? "font-bold text-red-600"
                              : ""
                          }`}
                        >
                          {!value
                            ? "-"
                            : value.absent
                            ? `AB / ${formatMarks(
                                value.maxMarks
                              )}`
                            : `${formatMarks(
                                value.marks
                              )} / ${formatMarks(
                                value.maxMarks
                              )}`}
                        </td>
                      );
                    })}
                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      <p className="text-xs leading-5 text-slate-500">
        The PDF has both tables on one page with your photo and mentor, a declaration for your parent, and places for the signatures of you, your parent, your mentor, the HOD and the Principal. Each time new attendance or IA marks are entered, download it again: the new report includes everything entered so far.
      </p>

    </div>
  );
}
