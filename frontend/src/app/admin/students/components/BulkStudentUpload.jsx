"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import * as XLSX from "xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ==========================================================
// USER-FACING EXCEL PHOTO COLUMN
// ==========================================================

const PHOTO_COLUMN =
  "Student Photo with uniform, ID card and white background. PASSPORT size photo";

// ==========================================================
// USER-FACING EXCEL COLUMNS
// ==========================================================

const REQUIRED_COLUMNS = [
  "Register Number",
  "Student Name",
  "Email id",
  "Phone Number",
  "Course",
  "AdmissionYear",
  "Semester",
  "Batch",
  "Batch Number",
  "Gender",
  PHOTO_COLUMN,
];

// ==========================================================
// BACKEND FIELD MAPPING
// DO NOT CHANGE BACKEND
// ==========================================================

const EXCEL_TO_BACKEND = {
  "Register Number": "registerNumber",
  "Student Name": "name",
  "Email id": "email",
  "Phone Number": "phone",
  Course: "department",
  AdmissionYear: "admissionYear",
  Semester: "semester",
  Batch: "batch",
  "Batch Number": "batchNumber",
  Gender: "gender",
  [PHOTO_COLUMN]: "Photo",
};

export default function BulkStudentUpload({
  onSuccess,
  onCancel,
}) {
  const { getToken } = useAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");

  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setError("");
    setUploadResult(null);

    const fileName = file.name.toLowerCase();

    if (
      !fileName.endsWith(".xlsx") &&
      !fileName.endsWith(".xls")
    ) {
      setError(
        "Please select an Excel file (.xlsx or .xls)."
      );

      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");

      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  // ==========================================================
  // READ EXCEL AND CONVERT TO EXISTING BACKEND FORMAT
  // ==========================================================

  const prepareExcelForBackend = async (file) => {
    const arrayBuffer = await file.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true,
    });

    if (!workbook.SheetNames.length) {
      throw new Error(
        "Excel file does not contain any worksheet."
      );
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: true,
    });

    if (!rows.length) {
      throw new Error("Excel file is empty.");
    }

    // ========================================================
    // CHECK REQUIRED COLUMNS
    // ========================================================

    const existingColumns = Object.keys(rows[0]);

    const missingColumns = REQUIRED_COLUMNS.filter(
      (column) => !existingColumns.includes(column)
    );

    if (missingColumns.length > 0) {
      throw new Error(
        `Missing Excel column(s): ${missingColumns.join(
          ", "
        )}`
      );
    }

    // ========================================================
    // CONVERT EACH ROW
    // ========================================================

    const backendRows = rows.map((row, index) => {
      const excelRowNumber = index + 2;

      // ------------------------------------------------------
      // REGISTER NUMBER
      // ------------------------------------------------------

      const registerNumber = String(
        row["Register Number"] ?? ""
      )
        .trim()
        .toUpperCase();

      // ------------------------------------------------------
      // NAME
      // ------------------------------------------------------

      const name = String(
        row["Student Name"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // EMAIL
      // ------------------------------------------------------

      const email = String(
        row["Email id"] ?? ""
      )
        .trim()
        .toLowerCase();

      // ------------------------------------------------------
      // PHONE
      // ------------------------------------------------------

      const phone = String(
        row["Phone Number"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // COURSE → DEPARTMENT
      // ------------------------------------------------------

      const department = String(
        row["Course"] ?? ""
      )
        .trim()
        .toLowerCase();

      // ------------------------------------------------------
      // ADMISSION YEAR
      // ------------------------------------------------------

      const admissionYearRaw = String(
        row["AdmissionYear"] ?? ""
      ).trim();

      const admissionYear = Number(
        admissionYearRaw
      );

      // ------------------------------------------------------
      // SEMESTER
      // ------------------------------------------------------

      const semesterRaw = String(
        row["Semester"] ?? ""
      ).trim();

      const semester = Number(
        semesterRaw
      );

      // ------------------------------------------------------
      // BATCH
      // ------------------------------------------------------

      const batch = String(
        row["Batch"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // BATCH NUMBER
      // ------------------------------------------------------

      const batchNumberRaw = String(
        row["Batch Number"] ?? ""
      ).trim();

      const batchNumber = Number(
        batchNumberRaw
      );

      // ------------------------------------------------------
      // GENDER
      // ------------------------------------------------------

      const gender = String(
        row["Gender"] ?? ""
      )
        .trim()
        .toLowerCase();

      // ------------------------------------------------------
      // GOOGLE DRIVE PHOTO
      // ------------------------------------------------------

      const photo = String(
        row[PHOTO_COLUMN] ?? ""
      ).trim();

      // ======================================================
      // VALIDATION
      // ======================================================

      if (!registerNumber) {
        throw new Error(
          `Row ${excelRowNumber}: Register Number is missing.`
        );
      }

      if (!name) {
        throw new Error(
          `Row ${excelRowNumber}: Student Name is missing.`
        );
      }

      if (!email) {
        throw new Error(
          `Row ${excelRowNumber}: Email id is missing.`
        );
      }

      if (!phone) {
        throw new Error(
          `Row ${excelRowNumber}: Phone Number is missing.`
        );
      }

      if (!department) {
        throw new Error(
          `Row ${excelRowNumber}: Course is missing.`
        );
      }

      if (
        !Number.isInteger(admissionYear) ||
        admissionYear < 2000 ||
        admissionYear > 2100
      ) {
        throw new Error(
          `Row ${excelRowNumber}: Invalid AdmissionYear "${admissionYearRaw}".`
        );
      }

      if (
        !Number.isInteger(semester) ||
        semester < 1 ||
        semester > 6
      ) {
        throw new Error(
          `Row ${excelRowNumber}: Semester must be between 1 and 6.`
        );
      }

      if (!batch) {
        throw new Error(
          `Row ${excelRowNumber}: Batch is missing.`
        );
      }

      if (![1, 2].includes(batchNumber)) {
        throw new Error(
          `Row ${excelRowNumber}: Batch Number must be 1 or 2.`
        );
      }

      if (
        !["male", "female", "other"].includes(
          gender
        )
      ) {
        throw new Error(
          `Row ${excelRowNumber}: Gender must be male, female or other.`
        );
      }

      // ======================================================
      // ACADEMIC YEAR
      //
      // This is NOT part of Student model.
      //
      // It is required by the existing backend for
      // StudentSemester.
      //
      // AdmissionYear 2023 → 2023-24
      // ======================================================

      const academicYear =
        `${admissionYear}-${String(
          admissionYear + 1
        ).slice(-2)}`;

      // ======================================================
      // RETURN EXISTING BACKEND FORMAT
      // ======================================================

      return {
        registerNumber,
        name,
        email,
        phone,
        department,
        admissionYear,
        academicYear,
        semester,
        batch,
        batchNumber,
        gender,
        Photo: photo,
      };
    });

    // ========================================================
    // CREATE TEMPORARY EXCEL FOR EXISTING BACKEND
    // ========================================================

    const backendHeaders = [
      "registerNumber",
      "name",
      "email",
      "phone",
      "department",
      "admissionYear",
      "academicYear",
      "semester",
      "batch",
      "batchNumber",
      "gender",
      "Photo",
    ];

    const backendWorksheet =
      XLSX.utils.json_to_sheet(
        backendRows,
        {
          header: backendHeaders,
        }
      );

    backendWorksheet["!cols"] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 30 },
      { wch: 16 },
      { wch: 15 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 75 },
    ];

    const backendWorkbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      backendWorkbook,
      backendWorksheet,
      "Students"
    );

    // ========================================================
    // CONVERT WORKBOOK TO BINARY
    // ========================================================

    const excelBuffer = XLSX.write(
      backendWorkbook,
      {
        bookType: "xlsx",
        type: "array",
      }
    );

    return new Blob(
      [excelBuffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );
  };

  // ==========================================================
  // UPLOAD EXCEL
  // ==========================================================

  const handleUpload = async () => {
    if (!selectedFile) {
      setError(
        "Please select an Excel file first."
      );
      return;
    }

    try {
      setUploading(true);
      setError("");
      setUploadResult(null);

      // ======================================================
      // CONVERT USER EXCEL → BACKEND EXCEL
      // ======================================================

      const backendExcel =
        await prepareExcelForBackend(
          selectedFile
        );

      // ======================================================
      // GET CLERK TOKEN
      // ======================================================

     const token = await getToken();

if (!token) {
  throw new Error(
    "Authentication token could not be obtained."
  );
}

console.log("CLERK TOKEN:", token);
console.log(
  "TOKEN LENGTH:",
  token?.length
);
console.log(
  "API URL:",
  API_URL
);

      // ======================================================
      // FORM DATA
      // ======================================================

      const formData = new FormData();

      formData.append(
        "file",
        backendExcel,
        "students_bulk_upload.xlsx"
      );

      // ======================================================
      // SEND TO EXISTING BACKEND
      // ======================================================

      const response = await axios.post(
        `${API_URL}/api/students/bulk-upload`,
        formData,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      setUploadResult(
        response.data
      );

      if (
        response.data?.success &&
        onSuccess
      ) {
        onSuccess(
          response.data
        );
      }
    } catch (err) {
      console.error(
        "Bulk student upload error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Bulk student upload failed."
      );

      if (err.response?.data) {
        setUploadResult(
          err.response.data
        );
      }
    } finally {
      setUploading(false);
    }
  };

  // ==========================================================
  // DOWNLOAD USER-FRIENDLY EXCEL TEMPLATE
  // ==========================================================

  const downloadTemplate = () => {
    const headers = [
      "Register Number",
      "Student Name",
      "Email id",
      "Phone Number",
      "Course",
      "AdmissionYear",
      "Semester",
      "Batch",
      "Batch Number",
      "Gender",
      PHOTO_COLUMN,
    ];

    // ========================================================
    // SAMPLE DATA
    // ========================================================

    const rows = [
      {
        "Register Number":
          "1KT23CS001",

        "Student Name":
          "Student One",

        "Email id":
          "student1@gmail.com",

        "Phone Number":
          "9876543210",

        Course:
          "CS",

        AdmissionYear:
          2023,

        Semester:
          5,

        Batch:
          "2023-2026",

        "Batch Number":
          1,

        Gender:
          "male",

        [PHOTO_COLUMN]:
          "https://drive.google.com/file/d/FILE_ID/view",
      },

      {
        "Register Number":
          "1KT23CS002",

        "Student Name":
          "Student Two",

        "Email id":
          "student2@gmail.com",

        "Phone Number":
          "9876543211",

        Course:
          "CS",

        AdmissionYear:
          2023,

        Semester:
          5,

        Batch:
          "2023-2026",

        "Batch Number":
          2,

        Gender:
          "female",

        [PHOTO_COLUMN]:
          "https://drive.google.com/file/d/FILE_ID/view",
      },

      {
        "Register Number":
          "1KT23EC001",

        "Student Name":
          "Student Three",

        "Email id":
          "student3@gmail.com",

        "Phone Number":
          "9876543212",

        Course:
          "EC",

        AdmissionYear:
          2023,

        Semester:
          5,

        Batch:
          "2023-2026",

        "Batch Number":
          1,

        Gender:
          "male",

        [PHOTO_COLUMN]:
          "",
      },
    ];

    // ========================================================
    // CREATE WORKSHEET
    // ========================================================

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows,
        {
          header: headers,
        }
      );

    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 30 },
      { wch: 16 },
      { wch: 15 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 75 },
    ];

    // ========================================================
    // CREATE WORKBOOK
    // ========================================================

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Students"
    );

    // ========================================================
    // DOWNLOAD
    // ========================================================

    XLSX.writeFile(
      workbook,
      "students_bulk_upload_template.xlsx"
    );
  };

  // ==========================================================
  // RESET
  // ==========================================================

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError("");

    const input =
      document.getElementById(
        "student-excel"
      );

    if (input) {
      input.value = "";
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="border-b border-slate-100 px-6 py-5">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Bulk Student Upload
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add multiple students using an Excel file.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

            Download Excel Template
          </button>

        </div>
      </div>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="space-y-6 p-6">

        {/* ===================================================
            INFORMATION
        ==================================================== */}

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
                Excel format
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-700">
                The Excel file must contain only these
                student details:
              </p>

              <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-blue-700 sm:grid-cols-2">

                <span>
                  • Register Number
                </span>

                <span>
                  • Student Name
                </span>

                <span>
                  • Email id
                </span>

                <span>
                  • Phone Number
                </span>

                <span>
                  • Course
                </span>

                <span>
                  • AdmissionYear
                </span>

                <span>
                  • Semester
                </span>

                <span>
                  • Batch
                </span>

                <span>
                  • Batch Number
                </span>

                <span>
                  • Gender
                </span>

                <span className="sm:col-span-2">
                  • Student Photo with uniform, ID card
                  and white background, PASSPORT size
                </span>

              </div>

              <p className="mt-3 text-xs text-blue-600">
                <span className="font-semibold">
                  Course:
                </span>{" "}
                Enter the department/course code such as
                CS, EC, CE, ME, EE, etc.
              </p>

              <p className="mt-1 text-xs text-blue-600">
                <span className="font-semibold">
                  Semester:
                </span>{" "}
                Enter a number from 1 to 6.
              </p>

              <p className="mt-1 text-xs text-blue-600">
                <span className="font-semibold">
                  Batch Number:
                </span>{" "}
                Enter 1 or 2.
              </p>

              <p className="mt-1 text-xs text-blue-600">
                <span className="font-semibold">
                  Photo:
                </span>{" "}
                Enter the Google Drive link of the student's
                passport-size photo.
              </p>

              <p className="mt-1 text-xs text-blue-600">
                Google Drive photos must be shared as{" "}
                <span className="font-semibold">
                  Anyone with the link → Viewer
                </span>
                .
              </p>

              <p className="mt-1 text-xs text-blue-600">
                The photo should have uniform, ID card and
                white background.
              </p>

            </div>

          </div>

        </div>

        {/* ===================================================
            UPLOAD AREA
        ==================================================== */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Student Excel File
          </label>

          <label
            htmlFor="student-excel"
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
                <p className="mt-4 break-all text-sm font-semibold text-slate-900">
                  {selectedFile.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm font-semibold text-slate-900">
                  Choose an Excel file
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Click here to browse your computer
                </p>
              </>
            )}

            <p className="mt-3 text-xs text-slate-400">
              Excel only • .xlsx / .xls • Maximum 10 MB
            </p>

            <input
              id="student-excel"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
            />

          </label>

        </div>

        {/* ===================================================
            SELECTED FILE
        ==================================================== */}

        {selectedFile && !uploading && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

            <div className="flex items-center justify-between gap-3">

              <div className="min-w-0">

                <p className="text-xs font-medium text-slate-500">
                  Selected file
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                  {selectedFile.name}
                </p>

              </div>

              <button
                type="button"
                onClick={resetUpload}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>

            </div>

          </div>
        )}

        {/* ===================================================
            UPLOADING
        ==================================================== */}

        {uploading && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4">

            <div className="flex items-center gap-3">

              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />

              <div>

                <p className="text-sm font-semibold text-blue-900">
                  Uploading students...
                </p>

                <p className="mt-1 text-xs text-blue-700">
                  Student photos are being downloaded from
                  Google Drive and uploaded to Cloudinary.
                  Please do not close this window.
                </p>

              </div>

            </div>

          </div>
        )}

        {/* ===================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">

            <p className="text-sm font-medium text-red-700">
              {error}
            </p>

          </div>
        )}

        {/* ===================================================
            RESULT
        ==================================================== */}

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
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">

                    <div className="rounded-lg bg-white/70 p-3">

                      <p className="text-xs text-slate-500">
                        Total
                      </p>

                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {uploadResult.summary.totalRows ??
                          uploadResult.summary.total ??
                          0}
                      </p>

                    </div>

                    <div className="rounded-lg bg-white/70 p-3">

                      <p className="text-xs text-slate-500">
                        Added
                      </p>

                      <p className="mt-1 text-lg font-semibold text-emerald-600">
                        {uploadResult.summary.successful ??
                          uploadResult.summary.added ??
                          0}
                      </p>

                    </div>

                    <div className="rounded-lg bg-white/70 p-3">

                      <p className="text-xs text-slate-500">
                        Failed
                      </p>

                      <p className="mt-1 text-lg font-semibold text-red-600">
                        {uploadResult.summary.failed ??
                          uploadResult.summary.skipped ??
                          0}
                      </p>

                    </div>

                  </div>
                )}

                {/* SUCCESSFUL STUDENTS */}

                {Array.isArray(
                  uploadResult.createdStudents
                ) &&
                  uploadResult.createdStudents.length > 0 && (
                    <div className="mt-4 rounded-lg bg-white/70 p-4">

                      <div className="flex items-center justify-between">

                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Students Added
                        </p>

                        <p className="text-xs font-medium text-emerald-600">
                          {
                            uploadResult.createdStudents
                              .length
                          }{" "}
                          successful
                        </p>

                      </div>

                      <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">

                        {uploadResult.createdStudents.map(
                          (item, index) => (
                            <div
                              key={
                                item.studentId ||
                                `${item.registerNumber}-${index}`
                              }
                              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2"
                            >

                              <div className="min-w-0">

                                <p className="truncate text-xs font-semibold text-slate-800">
                                  {item.name ||
                                    "Student"}
                                </p>

                                <p className="text-[11px] text-slate-500">
                                  {item.registerNumber}
                                </p>

                              </div>

                              <div className="shrink-0">

                                {item.photoUploaded ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                                    Photo uploaded
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
                                    No photo
                                  </span>
                                )}

                              </div>

                            </div>
                          )
                        )}

                      </div>

                    </div>
                  )}

                {/* ERRORS */}

                {Array.isArray(
                  uploadResult.errors
                ) &&
                  uploadResult.errors.length > 0 && (
                    <div className="mt-4 rounded-lg bg-white/70 p-4">

                      <div className="flex items-center justify-between">

                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Failed Rows
                        </p>

                        <p className="text-xs font-medium text-red-600">
                          {
                            uploadResult.errors
                              .length
                          }{" "}
                          failed
                        </p>

                      </div>

                      <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">

                        {uploadResult.errors.map(
                          (item, index) => (
                            <div
                              key={index}
                              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2"
                            >

                              <p className="text-xs font-semibold text-red-700">
                                Row{" "}
                                {item.row ||
                                  index + 2}
                                {item.registerNumber
                                  ? ` — ${item.registerNumber}`
                                  : ""}
                              </p>

                              {item.name && (
                                <p className="mt-0.5 text-[11px] text-red-600">
                                  {item.name}
                                </p>
                              )}

                              <p className="mt-0.5 text-xs text-red-600">
                                {item.error ||
                                  item.message ||
                                  "Invalid data"}
                              </p>

                            </div>
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

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

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
              !selectedFile ||
              uploading
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