"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function BulkStudentUpload({
  onSuccess,
  onCancel,
}) {
  const { getToken } = useAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setError("");
    setUploadResult(null);

    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      setError("Please select a CSV file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a CSV file first.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setUploadResult(null);

      const token = await getToken();

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post(
        `${API_URL}/api/students/bulk-upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUploadResult(response.data);

      if (
        response.data?.success &&
        onSuccess
      ) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error(
        "Bulk student upload error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Bulk student upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  // ==========================================================
  // DOWNLOAD CSV TEMPLATE
  // ==========================================================

  const downloadTemplate = () => {
    const csv =
      "registerNumber,name,gender,email,phone,department,admissionYear,semester,batch,batchNumber\n" +
      "1KT23CS001,Student One,male,student1@gmail.com,9876543210,cs,2023,5,2023-2026,1\n" +
      "1KT23CS002,Student Two,female,student2@gmail.com,9876543211,cs,2023,3,2023-2026,2\n" +
      "1KT23EC001,Student Three,male,student3@gmail.com,9876543212,ec,2023,3,2023-2026,1\n";

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "students_template.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* HEADER */}

      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Bulk Student Upload
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add multiple students using a CSV file.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
              />
            </svg>

            Download Template
          </button>

        </div>
      </div>

      {/* CONTENT */}

      <div className="space-y-6 p-6">

        {/* INFORMATION */}

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">

          <div className="flex gap-3">

            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8h.01M11 12h1v4h1m-1 8a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z"
              />
            </svg>

            <div>

              <p className="text-sm font-semibold text-blue-900">
                CSV format
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-700">
                <span className="font-medium">
                  Required columns:
                </span>{" "}
                registerNumber, name, gender, email,
                phone, department, admissionYear,
                semester, batch, batchNumber
              </p>

              <p className="mt-2 text-xs text-blue-600">
                Gender must be entered as{" "}
                <span className="font-semibold">
                  male
                </span>
                ,{" "}
                <span className="font-semibold">
                  female
                </span>
                , or{" "}
                <span className="font-semibold">
                  other
                </span>
                .
              </p>

              <p className="mt-1 text-xs text-blue-600">
                Student photos are not required during
                bulk upload. Photos can be added later.
              </p>

            </div>

          </div>

        </div>

        {/* UPLOAD AREA */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Student CSV File
          </label>

          <label
            htmlFor="student-csv"
            className="flex min-h-[210px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition hover:border-slate-300 hover:bg-slate-100/60"
          >

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

              <svg
                className="h-7 w-7 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                  d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"
                />
              </svg>

            </div>

            {selectedFile ? (
              <>
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  {selectedFile.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {(
                    selectedFile.size /
                    1024
                  ).toFixed(1)}{" "}
                  KB
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  Choose a CSV file
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Click here to browse your computer
                </p>
              </>
            )}

            <p className="mt-3 text-xs text-slate-400">
              CSV only • Maximum 5 MB
            </p>

            <input
              id="student-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />

          </label>

        </div>

        {/* ERROR */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">

            <p className="text-sm font-medium text-red-700">
              {error}
            </p>

          </div>
        )}

        {/* RESULT */}

        {uploadResult && (
          <div
            className={`rounded-xl border px-5 py-4 ${
              uploadResult.success
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >

            <div className="flex items-start gap-3">

              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  uploadResult.success
                    ? "bg-emerald-100"
                    : "bg-red-100"
                }`}
              >

                {uploadResult.success ? (
                  <svg
                    className="h-4 w-4 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m5 12 4 4L19 6"
                    />
                  </svg>
                ) : (
                  <span className="text-sm font-bold text-red-600">
                    !
                  </span>
                )}

              </div>

              <div className="min-w-0 flex-1">

                <p
                  className={`text-sm font-semibold ${
                    uploadResult.success
                      ? "text-emerald-800"
                      : "text-red-800"
                  }`}
                >
                  {uploadResult.message ||
                    (uploadResult.success
                      ? "Upload completed."
                      : "Upload failed.")}
                </p>

                {/* SUMMARY */}

                {uploadResult.summary && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">

                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs text-slate-500">
                        Total
                      </p>

                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {uploadResult.summary.total ??
                          0}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs text-slate-500">
                        Added
                      </p>

                      <p className="mt-1 text-lg font-semibold text-emerald-600">
                        {uploadResult.summary.added ??
                          uploadResult.summary.inserted ??
                          0}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs text-slate-500">
                        Skipped
                      </p>

                      <p className="mt-1 text-lg font-semibold text-amber-600">
                        {uploadResult.summary.skipped ??
                          0}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-xs text-slate-500">
                        Errors
                      </p>

                      <p className="mt-1 text-lg font-semibold text-red-600">
                        {uploadResult.summary.errors ??
                          0}
                      </p>
                    </div>

                  </div>
                )}

                {/* ROW ERRORS */}

                {Array.isArray(
                  uploadResult.errors
                ) &&
                  uploadResult.errors.length > 0 && (
                    <div className="mt-4 rounded-lg bg-white/70 p-4">

                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Row Errors
                      </p>

                      <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">

                        {uploadResult.errors.map(
                          (item, index) => (
                            <p
                              key={index}
                              className="text-xs text-red-600"
                            >
                              {typeof item ===
                              "string"
                                ? item
                                : `Row ${
                                    item.row ||
                                    index + 1
                                  }: ${
                                    item.message ||
                                    "Invalid data"
                                  }`}
                            </p>
                          )
                        )}

                      </div>

                    </div>
                  )}

              </div>

            </div>

          </div>
        )}

      </div>

      {/* FOOTER */}

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">

        <button
          type="button"
          onClick={resetUpload}
          disabled={uploading}
          className="text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
        >
          Clear
        </button>

        <div className="flex gap-3">

          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={
              !selectedFile || uploading
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {uploading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}

            {uploading
              ? "Uploading..."
              : "Upload Students"}

          </button>

        </div>

      </div>

    </div>
  );
}