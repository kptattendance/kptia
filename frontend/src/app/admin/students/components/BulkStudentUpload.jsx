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
  "Roll Number",
  "Student Name",
  "Father Name",
  "Mother Name",
  "DOB",
  "Gender",
  "Email id",
  "Phone Number",
  "Course",
  "AdmissionYear",
  "Batch",
  "Batch Number",
  "Admission Type",
  "Semester",
  PHOTO_COLUMN,
];

// ==========================================================
// BACKEND FIELD MAPPING
// ==========================================================

const EXCEL_TO_BACKEND = {
  "Register Number": "registerNumber",
  "Roll Number": "rollNumber",
  "Student Name": "name",
  "Father Name": "fatherName",
  "Mother Name": "motherName",
  DOB: "dob",
  Gender: "gender",
  "Email id": "email",
  "Phone Number": "phone",
  "Parent Phone": "parentPhone",
  Caste: "caste",
  Category: "category",
  "Aadhaar Number": "aadhaarNumber",
  "SATS Number": "satsNumber",
  Course: "department",
  AdmissionYear: "admissionYear",
  Batch: "batch",
  "Batch Number": "batchNumber",
  "Admission Type": "admissionType",
  Semester: "semester",
  Status: "status",
  [PHOTO_COLUMN]: "Photo",
};

// ==========================================================
// VALID VALUES
// ==========================================================

const VALID_GENDERS = ["male", "female", "other"];

const VALID_ADMISSION_TYPES = [
  "regular",
  "lateralPUC",
  "lateralITI",
  "lateralCross",
  "workingProfessional",
];

const VALID_STATUSES = [
  "active",
  "inactive",
  "passed",
  "detained",
  "discontinued",
  "transferred",
];

// ==========================================================
// DATE HELPER
// ==========================================================

const formatExcelDate = (value) => {
  if (!value) return "";

  // Excel cellDates:true normally gives Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const stringValue = String(value).trim();

  if (!stringValue) return "";

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  // DD-MM-YYYY
  const ddmmyyyy = stringValue.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/
  );

  if (ddmmyyyy) {
    const day = String(ddmmyyyy[1]).padStart(2, "0");
    const month = String(ddmmyyyy[2]).padStart(2, "0");
    const year = ddmmyyyy[3];

    return `${year}-${month}-${day}`;
  }

  // Try JavaScript Date
  const parsed = new Date(stringValue);

  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return stringValue;
};

// ==========================================================
// COMPONENT
// ==========================================================

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
  // READ EXCEL AND CONVERT TO BACKEND FORMAT
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
      // ROLL NUMBER
      // ------------------------------------------------------

      const rollNumber = String(
        row["Roll Number"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // NAME
      // ------------------------------------------------------

      const name = String(
        row["Student Name"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // FATHER NAME
      // ------------------------------------------------------

      const fatherName = String(
        row["Father Name"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // MOTHER NAME
      // ------------------------------------------------------

      const motherName = String(
        row["Mother Name"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // DOB
      // ------------------------------------------------------

      const dob = formatExcelDate(
        row["DOB"] ?? ""
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
      // PARENT PHONE
      // OPTIONAL
      // ------------------------------------------------------

      const parentPhone = String(
        row["Parent Phone"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // CASTE
      // OPTIONAL
      // ------------------------------------------------------

      const caste = String(
        row["Caste"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // CATEGORY
      // OPTIONAL
      // ------------------------------------------------------

      const category = String(
        row["Category"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // AADHAAR NUMBER
      // OPTIONAL
      // ------------------------------------------------------

      const aadhaarNumber = String(
        row["Aadhaar Number"] ?? ""
      ).trim();

      // ------------------------------------------------------
      // SATS NUMBER
      // OPTIONAL
      // ------------------------------------------------------

      const satsNumber = String(
        row["SATS Number"] ?? ""
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
      // ADMISSION TYPE
      // ------------------------------------------------------

      const admissionType = String(
        row["Admission Type"] ?? ""
      ).trim();

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
      // STATUS
      // ------------------------------------------------------

      const statusRaw = String(
        row["Status"] ?? ""
      ).trim().toLowerCase();

      const status = statusRaw || "active";

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

      if (!rollNumber) {
        throw new Error(
          `Row ${excelRowNumber}: Roll Number is missing.`
        );
      }

      if (!name) {
        throw new Error(
          `Row ${excelRowNumber}: Student Name is missing.`
        );
      }

      if (!fatherName) {
        throw new Error(
          `Row ${excelRowNumber}: Father Name is missing.`
        );
      }

      if (!motherName) {
        throw new Error(
          `Row ${excelRowNumber}: Mother Name is missing.`
        );
      }

      if (!dob) {
        throw new Error(
          `Row ${excelRowNumber}: DOB is missing.`
        );
      }

      // Validate DOB
      const dobDate = new Date(dob);

      if (isNaN(dobDate.getTime())) {
        throw new Error(
          `Row ${excelRowNumber}: Invalid DOB "${dob}". Use DD-MM-YYYY or YYYY-MM-DD.`
        );
      }

      if (!gender) {
        throw new Error(
          `Row ${excelRowNumber}: Gender is missing.`
        );
      }

      if (!VALID_GENDERS.includes(gender)) {
        throw new Error(
          `Row ${excelRowNumber}: Gender must be male, female or other.`
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

      if (!/^\d{10}$/.test(phone)) {
        throw new Error(
          `Row ${excelRowNumber}: Phone Number must contain exactly 10 digits.`
        );
      }

      // Parent phone is optional
      if (
        parentPhone &&
        !/^\d{10}$/.test(parentPhone)
      ) {
        throw new Error(
          `Row ${excelRowNumber}: Parent Phone must contain exactly 10 digits.`
        );
      }

      // Aadhaar is optional
      if (
        aadhaarNumber &&
        !/^\d{12}$/.test(aadhaarNumber)
      ) {
        throw new Error(
          `Row ${excelRowNumber}: Aadhaar Number must contain exactly 12 digits.`
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

      if (!admissionType) {
        throw new Error(
          `Row ${excelRowNumber}: Admission Type is missing.`
        );
      }

      if (
        !VALID_ADMISSION_TYPES.includes(
          admissionType
        )
      ) {
        throw new Error(
          `Row ${excelRowNumber}: Invalid Admission Type "${admissionType}". Valid values are regular, lateralPUC, lateralITI, lateralCross, workingProfessional.`
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

      if (!VALID_STATUSES.includes(status)) {
        throw new Error(
          `Row ${excelRowNumber}: Invalid Status "${status}".`
        );
      }

      // ======================================================
      // ACADEMIC YEAR
      //
      // This is NOT part of Student model.
      //
      // It is required by the existing backend
      // StudentSemester logic.
      // ======================================================

      const academicYear =
        `${admissionYear}-${String(
          admissionYear + 1
        ).slice(-2)}`;

      // ======================================================
      // RETURN BACKEND FORMAT
      // ======================================================

      return {
        registerNumber,
        rollNumber,
        name,
        fatherName,
        motherName,
        dob,
        gender,
        email,
        phone,
        parentPhone,
        caste,
        category,
        aadhaarNumber,
        satsNumber,
        department,
        admissionYear,
        academicYear,
        batch,
        batchNumber,
        admissionType,
        semester,
        status,
        Photo: photo,
      };
    });

    // ========================================================
    // CREATE TEMPORARY EXCEL FOR BACKEND
    // ========================================================

    const backendHeaders = [
      "registerNumber",
      "rollNumber",
      "name",
      "fatherName",
      "motherName",
      "dob",
      "gender",
      "email",
      "phone",
      "parentPhone",
      "caste",
      "category",
      "aadhaarNumber",
      "satsNumber",
      "department",
      "admissionYear",
      "academicYear",
      "batch",
      "batchNumber",
      "admissionType",
      "semester",
      "status",
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
      { wch: 20 }, // registerNumber
      { wch: 15 }, // rollNumber
      { wch: 30 }, // name
      { wch: 30 }, // fatherName
      { wch: 30 }, // motherName
      { wch: 15 }, // dob
      { wch: 12 }, // gender
      { wch: 30 }, // email
      { wch: 16 }, // phone
      { wch: 16 }, // parentPhone
      { wch: 15 }, // caste
      { wch: 15 }, // category
      { wch: 18 }, // aadhaarNumber
      { wch: 18 }, // satsNumber
      { wch: 15 }, // department
      { wch: 16 }, // admissionYear
      { wch: 18 }, // academicYear
      { wch: 18 }, // batch
      { wch: 15 }, // batchNumber
      { wch: 25 }, // admissionType
      { wch: 12 }, // semester
      { wch: 15 }, // status
      { wch: 75 }, // Photo
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

      console.log(
        "CLERK TOKEN:",
        token
      );

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
      "Roll Number",
      "Student Name",
      "Father Name",
      "Mother Name",
      "DOB",
      "Gender",
      "Email id",
      "Phone Number",
      "Parent Phone",
      "Caste",
      "Category",
      "Aadhaar Number",
      "SATS Number",
      "Course",
      "AdmissionYear",
      "Batch",
      "Batch Number",
      "Admission Type",
      "Semester",
      "Status",
      PHOTO_COLUMN,
    ];

    // ========================================================
    // SAMPLE DATA
    // ========================================================

    const rows = [
      {
        "Register Number":
          "103CS26001",

        "Roll Number":
          "1",

        "Student Name":
          "Student One",

        "Father Name":
          "Father One",

        "Mother Name":
          "Mother One",

        DOB:
          "15-06-2008",

        Gender:
          "male",

        "Email id":
          "student1@gmail.com",

        "Phone Number":
          "9876543210",

        "Parent Phone":
          "9876543200",

        Caste:
          "2A",

        Category:
          "2A",

        "Aadhaar Number":
          "123456789012",

        "SATS Number":
          "SATS100001",

        Course:
          "CS",

        AdmissionYear:
          2026,

        Batch:
          "2026-2029",

        "Batch Number":
          1,

        "Admission Type":
          "regular",

        Semester:
          1,

        Status:
          "active",

        [PHOTO_COLUMN]:
          "https://drive.google.com/file/d/FILE_ID/view",
      },

      {
        "Register Number":
          "103CS26701",

        "Roll Number":
          "1",

        "Student Name":
          "Student Two",

        "Father Name":
          "Father Two",

        "Mother Name":
          "Mother Two",

        DOB:
          "20-04-2007",

        Gender:
          "female",

        "Email id":
          "student2@gmail.com",

        "Phone Number":
          "9876543211",

        "Parent Phone":
          "9876543201",

        Caste:
          "GM",

        Category:
          "GM",

        "Aadhaar Number":
          "234567890123",

        "SATS Number":
          "SATS100002",

        Course:
          "CS",

        AdmissionYear:
          2026,

        Batch:
          "2026-2029",

        "Batch Number":
          2,

        "Admission Type":
          "lateralPUC",

        Semester:
          3,

        Status:
          "active",

        [PHOTO_COLUMN]:
          "https://drive.google.com/file/d/FILE_ID/view",
      },

      {
        "Register Number":
          "103CS26301",

        "Roll Number":
          "1",

        "Student Name":
          "Student Three",

        "Father Name":
          "Father Three",

        "Mother Name":
          "Mother Three",

        DOB:
          "10-02-2007",

        Gender:
          "male",

        "Email id":
          "student3@gmail.com",

        "Phone Number":
          "9876543212",

        "Parent Phone":
          "",

        Caste:
          "SC",

        Category:
          "SC",

        "Aadhaar Number":
          "",

        "SATS Number":
          "",

        Course:
          "EC",

        AdmissionYear:
          2026,

        Batch:
          "2026-2029",

        "Batch Number":
          1,

        "Admission Type":
          "lateralITI",

        Semester:
          3,

        Status:
          "active",

        [PHOTO_COLUMN]:
          "",
      },

      {
        "Register Number":
          "103CS26002",

        "Roll Number":
          "2",

        "Student Name":
          "Student Four",

        "Father Name":
          "Father Four",

        "Mother Name":
          "Mother Four",

        DOB:
          "05-09-2008",

        Gender:
          "female",

        "Email id":
          "student4@gmail.com",

        "Phone Number":
          "9876543213",

        "Parent Phone":
          "9876543203",

        Caste:
          "3B",

        Category:
          "3B",

        "Aadhaar Number":
          "345678901234",

        "SATS Number":
          "SATS100004",

        Course:
          "EC",

        AdmissionYear:
          2026,

        Batch:
          "2026-2029",

        "Batch Number":
          2,

        "Admission Type":
          "lateralCross",

        Semester:
          3,

        Status:
          "active",

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

    // ========================================================
    // COLUMN WIDTHS
    // ========================================================

    worksheet["!cols"] = [
      { wch: 20 }, // Register Number
      { wch: 15 }, // Roll Number
      { wch: 25 }, // Student Name
      { wch: 25 }, // Father Name
      { wch: 25 }, // Mother Name
      { wch: 15 }, // DOB
      { wch: 12 }, // Gender
      { wch: 30 }, // Email
      { wch: 16 }, // Phone
      { wch: 16 }, // Parent Phone
      { wch: 15 }, // Caste
      { wch: 15 }, // Category
      { wch: 18 }, // Aadhaar
      { wch: 18 }, // SATS
      { wch: 15 }, // Course
      { wch: 16 }, // AdmissionYear
      { wch: 18 }, // Batch
      { wch: 15 }, // Batch Number
      { wch: 25 }, // Admission Type
      { wch: 12 }, // Semester
      { wch: 15 }, // Status
      { wch: 75 }, // Photo
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
                Download the Excel template and enter the
                student details in the specified columns.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-blue-700 sm:grid-cols-2">

                <span>
                  • Register Number
                </span>

                <span>
                  • Roll Number
                </span>

                <span>
                  • Student Name
                </span>

                <span>
                  • Father Name
                </span>

                <span>
                  • Mother Name
                </span>

                <span>
                  • DOB
                </span>

                <span>
                  • Gender
                </span>

                <span>
                  • Email id
                </span>

                <span>
                  • Phone Number
                </span>

                <span>
                  • Parent Phone
                </span>

                <span>
                  • Caste
                </span>

                <span>
                  • Category
                </span>

                <span>
                  • Aadhaar Number
                </span>

                <span>
                  • SATS Number
                </span>

                <span>
                  • Course
                </span>

                <span>
                  • AdmissionYear
                </span>

                <span>
                  • Batch
                </span>

                <span>
                  • Batch Number
                </span>

                <span>
                  • Admission Type
                </span>

                <span>
                  • Semester
                </span>

                <span>
                  • Status
                </span>

                <span className="sm:col-span-2">
                  • Student Photo with uniform, ID card
                  and white background, PASSPORT size
                </span>

              </div>

              <div className="mt-4 space-y-1">

                <p className="text-xs text-blue-600">
                  <span className="font-semibold">
                    Gender:
                  </span>{" "}
                  Use male, female or other.
                </p>

                <p className="text-xs text-blue-600">
                  <span className="font-semibold">
                    Semester:
                  </span>{" "}
                  Enter a number from 1 to 6.
                </p>

                <p className="text-xs text-blue-600">
                  <span className="font-semibold">
                    Batch Number:
                  </span>{" "}
                  Enter 1 or 2.
                </p>

                <p className="text-xs text-blue-600">
                  <span className="font-semibold">
                    Admission Type:
                  </span>{" "}
                  Use one of:
                  {" "}
                  regular,
                  {" "}
                  lateralPUC,
                  {" "}
                  lateralITI,
                  {" "}
                  lateralCross,
                  {" "}
                  workingProfessional.
                </p>

                <p className="text-xs text-blue-600">
                  <span className="font-semibold">
                    Status:
                  </span>{" "}
                  Use active, inactive, passed, detained,
                  discontinued or transferred.
                </p>

                <p className="text-xs text-blue-600">
                  <span className="font-semibold">
                    DOB:
                  </span>{" "}
                  Enter as DD-MM-YYYY or YYYY-MM-DD.
                </p>

                <p className="text-xs text-blue-600">
                  <span className="font-semibold">
                    Course:
                  </span>{" "}
                  Enter the department/course code such as
                  CS, EC, CE, ME, EE, etc.
                </p>

                <p className="text-xs text-blue-600">
                  <span className="font-semibold">
                    Optional fields:
                  </span>{" "}
                  Parent Phone, Caste, Category,
                  Aadhaar Number and SATS Number can be
                  left blank if not available.
                </p>

                <p className="text-xs text-blue-600">
                  <span className="font-semibold">
                    Photo:
                  </span>{" "}
                  Enter the Google Drive link of the student's
                  passport-size photo.
                </p>

                <p className="text-xs text-blue-600">
                  Google Drive photos must be shared as{" "}
                  <span className="font-semibold">
                    Anyone with the link → Viewer
                  </span>
                  .
                </p>

                <p className="text-xs text-blue-600">
                  The photo should have uniform, ID card and
                  white background.
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ===================================================
            ADMISSION TYPE INFORMATION
        ==================================================== */}

        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4">

          <p className="text-sm font-semibold text-amber-900">
            Admission Type values
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-amber-800 sm:grid-cols-2">

            <div className="rounded-lg bg-white/60 px-3 py-2">
              <span className="font-semibold">
                regular
              </span>{" "}
              – Regular admission
            </div>

            <div className="rounded-lg bg-white/60 px-3 py-2">
              <span className="font-semibold">
                lateralPUC
              </span>{" "}
              – Lateral entry through PUC
            </div>

            <div className="rounded-lg bg-white/60 px-3 py-2">
              <span className="font-semibold">
                lateralITI
              </span>{" "}
              – Lateral entry through ITI
            </div>

            <div className="rounded-lg bg-white/60 px-3 py-2">
              <span className="font-semibold">
                lateralCross
              </span>{" "}
              – Lateral cross entry
            </div>

            <div className="rounded-lg bg-white/60 px-3 py-2 sm:col-span-2">
              <span className="font-semibold">
                workingProfessional
              </span>{" "}
              – Working professional
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


// =====================================================
// GET STUDENTS
// GET /api/students
// =====================================================

export const getStudents = async (
  req,
  res
) => {
  try {
    const {
      search,
      department,
      semester,
      batch,
      admissionYear,
      admissionType,
      status,
    } = req.query;

    const requesterRole =
      (
        req.user?.role || ""
      ).toLowerCase();

    const filter = {};

    // -------------------------------------------------
    // SEARCH
    // -------------------------------------------------

    if (
      search?.trim()
    ) {
      const regex =
        new RegExp(
          search.trim(),
          "i"
        );

      filter.$or = [
        {
          name: regex,
        },
        {
          registerNumber:
            regex,
        },
        {
          email: regex,
        },
        {
          phone: regex,
        },
        {
          satsNumber:
            regex,
        },
      ];
    }

    // -------------------------------------------------
    // HOD RESTRICTION
    // -------------------------------------------------

    if (
      requesterRole ===
      "hod"
    ) {
      const hodDepartment =
        String(
          req.user?.department ||
            ""
        )
          .trim()
          .toLowerCase();

      if (!hodDepartment) {
        return res.status(403).json({
          success: false,
          message:
            "HOD department is not assigned.",
        });
      }

      // HOD cannot override department
      // through query parameters.

      filter.department =
        hodDepartment;
    }

    // -------------------------------------------------
    // OTHER ROLES
    // -------------------------------------------------

    else if (
      department?.trim()
    ) {
      filter.department =
        department
          .trim()
          .toLowerCase();
    }

    // -------------------------------------------------
    // SEMESTER
    // -------------------------------------------------

    if (semester) {
      filter.semester =
        Number(
          semester
        );
    }

    // -------------------------------------------------
    // BATCH
    // -------------------------------------------------

    if (batch) {
      filter.batch =
        batch;
    }

    // -------------------------------------------------
    // ADMISSION YEAR
    // -------------------------------------------------

    if (admissionYear) {
      filter.admissionYear =
        Number(
          admissionYear
        );
    }

    // -------------------------------------------------
    // ADMISSION TYPE
    // -------------------------------------------------

    if (
      admissionType?.trim()
    ) {
      filter.admissionType =
        admissionType.trim();
    }

    // -------------------------------------------------
    // STATUS
    // -------------------------------------------------

    if (status) {
      filter.status =
        status;
    }

    // -------------------------------------------------
    // FETCH
    // -------------------------------------------------

    const students =
      await Student.find(
        filter
      )
        .sort({
          semester: 1,
          registerNumber: 1,
          name: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      count:
        students.length,
      data:
        students,
    });

  } catch (error) {
    console.error(
      "Get students error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching students.",
      error:
        error.message,
    });
  }
};

// =====================================================
// GET ONE STUDENT
// GET /api/students/:id
// =====================================================

export const getStudentById =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const student =
        await Student.findById(
          id
        ).lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      return res.status(200).json({
        success: true,
        data:
          student,
      });

    } catch (error) {
      console.error(
        "Get student by ID error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching student.",
        error:
          error.message,
      });
    }
  };

// =====================================================
// UPDATE STUDENT
// PUT /api/students/:id
//
// registerNumber and email CANNOT be changed.
// =====================================================

export const updateStudent =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      // -------------------------------------------------
      // FIND STUDENT
      // -------------------------------------------------

      const student =
        await Student.findById(
          id
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      // -------------------------------------------------
      // KEEP OLD PHOTO ID
      // -------------------------------------------------

      const oldImagePublicId =
        student.imagePublicId;

      // -------------------------------------------------
      // LINK OLD RECORD IF NECESSARY
      // -------------------------------------------------

      const linkedUser =
        await syncStudentUser(
          student
        );

      // -------------------------------------------------
      // ONLY THESE FIELDS CAN CHANGE
      // -------------------------------------------------

      const allowedFields = [
        "rollNumber",
        "name",
        "fatherName",
        "motherName",
        "dob",
        "gender",
        "phone",
        "parentPhone",
        "caste",
        "category",
        "aadhaarNumber",
        "satsNumber",
        "department",
        "admissionYear",
        "batch",
        "batchNumber",
        "admissionType",
        "semester",
        "status",
      ];

      for (
        const field of allowedFields
      ) {
        if (
          req.body[field] !==
          undefined
        ) {
          student[field] =
            req.body[field];
        }
      }

      // -------------------------------------------------
      // NORMALIZE
      // -------------------------------------------------

      student.name =
        String(
          student.name || ""
        ).trim();

      student.fatherName =
        String(
          student.fatherName ||
            ""
        ).trim();

      student.motherName =
        String(
          student.motherName ||
            ""
        ).trim();

      student.phone =
        String(
          student.phone || ""
        ).trim();

      student.parentPhone =
        String(
          student.parentPhone ||
            ""
        ).trim();

      student.department =
        String(
          student.department ||
            ""
        )
          .trim()
          .toLowerCase();

      student.gender =
        String(
          student.gender ||
            ""
        )
          .trim()
          .toLowerCase();

      student.rollNumber =
        String(
          student.rollNumber ||
            ""
        ).trim();

      student.batch =
        String(
          student.batch ||
            ""
        ).trim();

      student.admissionYear =
        Number(
          student.admissionYear
        );

      student.batchNumber =
        Number(
          student.batchNumber
        );

      student.semester =
        Number(
          student.semester
        );

      student.admissionType =
        String(
          student.admissionType ||
            ""
        ).trim();

      student.status =
        String(
          student.status ||
            "active"
        )
          .trim()
          .toLowerCase();

      // -------------------------------------------------
      // DATE
      // -------------------------------------------------

      if (
        req.body.dob !==
        undefined
      ) {
        const newDob =
          new Date(
            req.body.dob
          );

        if (
          Number.isNaN(
            newDob.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid date of birth.",
          });
        }

        student.dob =
          newDob;
      }

      // -------------------------------------------------
      // GENDER
      // -------------------------------------------------

      if (
        ![
          "male",
          "female",
          "other",
        ].includes(
          student.gender
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid gender.",
        });
      }

      // -------------------------------------------------
      // DEPARTMENT
      // -------------------------------------------------

      if (
        !VALID_DEPARTMENTS.includes(
          student.department
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid department: ${student.department}`,
        });
      }

      // -------------------------------------------------
      // ADMISSION YEAR
      // -------------------------------------------------

      if (
        !Number.isInteger(
          student.admissionYear
        ) ||
        student.admissionYear <=
          0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid admission year.",
        });
      }

      // -------------------------------------------------
      // BATCH NUMBER
      // -------------------------------------------------

      if (
        ![
          1,
          2,
        ].includes(
          student.batchNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Batch number must be either 1 or 2.",
        });
      }

      // -------------------------------------------------
      // SEMESTER
      // -------------------------------------------------

      if (
        !Number.isInteger(
          student.semester
        ) ||
        student.semester <
          1 ||
        student.semester >
          6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Semester must be between 1 and 6.",
        });
      }

      // -------------------------------------------------
      // ADMISSION TYPE
      // -------------------------------------------------

      if (
        !VALID_ADMISSION_TYPES.includes(
          student.admissionType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid admission type.",
        });
      }

      // -------------------------------------------------
      // STATUS
      // -------------------------------------------------

      if (
        !VALID_STATUSES.includes(
          student.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student status.",
        });
      }

      // -------------------------------------------------
      // PHONE
      // -------------------------------------------------

      if (
        !/^\d{10}$/.test(
          student.phone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student phone number must contain exactly 10 digits.",
        });
      }

      // -------------------------------------------------
      // PARENT PHONE
      // -------------------------------------------------

      if (
        student.parentPhone &&
        !/^\d{10}$/.test(
          student.parentPhone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Parent phone number must contain exactly 10 digits.",
        });
      }

      // -------------------------------------------------
      // AADHAAR
      // -------------------------------------------------

      student.aadhaarNumber =
        String(
          student.aadhaarNumber ||
            ""
        ).trim();

      if (
        student.aadhaarNumber &&
        !/^\d{12}$/.test(
          student.aadhaarNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Aadhaar number must contain exactly 12 digits.",
        });
      }

      // -------------------------------------------------
      // PHOTO
      // -------------------------------------------------

      if (
        req.cloudinaryResult
      ) {
        student.imageUrl =
          req.cloudinaryResult
            .secure_url;

        student.imagePublicId =
          req.cloudinaryResult
            .public_id;
      }

      // -------------------------------------------------
      // SAVE STUDENT
      // -------------------------------------------------

      await student.save();

      // -------------------------------------------------
      // UPDATE MONGODB USER
      // -------------------------------------------------

      if (linkedUser) {
        linkedUser.name =
          student.name;

        linkedUser.phone =
          student.phone;

        linkedUser.department =
          student.department;

        linkedUser.role =
          "student";

        if (
          req.cloudinaryResult
        ) {
          linkedUser.imageUrl =
            student.imageUrl;

          linkedUser.imagePublicId =
            student.imagePublicId;
        }

        await linkedUser.save();
      }

      // -------------------------------------------------
      // DELETE OLD PHOTO
      // -------------------------------------------------

      if (
        req.cloudinaryResult
          ?.public_id &&
        oldImagePublicId &&
        oldImagePublicId !==
          req.cloudinaryResult
            .public_id
      ) {
        await deleteCloudinarySafely(
          oldImagePublicId
        );
      }

      // -------------------------------------------------
      // UPDATE CLERK
      // -------------------------------------------------

      if (
        student.clerkId
      ) {
        try {
          await clerkClient.users.updateUser(
            student.clerkId,
            {
              firstName:
                student.name,

              publicMetadata: {
                role:
                  "student",

                department:
                  student.department,

                registerNumber:
                  student.registerNumber,
              },
            }
          );
        } catch (
          clerkError
        ) {
          console.error(
            "Clerk update warning:",
            clerkError
          );
        }
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Student updated successfully.",
        data:
          student,
      });

    } catch (error) {
      console.error(
        "Update student error:",
        error
      );

      if (
        error?.code ===
        11000
      ) {
        const duplicateField =
          Object.keys(
            error.keyPattern ||
              {}
          )[0];

        return res.status(409).json({
          success: false,
          message:
            `A student with this ${duplicateField} already exists.`,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while updating student.",
        error:
          error.message,
      });
    }
  };

// =====================================================
// DELETE STUDENT
// DELETE /api/students/:id
//
// Deletes:
// 1. Student MongoDB document
// 2. MongoDB User document
// 3. Clerk account
// 4. Cloudinary image
// =====================================================

export const deleteStudent =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      // -------------------------------------------------
      // FIND STUDENT
      // -------------------------------------------------

      const student =
        await Student.findById(
          id
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const clerkId =
        student.clerkId;

      const userId =
        student.userId;

      const imagePublicId =
        student.imagePublicId;

      console.log(
        "=========================================="
      );

      console.log(
        "DELETE STUDENT"
      );

      console.log(
        "Student Mongo ID:",
        student._id
      );

      console.log(
        "User Mongo ID:",
        userId || "N/A"
      );

      console.log(
        "Clerk ID:",
        clerkId || "N/A"
      );

      console.log(
        "Image Public ID:",
        imagePublicId || "N/A"
      );

      console.log(
        "=========================================="
      );

      // -------------------------------------------------
      // DELETE CLERK FIRST
      // -------------------------------------------------

      if (clerkId) {
        try {
          await deleteClerkSafely(
            clerkId
          );
        } catch (
          clerkError
        ) {
          console.error(
            "Clerk deletion failed:",
            clerkError
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to delete Clerk account. Student was not removed from MongoDB.",
            error:
              clerkError?.message ||
              "Clerk deletion failed.",
          });
        }
      }

      // -------------------------------------------------
      // DELETE CLOUDINARY
      // -------------------------------------------------

      if (
        imagePublicId
      ) {
        await deleteCloudinarySafely(
          imagePublicId
        );
      }

      // -------------------------------------------------
      // DELETE STUDENT
      // -------------------------------------------------

      await Student.findByIdAndDelete(
        id
      );

      // -------------------------------------------------
      // DELETE MONGODB USER
      // -------------------------------------------------

      const deletedUser =
        await deleteMongoUserSafely({
          userId,
          clerkId,
        });

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          "Student, User, Clerk account and associated image cleanup completed successfully.",

        data: {
          studentMongoId:
            id,

          userMongoId:
            userId || null,

          clerkId:
            clerkId || null,

          studentDeleted:
            true,

          userDeleted:
            !!deletedUser,

          cloudinaryDeleted:
            !!imagePublicId,

          clerkDeleted:
            !!clerkId,
        },
      });

    } catch (error) {
      console.error(
        "Delete student error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while deleting student.",
        error:
          error.message,
      });
    }
  };

// =====================================================
// UPDATE STUDENT STATUS
// PATCH /api/students/:id/status
// =====================================================

export const updateStudentStatus =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const {
        status,
      } = req.body;

      // -------------------------------------------------
      // VALIDATE STATUS
      // -------------------------------------------------

      if (
        !VALID_STATUSES.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student status.",
        });
      }

      // -------------------------------------------------
      // FIND STUDENT
      // -------------------------------------------------

      const student =
        await Student.findById(
          id
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      // -------------------------------------------------
      // LINK OLD USER IF NECESSARY
      // -------------------------------------------------

      await syncStudentUser(
        student
      );

      // -------------------------------------------------
      // UPDATE STATUS
      // -------------------------------------------------

      student.status =
        status;

      await student.save();

      return res.status(200).json({
        success: true,
        message:
          "Student status updated successfully.",
        data:
          student,
      });

    } catch (error) {
      console.error(
        "Update status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while updating status.",
        error:
          error.message,
      });
    }
  };

// =====================================================
// DELETE MULTIPLE STUDENTS
// DELETE /api/students/bulk-delete
//
// Deletes:
// 1. Student MongoDB records
// 2. User MongoDB records
// 3. Clerk accounts
// 4. Cloudinary images
// =====================================================

export const deleteMultipleStudents =
  async (
    req,
    res
  ) => {
    try {
      const {
        ids,
      } = req.body;

      // -------------------------------------------------
      // VALIDATION
      // -------------------------------------------------

      if (
        !Array.isArray(
          ids
        ) ||
        ids.length ===
          0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No students selected.",
        });
      }

      // -------------------------------------------------
      // FIND STUDENTS
      // -------------------------------------------------

      const students =
        await Student.find({
          _id: {
            $in: ids,
          },
        });

      if (
        !students.length
      ) {
        return res.status(404).json({
          success: false,
          message:
            "No students found.",
        });
      }

      let clerkDeletedCount =
        0;

      let userDeletedCount =
        0;

      let cloudinaryDeletedCount =
        0;

      let studentDeletedCount =
        0;

      // -------------------------------------------------
      // PROCESS EACH STUDENT
      // -------------------------------------------------

      for (
        const student of students
      ) {
        // =============================================
        // CLERK
        // =============================================

        if (
          student.clerkId
        ) {
          try {
            await deleteClerkSafely(
              student.clerkId
            );

            clerkDeletedCount++;

          } catch (
            error
          ) {
            console.error(
              `Failed to delete Clerk user ${student.clerkId}:`,
              error
            );
          }
        }

        // =============================================
        // CLOUDINARY
        // =============================================

        if (
          student.imagePublicId
        ) {
          const deleted =
            await deleteCloudinarySafely(
              student.imagePublicId
            );

          if (deleted) {
            cloudinaryDeletedCount++;
          }
        }

        // =============================================
        // MONGODB USER
        // =============================================

        if (
          student.userId ||
          student.clerkId
        ) {
          try {
            const deletedUser =
              await deleteMongoUserSafely({
                userId:
                  student.userId,

                clerkId:
                  student.clerkId,
              });

            if (
              deletedUser
            ) {
              userDeletedCount++;

              console.log(
                `User MongoDB record deleted: ${deletedUser._id}`
              );
            }

          } catch (
            error
          ) {
            console.error(
              `Failed to delete User MongoDB record for ${student.clerkId}:`,
              error
            );
          }
        }

        // =============================================
        // STUDENT MONGODB
        // =============================================

        try {
          await Student.findByIdAndDelete(
            student._id
          );

          studentDeletedCount++;

        } catch (
          error
        ) {
          console.error(
            `Failed to delete Student ${student._id}:`,
            error
          );
        }
      }

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          `${studentDeletedCount} student(s) deleted successfully.`,

        deletedCount:
          studentDeletedCount,

        details: {
          studentsDeleted:
            studentDeletedCount,

          usersDeleted:
            userDeletedCount,

          clerkUsersDeleted:
            clerkDeletedCount,

          cloudinaryImagesDeleted:
            cloudinaryDeletedCount,
        },
      });

    } catch (error) {
      console.error(
        "Bulk delete students error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete selected students.",
        error:
          error.message,
      });
    }
  };