"use client";

import { useEffect, useMemo, useState,useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  RefreshCw,
  Search,
  Users,
  BookOpen,
  Lock,
  LockOpen,
  Building2,
  GraduationCap,
  Download,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

  

// =====================================================
// DEPARTMENTS
// =====================================================

const departments = [
  {
    value: "at",
    label: "Automobile Engineering",
  },
  {
    value: "ch",
    label: "Chemical Engineering",
  },
  {
    value: "ce",
    label: "Civil Engineering",
  },
  {
    value: "cs",
    label: "Computer Science Engineering",
  },
  {
    value: "ec",
    label: "Electronics & Communication",
  },
  {
    value: "ee",
    label: "Electrical & Electronics",
  },
  {
    value: "me",
    label: "Mechanical Engineering",
  },
  {
    value: "ps",
    label: "Polymer Engineering",
  },
  {
    value: "sc",
    label: "Science & English",
  },
];

// =====================================================
// MONTHS
// =====================================================

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// =====================================================
// EXCEL REPORT
// =====================================================

const downloadExcelReport = async ({
  department,
  semester,
  filteredStudents,
  batchSelection,
  departmentLabel,
  monthLabel,
  year,
  subjects,
}) => {
  try {
    if (!department || !semester) {
      alert("Please select department and semester.");
      return;
    }

    if (!filteredStudents.length) {
      alert("No student attendance data available.");
      return;
    }

    // Load Excel library only when required
    const XLSX = await import("xlsx-js-style");

    const workbook = XLSX.utils.book_new();

    // =================================================
    // REPORT INFORMATION
    // =================================================

    const batchLabel =
      batchSelection === "both"
        ? "Batch 1 & Batch 2"
        : `Batch ${batchSelection}`;

    const generatedDate = new Date().toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    // =================================================
    // MAIN REPORT DATA
    // =================================================

    const reportRows = [];

    // -------------------------------------------------
    // HEADER
    // -------------------------------------------------

    reportRows.push([
      "GOVERNMENT OF KARNATAKA",
    ]);

    reportRows.push([
      "DEPARTMENT OF COLLEGIATE AND TECHNICAL EDUCATION",
    ]);

    reportRows.push([
      "KARNATAKA (GOVT.) POLYTECHNIC, MANGALURU",
    ]);

    reportRows.push([
      "(First Autonomous Polytechnic in India from AICTE, New Delhi)",
    ]);

    reportRows.push([
      "Kadri Hills., Mangaluru–575004, Dakshina Kannada, Karnataka",
    ]);

    reportRows.push([]);

    reportRows.push([
      "SEMESTER ATTENDANCE REPORT",
    ]);

    reportRows.push([]);

    reportRows.push([
      "Department",
      departmentLabel,
      "Semester",
      `Semester ${semester}`,
    ]);

    reportRows.push([
      "Month",
      monthLabel,
      "Year",
      year,
    ]);

    reportRows.push([
      "Batch",
      batchLabel,
      "Total Students",
      filteredStudents.length,
    ]);

    reportRows.push([
      "Total Subjects",
      subjects.length,
      "Generated On",
      generatedDate,
    ]);

    reportRows.push([]);

    // =================================================
    // TABLE HEADER
    // =================================================

    reportRows.push([
      "Sl. No.",
      "Register Number",
      "Student Name",
      "Batch",

      ...subjects.flatMap((subject) => [
        `${subject.code} - ${subject.name}`,
        "",
        "",
      ]),

      "Overall Attendance",
      "",
      "",
    ]);

    reportRows.push([
      "",
      "",
      "",
      "",

      ...subjects.flatMap(() => [
        "Attended",
        "Conducted",
        "Percentage",
      ]),

      "Attended",
      "Conducted",
      "Percentage",
    ]);

    // =================================================
    // STUDENT DATA
    // =================================================

    const studentReportData = [];

    filteredStudents.forEach(
      (student, studentIndex) => {
        let totalAttended = 0;
        let totalConducted = 0;

        const row = [
          studentIndex + 1,
          student.registerNumber || "",
          student.name || "",
          Number(student.batchNumber) || "",
        ];

        subjects.forEach((subject) => {
          const record =
            student.subjects[
              String(subject._id)
            ];

          const attended = Number(
            record?.attended || 0
          );

          const conducted = Number(
            record?.conducted || 0
          );

          const percentage =
            conducted > 0
              ? (attended / conducted) * 100
              : null;

          if (conducted > 0) {
            totalAttended += attended;
            totalConducted += conducted;
          }

          row.push(
            attended,
            conducted,
            percentage !== null
              ? Number(percentage.toFixed(2))
              : ""
          );
        });

        const overallPercentage =
          totalConducted > 0
            ? (totalAttended / totalConducted) * 100
            : null;

        row.push(
          totalAttended,
          totalConducted,
          overallPercentage !== null
            ? Number(
                overallPercentage.toFixed(2)
              )
            : ""
        );

        reportRows.push(row);

        studentReportData.push({
          student,
          totalAttended,
          totalConducted,
          percentage: overallPercentage,
        });
      }
    );

    // =================================================
    // SUMMARY
    // =================================================

    const studentsAbove75 =
      studentReportData.filter(
        (item) =>
          item.percentage !== null &&
          item.percentage >= 75
      );

    const studentsBelow75 =
      studentReportData.filter(
        (item) =>
          item.percentage !== null &&
          item.percentage < 75
      );

    const studentsWithoutAttendance =
      studentReportData.filter(
        (item) =>
          item.percentage === null
      );

    const validPercentages =
      studentReportData
        .filter(
          (item) =>
            item.percentage !== null
        )
        .map(
          (item) => item.percentage
        );

    const averageAttendance =
      validPercentages.length > 0
        ? validPercentages.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          validPercentages.length
        : 0;

    // -------------------------------------------------
    // SUMMARY SECTION
    // -------------------------------------------------

    reportRows.push([]);
    reportRows.push([]);
    reportRows.push([
      "ATTENDANCE SUMMARY",
    ]);

    reportRows.push([
      "Total Students",
      filteredStudents.length,
    ]);

    reportRows.push([
      "Students with 75% and Above",
      studentsAbove75.length,
    ]);

    reportRows.push([
      "Students Below 75%",
      studentsBelow75.length,
    ]);

    reportRows.push([
      "Students Without Attendance",
      studentsWithoutAttendance.length,
    ]);

    reportRows.push([
      "Average Attendance",
      `${averageAttendance.toFixed(2)}%`,
    ]);

    // =================================================
    // LOW ATTENDANCE STUDENTS
    // =================================================

    reportRows.push([]);
    reportRows.push([]);

    reportRows.push([
      "STUDENTS BELOW 75% ATTENDANCE",
    ]);

    reportRows.push([]);

    reportRows.push([
      "Sl. No.",
      "Register Number",
      "Student Name",
      "Batch",
      "Total Classes Attended",
      "Total Classes Conducted",
      "Overall Attendance %",
    ]);

    studentsBelow75.forEach(
      (item, index) => {
        reportRows.push([
          index + 1,
          item.student.registerNumber || "",
          item.student.name || "",
          Number(
            item.student.batchNumber
          ) || "",
          item.totalAttended,
          item.totalConducted,
          Number(
            item.percentage.toFixed(2)
          ),
        ]);
      }
    );

    // =================================================
    // CREATE WORKSHEET
    // =================================================

    const worksheet =
      XLSX.utils.aoa_to_sheet(
        reportRows
      );

    // =================================================
    // MERGE MAIN HEADINGS
    // =================================================

    const totalColumns =
      4 +
      subjects.length * 3 +
      3;

    const lastColumn =
      totalColumns - 1;

    worksheet["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: lastColumn },
      },
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: lastColumn },
      },
      {
        s: { r: 2, c: 0 },
        e: { r: 2, c: lastColumn },
      },
      {
        s: { r: 3, c: 0 },
        e: { r: 3, c: lastColumn },
      },
      {
        s: { r: 4, c: 0 },
        e: { r: 4, c: lastColumn },
      },
      {
        s: { r: 6, c: 0 },
        e: { r: 6, c: lastColumn },
      },
    ];

    // =================================================
    // MERGE SUBJECT HEADINGS
    // =================================================

    const subjectHeaderRow = 13;
    const subjectSubHeaderRow = 14;

    let subjectStartColumn = 4;

    subjects.forEach(() => {
      worksheet["!merges"].push({
        s: {
          r: subjectHeaderRow,
          c: subjectStartColumn,
        },
        e: {
          r: subjectHeaderRow,
          c: subjectStartColumn + 2,
        },
      });

      subjectStartColumn += 3;
    });

    // Merge overall attendance
    worksheet["!merges"].push({
      s: {
        r: subjectHeaderRow,
        c: subjectStartColumn,
      },
      e: {
        r: subjectHeaderRow,
        c: subjectStartColumn + 2,
      },
    });

    // =================================================
    // COLUMN WIDTHS
    // =================================================

    const columnWidths = [
      8,
      18,
      28,
      10,
    ];

    subjects.forEach(() => {
      columnWidths.push(
        25,
        12,
        14
      );
    });

    columnWidths.push(
      16,
      14,
      18
    );

    worksheet["!cols"] =
      columnWidths.map(
        (width) => ({
          wch: width,
        })
      );

    // =================================================
    // ROW HEIGHTS
    // =================================================

    worksheet["!rows"] = [];

    worksheet["!rows"][0] = {
      hpt: 24,
    };

    worksheet["!rows"][1] = {
      hpt: 22,
    };

    worksheet["!rows"][2] = {
      hpt: 26,
    };

    worksheet["!rows"][6] = {
      hpt: 24,
    };

    // =================================================
    // STYLES
    // =================================================

    const titleStyle = {
      font: {
        bold: true,
        sz: 16,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };

    const subTitleStyle = {
      font: {
        bold: true,
        sz: 12,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };

    const institutionStyle = {
      font: {
        bold: true,
        sz: 14,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };

    const tableHeaderStyle = {
      font: {
        bold: true,
        color: {
          rgb: "FFFFFF",
        },
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "1E293B",
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border: {
        top: {
          style: "thin",
          color: {
            rgb: "CBD5E1",
          },
        },
        bottom: {
          style: "thin",
          color: {
            rgb: "CBD5E1",
          },
        },
        left: {
          style: "thin",
          color: {
            rgb: "CBD5E1",
          },
        },
        right: {
          style: "thin",
          color: {
            rgb: "CBD5E1",
          },
        },
      },
    };

    const cellStyle = {
      alignment: {
        vertical: "center",
      },
      border: {
        top: {
          style: "thin",
          color: {
            rgb: "E2E8F0",
          },
        },
        bottom: {
          style: "thin",
          color: {
            rgb: "E2E8F0",
          },
        },
        left: {
          style: "thin",
          color: {
            rgb: "E2E8F0",
          },
        },
        right: {
          style: "thin",
          color: {
            rgb: "E2E8F0",
          },
        },
      },
    };

    // Institution headings
    for (let row = 0; row <= 4; row++) {
      const cell =
        XLSX.utils.encode_cell({
          r: row,
          c: 0,
        });

      if (worksheet[cell]) {
        worksheet[cell].s =
          row === 2
            ? institutionStyle
            : row === 3
            ? subTitleStyle
            : titleStyle;
      }
    }

    // Main report title
    if (worksheet["A7"]) {
      worksheet["A7"].s =
        titleStyle;
    }

    // Table headers
    for (
      let row = subjectHeaderRow;
      row <= subjectSubHeaderRow;
      row++
    ) {
      for (
        let col = 0;
        col <= lastColumn;
        col++
      ) {
        const cell =
          XLSX.utils.encode_cell({
            r: row,
            c: col,
          });

        if (worksheet[cell]) {
          worksheet[cell].s =
            tableHeaderStyle;
        }
      }
    }

    // Data cells
    const dataStartRow = 15;

    const dataEndRow =
      dataStartRow +
      filteredStudents.length -
      1;

    for (
      let row = dataStartRow;
      row <= dataEndRow;
      row++
    ) {
      for (
        let col = 0;
        col <= lastColumn;
        col++
      ) {
        const cell =
          XLSX.utils.encode_cell({
            r: row,
            c: col,
          });

        if (worksheet[cell]) {
          worksheet[cell].s =
            cellStyle;
        }
      }
    }

    // =================================================
    // NUMBER FORMATS
    // =================================================

    for (
      let row = dataStartRow;
      row <= dataEndRow;
      row++
    ) {
      let col = 4;

      subjects.forEach(() => {
        if (worksheet[
          XLSX.utils.encode_cell({
            r: row,
            c: col + 2,
          })
        ]) {
          worksheet[
            XLSX.utils.encode_cell({
              r: row,
              c: col + 2,
            })
          ].z = "0.00";
        }

        col += 3;
      });

      const overallPercentageCell =
        XLSX.utils.encode_cell({
          r: row,
          c: lastColumn,
        });

      if (
        worksheet[
          overallPercentageCell
        ]
      ) {
        worksheet[
          overallPercentageCell
        ].z = "0.00";
      }
    }

    // =================================================
    // FREEZE PANES
    // =================================================

    worksheet["!freeze"] = {
      xSplit: 4,
      ySplit: 15,
    };

    // =================================================
    // AUTOFILTER
    // =================================================

    worksheet["!autofilter"] = {
      ref: `A15:${XLSX.utils.encode_col(
        lastColumn
      )}${dataEndRow + 1}`,
    };

    // =================================================
    // SUMMARY STYLE
    // =================================================

    const summaryTitleRow =
      dataEndRow + 3;

    const summaryStartRow =
      summaryTitleRow + 1;

    const lowTitleRow =
      summaryStartRow + 6;

    const lowHeaderRow =
      lowTitleRow + 2;

    const summaryStyle = {
      font: {
        bold: true,
        sz: 12,
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "DBEAFE",
        },
      },
      alignment: {
        horizontal: "left",
        vertical: "center",
      },
    };

    const lowHeaderStyle = {
      font: {
        bold: true,
        color: {
          rgb: "FFFFFF",
        },
      },
      fill: {
        patternType: "solid",
        fgColor: {
          rgb: "DC2626",
        },
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    };

    const summaryCell =
      XLSX.utils.encode_cell({
        r: summaryTitleRow,
        c: 0,
      });

    if (worksheet[summaryCell]) {
      worksheet[summaryCell].s =
        summaryStyle;
    }

    for (
      let row = summaryStartRow;
      row <= summaryStartRow + 5;
      row++
    ) {
      for (
        let col = 0;
        col < 2;
        col++
      ) {
        const cell =
          XLSX.utils.encode_cell({
            r: row,
            c: col,
          });

        if (worksheet[cell]) {
          worksheet[cell].s =
            cellStyle;
        }
      }
    }

    const lowTitleCell =
      XLSX.utils.encode_cell({
        r: lowTitleRow,
        c: 0,
      });

    if (worksheet[lowTitleCell]) {
      worksheet[lowTitleCell].s =
        {
          font: {
            bold: true,
            sz: 12,
            color: {
              rgb: "991B1B",
            },
          },
          fill: {
            patternType: "solid",
            fgColor: {
              rgb: "FEE2E2",
            },
          },
        };
    }

    // Low attendance header
    for (
      let col = 0;
      col < 7;
      col++
    ) {
      const cell =
        XLSX.utils.encode_cell({
          r: lowHeaderRow,
          c: col,
        });

      if (worksheet[cell]) {
        worksheet[cell].s =
          lowHeaderStyle;
      }
    }

    // Low attendance data
    const lowDataStart =
      lowHeaderRow + 1;

    studentsBelow75.forEach(
      (_, index) => {
        const row =
          lowDataStart + index;

        for (
          let col = 0;
          col < 7;
          col++
        ) {
          const cell =
            XLSX.utils.encode_cell({
              r: row,
              c: col,
            });

          if (worksheet[cell]) {
            worksheet[cell].s =
              cellStyle;
          }
        }

        const percentageCell =
          XLSX.utils.encode_cell({
            r: row,
            c: 6,
          });

        if (
          worksheet[percentageCell]
        ) {
          worksheet[
            percentageCell
          ].z = "0.00";
        }
      }
    );

    // =================================================
    // WORKSHEET NAME
    // =================================================

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Attendance Report"
    );

    // =================================================
    // FILE NAME
    // =================================================

    const safeDepartment =
      departmentLabel
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const safeMonth =
      monthLabel.replace(
        /[^a-zA-Z0-9]+/g,
        "_"
      );

    const fileName =
      `Attendance_Report_${safeDepartment}_Sem${semester}_${safeMonth}_${year}.xlsx`;

    // =================================================
    // DOWNLOAD
    // =================================================

    XLSX.writeFile(
      workbook,
      fileName
    );
  } catch (error) {
    console.error(
      "Excel report generation failed:",
      error
    );

    alert(
      "Unable to generate Excel report. Please try again."
    );
  }
};
// =====================================================
// SEMESTERS
// =====================================================

const semesters = [1, 2, 3, 4, 5, 6];

// =====================================================
// HOD ATTENDANCE PAGE
// =====================================================

export default function HODAttendancePage() {
const { getToken } = useAuth();
const { user, isLoaded: isUserLoaded } = useUser();
  const tableScrollRef = useRef(null);
  const currentDate = new Date();
const [refreshKey, setRefreshKey] =
  useState(0);
  // ---------------------------------------------------
  // FILTERS
  // ---------------------------------------------------

  const [month, setMonth] = useState(
    currentDate.getMonth() + 1
  );

  const [year, setYear] = useState(
    currentDate.getFullYear()
  );

  const [department, setDepartment] =
    useState("");
    // =====================================================
// HOD DEPARTMENT
// Department comes automatically from Clerk metadata.
// HOD should not manually select another department.
// =====================================================

useEffect(() => {
  if (!isUserLoaded || !user) return;

  const hodDepartment =
    user.publicMetadata?.department;

  if (hodDepartment) {
    setDepartment(
      String(hodDepartment).trim().toLowerCase()
    );
  }
}, [
  user,
  isUserLoaded,
]);

  const [semester, setSemester] =
    useState("");

  const [batchSelection, setBatchSelection] =
    useState("both");

  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  const [subjects, setSubjects] =
    useState([]);

  const [attendanceData, setAttendanceData] =
    useState({});

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [searchText, setSearchText] =
    useState("");
    const [selectedStudentPhoto, setSelectedStudentPhoto] = useState(null);

  // =====================================================
  // YEARS
  // =====================================================

  const years = useMemo(() => {
    const result = [];

    for (
      let i =
        currentDate.getFullYear() - 2;
      i <=
      currentDate.getFullYear() + 1;
      i++
    ) {
      result.push(i);
    }

    return result;
  }, []);

  
  // =====================================================
  // LOAD SUBJECTS + ALL ATTENDANCE
  // =====================================================

  useEffect(() => {
    const loadSemesterAttendance =
      async () => {
        if (
          !department ||
          !semester
        ) {
          setSubjects([]);
          setAttendanceData({});
          return;
        }

        try {
          setLoading(true);
          setError("");

          const token =
            await getToken();

          // =================================================
          // 1. GET ALL SUBJECTS FOR SEMESTER
          // =================================================

          const subjectResponse =
            await axios.get(
              `${API_URL}/api/subjects/getsubjects`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                params: {
                  department,

                  semester:
                    Number(semester),
                },
              }
            );

          const subjectResult =
            subjectResponse.data;

          const subjectList =
            Array.isArray(
              subjectResult?.data
            )
              ? subjectResult.data
              : Array.isArray(
                  subjectResult?.subjects
                )
              ? subjectResult.subjects
              : subjectResult?.subjects
                    ?.data || [];

          const nonBridgeSubjects = subjectList.filter(
  (subject) =>
    String(subject.subjectCategory || "").toUpperCase() !== "BRIDGE"
);

setSubjects(nonBridgeSubjects);

          // =================================================
          // 2. LOAD ATTENDANCE FOR ALL SUBJECTS
          // =================================================

          const attendanceMap = {};

          await Promise.all(
            nonBridgeSubjects.map(
              async (subject) => {
                try {
                  const response =
                    await axios.get(
                      `${API_URL}/api/attendance`,
                      {
                        headers: {
                          Authorization:
                            `Bearer ${token}`,
                        },

                        params: {
                          department,

                          semester:
                            Number(
                              semester
                            ),

                          subjectId:
                            subject._id,

                          month:
                            Number(month),

                          year:
                            Number(year),

                          batchNumbers:
                            batchSelection ===
                            "both"
                              ? "1,2"
                              : batchSelection,
                        },
                      }
                    );

                  if (
                    response.data
                      ?.exists &&
                    response.data
                      ?.data
                  ) {
                    attendanceMap[
                      String(
                        subject._id
                      )
                    ] =
                      response.data.data;
                  } else {
                    attendanceMap[
                      String(
                        subject._id
                      )
                    ] = null;
                  }
                } catch (subjectError) {
                  console.error(
                    `Attendance load failed for ${subject.code}:`,
                    subjectError
                  );

                  attendanceMap[
                    String(
                      subject._id
                    )
                  ] = null;
                }
              }
            )
          );

          setAttendanceData(
            attendanceMap
          );
        } catch (err) {
          console.error(
            "HOD attendance loading error:",
            err
          );

          setSubjects([]);
          setAttendanceData({});

          setError(
            err.response?.data
              ?.message ||
              "Failed to load attendance."
          );
        } finally {
          setLoading(false);
        }
      };

    loadSemesterAttendance();
  }, [
      department,
  semester,
  month,
  year,
  batchSelection,
  refreshKey,
  getToken,
  ]);

// =====================================================
// UNLOCK ATTENDANCE FOR CORRECTION
//
// The saved attendance is kept. The faculty can correct
// it and save again, which locks it again.
// =====================================================

const handleUnlockAttendance = async (subject) => {
  const batchLabel =
    batchSelection === "both"
      ? "Batch 1 & Batch 2"
      : `Batch ${batchSelection}`;

  const confirmation = await Swal.fire({
    icon: "question",
    title: "Unlock Attendance?",
    text: `${subject.code} · ${batchLabel}. The faculty will be able to correct this month's attendance and save it again.`,
    showCancelButton: true,
    confirmButtonText: "Unlock",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#0f172a",
    cancelButtonColor: "#94a3b8",
    reverseButtons: true,
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  try {
    const token = await getToken();

    await axios.post(
      `${API_URL}/api/attendance/unlock`,
      {
        department,
        semester: Number(semester),
        subjectId: subject._id,
        month: Number(month),
        year: Number(year),
        batchNumbers:
          batchSelection === "both"
            ? [1, 2]
            : [Number(batchSelection)],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setRefreshKey((prev) => prev + 1);

    await Swal.fire({
      icon: "success",
      title: "Attendance Unlocked",
      text: "The faculty can now correct this attendance and save it again.",
      confirmButtonColor: "#0f172a",
    });
  } catch (unlockError) {
    console.error(
      "Unlock attendance error:",
      unlockError
    );

    await Swal.fire({
      icon: "error",
      title: "Unable to Unlock",
      text:
        unlockError.response?.data?.message ||
        "Failed to unlock attendance.",
      confirmButtonColor: "#0f172a",
    });
  }
};

 // =====================================================
// STUDENT LIST
// IMPORTANT:
// 1. Load the COMPLETE student roster from Student API.
// 2. Filter by Batch 1 / Batch 2 / Both.
// 3. Sort strictly by Roll Number.
// 4. Overlay attendance using Student MongoDB _id.
// 5. Students without attendance remain in the list
//    and their attendance cells show "—".
// =====================================================

const [allStudents, setAllStudents] = useState([]);

// =====================================================
// LOAD COMPLETE STUDENT ROSTER
// =====================================================

useEffect(() => {
  const loadStudents = async () => {
    if (!department || !semester) {
      setAllStudents([]);
      return;
    }

    try {
      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department,
            semester: Number(semester),
          },
        }
      );

      const result = response.data;

      const studentList =
        Array.isArray(result?.students)
          ? result.students
          : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.students?.data)
          ? result.students.data
          : Array.isArray(result)
          ? result
          : [];

      setAllStudents(studentList);
    } catch (error) {
      console.error(
        "Failed to load HOD student roster:",
        error
      );

      setAllStudents([]);
    }
  };

  loadStudents();
}, [
  department,
  semester,
  getToken,
]);

// =====================================================
// BUILD STUDENT LIST
// =====================================================

const students = useMemo(() => {
  const studentMap = new Map();

  // ---------------------------------------------------
  // 1. FIRST ADD ALL STUDENTS FROM STUDENT API
  // ---------------------------------------------------

  allStudents.forEach((student) => {
    if (!student?._id) return;

    const studentId = String(student._id);

    studentMap.set(studentId, {
      _id: studentId,

      registerNumber:
        student.registerNumber || "",

      rollNumber:
        student.rollNumber || "",

      name:
        student.name || "",

      email:
        student.email || "",

      imageUrl:
        student.imageUrl ||
        student.photoUrl ||
        student.profileImage ||
        "",

      batchNumber:
        Number(student.batchNumber),

      subjects: {},
    });
  });

  // ---------------------------------------------------
  // 2. OVERLAY ATTENDANCE USING STUDENT _id
  // ---------------------------------------------------

  subjects.forEach((subject) => {
    const attendance =
      attendanceData[String(subject._id)];

    if (!attendance) {
      return;
    }

    const conducted =
      Number(
        attendance.classesConducted || 0
      );

    (attendance.students || []).forEach(
      (entry) => {
        const student =
          entry.studentId;

        if (!student) {
          return;
        }

        const studentId =
          String(
            student._id || student
          );

        const target =
          studentMap.get(studentId);

        if (!target) {
          return;
        }

        // ---------------------------------------------
        // SAFETY CHECK:
        // Never attach attendance to another batch.
        // ---------------------------------------------

        if (
          batchSelection !== "both" &&
          Number(target.batchNumber) !==
            Number(batchSelection)
        ) {
          return;
        }

        target.subjects[
          String(subject._id)
        ] = {
          attended:
            Number(
              entry.classesAttended || 0
            ),

          conducted:
            Number(
              entry.classesEligible ??
              conducted ??
              0
            ),
        };
      }
    );
  });

  // ---------------------------------------------------
  // 3. FILTER BATCH
  // ---------------------------------------------------

  const filteredRoster =
    Array.from(
      studentMap.values()
    ).filter((student) => {
      if (
        batchSelection === "both"
      ) {
        return (
          Number(student.batchNumber) === 1 ||
          Number(student.batchNumber) === 2
        );
      }

      return (
        Number(student.batchNumber) ===
        Number(batchSelection)
      );
    });

  // ---------------------------------------------------
  // 4. SORT STRICTLY BY ROLL NUMBER
  // ---------------------------------------------------

  filteredRoster.sort((a, b) => {
    const rollA =
      Number(a.rollNumber);

    const rollB =
      Number(b.rollNumber);

    if (
      Number.isFinite(rollA) &&
      Number.isFinite(rollB)
    ) {
      return rollA - rollB;
    }

    return String(
      a.rollNumber || ""
    ).localeCompare(
      String(
        b.rollNumber || ""
      ),
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      }
    );
  });

  return filteredRoster;
}, [
  allStudents,
  subjects,
  attendanceData,
  batchSelection,
]);

  // =====================================================
  // FILTER STUDENTS
  // =====================================================

  const filteredStudents =
    useMemo(() => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      return students.filter(
        (student) => {
          // ---------------------------------------------
          // Batch filter
          // ---------------------------------------------

          if (
            batchSelection !==
              "both" &&
            Number(
              student.batchNumber
            ) !==
              Number(
                batchSelection
              )
          ) {
            return false;
          }

          // ---------------------------------------------
          // Search
          // ---------------------------------------------

          if (!search) {
            return true;
          }

          return (
            String(
              student.name
            )
              .toLowerCase()
              .includes(search) ||
            String(
              student.registerNumber
            )
              .toLowerCase()
              .includes(search)
          );
        }
      );
    }, [
      students,
      searchText,
      batchSelection,
    ]);

  // =====================================================
  // GET ATTENDANCE
  // =====================================================

  const getAttendance =
    (
      student,
      subjectId
    ) => {
      const record =
        student.subjects[
          String(subjectId)
        ];

      if (!record) {
        return null;
      }

      if (
        !record.conducted ||
        record.conducted <= 0
      ) {
        return null;
      }

      return (
        (record.attended /
          record.conducted) *
        100
      );
    };

  // =====================================================
  // TOTAL LOW ATTENDANCE CELLS
  // =====================================================

  const lowAttendanceCount =
    useMemo(() => {
      let count = 0;

      filteredStudents.forEach(
        (student) => {
          subjects.forEach(
            (subject) => {
              const percentage =
                getAttendance(
                  student,
                  subject._id
                );

              if (
                percentage !==
                  null &&
                percentage < 75
              ) {
                count++;
              }
            }
          );
        }
      );

      return count;
    }, [
      filteredStudents,
      subjects,
    ]);

  // =====================================================
  // SUBJECTS WITH NO ATTENDANCE
  // =====================================================

  const subjectsWithoutAttendance =
    useMemo(() => {
      return subjects.filter(
        (subject) =>
          !attendanceData[
            String(
              subject._id
            )
          ]
      );
    }, [
      subjects,
      attendanceData,
    ]);

  // =====================================================
  // DEPARTMENT LABEL
  // =====================================================

  const departmentLabel =
    departments.find(
      (item) =>
        item.value ===
        department
    )?.label || "";

  // =====================================================
  // MONTH LABEL
  // =====================================================

  const monthLabel =
    months.find(
      (item) =>
        item.value ===
        Number(month)
    )?.label || "";


  const moveTableHorizontally = (direction) => {
  const container = tableScrollRef.current;

  if (!container) return;

  const amount = 500;

  if (direction === "left") {
    container.scrollLeft = Math.max(
      0,
      container.scrollLeft - amount
    );
  } else {
    container.scrollLeft = Math.min(
      container.scrollWidth - container.clientWidth,
      container.scrollLeft + amount
    );
  }
};
  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-6 lg:px-8">
      

      <div className="mx-auto max-w-[1600px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <ClipboardCheck
                size={24}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                HOD Portal
              </p>

              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Semester Attendance
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                View attendance for all subjects in one place.
              </p>
            </div>

          </div>

          {department &&
            semester && (
              <button
                type="button"
             onClick={() =>
  setRefreshKey((prev) => prev + 1)
}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>
            )}

        </div>

        {/* =================================================
            FILTER CARD
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays
                  size={18}
                />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Attendance Selection
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Select month, department and semester.
                </p>
              </div>

            </div>

          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:p-6">

            {/* Month */}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Month
              </label>

              <div className="relative">

                <select
                  value={month}
                  onChange={(e) =>
                    setMonth(
                      Number(
                        e.target
                          .value
                      )
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                >
                  {months.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

            {/* Year */}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Year
              </label>

              <div className="relative">

                <select
                  value={year}
                  onChange={(e) =>
                    setYear(
                      Number(
                        e.target
                          .value
                      )
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                >
                  {years.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

            {/* Department */}

           {/* HOD DEPARTMENT - READ ONLY */}

<div>
  <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
    <Building2 size={13} />
    Department
  </label>

  <div className="flex min-h-[48px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
    {departmentLabel || "Loading department..."}
  </div>
</div>

            {/* Semester */}

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <GraduationCap
                  size={13}
                />
                Semester
              </label>

              <div className="relative">

                <select
                  value={
                    semester
                  }
                  disabled={
                    !department
                  }
                  onChange={(e) => {
                    setSemester(
                      e.target
                        .value
                    );

                    setSubjects(
                      []
                    );

                    setAttendanceData(
                      {}
                    );
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    Select semester
                  </option>

                  {semesters.map(
                    (sem) => (
                      <option
                        key={sem}
                        value={sem}
                      >
                        Semester{" "}
                        {sem}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

            {/* Batch */}

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Users
                  size={13}
                />
                Student Batch
              </label>

              <div className="relative">

                <select
                  value={
                    batchSelection
                  }
                  onChange={(e) =>
                    setBatchSelection(
                      e.target
                        .value
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="both">
                    Batch 1 & Batch 2
                  </option>

                  <option value="1">
                    Batch 1
                  </option>

                  <option value="2">
                    Batch 2
                  </option>
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

              </div>
            </div>

          </div>

        </section>

        {/* =================================================
            CONTENT
        ================================================= */}

        {department &&
          semester && (
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* ---------------------------------------------
                  TITLE
              --------------------------------------------- */}

              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <h2 className="text-lg font-bold text-slate-950">
                        Semester{" "}
                        {semester}{" "}
                        Attendance
                      </h2>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                        {
                          subjects.length
                        }{" "}
                        Subjects
                      </span>

                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {departmentLabel}
                      {" · "}
                      {monthLabel}{" "}
                      {year}
                      {" · "}
                      {batchSelection ===
                      "both"
                        ? "Batch 1 & Batch 2"
                        : `Batch ${batchSelection}`}
                    </p>

                  </div>

                {students.length > 0 && (
  <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">

    {/* SEARCH */}
    <div className="relative w-full sm:w-72">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        type="text"
        value={searchText}
        onChange={(e) =>
          setSearchText(e.target.value)
        }
        placeholder="Search student..."
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
      />
    </div>

    {/* EXCEL DOWNLOAD */}
    <button
      type="button"
    onClick={() =>
  downloadExcelReport({
    department,
    semester,
    filteredStudents,
    batchSelection,
    departmentLabel,
    monthLabel,
    year,
    subjects,
  })
}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download size={16} />
      Download Excel
    </button>

  </div>
)}

                </div>

              </div>

              {/* ---------------------------------------------
                  LEGEND
              --------------------------------------------- */}

              {students.length >
                0 && (
                <div className="flex flex-wrap items-center gap-5 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:px-6">

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">

                    <span className="h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-inset ring-emerald-200" />

                    75% and above

                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">

                    <span className="h-3 w-3 rounded-sm bg-red-100 ring-1 ring-inset ring-red-200" />

                    Below 75%

                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">

                    <span className="h-3 w-3 rounded-sm bg-slate-100 ring-1 ring-inset ring-slate-200" />

                    Not entered

                  </div>

                  <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-400">

                    <Lock
                      size={13}
                    />

                    Read only

                  </div>

                </div>
              )}

              {/* ---------------------------------------------
                  LOADING
              --------------------------------------------- */}

              {loading ? (
                <div className="px-6 py-20 text-center">

                  <RefreshCw
                    size={28}
                    className="mx-auto mb-3 animate-spin text-slate-400"
                  />

                  <p className="text-sm font-semibold text-slate-700">
                    Loading semester attendance...
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Loading all subjects.
                  </p>

                </div>
              ) : subjects.length ===
                0 ? (
                /* -------------------------------------------
                   NO SUBJECTS
                ------------------------------------------- */

                <div className="px-6 py-20 text-center">

                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <BookOpen
                      size={26}
                    />
                  </div>

                  <h3 className="text-sm font-bold text-slate-700">
                    No Subjects Found
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    No subjects are configured
                    for this department and
                    semester.
                  </p>

                </div>
              ) : students.length ===
                0 ? (
                /* -------------------------------------------
                   NO ATTENDANCE
                ------------------------------------------- */

                <div className="px-6 py-20 text-center">

                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <ClipboardCheck
                      size={26}
                    />
                  </div>

                  <h3 className="text-sm font-bold text-slate-700">
                    No Attendance Available
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                    Attendance has not been
                    entered for the selected
                    semester and month.
                  </p>

                </div>
              ) : (
                <>
                  {/* -----------------------------------------
                      SUBJECT STATUS
                  ----------------------------------------- */}

                  {subjectsWithoutAttendance.length >
                    0 && (
                    <div className="border-b border-amber-100 bg-amber-50 px-5 py-3.5 sm:px-6">

                      <div className="flex items-start gap-3">

                        <AlertTriangle
                          size={17}
                          className="mt-0.5 shrink-0 text-amber-600"
                        />

                        <div>

                          <p className="text-xs font-bold text-amber-800">
                            Attendance not entered for:
                          </p>

                          <p className="mt-1 text-xs leading-5 text-amber-700">
                            {subjectsWithoutAttendance
                              .map(
                                (
                                  subject
                                ) =>
                                  subject.code
                              )
                              .join(
                                ", "
                              )}
                          </p>

                        </div>

                      </div>

                    </div>
                  )}

                  {/* -----------------------------------------
                      TABLE
                  ----------------------------------------- */}

                 <div className="relative">
  {/* HORIZONTAL TABLE CONTROLS */}
  <div className="flex items-center justify-end gap-2 border-b border-slate-100 bg-white px-4 py-2">
    <button
      type="button"
      onClick={() => moveTableHorizontally("left")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
      title="Move table left"
    >
      ←
    </button>

    <button
      type="button"
      onClick={() => moveTableHorizontally("right")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
      title="Move table right"
    >
      →
    </button>
  </div>

  <div
    ref={tableScrollRef}
      className="w-full max-w-full overflow-x-auto overscroll-x-contain scrollbar-hide"
  >
                   <table
  className="table-fixed border-collapse"
  style={{
    width: `${456 + subjects.length * 170}px`,
    minWidth: `${456 + subjects.length * 170}px`,
  }}
>
                      <colgroup>
                        <col style={{ width: "56px" }} />
                        <col style={{ width: "144px" }} />
                        <col style={{ width: "256px" }} />
                        {subjects.map((subject) => (
                          <col key={subject._id} style={{ width: "170px" }} />
                        ))}
                      </colgroup>

                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th
                            className="sticky left-0 z-40 border-r border-slate-200 bg-slate-50 px-3 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400"
                            style={{ width: "56px", minWidth: "56px" }}
                          >
                            #
                          </th>

                          <th
                            className="sticky left-[56px] z-40 border-r border-slate-200 bg-slate-50 px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400"
                            style={{ width: "144px", minWidth: "144px" }}
                          >
                            Register
                            <br />
                            No.
                          </th>

                          <th
                            className="sticky left-[200px] z-40 border-r border-slate-200 bg-slate-50 px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 shadow-[6px_0_10px_-8px_rgba(15,23,42,0.45)]"
                            style={{ width: "256px", minWidth: "256px" }}
                          >
                            Student
                          </th>

                          {subjects.map((subject) => {
                            const subjectAttendance =
                              attendanceData[String(subject._id)];

                            const maxClasses = Number(
                              subjectAttendance?.classesConducted || 0
                            );

                            return (
                              <th
                                key={subject._id}
                                className="border-r border-slate-200 bg-slate-50 px-4 py-3 text-center"
                                style={{ width: "170px", minWidth: "170px" }}
                              >
                                <div className="mx-auto w-full">
                                  <p className="truncate text-xs font-bold text-slate-800">
                                    {subject.code}
                                  </p>

                                  <p className="mt-1 line-clamp-2 min-h-[32px] text-[10px] font-medium leading-4 text-slate-400">
                                    {subject.name}
                                  </p>

                                  <div className="mt-2 inline-flex rounded-md bg-slate-200/70 px-2 py-1 text-[10px] font-bold text-slate-600">
                                    Max: {maxClasses}
                                  </div>

                                  {subjectAttendance &&
                                    (subjectAttendance.isLocked === false ? (
                                      <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-bold text-sky-700">
                                        <LockOpen size={11} />
                                        Unlocked
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUnlockAttendance(subject)
                                        }
                                        className="mx-auto mt-2 flex items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                                      >
                                        <LockOpen size={11} />
                                        Unlock
                                      </button>
                                    ))}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((student, index) => (
                          <tr
                            key={student._id}
                            className="group transition hover:bg-slate-50/70"
                          >
                            <td
                              className="sticky left-0 z-30 border-r border-slate-100 bg-white px-3 py-4 text-center text-sm font-medium text-slate-400 group-hover:bg-slate-50"
                              style={{ width: "56px", minWidth: "56px" }}
                            >
                              {index + 1}
                            </td>

                            <td
                              className="sticky left-[56px] z-30 border-r border-slate-100 bg-white px-4 py-4 group-hover:bg-slate-50"
                              style={{ width: "144px", minWidth: "144px" }}
                            >
                              <span className="font-mono text-xs font-bold text-slate-700">
                                {student.registerNumber}
                              </span>
                            </td>

                            <td
                              className="sticky left-[200px] z-30 border-r border-slate-200 bg-white px-4 py-3 shadow-[6px_0_10px_-8px_rgba(15,23,42,0.45)] group-hover:bg-slate-50"
                              style={{ width: "256px", minWidth: "256px" }}
                            >
                              <div className="flex items-center gap-3">
                              
                                  {student.imageUrl ? (
  <img
    src={student.imageUrl}
    alt={student.name || "Student"}
    className="h-10 w-10 shrink-0 cursor-pointer rounded-full object-cover ring-2 ring-white shadow-sm transition hover:scale-110 hover:ring-2 hover:ring-blue-400"
    onClick={() => {
      setSelectedStudentPhoto({
        imageUrl: student.imageUrl,
        name: student.name || "Student",
        registerNumber: student.registerNumber || "",
      });
    }}
    onError={(e) => {
      e.currentTarget.style.display = "none";
      e.currentTarget.nextElementSibling?.classList.remove("hidden");
    }}
  />
) : null}

                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ${
                                    student.imageUrl ? "hidden" : ""
                                  }`}
                                >
                                  {student.name?.charAt(0)?.toUpperCase()}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {student.name}
                                  </p>

                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    Batch {student.batchNumber}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {subjects.map((subject) => {
                              const record =
                                student.subjects[String(subject._id)];

                              const attended = Number(record?.attended || 0);
                              const conducted = Number(record?.conducted || 0);

                              const percentage =
                                conducted > 0
                                  ? (attended / conducted) * 100
                                  : null;

                              const isLow =
                                percentage !== null && percentage < 75;

                              const notEntered =
                                !record || conducted <= 0;

                              return (
                                <td
                                  key={subject._id}
                                  className={`border-r border-slate-100 px-4 py-4 text-center ${
                                    isLow
                                      ? "bg-red-50"
                                      : percentage !== null
                                      ? "bg-emerald-50/50"
                                      : "bg-slate-50/50"
                                  }`}
                                  style={{ width: "170px", minWidth: "170px" }}
                                >
                                  {notEntered ? (
                                    <span className="inline-flex min-w-[72px] items-center justify-center rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400">
                                      —
                                    </span>
                                  ) : (
                                    <div
                                      className={`mx-auto flex w-fit min-w-[82px] flex-col items-center rounded-lg px-3 py-2 ring-1 ring-inset ${
                                        isLow
                                          ? "bg-red-100 text-red-700 ring-red-200"
                                          : "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                      }`}
                                    >
                                      <span className="text-sm font-bold leading-5">
                                        {attended} / {conducted}
                                      </span>

                                      <span
                                        className={`mt-0.5 text-[11px] font-semibold ${
                                          isLow
                                            ? "text-red-600"
                                            : "text-emerald-600"
                                        }`}
                                      >
                                        {percentage.toFixed(1)}%
                                      </span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div></div>

                  {/* -----------------------------------------
                      FOOTER
                  ----------------------------------------- */}

                  <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                    <div className="flex flex-wrap items-center gap-4">

                      <p className="text-xs text-slate-500">

                        <span className="font-semibold text-slate-700">
                          {
                            filteredStudents.length
                          }
                        </span>{" "}
                        students

                      </p>

                      <p className="text-xs text-red-600">

                        <span className="font-bold">
                          {
                            lowAttendanceCount
                          }
                        </span>{" "}
                        attendance entries below 75%

                      </p>

                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">

                      <Lock
                        size={13}
                      />

                      Attendance is read-only

                    </div>

                  </div>
                </>
              )}

            </section>
          )}

        {/* =================================================
            INITIAL STATE
        ================================================= */}

        {!department ||
          (!semester && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardCheck
                  size={26}
                />
              </div>

              <h2 className="text-sm font-bold text-slate-700">
                Select Department & Semester
              </h2>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                Select the department and semester
                above to view attendance for all
                subjects together.
              </p>

            </div>
          ))}

      </div>
{/* =====================================================
    STUDENT PHOTO PREVIEW
===================================================== */}
{selectedStudentPhoto && (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    onClick={() => setSelectedStudentPhoto(null)}
  >
    <div
      className="relative flex max-h-[95vh] max-w-[95vw] flex-col items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* CLOSE BUTTON */}
      <button
        type="button"
        onClick={() => setSelectedStudentPhoto(null)}
        className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-bold text-slate-700 shadow-lg transition hover:bg-slate-100 hover:text-red-600"
        aria-label="Close photo"
      >
        ×
      </button>

      {/* LARGE PHOTO */}
      <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
        <img
          src={selectedStudentPhoto.imageUrl}
          alt={selectedStudentPhoto.name}
          className="max-h-[75vh] max-w-[90vw] rounded-xl object-contain"
        />
      </div>

      {/* STUDENT DETAILS */}
      <div className="mt-3 rounded-xl bg-white px-5 py-3 text-center shadow-lg">
        <p className="text-sm font-bold text-slate-900">
          {selectedStudentPhoto.name}
        </p>

        {selectedStudentPhoto.registerNumber && (
          <p className="mt-1 text-xs font-medium text-slate-500">
            {selectedStudentPhoto.registerNumber}
          </p>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  );
}