"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  Lock,
  Users,
  BookOpen,
  Building2,
  GraduationCap,
  RotateCw,
  Save,
  ShieldCheck,
  AlertCircle,
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
// SEMESTERS
// =====================================================

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

// =====================================================
// FACULTY ATTENDANCE PAGE
// =====================================================

export default function FacultyAttendancePage() {
  const { getToken } = useAuth();

  const currentDate = new Date();

  // ---------------------------------------------------
  // Selection
  // ---------------------------------------------------

  const [month, setMonth] = useState(
    currentDate.getMonth() + 1
  );

  const [year, setYear] = useState(
    currentDate.getFullYear()
  );

  const [department, setDepartment] =
    useState("");

  const [semester, setSemester] =
    useState("");

  const [subjectId, setSubjectId] =
    useState("");

  const [batchSelection, setBatchSelection] =
    useState("");

  // ---------------------------------------------------
  // Data
  // ---------------------------------------------------

  const [subjects, setSubjects] =
    useState([]);

  const [students, setStudents] =
    useState([]);

  const [attendance, setAttendance] =
    useState({});

  const [classesConducted, setClassesConducted] =
    useState("");

  // ---------------------------------------------------
  // Status
  // ---------------------------------------------------

  const [loadingSubjects, setLoadingSubjects] =
    useState(false);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [checkingAttendance, setCheckingAttendance] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [attendanceLocked, setAttendanceLocked] =
    useState(false);

  // =====================================================
  // YEARS
  // =====================================================

  const years = useMemo(() => {
    const list = [];

    for (
      let i =
        currentDate.getFullYear() - 2;
      i <=
        currentDate.getFullYear() + 1;
      i++
    ) {
      list.push(i);
    }

    return list;
  }, []);

  // =====================================================
  // SELECTED SUBJECT
  // =====================================================

  const selectedSubject = useMemo(() => {
    return subjects.find(
      (subject) =>
        String(subject._id) ===
        String(subjectId)
    );
  }, [subjects, subjectId]);

  // =====================================================
  // SELECTED DEPARTMENT LABEL
  // =====================================================

  const selectedDepartmentLabel =
    useMemo(() => {
      return (
        departments.find(
          (item) =>
            item.value === department
        )?.label || ""
      );
    }, [department]);

  // =====================================================
  // BATCH LABEL
  // =====================================================

  const batchLabel = useMemo(() => {
    if (batchSelection === "1") {
      return "Batch 1";
    }

    if (batchSelection === "2") {
      return "Batch 2";
    }

    if (batchSelection === "both") {
      return "Batch 1 & Batch 2";
    }

    return "";
  }, [batchSelection]);

  // =====================================================
  // RESET ATTENDANCE AREA
  // =====================================================

  const resetAttendanceArea = () => {
    setStudents([]);
    setAttendance({});
    setClassesConducted("");
    setAttendanceLocked(false);
  };

  // =====================================================
  // LOAD SUBJECTS
  // =====================================================

  useEffect(() => {
    const loadSubjects = async () => {
      if (!department || !semester) {
        setSubjects([]);
        setSubjectId("");
        resetAttendanceArea();
        return;
      }

      try {
        setLoadingSubjects(true);

        setSubjectId("");

        setBatchSelection("");

        resetAttendanceArea();

        const token =
          await getToken();

        const response =
          await axios.get(
            `${API_URL}/api/subjects/getsubjects`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              params: {
                department,
                semester: Number(
                  semester
                ),
              },
            }
          );

        const result =
          response.data;

        const data =
          Array.isArray(
            result?.data
          )
            ? result.data
            : Array.isArray(
                result?.subjects
              )
            ? result.subjects
            : result?.subjects?.data ||
              [];

        setSubjects(data);
      } catch (error) {
        console.error(
          "Failed to load subjects:",
          error
        );

        setSubjects([]);

        await Swal.fire({
          icon: "error",
          title: "Unable to Load Subjects",
          text:
            error.response?.data
              ?.message ||
            "Unable to load subjects.",
          confirmButtonColor:
            "#0f172a",
        });
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [
    department,
    semester,
    getToken,
  ]);

  // =====================================================
  // LOAD STUDENTS + CHECK EXISTING ATTENDANCE
  // =====================================================

  useEffect(() => {
    const loadStudentsAndAttendance =
      async () => {
        if (
          !department ||
          !semester ||
          !subjectId ||
          !batchSelection
        ) {
          resetAttendanceArea();
          return;
        }

        try {
          setLoadingStudents(true);

          setCheckingAttendance(true);

          setAttendanceLocked(false);

          const token =
            await getToken();

          // ---------------------------------------------
          // LOAD STUDENTS
          // ---------------------------------------------

          const studentResponse =
            await axios.get(
              `${API_URL}/api/students/getstudents`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                params: {
                  department,
                  semester: Number(
                    semester
                  ),
                },
              }
            );

          const studentResult =
            studentResponse.data;

          const allStudents =
            Array.isArray(
              studentResult?.data
            )
              ? studentResult.data
              : Array.isArray(
                  studentResult?.students
                )
              ? studentResult.students
              : studentResult?.students
                    ?.data || [];

          // ---------------------------------------------
          // FILTER BATCH
          // ---------------------------------------------

          const filteredStudents =
            allStudents.filter(
              (student) => {
                const studentBatch =
                  Number(
                    student.batchNumber
                  );

                if (
                  batchSelection ===
                  "both"
                ) {
                  return (
                    studentBatch ===
                      1 ||
                    studentBatch ===
                      2
                  );
                }

                return (
                  studentBatch ===
                  Number(
                    batchSelection
                  )
                );
              }
            );

          setStudents(
            filteredStudents
          );

          // ---------------------------------------------
          // CHECK EXISTING ATTENDANCE
          // ---------------------------------------------

          const attendanceResponse =
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
                    Number(semester),

                  subjectId,

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

          const attendanceResult =
            attendanceResponse.data;

          const existingAttendance =
            attendanceResult?.data;

          // ---------------------------------------------
          // ATTENDANCE EXISTS
          // ---------------------------------------------

          if (existingAttendance) {
            setAttendanceLocked(
              true
            );

            setClassesConducted(
              existingAttendance.classesConducted ??
                ""
            );

            const savedAttendance =
              {};

            filteredStudents.forEach(
              (student) => {
                const savedStudent =
                  existingAttendance.students?.find(
                    (item) =>
                      String(
                        item.studentId?._id ||
                          item.studentId
                      ) ===
                      String(
                        student._id
                      )
                  );

                savedAttendance[
                  student._id
                ] =
                  savedStudent?.classesAttended ??
                  "";
              }
            );

            setAttendance(
              savedAttendance
            );

            const monthName =
              months.find(
                (item) =>
                  item.value ===
                  Number(month)
              )?.label ||
              month;

            await Swal.fire({
              icon: "info",

              title:
                "Attendance Already Entered",

              html: `
                <div style="
                  font-size:14px;
                  line-height:1.8;
                  color:#64748b;
                ">
                  Attendance for
                  <strong style="color:#0f172a">
                    ${monthName} ${year}
                  </strong>
                  has already been entered for
                  <strong style="color:#0f172a">
                    ${batchLabel}
                  </strong>.
                  <br><br>
                  <strong style="color:#dc2626">
                    This attendance is locked and cannot be modified.
                  </strong>
                </div>
              `,

              confirmButtonText:
                "View Attendance",

              confirmButtonColor:
                "#0f172a",
            });
          }

          // ---------------------------------------------
          // NO ATTENDANCE
          // ---------------------------------------------

          else {
            setAttendanceLocked(
              false
            );

            setClassesConducted(
              ""
            );

            const initialAttendance =
              {};

            filteredStudents.forEach(
              (student) => {
                initialAttendance[
                  student._id
                ] = "";
              }
            );

            setAttendance(
              initialAttendance
            );
          }
        } catch (error) {
          console.error(
            "Failed to load students/attendance:",
            error
          );

          setStudents([]);

          setAttendance({});

          setClassesConducted(
            ""
          );

          setAttendanceLocked(
            false
          );

          await Swal.fire({
            icon: "error",

            title:
              "Unable to Load Attendance",

            text:
              error.response?.data
                ?.message ||
              "Unable to load students or attendance.",

            confirmButtonColor:
              "#0f172a",
          });
        } finally {
          setLoadingStudents(
            false
          );

          setCheckingAttendance(
            false
          );
        }
      };

    loadStudentsAndAttendance();
  }, [
    department,
    semester,
    subjectId,
    batchSelection,
    month,
    year,
    getToken,
  ]);

  // =====================================================
  // ATTENDANCE PERCENTAGE
  // =====================================================

  const getPercentage = (
    studentId
  ) => {
    const conducted =
      Number(classesConducted);

    const value =
      attendance[studentId];

    if (
      !conducted ||
      value === "" ||
      value === undefined ||
      value === null
    ) {
      return null;
    }

    const attended =
      Number(value);

    if (
      !Number.isFinite(
        attended
      )
    ) {
      return null;
    }

    return (
      (attended / conducted) *
      100
    ).toFixed(1);
  };

  // =====================================================
  // ATTENDANCE SUMMARY
  // =====================================================

  const enteredCount = useMemo(() => {
    return students.filter(
      (student) =>
        attendance[
          student._id
        ] !== "" &&
        attendance[
          student._id
        ] !== undefined
    ).length;
  }, [
    students,
    attendance,
  ]);

  // =====================================================
  // HANDLE ATTENDANCE CHANGE
  // =====================================================

  const handleAttendanceChange = (
    studentId,
    value
  ) => {
    if (attendanceLocked) {
      return;
    }

    if (value === "") {
      setAttendance((prev) => ({
        ...prev,
        [studentId]: "",
      }));

      return;
    }

    const numericValue =
      Number(value);

    if (
      Number.isNaN(
        numericValue
      )
    ) {
      return;
    }

    if (
      numericValue < 0
    ) {
      return;
    }

    if (
      classesConducted !== "" &&
      numericValue >
        Number(
          classesConducted
        )
    ) {
      return;
    }

    setAttendance((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  // =====================================================
  // HANDLE BATCH CHANGE
  // =====================================================

  const handleBatchChange = (
    value
  ) => {
    setBatchSelection(value);

    setStudents([]);

    setAttendance({});

    setClassesConducted("");

    setAttendanceLocked(false);
  };

  // =====================================================
  // HANDLE SAVE
  // =====================================================

  const handleSave = async () => {
    // ---------------------------------------------
    // LOCK CHECK
    // ---------------------------------------------

    if (attendanceLocked) {
      await Swal.fire({
        icon: "warning",

        title:
          "Attendance Locked",

        text:
          "Attendance for this month, subject and selected batch has already been entered and cannot be modified.",

        confirmButtonColor:
          "#0f172a",
      });

      return;
    }

    // ---------------------------------------------
    // SELECTION VALIDATION
    // ---------------------------------------------

    if (
      !department ||
      !semester ||
      !subjectId ||
      !batchSelection
    ) {
      await Swal.fire({
        icon: "warning",

        title:
          "Incomplete Selection",

        text:
          "Please select department, semester, subject and student batch.",

        confirmButtonColor:
          "#0f172a",
      });

      return;
    }

    // ---------------------------------------------
    // STUDENT VALIDATION
    // ---------------------------------------------

    if (
      students.length === 0
    ) {
      await Swal.fire({
        icon: "warning",

        title:
          "No Students",

        text:
          "No students are available for the selected batch.",

        confirmButtonColor:
          "#0f172a",
      });

      return;
    }

    // ---------------------------------------------
    // CLASSES CONDUCTED
    // ---------------------------------------------

    if (
      classesConducted === "" ||
      !Number.isInteger(
        Number(classesConducted)
      ) ||
      Number(classesConducted) <
        0
    ) {
      await Swal.fire({
        icon: "warning",

        title:
          "Invalid Classes Conducted",

        text:
          "Please enter a valid number of classes conducted.",

        confirmButtonColor:
          "#0f172a",
      });

      return;
    }

    // ---------------------------------------------
    // STUDENT ATTENDANCE VALIDATION
    // ---------------------------------------------

    for (const student of students) {
      const value =
        attendance[
          student._id
        ];

      if (
        value === "" ||
        value === undefined ||
        value === null
      ) {
        await Swal.fire({
          icon: "warning",

          title:
            "Attendance Missing",

          text:
            `Please enter attendance for ${student.name}.`,

          confirmButtonColor:
            "#0f172a",
        });

        return;
      }

      const attended =
        Number(value);

      if (
        !Number.isFinite(
          attended
        )
      ) {
        await Swal.fire({
          icon: "warning",

          title:
            "Invalid Attendance",

          text:
            `Invalid attendance value for ${student.name}.`,

          confirmButtonColor:
            "#0f172a",
        });

        return;
      }

      if (
        attended < 0
      ) {
        await Swal.fire({
          icon: "warning",

          title:
            "Invalid Attendance",

          text:
            `Attendance for ${student.name} cannot be negative.`,

          confirmButtonColor:
            "#0f172a",
        });

        return;
      }

      if (
        attended >
        Number(
          classesConducted
        )
      ) {
        await Swal.fire({
          icon: "warning",

          title:
            "Invalid Attendance",

          text:
            `Attendance for ${student.name} cannot exceed classes conducted.`,

          confirmButtonColor:
            "#0f172a",
        });

        return;
      }
    }

    // ---------------------------------------------
    // CONFIRMATION
    // ---------------------------------------------

    const monthName =
      months.find(
        (item) =>
          item.value ===
          Number(month)
      )?.label || month;

    const confirmation =
      await Swal.fire({
        icon: "question",

        title:
          "Save Attendance?",

        html: `
          <div style="
            font-size:14px;
            line-height:1.9;
            color:#64748b;
          ">

            <div style="
              padding:12px;
              margin-bottom:10px;
              border-radius:10px;
              background:#f8fafc;
            ">
              <strong style="color:#0f172a">
                ${selectedSubject?.code || ""}
              </strong>
              <br>
              ${selectedSubject?.name || ""}
            </div>

            <strong style="color:#0f172a">
              ${monthName} ${year}
            </strong>

            <br>

            Semester ${semester}
            ·
            ${batchLabel}

            <br>

            ${students.length} students

            <br><br>

            <strong style="color:#dc2626">
              Once saved, this attendance will be permanently locked and cannot be edited.
            </strong>

          </div>
        `,

        showCancelButton: true,

        confirmButtonText:
          "Save & Lock",

        cancelButtonText:
          "Cancel",

        confirmButtonColor:
          "#0f172a",

        cancelButtonColor:
          "#94a3b8",

        reverseButtons: true,
      });

    if (
      !confirmation.isConfirmed
    ) {
      return;
    }

    // ---------------------------------------------
    // SAVE
    // ---------------------------------------------

    try {
      setSaving(true);

      const token =
        await getToken();

      const payload = {
        department,

        semester:
          Number(semester),

        subjectId,

        month:
          Number(month),

        year:
          Number(year),

        batchNumbers:
          batchSelection ===
          "both"
            ? [1, 2]
            : [
                Number(
                  batchSelection
                ),
              ],

        classesConducted:
          Number(
            classesConducted
          ),

        students:
          students.map(
            (student) => ({
              studentId:
                student._id,

              classesAttended:
                Number(
                  attendance[
                    student._id
                  ]
                ),
            })
          ),
      };

      await axios.post(
        `${API_URL}/api/attendance/save`,
        payload,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      // ---------------------------------------------
      // LOCK UI
      // ---------------------------------------------

      setAttendanceLocked(
        true
      );

      await Swal.fire({
        icon: "success",

        title:
          "Attendance Saved",

        html: `
          <div style="
            font-size:14px;
            line-height:1.7;
            color:#64748b;
          ">
            Attendance has been saved successfully
            for <strong style="color:#0f172a">
              ${batchLabel}
            </strong>.
            <br>
            The record is now permanently locked.
          </div>
        `,

        confirmButtonColor:
          "#0f172a",
      });
    } catch (error) {
      console.error(
        "Save attendance error:",
        error
      );

      // ---------------------------------------------
      // DUPLICATE / LOCKED
      // ---------------------------------------------

      if (
        error.response?.status ===
        409
      ) {
        setAttendanceLocked(
          true
        );

        await Swal.fire({
          icon: "warning",

          title:
            "Attendance Already Entered",

          text:
            error.response?.data
              ?.message ||
            "Attendance for the selected batch has already been entered and is locked.",

          confirmButtonText:
            "OK",

          confirmButtonColor:
            "#0f172a",
        });

        return;
      }

      await Swal.fire({
        icon: "error",

        title:
          "Unable to Save Attendance",

        text:
          error.response?.data
            ?.message ||
          "Failed to save attendance.",

        confirmButtonColor:
          "#0f172a",
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = () => {
    if (
      !department ||
      !semester ||
      !subjectId ||
      !batchSelection
    ) {
      return;
    }

    // Trigger reload by temporarily clearing and restoring
    setBatchSelection("");
    
    setTimeout(() => {
      setBatchSelection(
        batchSelection
      );
    }, 50);
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-5 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-[1500px]">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <ClipboardCheck
                size={24}
                strokeWidth={2}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Faculty Portal
              </p>

              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Monthly Attendance
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Record and lock monthly student attendance.
              </p>
            </div>

          </div>

          {subjectId &&
            batchSelection && (
              <button
                type="button"
                onClick={
                  handleRefresh
                }
                disabled={
                  loadingStudents ||
                  checkingAttendance
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCw
                  size={16}
                  className={
                    loadingStudents
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>
            )}

        </div>

        {/* =================================================
            SELECTION CARD
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Section title */}

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
                  Select the class and student batch.
                </p>
              </div>

            </div>

          </div>

          {/* Selection fields */}

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 sm:p-6">

            {/* Month */}

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <CalendarDays
                  size={13}
                />
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
                        {item.label}
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
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <CalendarDays
                  size={13}
                />
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

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Building2
                  size={13}
                />
                Department
              </label>

              <div className="relative">

                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(
                      e.target
                        .value
                    );

                    setSemester(
                      ""
                    );

                    setSubjectId(
                      ""
                    );

                    setBatchSelection(
                      ""
                    );

                    setSubjects(
                      []
                    );

                    resetAttendanceArea();
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="">
                    Select department
                  </option>

                  {departments.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
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
                  value={semester}
                  disabled={
                    !department
                  }
                  onChange={(e) => {
                    setSemester(
                      e.target
                        .value
                    );

                    setSubjectId(
                      ""
                    );

                    setBatchSelection(
                      ""
                    );

                    resetAttendanceArea();
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

            {/* Subject */}

            <div className="sm:col-span-2 lg:col-span-1">

              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <BookOpen
                  size={13}
                />
                Subject
              </label>

              <div className="relative">

                <select
                  value={subjectId}
                  disabled={
                    !semester ||
                    loadingSubjects
                  }
                  onChange={(e) => {
                    setSubjectId(
                      e.target
                        .value
                    );

                    setBatchSelection(
                      ""
                    );

                    resetAttendanceArea();
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {loadingSubjects
                      ? "Loading subjects..."
                      : "Select subject"}
                  </option>

                  {subjects.map(
                    (subject) => (
                      <option
                        key={
                          subject._id
                        }
                        value={
                          subject._id
                        }
                      >
                        {subject.code}{" "}
                        -{" "}
                        {
                          subject.name
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
                  disabled={
                    !subjectId
                  }
                  onChange={(e) =>
                    handleBatchChange(
                      e.target
                        .value
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    Select batch
                  </option>

                  <option value="1">
                    Batch 1
                  </option>

                  <option value="2">
                    Batch 2
                  </option>

                  <option value="both">
                    Batch 1 & Batch 2
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
            ATTENDANCE CONTENT
        ================================================= */}

        {subjectId &&
          batchSelection && (
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* -----------------------------------------
                  Attendance Header
              ----------------------------------------- */}

              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <h2 className="text-lg font-bold text-slate-950">
                        Enter Attendance
                      </h2>

                      {attendanceLocked && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                          <Lock
                            size={12}
                          />
                          LOCKED
                        </span>
                      )}

                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedSubject?.code}
                      {" — "}
                      {selectedSubject?.name}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                        {selectedDepartmentLabel}
                      </span>

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                        Semester{" "}
                        {semester}
                      </span>

                      <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
                        {batchLabel}
                      </span>

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                        {
                          months.find(
                            (m) =>
                              m.value ===
                              Number(
                                month
                              )
                          )?.label
                        }{" "}
                        {year}
                      </span>

                    </div>

                  </div>

                  {/* Classes Conducted */}

                  <div className="w-full lg:w-72">

                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Classes Conducted
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={
                        classesConducted
                      }
                      disabled={
                        attendanceLocked ||
                        checkingAttendance
                      }
                      onChange={(e) =>
                        setClassesConducted(
                          e.target
                            .value
                        )
                      }
                      placeholder="Enter number of classes"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    />

                    {attendanceLocked && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <Lock
                          size={12}
                        />
                        Classes conducted cannot be changed.
                      </p>
                    )}

                  </div>

                </div>

              </div>

              {/* -----------------------------------------
                  Loading
              ----------------------------------------- */}

              {loadingStudents ? (
                <div className="px-6 py-20 text-center">

                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">

                    <RotateCw
                      size={22}
                      className="animate-spin text-slate-500"
                    />

                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    Loading students...
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Preparing the selected batch.
                  </p>

                </div>
              ) : students.length ===
                0 ? (
                /* -----------------------------------------
                   No students
                ----------------------------------------- */

                <div className="px-6 py-20 text-center">

                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Users
                      size={25}
                    />
                  </div>

                  <h3 className="text-sm font-bold text-slate-700">
                    No Students Found
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
                    No students are available
                    for {batchLabel} in the
                    selected department and
                    semester.
                  </p>

                </div>
              ) : (
                <>
                  {/* -----------------------------------------
                      Summary bar
                  ----------------------------------------- */}

                  <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                    <div className="flex flex-wrap items-center gap-2">

                      <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">

                        <Users
                          size={14}
                          className="text-slate-400"
                        />

                        {students.length}{" "}
                        Students

                      </div>

                      <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">

                        <Check
                          size={14}
                          className="text-emerald-500"
                        />

                        {enteredCount}/
                        {
                          students.length
                        }{" "}
                        Entered

                      </div>

                    </div>

                    {attendanceLocked && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">

                        <ShieldCheck
                          size={15}
                        />

                        Attendance permanently locked

                      </div>
                    )}

                  </div>

                  {/* -----------------------------------------
                      Student Table
                  ----------------------------------------- */}

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[850px]">

                      <thead>

                        <tr className="border-b border-slate-200 bg-slate-50">

                          <th className="w-16 px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            #
                          </th>

                          <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Register No.
                          </th>

                          <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Student
                          </th>

                          <th className="w-48 px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Classes Attended
                          </th>

                          <th className="w-44 px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Attendance %
                          </th>

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-slate-100">

                        {students.map(
                          (
                            student,
                            index
                          ) => {
                            const percentage =
                              getPercentage(
                                student._id
                              );

                            return (
                              <tr
                                key={
                                  student._id
                                }
                                className="transition hover:bg-slate-50/70"
                              >

                                {/* Number */}

                                <td className="px-5 py-4 text-sm font-medium text-slate-400">
                                  {index +
                                    1}
                                </td>

                                {/* Register Number */}

                                <td className="px-4 py-4">

                                  <span className="font-mono text-sm font-semibold text-slate-700">
                                    {
                                      student.registerNumber
                                    }
                                  </span>

                                </td>

                                {/* Student */}

                                <td className="px-4 py-4">

                              <div className="flex items-center gap-3">
  {student.imageUrl ? (
    <img
      src={student.imageUrl}
      alt={student.name || "Student"}
      className="h-9 w-9 shrink-0 rounded-full object-cover border border-slate-200"
      onError={(e) => {
        e.currentTarget.style.display = "none";
        e.currentTarget.nextElementSibling.style.display = "flex";
      }}
    />
  ) : null}

  <div
    className={`h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 ${
      student.imageUrl ? "hidden" : "flex"
    }`}
  >
    {student.name?.charAt(0)?.toUpperCase() || "S"}
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

                                {/* Attendance Input */}

                                <td className="px-4 py-4 text-center">

                                  <input
                                    type="number"
                                    min="0"
                                    max={
                                      classesConducted ||
                                      undefined
                                    }
                                    value={
                                      attendance[
                                        student
                                          ._id
                                      ] ??
                                      ""
                                    }
                                    disabled={
                                      attendanceLocked ||
                                      checkingAttendance
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      handleAttendanceChange(
                                        student._id,
                                        e
                                          .target
                                          .value
                                      )
                                    }
                                    placeholder="0"
                                    className="mx-auto block w-32 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                  />

                                </td>

                                {/* Percentage */}

                                <td className="px-4 py-4 text-center">

                                  {percentage !==
                                  null ? (
                                    <span
                                      className={`inline-flex min-w-[76px] items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold ${
                                        Number(
                                          percentage
                                        ) >=
                                        75
                                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100"
                                          : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-100"
                                      }`}
                                    >
                                      {
                                        percentage
                                      }
                                      %
                                    </span>
                                  ) : (
                                    <span className="text-sm text-slate-300">
                                      —
                                    </span>
                                  )}

                                </td>

                              </tr>
                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                  {/* -----------------------------------------
                      Footer
                  ----------------------------------------- */}

                  <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                    <div className="flex items-start gap-3">

                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        {attendanceLocked ? (
                          <Lock
                            size={15}
                          />
                        ) : (
                          <AlertCircle
                            size={15}
                          />
                        )}
                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-700">
                          {attendanceLocked
                            ? "Attendance is locked"
                            : "Please verify all entries before saving"}
                        </p>

                        <p className="mt-0.5 max-w-xl text-xs leading-5 text-slate-400">
                          {attendanceLocked
                            ? "This attendance record cannot be edited once saved."
                            : "After saving, this month's attendance for the selected subject and batch will be permanently locked."}
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={
                        handleSave
                      }
                      disabled={
                        saving ||
                        loadingStudents ||
                        checkingAttendance ||
                        attendanceLocked
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >

                      {saving ? (
                        <>
                          <RotateCw
                            size={17}
                            className="animate-spin"
                          />
                          Saving...
                        </>
                      ) : attendanceLocked ? (
                        <>
                          <Lock
                            size={16}
                          />
                          Attendance Locked
                        </>
                      ) : (
                        <>
                          <Save
                            size={17}
                          />
                          Save & Lock Attendance
                        </>
                      )}

                    </button>

                  </div>
                </>
              )}

            </section>
          )}

        {/* =================================================
            INITIAL EMPTY STATE
        ================================================= */}

        {!subjectId && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ClipboardCheck
                size={26}
              />
            </div>

            <h2 className="text-sm font-bold text-slate-700">
              Select a class to begin
            </h2>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
              Select the academic details and
              subject above. Then choose Batch 1,
              Batch 2, or both batches to enter
              attendance.
            </p>

          </div>
        )}

        {/* =================================================
            SUBJECT SELECTED BUT BATCH NOT SELECTED
        ================================================= */}

        {subjectId &&
          !batchSelection && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 px-6 py-10 text-center">

              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                <Users
                  size={23}
                />
              </div>

              <h2 className="text-sm font-bold text-slate-800">
                Select Student Batch
              </h2>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                Choose Batch 1, Batch 2, or
                Batch 1 & Batch 2 from the
                Student Batch field above.
              </p>

            </div>
          )}

      </div>
    </div>
  );
}