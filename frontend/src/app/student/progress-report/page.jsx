"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { Download, FileSpreadsheet } from "lucide-react";
import { loadLetterhead } from "../../utils/letterheadAssets";
import {
  formatDate,
  getDepartmentName,
  getMonthLabel,
} from "./progressReportPdf";
import {
  AttendanceCell,
  AttendanceLegend,
  MarkCell,
  MarksLegend,
  assessmentHead,
  assessmentName,
  attendanceTone,
  percentOf,
} from "../components/AcademicBadges";

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
  const [downloadingExcel, setDownloadingExcel] = useState(false);

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

  // The same report as an Excel sheet (no photo or
  // signatures)
  const handleDownloadExcel = async () => {
    if (downloadingExcel || !report) {
      return;
    }

    try {
      setDownloadingExcel(true);

      const [{ buildProgressReportPdf }, { downloadPdfAsExcel }] =
        await Promise.all([
          import("./progressReportPdf"),
          import("../../utils/pdfToExcel"),
        ]);

      await downloadPdfAsExcel(
        buildProgressReportPdf(report, null, {}),
        `Progress_Report_${report.student.registerNumber}.xlsx`,
        "Progress Report"
      );
    } catch (err) {
      console.error("Progress report Excel error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Download",
        text: "The report could not be prepared. Please try again.",
        confirmButtonColor: "#283618",
      });
    } finally {
      setDownloadingExcel(false);
    }
  };

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
        confirmButtonColor: "#283618",
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
    overallAttendance,
  } = report;

  // ---------------- summary ----------------
  const attendanceOf = (row) =>
    percentOf(row.attendanceTotal?.attended, row.attendanceTotal?.eligible);

  const lowAttendance = rows.filter((row) => {
    const value = attendanceOf(row);
    return value !== null && value < minimumAttendance;
  }).length;

  const withCIE = rows.filter((row) => row.iaTotal?.maxMarks > 0);

  const belowMinimum = withCIE.filter(
    (row) => row.iaTotal.marks < row.iaTotal.minMarks
  ).length;

  const overallPercent = percentOf(
    overallAttendance?.attended,
    overallAttendance?.eligible
  );

  const overallTone = attendanceTone(overallPercent, minimumAttendance);

  const monthHead = (month) =>
    `${attendanceIsRunningTotal ? "Up to " : ""}${getMonthLabel(month)}`;

  const headCell =
    "px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider";

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Progress Report
            </h1>

            <p className="mt-1.5 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{student.name}</span>
              {" · "}
              <span className="font-mono">{student.registerNumber}</span>
              {" · "}
              {getDepartmentName(student.department)} · Semester {student.semester}, {report.academicYear}
              {student.mentorName ? ` · Mentor: ${student.mentorName}` : ""}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              As on {formatDate(report.generatedAt)}. Download it, sign it, get it signed by your parent and submit it to your HOD.
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={17} />
              {downloadingExcel ? "Preparing..." : "Excel"}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              {downloading ? "Preparing..." : "Download PDF"}
            </button>
          </div>
        </div>

        {/* ================= SUMMARY ================= */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile
            label="Overall attendance"
            value={overallPercent === null ? "—" : `${overallPercent}%`}
            note={
              overallPercent === null
                ? "Not entered yet"
                : `${overallAttendance.attended} of ${overallAttendance.eligible} classes`
            }
            tone={overallTone}
          />
          <SummaryTile
            label="Subjects below 75%"
            value={lowAttendance}
            note={lowAttendance ? "Attendance shortage" : "All subjects fine"}
            tone={lowAttendance ? "low" : "good"}
          />
          <SummaryTile
            label="Final CIE entered"
            value={`${withCIE.length}/${rows.length}`}
            note="subjects"
            tone="none"
          />
          <SummaryTile
            label="Below CIE minimum"
            value={belowMinimum}
            note={belowMinimum ? "Needs improvement" : "All subjects fine"}
            tone={belowMinimum ? "low" : "good"}
          />
        </div>

        {/* ================= ATTENDANCE ================= */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Attendance</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {attendanceIsRunningTotal
                  ? "Classes attended / held from the start of the semester up to the end of each month."
                  : "Classes attended / held in each month."}
              </p>
            </div>
            <AttendanceLegend minimum={minimumAttendance} />
          </div>

          {months.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Attendance has not been entered yet.
            </p>
          ) : (
            <>
              {/* phone: one card per subject */}
              <div className="divide-y divide-slate-100 md:hidden">
                {rows.map((row) => (
                  <div key={row.subject._id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <SubjectName row={row} />
                      <AttendanceCell
                        attended={row.attendanceTotal?.attended}
                        eligible={row.attendanceTotal?.eligible}
                        minimum={minimumAttendance}
                        large
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {months.map((month) => {
                        const value = row.attendance[month.key];
                        return (
                          <div key={month.key} className="rounded-lg bg-slate-50 px-1.5 py-2 text-center">
                            <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                              {getMonthLabel(month)}
                            </p>
                            <AttendanceCell
                              attended={value?.attended}
                              eligible={value?.eligible}
                              minimum={minimumAttendance}
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
                      {months.map((month) => (
                        <th key={month.key} className={`${headCell} text-slate-500`}>
                          {monthHead(month)}
                        </th>
                      ))}
                      <th className={`${headCell} bg-slate-800 text-white`}>
                        Semester
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.subject._id} className="hover:bg-slate-50/60">
                        <td className="sticky left-0 z-10 bg-white px-4 py-3">
                          <SubjectName row={row} />
                        </td>
                        {months.map((month) => {
                          const value = row.attendance[month.key];
                          return (
                            <td key={month.key} className="px-3 py-3 text-center">
                              <AttendanceCell
                                attended={value?.attended}
                                eligible={value?.eligible}
                                minimum={minimumAttendance}
                              />
                            </td>
                          );
                        })}
                        <td className="bg-slate-50 px-3 py-3 text-center">
                          <AttendanceCell
                            attended={row.attendanceTotal?.attended}
                            eligible={row.attendanceTotal?.eligible}
                            minimum={minimumAttendance}
                            large
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td
                        colSpan={months.length + 1}
                        className="sticky left-0 bg-slate-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600"
                      >
                        Overall (all subjects)
                      </td>
                      <td className="bg-slate-100 px-3 py-3 text-center">
                        <AttendanceCell
                          attended={overallAttendance?.attended}
                          eligible={overallAttendance?.eligible}
                          minimum={minimumAttendance}
                          large
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ================= INTERNAL ASSESSMENT ================= */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Internal Assessment</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Final CIE = average of the IAs and CIE 5, each scaled to the subject maximum, with the improvement test when higher. Red = below the subject minimum.
              </p>
            </div>
            <MarksLegend />
          </div>

          {iaNumbers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              IA marks have not been entered yet.
            </p>
          ) : (
            <>
              {/* phone: one card per subject */}
              <div className="divide-y divide-slate-100 md:hidden">
                {rows.map((row) => (
                  <div key={row.subject._id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <SubjectName row={row} />
                      <div className="text-center">
                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Final CIE</p>
                        <FinalCIE row={row} large />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {iaNumbers.map((iaNumber) => {
                        const value = row.ia[iaNumber];
                        return (
                          <div key={iaNumber} className="rounded-lg bg-slate-50 px-1.5 py-2 text-center">
                            <p className={`mx-auto mb-1 w-fit rounded px-1.5 text-[10px] font-bold uppercase ${assessmentHead(iaNumber)}`}>
                              {assessmentName(iaNumber)}
                            </p>
                            <MarkCell
                              marks={value?.marks}
                              max={value?.maxMarks}
                              absent={value?.absent}
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
                    <tr className="border-b border-slate-200">
                      <th className={`${headCell} sticky left-0 z-10 bg-slate-50 text-left text-slate-500`}>
                        Subject
                      </th>
                      {iaNumbers.map((iaNumber) => (
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
                    {rows.map((row) => (
                      <tr key={row.subject._id} className="hover:bg-slate-50/60">
                        <td className="sticky left-0 z-10 bg-white px-4 py-3">
                          <SubjectName row={row} />
                        </td>
                        {iaNumbers.map((iaNumber) => {
                          const value = row.ia[iaNumber];
                          return (
                            <td key={iaNumber} className="px-3 py-3 text-center">
                              <MarkCell
                                marks={value?.marks}
                                max={value?.maxMarks}
                                absent={value?.absent}
                              />
                            </td>
                          );
                        })}
                        <td className="bg-slate-50 px-3 py-3 text-center">
                          <FinalCIE row={row} large />
                          {row.iaTotal?.maxMarks > 0 && (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              min {row.iaTotal.minMarks}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <p className="text-xs leading-5 text-slate-500">
          The PDF has both tables on one page with your photo and mentor, a declaration for your parent, and places for the signatures of you, your parent, your mentor, the HOD and the Principal. Each time new attendance or IA marks are entered, download it again: the new report includes everything entered so far.
        </p>
      </div>
    </div>
  );
}

const SUMMARY_TONES = {
  good: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
  fair: "border-amber-200 bg-amber-50/60 text-amber-800",
  low: "border-red-200 bg-red-50/60 text-red-700",
  none: "border-slate-200 bg-white text-slate-900",
};

function SummaryTile({ label, value, note, tone }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${SUMMARY_TONES[tone] || SUMMARY_TONES.none}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  );
}

function SubjectName({ row }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold leading-snug text-slate-900">
        {row.subject.name}
      </p>
      <p className="font-mono text-[11px] text-slate-400">{row.subject.code}</p>
    </div>
  );
}

function FinalCIE({ row, large = false }) {
  return (
    row.iaTotal?.maxMarks ? (
      <span className="inline-flex flex-col items-center gap-0.5">
        <MarkCell
          marks={row.iaTotal.marks}
          max={row.iaTotal.maxMarks}
          minimum={row.iaTotal.minMarks}
          large={large}
        />
        {row.iaTotal.improvedIA && (
          <span className="text-[10px] font-semibold text-teal-700">
            Improved IA {row.iaTotal.improvedIA}
          </span>
        )}
      </span>
    ) : (
      <span className="text-sm text-slate-300">—</span>
    )
  );
}
