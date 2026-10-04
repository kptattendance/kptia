"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Swal from "sweetalert2";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const DEPARTMENTS = [
  { value: "all", label: "All Departments" },
  { value: "at", label: "Automobile Engineering" },
  { value: "ce", label: "Civil Engineering" },
  { value: "ch", label: "Chemical Engineering" },
  { value: "cs", label: "Computer Science & Engineering" },
  { value: "ec", label: "Electronics & Communication Engineering" },
  { value: "ee", label: "Electrical & Electronics Engineering" },
  { value: "me", label: "Mechanical Engineering" },
  { value: "ps", label: "Polymer Technology" },
];

const SEMESTERS = [
  { value: "all", label: "All Semesters" },
  { value: "1", label: "1st Semester" },
  { value: "2", label: "2nd Semester" },
  { value: "3", label: "3rd Semester" },
  { value: "4", label: "4th Semester" },
  { value: "5", label: "5th Semester" },
  { value: "6", label: "6th Semester" },
];

const IA_OPTIONS = [
  { value: "1", label: "IA 1" },
  { value: "2", label: "IA 2" },
  { value: "3", label: "IA 3" },
];

const ACADEMIC_YEARS = [
  "2026-27",
  "2025-26",
  "2024-25",
  "2023-24",
];

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const BATCH_OPTIONS = [
  { value: "all", label: "All Batches" },
  { value: "1", label: "Batch 1" },
  { value: "2", label: "Batch 2" },
];

const getSemesterLabel = (semester) => {
  const value = String(semester);

  if (value === "1") return "1st Semester";
  if (value === "2") return "2nd Semester";
  if (value === "3") return "3rd Semester";

  return `${value}th Semester`;
};

const getDepartmentLabel = (department) => {
  const found = DEPARTMENTS.find(
    (item) => item.value === String(department).toLowerCase()
  );

  return found?.label || String(department || "").toUpperCase();
};

const getAcademicCalendarYear = (academicYear) => {
  if (!academicYear) return new Date().getFullYear();

  const firstYear = Number(String(academicYear).split("-")[0]);

  return Number.isFinite(firstYear)
    ? firstYear
    : new Date().getFullYear();
};

export default function IAMonitoringPage() {
  const { getToken } = useAuth();

  // =========================================================
  // COMMON FILTERS
  // =========================================================

  const [academicYear, setAcademicYear] = useState("");
  const [department, setDepartment] = useState("all");
  const [semester, setSemester] = useState("all");

  // =========================================================
  // IA FILTERS
  // =========================================================

  const [iaNumber, setIaNumber] = useState("1");

  const [iaRows, setIaRows] = useState([]);
  const [iaSummary, setIaSummary] = useState(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaError, setIaError] = useState("");

  // =========================================================
  // ATTENDANCE FILTERS
  // =========================================================

  const [attendanceYear, setAttendanceYear] = useState("");
  const [attendanceMonth, setAttendanceMonth] = useState(
    String(new Date().getMonth() + 1)
  );
  const [attendanceBatch, setAttendanceBatch] = useState("all");

  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");

  // =========================================================
  // TABLE REFS
  // =========================================================

  const iaTableScrollRef = useRef(null);
  const attendanceTableScrollRef = useRef(null);

  const iaDragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
  });

  const attendanceDragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
  });

  // =========================================================
  // LOAD IA STATUS
  // =========================================================

  const loadIAStatus = async () => {
    if (!academicYear) {
      setIaRows([]);
      setIaSummary(null);
      return;
    }

    try {
      setIaLoading(true);
      setIaError("");

      const token = await getToken();

      const params = new URLSearchParams();

      params.append("academicYear", academicYear);
      params.append("department", department);
      params.append("iaNumber", iaNumber);

      if (semester !== "all") {
        params.append("semester", semester);
      } else {
        params.append("semesterType", "all");
      }

      const response = await fetch(
        `${API_URL}/api/ia/admin-status?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load IA monitoring status."
        );
      }

      const subjectRows = [];

      (data.rows || []).forEach((row) => {
        (row.subjects || []).forEach((subject) => {
          subjectRows.push({
            ...subject,
            department: row.department,
            semester: row.semester,
          });
        });
      });

      subjectRows.sort((a, b) => {
        const seqCompare = String(a.sequence || "").localeCompare(
          String(b.sequence || ""),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        );

        if (seqCompare !== 0) {
          return seqCompare;
        }

        return String(a.code || "").localeCompare(
          String(b.code || "")
        );
      });

      setIaRows(subjectRows);
      setIaSummary(data.summary || null);
    } catch (err) {
      console.error("IA Monitoring Error:", err);

      setIaRows([]);
      setIaSummary(null);

      setIaError(
        err?.message || "Failed to load IA monitoring status."
      );
    } finally {
      setIaLoading(false);
    }
  };

  // =========================================================
  // LOAD ATTENDANCE STATISTICS
  // =========================================================

  const loadAttendanceStatistics = async () => {
    if (!academicYear) {
      setAttendanceRows([]);
      setAttendanceSummary(null);
      return;
    }

    try {
      setAttendanceLoading(true);
      setAttendanceError("");

      const token = await getToken();

      const params = new URLSearchParams();

      /*
        Attendance data is stored using calendar year.

        For example:
        2026-27 -> 2026

        If a different attendance-year mapping is required later,
        only this value needs to be changed.
      */
      const selectedYear =
        attendanceYear || getAcademicCalendarYear(academicYear);

      params.append("year", selectedYear);
      params.append("month", attendanceMonth);
      params.append("department", department);
      params.append("semester", semester);
      params.append("batch", attendanceBatch);

      const response = await fetch(
        `${API_URL}/api/attendance/admin-statistics?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to load attendance statistics."
        );
      }
// =========================================================
// LOAD SUBJECT MASTER DATA
// Existing subject API already contains subject names.
// =========================================================

let subjectList = [];

try {
const subjectParams = {};

if (department !== "all") {
  subjectParams.department = department;
}

if (semester !== "all") {
  subjectParams.semester = Number(semester);
}

const subjectResponse = await axios.get(
  `${API_URL}/api/subjects/getsubjects`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: subjectParams,
  }
);

const subjectData = subjectResponse.data;

subjectList =
  Array.isArray(subjectData?.data)
    ? subjectData.data
    : Array.isArray(subjectData?.subjects)
    ? subjectData.subjects
    : Array.isArray(subjectData?.subjects?.data)
    ? subjectData.subjects.data
    : [];




} catch (subjectError) {
  console.error(
    "Failed to load subject master data:",
    subjectError
  );
}
      const receivedRows =
        data?.rows ||
        data?.data?.rows ||
        data?.attendance ||
        data?.data ||
        [];

    const normalizedRows = Array.isArray(receivedRows)
  ? receivedRows.map((row) => {
      // ---------------------------------------------
      // Find matching subject from existing Subject API
      // ---------------------------------------------

      const matchingSubject =
        subjectList.find((subject) => {
          const rowSubjectId =
            row.subjectId ||
            row.subject?._id ||
            row.subject?.subjectId;

          const subjectId =
            subject._id ||
            subject.subjectId;

          if (
            rowSubjectId &&
            subjectId &&
            String(rowSubjectId) ===
              String(subjectId)
          ) {
            return true;
          }

          // Fallback to subject code
          const rowCode =
            row.code ||
            row.subjectCode ||
            row.subject?.code;

          return (
            rowCode &&
            subject.code &&
            String(rowCode).trim().toLowerCase() ===
              String(subject.code).trim().toLowerCase()
          );
        }) || null;

      const batch1 =
        row.batch1 ||
        row.batchOne ||
        row.batches?.batch1 ||
        null;

      const batch2 =
        row.batch2 ||
        row.batchTwo ||
        row.batches?.batch2 ||
        null;

      const overall =
        row.overall ||
        row.total ||
        row.overallAttendance ||
        null;

      return {
        ...row,

        subjectId:
          row.subjectId ||
          row.subject?._id ||
          row.subject?.subjectId ||
          matchingSubject?._id,

        // ---------------------------------------------
        // SUBJECT NAME
        // ---------------------------------------------

        name:
          row.name ||
          row.subjectName ||
          row.subject?.name ||
          matchingSubject?.name ||
          "—",

        // ---------------------------------------------
        // SUBJECT CODE
        // ---------------------------------------------

        code:
          row.code ||
          row.subjectCode ||
          row.subject?.code ||
          matchingSubject?.code ||
          "—",

        department:
          row.department ||
          row.subject?.department ||
          matchingSubject?.department ||
          department,

        semester:
          row.semester ||
          row.subject?.semester ||
          matchingSubject?.semester ||
          semester,

        subjectCategory:
          row.subjectCategory ||
          row.subject?.subjectCategory ||
          matchingSubject?.subjectCategory ||
          "REGULAR",

        sequence:
          row.sequence ||
          row.subject?.sequence ||
          matchingSubject?.sequence ||
          "",

        batch1,
        batch2,
        overall,
      };
    })
  : [];

      normalizedRows.sort((a, b) => {
        const seqCompare = String(a.sequence || "").localeCompare(
          String(b.sequence || ""),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        );

        if (seqCompare !== 0) {
          return seqCompare;
        }

        return String(a.code || "").localeCompare(
          String(b.code || "")
        );
      });

      setAttendanceRows(normalizedRows);

      setAttendanceSummary(
        data?.summary ||
          data?.data?.summary ||
          null
      );
    } catch (err) {
      console.error("Attendance Statistics Error:", err);

      setAttendanceRows([]);
      setAttendanceSummary(null);

      setAttendanceError(
        err?.message ||
          "Failed to load attendance statistics."
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  // =========================================================
  // LOAD IA WHEN IA FILTERS CHANGE
  // =========================================================

  useEffect(() => {
    loadIAStatus();
  }, [
    academicYear,
    department,
    semester,
    iaNumber,
  ]);

  // =========================================================
  // LOAD ATTENDANCE WHEN ATTENDANCE FILTERS CHANGE
  // =========================================================

  useEffect(() => {
    loadAttendanceStatistics();
  }, [
    academicYear,
    department,
    semester,
    attendanceYear,
    attendanceMonth,
    attendanceBatch,
  ]);

  // =========================================================
  // SET ATTENDANCE YEAR WHEN ACADEMIC YEAR CHANGES
  // =========================================================

  useEffect(() => {
    if (!academicYear) {
      setAttendanceYear("");
      return;
    }

    setAttendanceYear(
      String(getAcademicCalendarYear(academicYear))
    );
  }, [academicYear]);

  // =========================================================
  // IA DRAG SCROLL
  // =========================================================

  const startIADrag = (event) => {
    const element = iaTableScrollRef.current;

    if (!element) return;

    iaDragRef.current = {
      active: true,
      startX: event.clientX,
      startScroll: element.scrollLeft,
    };

    element.style.cursor = "grabbing";
  };

  const dragIATable = (event) => {
    if (!iaDragRef.current.active) return;

    const element = iaTableScrollRef.current;

    if (!element) return;

    const distance =
      event.clientX - iaDragRef.current.startX;

    element.scrollLeft =
      iaDragRef.current.startScroll - distance;
  };

  const stopIADrag = () => {
    const element = iaTableScrollRef.current;

    iaDragRef.current.active = false;

    if (element) {
      element.style.cursor = "grab";
    }
  };

  // =========================================================
  // ATTENDANCE DRAG SCROLL
  // =========================================================

  const startAttendanceDrag = (event) => {
    const element =
      attendanceTableScrollRef.current;

    if (!element) return;

    attendanceDragRef.current = {
      active: true,
      startX: event.clientX,
      startScroll: element.scrollLeft,
    };

    element.style.cursor = "grabbing";
  };

  const dragAttendanceTable = (event) => {
    if (!attendanceDragRef.current.active) return;

    const element =
      attendanceTableScrollRef.current;

    if (!element) return;

    const distance =
      event.clientX -
      attendanceDragRef.current.startX;

    element.scrollLeft =
      attendanceDragRef.current.startScroll -
      distance;
  };

  const stopAttendanceDrag = () => {
    const element =
      attendanceTableScrollRef.current;

    attendanceDragRef.current.active = false;

    if (element) {
      element.style.cursor = "grab";
    }
  };

  // =========================================================
  // OPEN IA RECORD
  // =========================================================

  const openIARecord = async (
    recordId,
    subject,
    batch
  ) => {
    if (!recordId) return;

    try {
      const token = await getToken();

      const response = await fetch(
        `${API_URL}/api/ia/${recordId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to load IA record."
        );
      }

      const record =
        data?.data ||
        data?.iaMarks ||
        data?.record ||
        data;

      const students = record?.students || [];

      const enteredBy =
        record?.enteredBy?.name ||
        record?.enteredBy?.email ||
        record?.enteredBy ||
        "—";

      await Swal.fire({
        title: "IA Entered",
        width: 600,

        html: `
          <div
            style="
              text-align:left;
              font-size:14px;
              line-height:1.8;
              color:#171717;
            "
          >
            <div
              style="
                background:#f5f5f5;
                border:1px solid #e5e5e5;
                padding:14px;
                border-radius:10px;
                margin-bottom:15px;
              "
            >
              <div>
                <strong>Subject:</strong>
                ${subject.name || "—"}
              </div>

              <div>
                <strong>Code:</strong>
                ${subject.code || "—"}
              </div>

              <div>
                <strong>Department:</strong>
                ${String(
                  subject.department || ""
                ).toUpperCase()}
              </div>

              <div>
                <strong>Semester:</strong>
                ${subject.semester || "—"}
              </div>

              <div>
                <strong>Batch:</strong>
                ${batch}
              </div>
            </div>

            <div>
              <strong>Students:</strong>
              ${students.length}
            </div>

            <div>
              <strong>Status:</strong>
              ${
                record?.isLocked
                  ? '<span style="color:#111;font-weight:700">Locked</span>'
                  : '<span style="color:#555;font-weight:700">Not Locked</span>'
              }
            </div>

            <div>
              <strong>Entered By:</strong>
              ${enteredBy}
            </div>
          </div>
        `,

        confirmButtonText: "Close",
        confirmButtonColor: "#111111",
      });
    } catch (err) {
      console.error(err);

      Swal.fire({
        icon: "error",
        title: "Unable to open IA",
        text:
          err?.message ||
          "Failed to load IA record.",
        confirmButtonColor: "#111111",
      });
    }
  };

  // =========================================================
  // IA STATUS CELL
  // =========================================================

  const IAStatusCell = ({
    status,
    subject,
    batch,
  }) => {
    if (!status?.entered) {
      return (
        <div className="flex items-center justify-center">
          <span
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-full
              border
              border-red-200
              bg-red-50
              px-3
              py-1.5
              text-xs
              font-semibold
              text-red-600
            "
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Not Entered
          </span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();

          openIARecord(
            status.recordId,
            subject,
            batch
          );
        }}
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-full
          border
          border-green-200
          bg-green-50
          px-3
          py-1.5
          text-xs
          font-semibold
          text-green-700
          transition
          hover:bg-green-100
          hover:shadow-sm
        "
      >
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Entered
      </button>
    );
  };

  // =========================================================
  // IA SUMMARY
  // =========================================================

  const iaEnteredCount = useMemo(() => {
    return iaRows.reduce((count, subject) => {
      let total = count;

      if (subject.batch1?.entered) {
        total += 1;
      }

      if (subject.batch2?.entered) {
        total += 1;
      }

      return total;
    }, 0);
  }, [iaRows]);

  const iaTotalPossible = iaRows.length * 2;

  const iaCompletionPercentage =
    iaTotalPossible > 0
      ? Math.round(
          (iaEnteredCount / iaTotalPossible) * 100
        )
      : 0;

  // =========================================================
  // ATTENDANCE SEARCH
  // =========================================================

  const filteredAttendanceRows = useMemo(() => {
    const search = attendanceSearch
      .trim()
      .toLowerCase();

    if (!search) {
      return attendanceRows;
    }

    return attendanceRows.filter((row) => {
      return (
        String(row.name || "")
          .toLowerCase()
          .includes(search) ||
        String(row.code || "")
          .toLowerCase()
          .includes(search) ||
        String(row.department || "")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [attendanceRows, attendanceSearch]);

  // =========================================================
  // ATTENDANCE HELPERS
  // =========================================================

  const getAttendancePercentage = (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(
        value.replace("%", "").trim()
      );

      return Number.isFinite(parsed)
        ? parsed
        : null;
    }

    if (typeof value === "object") {
      if (
        value.percentage !== undefined &&
        value.percentage !== null
      ) {
        return Number(value.percentage);
      }

      if (
        value.attendancePercentage !== undefined &&
        value.attendancePercentage !== null
      ) {
        return Number(
          value.attendancePercentage
        );
      }

      const attended =
        value.attended ??
        value.classesAttended ??
        value.totalAttended;

      const eligible =
        value.eligible ??
        value.classesEligible ??
        value.totalEligible;

      if (
        Number.isFinite(Number(attended)) &&
        Number.isFinite(Number(eligible)) &&
        Number(eligible) > 0
      ) {
        return (
          (Number(attended) /
            Number(eligible)) *
          100
        );
      }
    }

    return null;
  };

  const getAttendanceStatus = (value) => {
    const percentage =
      getAttendancePercentage(value);

    if (
      percentage === null ||
      !Number.isFinite(percentage)
    ) {
      return "not-entered";
    }

    if (percentage >= 75) {
      return "good";
    }

    return "low";
  };

  const AttendanceCell = ({ value }) => {
    const percentage =
      getAttendancePercentage(value);

    const status =
      getAttendanceStatus(value);

    if (status === "not-entered") {
      return (
        <div className="flex items-center justify-center">
          <span
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-full
              border
              border-red-200
              bg-red-50
              px-3
              py-1.5
              text-xs
              font-semibold
              text-red-600
            "
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Not Entered
          </span>
        </div>
      );
    }

    if (status === "good") {
      return (
        <span
          className="
            inline-flex
            min-w-[82px]
            items-center
            justify-center
            rounded-full
            border
            border-green-200
            bg-green-50
            px-3
            py-1.5
            text-xs
            font-bold
            text-green-700
          "
        >
          {Number(percentage).toFixed(1)}%
        </span>
      );
    }

    return (
      <span
        className="
          inline-flex
          min-w-[82px]
          items-center
          justify-center
          rounded-full
          border
          border-red-200
          bg-red-50
          px-3
          py-1.5
          text-xs
          font-bold
          text-red-700
        "
      >
        {Number(percentage).toFixed(1)}%
      </span>
    );
  };

  // =========================================================
  // ATTENDANCE CALCULATED SUMMARY
  // =========================================================

  const calculatedAttendanceSummary = useMemo(() => {
    let entered = 0;
    let notEntered = 0;
    let below75 = 0;
    let percentageTotal = 0;
    let percentageCount = 0;

    filteredAttendanceRows.forEach((row) => {
      const values = [];

      if (
        attendanceBatch === "all" ||
        attendanceBatch === "1"
      ) {
        values.push(row.batch1);
      }

      if (
        attendanceBatch === "all" ||
        attendanceBatch === "2"
      ) {
        values.push(row.batch2);
      }

      values.forEach((value) => {
        const percentage =
          getAttendancePercentage(value);

        if (
          percentage === null ||
          !Number.isFinite(percentage)
        ) {
          notEntered += 1;
          return;
        }

        entered += 1;

        if (percentage < 75) {
          below75 += 1;
        }

        percentageTotal += percentage;
        percentageCount += 1;
      });
    });

    return {
      subjects: filteredAttendanceRows.length,
      entered,
      notEntered,
      below75,
      average:
        percentageCount > 0
          ? percentageTotal /
            percentageCount
          : 0,
    };
  }, [
    filteredAttendanceRows,
    attendanceBatch,
  ]);

  const finalAttendanceSummary =
    attendanceSummary || calculatedAttendanceSummary;

  // =========================================================
  // COMMON SELECT CLASS
  // =========================================================

  const selectClass = `
    w-full
    rounded-xl
    border
    border-gray-300
    bg-white
    px-3
    py-2.5
    text-sm
    text-black
    outline-none
    transition
    focus:border-black
    focus:ring-2
    focus:ring-gray-200
  `;

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-white p-4 text-black sm:p-6 lg:p-8">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="mb-8">
        <div
          className="
            flex
            flex-col
            gap-3
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <h1
              className="
                text-2xl
                font-bold
                tracking-tight
                text-black
                sm:text-3xl
              "
            >
              Academic Monitoring
            </h1>

          
          </div>

          {academicYear && (
            <div
              className="
                inline-flex
                w-fit
                items-center
                rounded-full
                border
                border-black
                bg-black
                px-4
                py-2
                text-sm
                font-semibold
                text-white
              "
            >
              {academicYear}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          COMMON FILTERS
      ===================================================== */}

      <div
        className="
          mb-8
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-4
          shadow-sm
          sm:p-5
        "
      >
       

        <div
          className="
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {/* ACADEMIC YEAR */}

          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-semibold
                text-gray-700
              "
            >
              Academic Year
            </label>

            <select
              value={academicYear}
              onChange={(event) =>
                setAcademicYear(
                  event.target.value
                )
              }
              className={selectClass}
            >
              <option value="">
                Select Academic Year
              </option>

              {ACADEMIC_YEARS.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* DEPARTMENT */}

          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-semibold
                text-gray-700
              "
            >
              Department
            </label>

            <select
              value={department}
              onChange={(event) =>
                setDepartment(
                  event.target.value
                )
              }
              className={selectClass}
            >
              {DEPARTMENTS.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* SEMESTER */}

          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-semibold
                text-gray-700
              "
            >
              Semester
            </label>

            <select
              value={semester}
              onChange={(event) =>
                setSemester(
                  event.target.value
                )
              }
              className={selectClass}
            >
              {SEMESTERS.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =====================================================
          IA MONITORING SECTION
      ===================================================== */}

      <section className="mb-12">

        <div className="mb-5">
          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >
            <div>
              

              <h2 className="text-xl font-bold text-black">
                IA Monitoring
              </h2>

         
            </div>

            <div className="w-full sm:w-44">
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  text-gray-700
                "
              >
                IA Number
              </label>

              <select
                value={iaNumber}
                onChange={(event) =>
                  setIaNumber(
                    event.target.value
                  )
                }
                className={selectClass}
              >
                {IA_OPTIONS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* IA SUMMARY */}

        {academicYear && !iaLoading && (
          <div
            className="
              mb-5
              grid
              grid-cols-2
              gap-3
              sm:grid-cols-4
            "
          >
            <div
              className="
                rounded-2xl
                border
                border-gray-200
                bg-white
                p-4
                shadow-sm
              "
            >
              <p className="text-xs font-medium text-gray-500">
                Subjects
              </p>

              <p className="mt-1 text-2xl font-bold text-black">
                {iaRows.length}
              </p>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-gray-200
                bg-white
                p-4
                shadow-sm
              "
            >
              <p className="text-xs font-medium text-gray-500">
                Entered
              </p>

              <p className="mt-1 text-2xl font-bold text-green-600">
                {iaEnteredCount}
              </p>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-gray-200
                bg-white
                p-4
                shadow-sm
              "
            >
              <p className="text-xs font-medium text-gray-500">
                Not Entered
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600">
                {Math.max(
                  iaTotalPossible -
                    iaEnteredCount,
                  0
                )}
              </p>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-black
                bg-black
                p-4
                shadow-sm
              "
            >
              <p className="text-xs font-medium text-gray-300">
                Completion
              </p>

              <p className="mt-1 text-2xl font-bold text-white">
                {iaCompletionPercentage}%
              </p>
            </div>
          </div>
        )}

        {/* IA ERROR */}

        {iaError && (
          <div
            className="
              mb-5
              rounded-xl
              border
              border-red-300
              bg-red-50
              px-4
              py-3
              text-sm
              font-medium
              text-red-700
            "
          >
            {iaError}
          </div>
        )}

        {/* IA TABLE */}

        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-gray-200
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              flex
              flex-col
              gap-2
              border-b
              border-gray-200
              bg-black
              px-4
              py-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <h3 className="text-base font-bold text-white">
                Subject-wise IA Status
              </h3>
            </div>

            {academicYear && (
              <div className="text-xs font-medium text-gray-300">
                {department === "all"
                  ? "All Departments"
                  : department.toUpperCase()}
                {" • "}
                {semester === "all"
                  ? "All Semesters"
                  : getSemesterLabel(semester)}
                {" • "}
                IA {iaNumber}
              </div>
            )}
          </div>

          {!academicYear ? (
            <div
              className="
                flex
                min-h-[220px]
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <div>
                <div
                  className="
                    mx-auto
                    mb-3
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-gray-100
                    text-xl
                  "
                >
                  IA
                </div>

                <h3 className="font-semibold text-black">
                  Select Academic Year
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Select an academic year to view
                  IA monitoring.
                </p>
              </div>
            </div>
          ) : iaLoading ? (
            <div
              className="
                flex
                min-h-[220px]
                items-center
                justify-center
              "
            >
              <div className="text-center">
                <div
                  className="
                    mx-auto
                    mb-3
                    h-8
                    w-8
                    animate-spin
                    rounded-full
                    border-4
                    border-gray-200
                    border-t-black
                  "
                />

                <p className="text-sm text-gray-500">
                  Loading IA status...
                </p>
              </div>
            </div>
          ) : iaRows.length === 0 ? (
            <div
              className="
                flex
                min-h-[220px]
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <div>
                <div
                  className="
                    mx-auto
                    mb-3
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-gray-100
                    text-xl
                  "
                >
                  —
                </div>

                <h3 className="font-semibold text-black">
                  No subjects found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  No subjects are available for
                  the selected filters.
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={iaTableScrollRef}
              onMouseDown={startIADrag}
              onMouseMove={dragIATable}
              onMouseUp={stopIADrag}
              onMouseLeave={stopIADrag}
              className="
                relative
                w-full
                cursor-grab
                select-none
                overflow-x-auto
                overscroll-x-contain
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              <table
                className="
                  w-full
                  min-w-[900px]
                  border-collapse
                "
              >
                <thead>
                  <tr className="bg-gray-100">

                    {/* SERIAL */}

                    <th
                      className="
                        sticky
                        left-0
                        z-30
                        min-w-[70px]
                        border-b
                        border-r
                        border-gray-300
                        bg-gray-100
                        px-4
                        py-4
                        text-left
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-black
                      "
                    >
                      Sl.
                    </th>

                    {/* SUBJECT */}

                    <th
                      className="
                        sticky
                        left-[70px]
                        z-30
                        min-w-[280px]
                        border-b
                        border-r
                        border-gray-300
                        bg-gray-100
                        px-4
                        py-4
                        text-left
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-black
                      "
                    >
                      Subject
                    </th>

                    {/* CODE */}

                    <th
                      className="
                        min-w-[150px]
                        border-b
                        border-r
                        border-gray-300
                        px-4
                        py-4
                        text-left
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-black
                      "
                    >
                      Code
                    </th>

                    {/* DEPARTMENT */}

                    {department === "all" && (
                      <th
                        className="
                          min-w-[110px]
                          border-b
                          border-r
                          border-gray-300
                          px-4
                          py-4
                          text-left
                          text-xs
                          font-bold
                          uppercase
                          tracking-wide
                          text-black
                        "
                      >
                        Dept.
                      </th>
                    )}

                    {/* SEMESTER */}

                    {semester === "all" && (
                      <th
                        className="
                          min-w-[100px]
                          border-b
                          border-r
                          border-gray-300
                          px-4
                          py-4
                          text-center
                          text-xs
                          font-bold
                          uppercase
                          tracking-wide
                          text-black
                        "
                      >
                        Sem.
                      </th>
                    )}

                    {/* CATEGORY */}

                    <th
                      className="
                        min-w-[130px]
                        border-b
                        border-r
                        border-gray-300
                        px-4
                        py-4
                        text-left
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-black
                      "
                    >
                      Category
                    </th>

                    {/* BATCH 1 */}

                    <th
                      className="
                        min-w-[180px]
                        border-b
                        border-r
                        border-gray-300
                        px-4
                        py-4
                        text-center
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-black
                      "
                    >
                      Batch 1
                    </th>

                    {/* BATCH 2 */}

                    <th
                      className="
                        min-w-[180px]
                        border-b
                        border-gray-300
                        px-4
                        py-4
                        text-center
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-black
                      "
                    >
                      Batch 2
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {iaRows.map(
                    (subject, index) => (
                      <tr
                        key={
                          subject.subjectId ||
                          `${subject.code}-${index}`
                        }
                        className="
                          group
                          transition
                          hover:bg-gray-50
                        "
                      >

                        {/* SERIAL */}

                        <td
                          className="
                            sticky
                            left-0
                            z-20
                            border-b
                            border-r
                            border-gray-200
                            bg-white
                            px-4
                            py-4
                            text-sm
                            font-medium
                            text-gray-500
                            group-hover:bg-gray-50
                          "
                        >
                          {index + 1}
                        </td>

                        {/* SUBJECT */}

                        <td
                          className="
                            sticky
                            left-[70px]
                            z-20
                            border-b
                            border-r
                            border-gray-200
                            bg-white
                            px-4
                            py-4
                            group-hover:bg-gray-50
                          "
                        >
                          <div className="max-w-[280px]">
                            <p
                              className="
                                truncate
                                text-sm
                                font-semibold
                                text-black
                              "
                            >
                              {subject.name || "—"}
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400">
                              Sem {subject.semester}
                            </p>
                          </div>
                        </td>

                        {/* CODE */}

                        <td
                          className="
                            border-b
                            border-r
                            border-gray-200
                            px-4
                            py-4
                            text-sm
                            font-medium
                            text-gray-700
                          "
                        >
                          {subject.code || "—"}
                        </td>

                        {/* DEPARTMENT */}

                        {department === "all" && (
                          <td
                            className="
                              border-b
                              border-r
                              border-gray-200
                              px-4
                              py-4
                              text-sm
                              font-medium
                              text-gray-700
                            "
                          >
                            {String(
                              subject.department || ""
                            ).toUpperCase()}
                          </td>
                        )}

                        {/* SEMESTER */}

                        {semester === "all" && (
                          <td
                            className="
                              border-b
                              border-r
                              border-gray-200
                              px-4
                              py-4
                              text-center
                              text-sm
                              font-medium
                              text-gray-700
                            "
                          >
                            {subject.semester || "—"}
                          </td>
                        )}

                        {/* CATEGORY */}

                        <td
                          className="
                            border-b
                            border-r
                            border-gray-200
                            px-4
                            py-4
                          "
                        >
                          <span
                            className="
                              inline-flex
                              rounded-full
                              border
                              border-gray-200
                              bg-gray-50
                              px-2.5
                              py-1
                              text-[11px]
                              font-bold
                              text-gray-700
                            "
                          >
                            {String(
                              subject.subjectCategory ||
                                "REGULAR"
                            ).toUpperCase()}
                          </span>
                        </td>

                        {/* BATCH 1 */}

                        <td
                          className="
                            border-b
                            border-r
                            border-gray-200
                            px-4
                            py-4
                            text-center
                          "
                        >
                          <IAStatusCell
                            status={
                              subject.batch1
                            }
                            subject={subject}
                            batch="Batch 1"
                          />
                        </td>

                        {/* BATCH 2 */}

                        <td
                          className="
                            border-b
                            border-gray-200
                            px-4
                            py-4
                            text-center
                          "
                        >
                          <IAStatusCell
                            status={
                              subject.batch2
                            }
                            subject={subject}
                            batch="Batch 2"
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {iaRows.length > 0 &&
          !iaLoading && (
            <div
              className="
                mt-3
                flex
                items-center
                justify-between
                px-1
              "
            >
              <p className="text-xs text-gray-400">
                Drag the table horizontally to
                view all columns.
              </p>

              <p className="text-xs font-medium text-gray-500">
                {iaRows.length} subject
                {iaRows.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          )}
      </section>

      {/* =====================================================
          ATTENDANCE SECTION STARTS IN PART 2
      ===================================================== */}

            {/* =====================================================
          ATTENDANCE MONITORING SECTION
      ===================================================== */}

      <section className="mb-8">

        <div className="mb-5">
          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >
            <div>
           

              <h2 className="text-xl font-bold text-black">
                Attendance Statistics
              </h2>

           
            </div>

            <div className="text-xs text-gray-400">
              Bridge subjects are excluded.
            </div>
          </div>
        </div>

        {/* =================================================
            ATTENDANCE FILTERS
        ================================================= */}

        <div
          className="
            mb-5
            rounded-2xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            sm:p-5
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >

            {/* YEAR */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  text-gray-700
                "
              >
                Year
              </label>

              <select
                value={attendanceYear}
                onChange={(event) =>
                  setAttendanceYear(
                    event.target.value
                  )
                }
                className={selectClass}
              >
                <option value="">
                  Select Year
                </option>

                {ACADEMIC_YEARS.map(
                  (year) => {
                    const calendarYear =
                      getAcademicCalendarYear(
                        year
                      );

                    return (
                      <option
                        key={calendarYear}
                        value={calendarYear}
                      >
                        {calendarYear}
                      </option>
                    );
                  }
                )}
              </select>
            </div>

            {/* MONTH */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  text-gray-700
                "
              >
                Month
              </label>

              <select
                value={attendanceMonth}
                onChange={(event) =>
                  setAttendanceMonth(
                    event.target.value
                  )
                }
                className={selectClass}
              >
                {MONTHS.map((month) => (
                  <option
                    key={month.value}
                    value={month.value}
                  >
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* BATCH */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-semibold
                  text-gray-700
                "
              >
                Batch
              </label>

              <select
                value={attendanceBatch}
                onChange={(event) =>
                  setAttendanceBatch(
                    event.target.value
                  )
                }
                className={selectClass}
              >
                {BATCH_OPTIONS.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

       
        </div>

        {/* =================================================
            ATTENDANCE SUMMARY
        ================================================= */}

        {academicYear &&
          !attendanceLoading && (
            <div
              className="
                mb-5
                grid
                grid-cols-2
                gap-3
                sm:grid-cols-3
                lg:grid-cols-5
              "
            >

              {/* SUBJECTS */}

              <div
                className="
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  p-4
                  shadow-sm
                "
              >
                <p className="text-xs font-medium text-gray-500">
                  Subjects
                </p>

                <p className="mt-1 text-2xl font-bold text-black">
                  {finalAttendanceSummary?.subjects ??
                    filteredAttendanceRows.length}
                </p>
              </div>

              {/* ENTERED */}

              <div
                className="
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  p-4
                  shadow-sm
                "
              >
                <p className="text-xs font-medium text-gray-500">
                  Attendance Entered
                </p>

                <p className="mt-1 text-2xl font-bold text-green-600">
                  {finalAttendanceSummary?.entered ??
                    0}
                </p>
              </div>

              {/* NOT ENTERED */}

              <div
                className="
                  rounded-2xl
                  border
                  border-gray-200
                  bg-white
                  p-4
                  shadow-sm
                "
              >
                <p className="text-xs font-medium text-gray-500">
                  Not Entered
                </p>

                <p className="mt-1 text-2xl font-bold text-red-600">
                  {finalAttendanceSummary?.notEntered ??
                    0}
                </p>
              </div>

              {/* BELOW 75 */}

              <div
                className="
                  rounded-2xl
                  border
                  border-red-200
                  bg-red-50
                  p-4
                  shadow-sm
                "
              >
                <p className="text-xs font-medium text-red-600">
                  Below 75%
                </p>

                <p className="mt-1 text-2xl font-bold text-red-700">
                  {finalAttendanceSummary?.below75 ??
                    0}
                </p>
              </div>

              {/* AVERAGE */}

              <div
                className="
                  rounded-2xl
                  border
                  border-black
                  bg-black
                  p-4
                  shadow-sm
                "
              >
                <p className="text-xs font-medium text-gray-300">
                  Average Attendance
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {Number(
                    finalAttendanceSummary?.average ||
                      0
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          )}

        {/* =================================================
            ATTENDANCE ERROR
        ================================================= */}

        {attendanceError && (
          <div
            className="
              mb-5
              rounded-xl
              border
              border-red-300
              bg-red-50
              px-4
              py-3
              text-sm
              font-medium
              text-red-700
            "
          >
            {attendanceError}
          </div>
        )}

        {/* =================================================
            ATTENDANCE TABLE
        ================================================= */}

        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-gray-200
            bg-white
            shadow-sm
          "
        >

          {/* TABLE HEADER */}

          <div
            className="
              flex
              flex-col
              gap-2
              border-b
              border-gray-200
              bg-black
              px-4
              py-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <h3 className="text-base font-bold text-white">
                Subject-wise Attendance
              </h3>

        
            </div>

            {academicYear && (
              <div className="text-xs font-medium text-gray-300">
                {getDepartmentLabel(
                  department
                )}
                {" • "}
                {semester === "all"
                  ? "All Semesters"
                  : getSemesterLabel(semester)}
                {" • "}
                {MONTHS.find(
                  (item) =>
                    item.value ===
                    String(attendanceMonth)
                )?.label || "—"}
                {" • "}
                {attendanceYear || "—"}
              </div>
            )}
          </div>

          {!academicYear ? (
            <div
              className="
                flex
                min-h-[220px]
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <div>
                <div
                  className="
                    mx-auto
                    mb-3
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-gray-100
                    text-xl
                  "
                >
                  %
                </div>

                <h3 className="font-semibold text-black">
                  Select Academic Year
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Select an academic year to view
                  attendance statistics.
                </p>
              </div>
            </div>
          ) : attendanceLoading ? (
            <div
              className="
                flex
                min-h-[220px]
                items-center
                justify-center
              "
            >
              <div className="text-center">
                <div
                  className="
                    mx-auto
                    mb-3
                    h-8
                    w-8
                    animate-spin
                    rounded-full
                    border-4
                    border-gray-200
                    border-t-black
                  "
                />

                <p className="text-sm text-gray-500">
                  Loading attendance statistics...
                </p>
              </div>
            </div>
          ) : filteredAttendanceRows.length === 0 ? (
            <div
              className="
                flex
                min-h-[220px]
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <div>
                <div
                  className="
                    mx-auto
                    mb-3
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-gray-100
                    text-xl
                  "
                >
                  —
                </div>

                <h3 className="font-semibold text-black">
                  No attendance records found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  No attendance data is available
                  for the selected filters.
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={attendanceTableScrollRef}
              onMouseDown={startAttendanceDrag}
              onMouseMove={dragAttendanceTable}
              onMouseUp={stopAttendanceDrag}
              onMouseLeave={stopAttendanceDrag}
              className="
                relative
                w-full
                cursor-grab
                select-none
                overflow-x-auto
                overscroll-x-contain
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              <table
                className="
                  w-full
                  min-w-[1100px]
                  border-collapse
                "
              >
                <thead>
                  <tr className="bg-gray-100">

                    {/* SERIAL */}

                    <th
                      className="
                        sticky
                        left-0
                        z-30
                        min-w-[70px]
                        border-b
                        border-r
                        border-gray-300
                        bg-gray-100
                        px-4
                        py-4
                        text-left
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-black
                      "
                    >
                      Sl.
                    </th>

                    {/* SUBJECT */}

                    <th
                      className="
                        sticky
                        left-[70px]
                        z-30
                        min-w-[280px]
                        border-b
                        border-r
                        border-gray-300
                        bg-gray-100
                        px-4
                        py-4
                        text-left
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-black
                      "
                    >
                      Subject
                    </th>

                    {/* CODE */}

                    <th
                      className="
                        min-w-[150px]
                        border-b
                        border-r
                        border-gray-300
                        px-4
                        py-4
                        text-left
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-black
                      "
                    >
                      Code
                    </th>

                    {/* DEPARTMENT */}

                    {department === "all" && (
                      <th
                        className="
                          min-w-[110px]
                          border-b
                          border-r
                          border-gray-300
                          px-4
                          py-4
                          text-left
                          text-xs
                          font-bold
                          uppercase
                          tracking-wide
                          text-black
                        "
                      >
                        Dept.
                      </th>
                    )}

                    {/* SEMESTER */}

                    {semester === "all" && (
                      <th
                        className="
                          min-w-[100px]
                          border-b
                          border-r
                          border-gray-300
                          px-4
                          py-4
                          text-center
                          text-xs
                          font-bold
                          uppercase
                          tracking-wide
                          text-black
                        "
                      >
                        Sem.
                      </th>
                    )}

                    {/* BATCH 1 */}

                    {(attendanceBatch === "all" ||
                      attendanceBatch === "1") && (
                      <th
                        className="
                          min-w-[180px]
                          border-b
                          border-r
                          border-gray-300
                          px-4
                          py-4
                          text-center
                          text-xs
                          font-bold
                          uppercase
                          tracking-wide
                          text-black
                        "
                      >
                        Batch 1
                      </th>
                    )}

                    {/* BATCH 2 */}

                    {(attendanceBatch === "all" ||
                      attendanceBatch === "2") && (
                      <th
                        className="
                          min-w-[180px]
                          border-b
                          border-r
                          border-gray-300
                          px-4
                          py-4
                          text-center
                          text-xs
                          font-bold
                          uppercase
                          tracking-wide
                          text-black
                        "
                      >
                        Batch 2
                      </th>
                    )}

                    {/* OVERALL */}

                    {attendanceBatch === "all" && (
                      <th
                        className="
                          min-w-[180px]
                          border-b
                          border-gray-300
                          px-4
                          py-4
                          text-center
                          text-xs
                          font-bold
                          uppercase
                          tracking-wide
                          text-black
                        "
                      >
                        Overall
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredAttendanceRows.map(
                    (row, index) => (
                      <tr
                        key={
                          row.subjectId ||
                          `${row.code}-${index}`
                        }
                        className="
                          group
                          transition
                          hover:bg-gray-50
                        "
                      >

                        {/* SERIAL */}

                        <td
                          className="
                            sticky
                            left-0
                            z-20
                            border-b
                            border-r
                            border-gray-200
                            bg-white
                            px-4
                            py-4
                            text-sm
                            font-medium
                            text-gray-500
                            group-hover:bg-gray-50
                          "
                        >
                          {index + 1}
                        </td>

                        {/* SUBJECT */}

                        <td
                          className="
                            sticky
                            left-[70px]
                            z-20
                            border-b
                            border-r
                            border-gray-200
                            bg-white
                            px-4
                            py-4
                            group-hover:bg-gray-50
                          "
                        >
                          <div className="max-w-[280px]">
                            <p
                              className="
                                truncate
                                text-sm
                                font-semibold
                                text-black
                              "
                            >
                              {row.name || "—"}
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400">
                              {row.sequence
                                ? `Seq. ${row.sequence}`
                                : `Sem ${row.semester || "—"}`}
                            </p>
                          </div>
                        </td>

                        {/* CODE */}

                        <td
                          className="
                            border-b
                            border-r
                            border-gray-200
                            px-4
                            py-4
                            text-sm
                            font-medium
                            text-gray-700
                          "
                        >
                          {row.code || "—"}
                        </td>

                        {/* DEPARTMENT */}

                        {department === "all" && (
                          <td
                            className="
                              border-b
                              border-r
                              border-gray-200
                              px-4
                              py-4
                              text-sm
                              font-medium
                              text-gray-700
                            "
                          >
                            {String(
                              row.department || ""
                            ).toUpperCase()}
                          </td>
                        )}

                        {/* SEMESTER */}

                        {semester === "all" && (
                          <td
                            className="
                              border-b
                              border-r
                              border-gray-200
                              px-4
                              py-4
                              text-center
                              text-sm
                              font-medium
                              text-gray-700
                            "
                          >
                            {row.semester || "—"}
                          </td>
                        )}

                        {/* BATCH 1 */}

                        {(attendanceBatch === "all" ||
                          attendanceBatch === "1") && (
                          <td
                            className="
                              border-b
                              border-r
                              border-gray-200
                              px-4
                              py-4
                              text-center
                            "
                          >
                            <AttendanceCell
                              value={
                                row.batch1
                              }
                            />
                          </td>
                        )}

                        {/* BATCH 2 */}

                        {(attendanceBatch === "all" ||
                          attendanceBatch === "2") && (
                          <td
                            className="
                              border-b
                              border-r
                              border-gray-200
                              px-4
                              py-4
                              text-center
                            "
                          >
                            <AttendanceCell
                              value={
                                row.batch2
                              }
                            />
                          </td>
                        )}

                        {/* OVERALL */}

                        {attendanceBatch === "all" && (
                          <td
                            className="
                              border-b
                              border-gray-200
                              px-4
                              py-4
                              text-center
                            "
                          >
                            <AttendanceCell
                              value={
                                row.overall
                              }
                            />
                          </td>
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =================================================
            ATTENDANCE FOOTER
        ================================================= */}

        {filteredAttendanceRows.length > 0 &&
          !attendanceLoading && (
            <div
              className="
                mt-3
                flex
                flex-col
                gap-2
                px-1
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <p className="text-xs text-gray-400">
                Drag the table horizontally to view
                all columns.
              </p>

              <p className="text-xs font-medium text-gray-500">
                Showing{" "}
                {filteredAttendanceRows.length}{" "}
                subject
                {filteredAttendanceRows.length !==
                1
                  ? "s"
                  : ""}
              </p>
            </div>
          )}
      </section>

      {/* =====================================================
          PAGE FOOTER
      ===================================================== */}

      <div
        className="
          border-t
          border-gray-200
          pt-5
          text-center
        "
      >
        <p className="text-xs text-gray-400">
          Academic Monitoring • IA & Attendance
        </p>
      </div>
    </div>
  );
}