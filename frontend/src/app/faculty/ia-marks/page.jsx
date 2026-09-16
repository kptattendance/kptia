"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const departments = [
  { value: "at", label: "Automobile Engineering" },
  { value: "ch", label: "Chemical Engineering" },
  { value: "ce", label: "Civil Engineering" },
  { value: "cs", label: "Computer Science Engineering" },
  { value: "ec", label: "Electronics & Communication" },
  { value: "ee", label: "Electrical & Electronics" },
  { value: "me", label: "Mechanical Engineering" },
  { value: "ps", label: "Polymer Engineering" },
  { value: "sc", label: "Science & English" },
];

const CO_NAMES = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"];

const emptyCO = () => ({
  CO1: 0,
  CO2: 0,
  CO3: 0,
  CO4: 0,
  CO5: 0,
  CO6: 0,
});

const emptyStudentCO = () => ({
  CO1: "",
  CO2: "",
  CO3: "",
  CO4: "",
  CO5: "",
  CO6: "",
});

export default function FacultyIAMarksPage() {
  const { getToken } = useAuth();

  const currentYear = new Date().getFullYear();

  // --------------------------------------------------
  // SELECTION
  // --------------------------------------------------

  const [academicYear, setAcademicYear] = useState(
    `${currentYear}-${String(currentYear + 1).slice(-2)}`
  );

  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectId, setSubjectId] = useState("");

  // IA selection
  const [iaNumber, setIaNumber] = useState("");

  // Student batch
  const [batchNumber, setBatchNumber] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [students, setStudents] = useState([]);

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // --------------------------------------------------
  // TESTS
  // --------------------------------------------------

  const [tests, setTests] = useState([]);

  // --------------------------------------------------
  // STUDENT MARKS
  //
  // {
  //   studentId: {
  //     0: {
  //       status: "PRESENT",
  //       coMarks: {
  //         CO1: 10,
  //         ...
  //       }
  //     }
  //   }
  // }
  // --------------------------------------------------

  const [studentMarks, setStudentMarks] = useState({});

  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // EXISTING / LOCKED IA
  // --------------------------------------------------

  const [existingIA, setExistingIA] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // --------------------------------------------------
  // MESSAGE
  // --------------------------------------------------

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // ==================================================
  // ACADEMIC YEARS
  // ==================================================

  const academicYears = useMemo(() => {
    const result = [];

    for (
      let i = currentYear - 2;
      i <= currentYear + 1;
      i++
    ) {
      result.push(
        `${i}-${String(i + 1).slice(-2)}`
      );
    }

    return result;
  }, [currentYear]);

  // ==================================================
  // LOAD SUBJECTS
  // ==================================================

  useEffect(() => {
    const loadSubjects = async () => {
      if (!department || !semester) {
        setSubjects([]);
        setSubjectId("");
        return;
      }

      try {
        setLoadingSubjects(true);
        setSubjectId("");
        setTests([]);
        setStudents([]);
        setStudentMarks({});
        setExistingIA(null);

        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/subjects/getsubjects`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              department,
              semester,
            },
          }
        );

        const result = response.data;

        const data = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.subjects)
            ? result.subjects
            : result?.subjects?.data || [];

        setSubjects(data);
      } catch (error) {
        console.error(
          "Failed to load subjects:",
          error
        );

        setSubjects([]);

        setMessage(
          "Unable to load subjects."
        );
        setMessageType("error");
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [department, semester, getToken]);

  // ==================================================
  // LOAD STUDENTS
  // ==================================================

  useEffect(() => {
    const loadStudents = async () => {
      if (!department || !semester || !subjectId) {
        setAllStudents([]);
        setStudents([]);
        setStudentMarks({});
        return;
      }

      try {
        setLoadingStudents(true);
        setMessage("");

        // Reset IA/range when subject changes
        setExistingIA(null);
        setTests([]);
        setStudentMarks({});

        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/students/getstudents`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              department,
              semester,
            },
          }
        );

        const result = response.data;

        const data = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.students)
            ? result.students
            : result?.students?.data || [];

        // Keep the complete class list.
        setAllStudents(data);
        setStudents([]);
      } catch (error) {
        console.error(
          "Failed to load students:",
          error
        );

        setAllStudents([]);
        setStudents([]);

        setMessage(
          "Unable to load students."
        );
        setMessageType("error");
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [
    department,
    semester,
    subjectId,
    getToken,
  ]);

  // ==================================================
  // LOAD SELECTED BATCH
  // ==================================================

  const loadBatch = async () => {
    setMessage("");
    setMessageType("");

    if (!department || !semester || !subjectId) {
      setMessage("Please select department, semester and subject.");
      setMessageType("error");
      return;
    }

    if (!iaNumber) {
      setMessage("Please select IA number.");
      setMessageType("error");
      return;
    }

    if (!batchNumber) {
      setMessage("Please select student batch.");
      setMessageType("error");
      return;
    }

    const selectedStudents = allStudents.filter(
      (student) => Number(student.batchNumber) === Number(batchNumber)
    );

    if (selectedStudents.length === 0) {
      setStudents([]);
      setStudentMarks({});
      setExistingIA(null);
      setTests([]);
      setMessage(`No students found in Batch ${batchNumber}.`);
      setMessageType("error");
      return;
    }

    const initialMarks = {};
    selectedStudents.forEach((student) => {
      initialMarks[student._id] = {};
    });

    setStudents(selectedStudents);
    setStudentMarks(initialMarks);

    await checkExistingIA(
      department,
      semester,
      subjectId,
      academicYear,
      Number(iaNumber),
      Number(batchNumber),
      selectedStudents
    );
  };

  // ==================================================
  // CHECK EXISTING IA
  // ==================================================

  const checkExistingIA = async (
    dept,
    sem,
    subject,
    year,
    selectedIaNumber,
    selectedBatchNumber,
    selectedStudents = []
  ) => {
    try {
      setCheckingExisting(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/ia`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            department: dept,
            semester: Number(sem),
            subjectId: subject,
            academicYear: year,
            iaNumber: Number(selectedIaNumber),
            batchNumber: Number(selectedBatchNumber),
          },
        }
      );

      const responseData = response.data?.data;

      // Backend returns the exact IA + batch record.
      const data = Array.isArray(responseData)
        ? responseData[0]
        : responseData;

      if (data) {
        setExistingIA(data);

        // Load existing tests
        setTests(
          Array.isArray(data.tests)
            ? data.tests
            : []
        );

        // Load existing student marks
        const loadedMarks = {};

        (data.students || []).forEach(
          (studentRecord) => {
            const studentId =
              studentRecord.studentId?._id ||
              studentRecord.studentId;

            loadedMarks[studentId] = {};

            (studentRecord.tests || []).forEach(
              (test, index) => {
                loadedMarks[studentId][index] = {
                  status:
                    test.status || "PRESENT",

                  coMarks: {
                    CO1:
                      test.coMarks?.CO1 ?? 0,
                    CO2:
                      test.coMarks?.CO2 ?? 0,
                    CO3:
                      test.coMarks?.CO3 ?? 0,
                    CO4:
                      test.coMarks?.CO4 ?? 0,
                    CO5:
                      test.coMarks?.CO5 ?? 0,
                    CO6:
                      test.coMarks?.CO6 ?? 0,
                  },
                };
              }
            );
          }
        );

        setStudentMarks(loadedMarks);
      } else {
        // New IA/batch
        setExistingIA(null);
        setTests([]);

        const initialMarks = {};

        selectedStudents.forEach((student) => {
          initialMarks[student._id] = {};
        });

        setStudentMarks(initialMarks);
      }
    } catch (error) {
      console.error(
        "Check existing IA error:",
        error
      );

      setExistingIA(null);
    } finally {
      setCheckingExisting(false);
    }
  };

  // ==================================================
  // ADD TEST
  // ==================================================

  const addTest = () => {
    if (existingIA) return;

    setTests((prev) => [
      ...prev,
      {
        testName: `IA Test ${prev.length + 1}`,
        maxMarks: 25,
        coMarks: emptyCO(),
      },
    ]);
  };

  // ==================================================
  // REMOVE TEST
  // ==================================================

  const removeTest = (testIndex) => {
    if (existingIA) return;

    setTests((prev) =>
      prev.filter(
        (_, index) => index !== testIndex
      )
    );

    setStudentMarks((prev) => {
      const updated = {};

      Object.entries(prev).forEach(
        ([studentId, studentTests]) => {
          const newTests = {};

          Object.entries(
            studentTests
          ).forEach(
            ([index, value]) => {
              const oldIndex = Number(index);

              if (oldIndex < testIndex) {
                newTests[oldIndex] = value;
              }

              if (oldIndex > testIndex) {
                newTests[oldIndex - 1] =
                  value;
              }
            }
          );

          updated[studentId] = newTests;
        }
      );

      return updated;
    });
  };

  // ==================================================
  // UPDATE TEST
  // ==================================================

  const updateTest = (
    index,
    field,
    value
  ) => {
    if (existingIA) return;

    setTests((prev) =>
      prev.map((test, testIndex) =>
        testIndex === index
          ? {
              ...test,
              [field]:
                field === "maxMarks"
                  ? value === ""
                    ? ""
                    : Number(value)
                  : value,
            }
          : test
      )
    );
  };

  // ==================================================
  // UPDATE TEST CO MAXIMUM
  // ==================================================

  const updateTestCO = (
    testIndex,
    co,
    value
  ) => {
    if (existingIA) return;

    setTests((prev) =>
      prev.map((test, index) =>
        index === testIndex
          ? {
              ...test,
              coMarks: {
                ...test.coMarks,
                [co]:
                  value === ""
                    ? ""
                    : Number(value),
              },
            }
          : test
      )
    );
  };

  // ==================================================
  // GET CO TOTAL
  // ==================================================

  const getCOTotal = (
    coMarks = {}
  ) => {
    return CO_NAMES.reduce(
      (total, co) =>
        total +
        Number(coMarks[co] || 0),
      0
    );
  };

  // ==================================================
  // TEST VALIDATION
  // ==================================================

  const isTestValid = (test) => {
    if (
      test.maxMarks === "" ||
      !Number.isFinite(
        Number(test.maxMarks)
      ) ||
      Number(test.maxMarks) <= 0
    ) {
      return false;
    }

    return (
      getCOTotal(test.coMarks) ===
      Number(test.maxMarks)
    );
  };

  // ==================================================
  // TOTAL IA MARKS
  // ==================================================

  const totalIAMarks = useMemo(() => {
    return tests.reduce(
      (total, test) =>
        total +
        Number(test.maxMarks || 0),
      0
    );
  }, [tests]);

  // ==================================================
  // GET STUDENT TEST
  // ==================================================

  const getStudentTest = (
    studentId,
    testIndex
  ) => {
    return (
      studentMarks[studentId]?.[
        testIndex
      ] || {
        status: "PRESENT",
        coMarks: emptyStudentCO(),
      }
    );
  };

  // ==================================================
  // GET STUDENT TEST TOTAL
  // ==================================================

  const getStudentTestTotal = (
    studentId,
    testIndex
  ) => {
    const record =
      getStudentTest(
        studentId,
        testIndex
      );

    if (
      record.status === "ABSENT"
    ) {
      return 0;
    }

    return getCOTotal(
      record.coMarks
    );
  };

  // ==================================================
  // GET STUDENT TOTAL
  // ==================================================

  const getStudentTotal = (
    studentId
  ) => {
    return tests.reduce(
      (total, _, testIndex) =>
        total +
        getStudentTestTotal(
          studentId,
          testIndex
        ),
      0
    );
  };

  // ==================================================
  // UPDATE STUDENT CO MARK
  // ==================================================

  const updateStudentCO = (
    studentId,
    testIndex,
    co,
    value
  ) => {
    if (existingIA) return;

    setStudentMarks((prev) => ({
      ...prev,

      [studentId]: {
        ...prev[studentId],

        [testIndex]: {
          ...(prev[studentId]?.[
            testIndex
          ] || {
            status: "PRESENT",
            coMarks:
              emptyStudentCO(),
          }),

          status: "PRESENT",

          coMarks: {
            ...(
              prev[studentId]?.[
                testIndex
              ]?.coMarks ||
              emptyStudentCO()
            ),

            [co]:
              value === ""
                ? ""
                : Number(value),
          },
        },
      },
    }));
  };

  // ==================================================
  // SET ABSENT
  // ==================================================

  const setStudentAbsent = (
    studentId,
    testIndex
  ) => {
    if (existingIA) return;

    setStudentMarks((prev) => ({
      ...prev,

      [studentId]: {
        ...prev[studentId],

        [testIndex]: {
          status: "ABSENT",

          coMarks: {
            CO1: 0,
            CO2: 0,
            CO3: 0,
            CO4: 0,
            CO5: 0,
            CO6: 0,
          },
        },
      },
    }));
  };

  // ==================================================
  // SET PRESENT
  // ==================================================

  const setStudentPresent = (
    studentId,
    testIndex
  ) => {
    if (existingIA) return;

    setStudentMarks((prev) => ({
      ...prev,

      [studentId]: {
        ...prev[studentId],

        [testIndex]: {
          status: "PRESENT",

          coMarks:
            prev[studentId]?.[
              testIndex
            ]?.coMarks ||
            emptyStudentCO(),
        },
      },
    }));
  };

  // ==================================================
  // VALIDATE STUDENT MARKS
  // ==================================================

  const validateStudentMarks = () => {
    for (const student of students) {
      for (
        let testIndex = 0;
        testIndex < tests.length;
        testIndex++
      ) {
        const test = tests[testIndex];

        const record =
          getStudentTest(
            student._id,
            testIndex
          );

        if (
          record.status === "ABSENT"
        ) {
          continue;
        }

        const coMarks =
          record.coMarks || {};

        for (const co of CO_NAMES) {
          const value = Number(
            coMarks[co] ?? 0
          );

          const maxCO = Number(
            test.coMarks?.[co] || 0
          );

          if (
            !Number.isFinite(value) ||
            value < 0
          ) {
            setMessage(
              `${student.name}: Invalid ${co} marks in ${test.testName}.`
            );
            setMessageType("error");
            return false;
          }

          if (value > maxCO) {
            setMessage(
              `${student.name}: ${co} cannot exceed ${maxCO} in ${test.testName}.`
            );
            setMessageType("error");
            return false;
          }
        }

        const studentTotal =
          getCOTotal(coMarks);

        if (
          studentTotal >
          Number(test.maxMarks)
        ) {
          setMessage(
            `${student.name}: ${test.testName} marks cannot exceed ${test.maxMarks}.`
          );
          setMessageType("error");
          return false;
        }
      }
    }

    return true;
  };

  // ==================================================
  // SAVE
  // ==================================================

  const handleSave = async () => {
    setMessage("");
    setMessageType("");

    if (existingIA) {
      setMessage(
        "This IA has already been saved and frozen."
      );
      setMessageType("error");
      return;
    }

    if (
      !department ||
      !semester ||
      !subjectId ||
      !iaNumber ||
      !batchNumber
    ) {
      setMessage(
        "Please select IA number and student batch."
      );
      setMessageType("error");
      return;
    }

    if (tests.length === 0) {
      setMessage(
        "Please add at least one IA test."
      );
      setMessageType("error");
      return;
    }

    if (students.length === 0) {
      setMessage(
        "No students found."
      );
      setMessageType("error");
      return;
    }

    // ----------------------------------------------
    // VALIDATE TESTS
    // ----------------------------------------------

    for (const test of tests) {
      if (!test.testName?.trim()) {
        setMessage(
          "Every test must have a name."
        );
        setMessageType("error");
        return;
      }

      if (
        !isTestValid(test)
      ) {
        setMessage(
          `${test.testName}: CO1–CO6 total must equal ${test.maxMarks}.`
        );
        setMessageType("error");
        return;
      }
    }

    // ----------------------------------------------
    // VALIDATE STUDENTS
    // ----------------------------------------------

    if (!validateStudentMarks()) {
      return;
    }

    // ----------------------------------------------
    // SAVE
    // ----------------------------------------------

    try {
      setSaving(true);

      const token =
        await getToken();

      const payload = {
        department,

        semester:
          Number(semester),

        subjectId,

        academicYear,

        iaNumber: Number(iaNumber),

        batchNumber: Number(batchNumber),

        // ------------------------------------------
        // TEST CONFIGURATION
        // ------------------------------------------

        tests: tests.map(
          (test) => ({
            testName:
              test.testName.trim(),

            maxMarks:
              Number(test.maxMarks),

            coMarks: {
              CO1: Number(
                test.coMarks?.CO1 || 0
              ),
              CO2: Number(
                test.coMarks?.CO2 || 0
              ),
              CO3: Number(
                test.coMarks?.CO3 || 0
              ),
              CO4: Number(
                test.coMarks?.CO4 || 0
              ),
              CO5: Number(
                test.coMarks?.CO5 || 0
              ),
              CO6: Number(
                test.coMarks?.CO6 || 0
              ),
            },
          })
        ),

        // ------------------------------------------
        // STUDENT MARKS
        // ------------------------------------------

        students: students.map(
          (student) => ({
            studentId:
              student._id,

            tests: tests.map(
              (_, testIndex) => {
                const record =
                  getStudentTest(
                    student._id,
                    testIndex
                  );

                if (
                  record.status ===
                  "ABSENT"
                ) {
                  return {
                    marks: null,

                    status:
                      "ABSENT",

                    coMarks: {
                      CO1: 0,
                      CO2: 0,
                      CO3: 0,
                      CO4: 0,
                      CO5: 0,
                      CO6: 0,
                    },
                  };
                }

                const coMarks =
                  record.coMarks ||
                  {};

                const obtained =
                  getCOTotal(
                    coMarks
                  );

                return {
                  marks: obtained,

                  status:
                    "PRESENT",

                  coMarks: {
                    CO1: Number(
                      coMarks.CO1 || 0
                    ),
                    CO2: Number(
                      coMarks.CO2 || 0
                    ),
                    CO3: Number(
                      coMarks.CO3 || 0
                    ),
                    CO4: Number(
                      coMarks.CO4 || 0
                    ),
                    CO5: Number(
                      coMarks.CO5 || 0
                    ),
                    CO6: Number(
                      coMarks.CO6 || 0
                    ),
                  },
                };
              }
            ),
          })
        ),
      };

      await axios.post(
        `${API_URL}/api/ia/save`,
        payload,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setMessage(
        "IA marks saved and frozen successfully."
      );

      setMessageType(
        "success"
      );

      // Mark page as locked
      await checkExistingIA(
        department,
        semester,
        subjectId,
        academicYear,
        Number(iaNumber),
        Number(batchNumber),
        students
      );
    } catch (error) {
      console.error(
        "Save IA error:",
        error
      );

      setMessage(
        error.response?.data
          ?.message ||
          "Failed to save IA marks."
      );

      setMessageType(
        "error"
      );
    } finally {
      setSaving(false);
    }
  };


 // ==================================================
// IA NUMBERS
// ==================================================

// IA number is independent of the Subject.
// Faculty can conduct as many IAs as required.
const iaNumbers = Array.from(
  { length: 10 },
  (_, index) => index + 1
);

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-[1600px]">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              IA Marks
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Enter internal assessment marks and CO-wise distribution.
            </p>
          </div>

          {existingIA && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
              <span>✓</span>
              IA FROZEN
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* SELECTION */}
        {/* ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {/* Academic Year */}

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Academic Year
              </label>

              <select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  setIaNumber("");
                                    setExistingIA(null);
                  setTests([]);
                  setStudents([]);
                  setStudentMarks({});
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Department
              </label>

              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setSemester("");
                  setSubjectId("");
                  setIaNumber("");
                                    setTests([]);
                  setAllStudents([]);
                  setStudents([]);
                  setStudentMarks({});
                  setExistingIA(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                <option value="">
                  Select department
                </option>

                {departments.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Semester
              </label>

              <select
                value={semester}
                disabled={!department}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setSubjectId("");
                  setIaNumber("");
                                    setTests([]);
                  setAllStudents([]);
                  setStudents([]);
                  setStudentMarks({});
                  setExistingIA(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
              >
                <option value="">
                  Select semester
                </option>

                {[1, 2, 3, 4, 5, 6, 7, 8].map(
                  (sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Subject */}

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Subject
              </label>

              <select
                value={subjectId}
                disabled={
                  !semester ||
                  loadingSubjects
                }
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setIaNumber("");
                                    setTests([]);
                  setStudents([]);
                  setStudentMarks({});
                  setExistingIA(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
              >
                <option value="">
                  {loadingSubjects
                    ? "Loading..."
                    : "Select subject"}
                </option>

                {subjects.map((subject) => (
                  <option
                    key={subject._id}
                    value={subject._id}
                  >
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* IA NUMBER */}

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                IA
              </label>
<select
  value={iaNumber}
  disabled={!subjectId}
  onChange={(e) => {
    setIaNumber(e.target.value);
    setBatchNumber("");
    setExistingIA(null);
    setTests([]);
    setStudents([]);
    setStudentMarks({});
  }}
  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
>
  <option value="">
    Select IA
  </option>

  {iaNumbers.map((number) => (
    <option key={number} value={number}>
      IA {number}
    </option>
  ))}
</select>
            </div>

            {/* STUDENT BATCH */}

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Student Batch
              </label>

              <select
                value={batchNumber}
                disabled={!iaNumber}
                onChange={(e) => {
                  setBatchNumber(e.target.value);
                  setExistingIA(null);
                  setTests([]);
                  setStudents([]);
                  setStudentMarks({});
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
              >
                <option value="">
                  Select Batch
                </option>
                <option value="1">Batch 1</option>
                <option value="2">Batch 2</option>
              </select>
            </div>

            {/* LOAD BATCH */}

            <div className="flex items-end">
              <button
                type="button"
                onClick={loadBatch}
                disabled={
                  !subjectId ||
                  !iaNumber ||
                  !batchNumber ||
                  loadingStudents ||
                  checkingExisting
                }
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {checkingExisting
                  ? "Checking..."
                  : loadingStudents
                    ? "Loading..."
                    : "Load Students"}
              </button>
            </div>

          </div>

          {/* Batch helper */}

          {allStudents.length > 0 && (
            <div className="mt-3 flex flex-col gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-700 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {allStudents.length} students available in the selected semester.
              </span>

              {students.length > 0 && (
                <span className="font-bold">
                  Showing {students.length} students
                </span>
              )}
            </div>
          )}
        </div>

        {/* ================================================= */}
        {/* MESSAGE */}
        {/* ================================================= */}

        {message && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
              messageType ===
              "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* ================================================= */}
        {/* EXISTING IA NOTICE */}
        {/* ================================================= */}

        {existingIA && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-800">
                IA {existingIA.iaNumber} is already frozen
              </p>

              <p className="text-xs text-amber-700">
                Batch:{" "}
                <span className="font-semibold">
                  {existingIA.batchNumber === 1 ? "Batch 1" : "Batch 2"}
                </span>
                {" · "}
                This record cannot be edited by faculty.
              </p>
            </div>

            <div className="text-xs font-semibold text-amber-700">
              Total Maximum:{" "}
              {existingIA.totalMaxMarks}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* TESTS */}
        {/* ================================================= */}

        {subjectId && students.length > 0 && (
          <div className="mt-5">

            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  IA Tests
                </h2>

                <p className="text-xs text-slate-500">
                  Define the maximum CO distribution for each test.
                </p>
              </div>

              {!existingIA && tests.length === 0 && (
                <button
                  type="button"
                  onClick={addTest}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
                >
                  <span className="text-base leading-none">+</span>
                  Add IA Test
                </button>
              )}
            </div>

            {tests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

                <p className="text-sm font-semibold text-slate-700">
                  No IA tests added
                </p>

                {!existingIA && (
                  <p className="mt-1 text-xs text-slate-400">
                    Click "Add Test" to create the first test.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">

                {tests.map(
                  (test, index) => {
                    const coTotal =
                      getCOTotal(
                        test.coMarks
                      );

                    const valid =
                      isTestValid(
                        test
                      );

                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >

                        {/* TEST HEADER */}

                        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                            {index + 1}
                          </div>

                          <div className="flex-1">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Test Name
                            </label>

                            <input
                              value={
                                test.testName
                              }
                              disabled={
                                !!existingIA
                              }
                              onChange={(e) =>
                                updateTest(
                                  index,
                                  "testName",
                                  e.target
                                    .value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400 disabled:bg-slate-50"
                            />
                          </div>

                          <div className="w-full sm:w-32">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Max Marks
                            </label>

                            <input
                              type="number"
                              min="1"
                              value={
                                test.maxMarks
                              }
                              disabled={
                                !!existingIA
                              }
                              onChange={(e) =>
                                updateTest(
                                  index,
                                  "maxMarks",
                                  e.target
                                    .value
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-slate-400 disabled:bg-slate-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>

                          {!existingIA && (
                            <button
                              type="button"
                              onClick={() =>
                                removeTest(
                                  index
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {/* CO MAXIMUM */}

                        <div className="p-4">

                          <div className="mb-2 flex items-center justify-between">

                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                              CO Maximum Distribution
                            </span>

                            <span
                              className={`text-xs font-bold ${
                                valid
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {coTotal} /{" "}
                              {test.maxMarks ||
                                0}

                              {valid &&
                                " ✓"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">

                            {CO_NAMES.map(
                              (co) => (
                                <div
                                  key={co}
                                >
                                  <label className="mb-1 block text-[10px] font-semibold text-slate-400">
                                    {co}
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    value={
                                      test
                                        .coMarks?.[
                                        co
                                      ] ?? 0
                                    }
                                    disabled={
                                      !!existingIA
                                    }
                                    onChange={(e) =>
                                      updateTestCO(
                                        index,
                                        co,
                                        e.target
                                          .value
                                      )
                                    }
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className={`w-full rounded-lg border px-3 py-2 text-center text-sm font-semibold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                                      valid
                                        ? "border-slate-200"
                                        : "border-red-200 bg-red-50"
                                    } disabled:bg-slate-50`}
                                  />
                                </div>
                              )
                            )}
                          </div>

                          {!valid && (
                            <p className="mt-2 text-xs font-medium text-red-500">
                              CO1 + CO2 + CO3 + CO4 + CO5 + CO6 must equal{" "}
                              {test.maxMarks ||
                                0}
                              .
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {!existingIA && tests.length > 0 && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={addTest}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <span className="text-base leading-none">+</span>
                  Add IA Test
                </button>
              </div>
            )}

            {/* TOTAL */}

            {tests.length > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">

                <span className="text-sm text-slate-300">
                  Total IA Maximum
                </span>

                <span className="text-xl font-bold">
                  {totalIAMarks}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* STUDENT TABLE */}
        {/* ================================================= */}

        {subjectId &&
          tests.length > 0 && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Student Marks
                  </h2>
                  <p className="text-xs text-slate-500">
                    Enter CO-wise marks directly in the table. Use AB for an absent student.
                  </p>
                </div>

                <div className="text-xs font-medium text-slate-400">
                  {students.length} Students · {tests.length} Tests
                </div>
              </div>

              <div className="overflow-x-auto">
                {checkingExisting || loadingStudents ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    Loading...
                  </div>
                ) : students.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    No students found.
                  </div>
                ) : (
                  <table className="w-full min-w-[1250px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="sticky left-0 z-20 w-12 border-r border-slate-200 bg-slate-50 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          #
                        </th>
                        <th className="sticky left-12 z-20 w-32 border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Register No.
                        </th>
                        <th className="sticky left-44 z-20 w-56 border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Student
                        </th>

                        {tests.map((test, testIndex) => (
                          <th
                            key={testIndex}
                            className="min-w-[430px] border-r border-slate-200 px-3 py-3 text-center align-top"
                          >
                            <div className="text-xs font-bold text-slate-800">
                              {test.testName}
                            </div>
                            <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                              Maximum: {test.maxMarks}
                            </div>
                            <div className="mt-2 grid grid-cols-7 gap-1">
                              {CO_NAMES.map((co) => (
                                <div
                                  key={co}
                                  className="text-[9px] font-bold text-slate-400"
                                >
                                  {co}
                                </div>
                              ))}
                              <div className="text-[9px] font-bold text-slate-500">
                                Total
                              </div>
                            </div>
                            <div className="mt-0.5 grid grid-cols-7 gap-1">
                              {CO_NAMES.map((co) => (
                                <div
                                  key={co}
                                  className="text-[8px] font-medium text-slate-300"
                                >
                                  /{Number(test.coMarks?.[co] || 0)}
                                </div>
                              ))}
                              <div className="text-[8px] font-medium text-slate-400">
                                /{test.maxMarks}
                              </div>
                            </div>
                          </th>
                        ))}

                        <th className="sticky right-0 z-20 min-w-[80px] border-l border-slate-200 bg-slate-50 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          Final Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {students.map((student, studentIndex) => (
                        <tr key={student._id} className="hover:bg-slate-50/70">
                          <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-3 py-3 text-center text-sm text-slate-400">
                            {studentIndex + 1}
                          </td>

                          <td className="sticky left-12 z-10 border-r border-slate-100 bg-white px-3 py-3 text-sm font-semibold text-slate-700">
                            {student.registerNumber}
                          </td>

                          <td className="sticky left-44 z-10 border-r border-slate-100 bg-white px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {student.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {student.name}
                                </p>
                                <p className="max-w-[180px] truncate text-[10px] text-slate-400">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {tests.map((test, testIndex) => {
                            const record = getStudentTest(student._id, testIndex);
                            const total = getStudentTestTotal(student._id, testIndex);
                            const absent = record.status === "ABSENT";

                            return (
                              <td
                                key={testIndex}
                                className="border-r border-slate-100 px-3 py-3 align-middle"
                              >
                                {absent ? (
                                  <div className="flex min-h-[76px] items-center justify-center gap-2">
                                    <span className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
                                      AB
                                    </span>
                                    {!existingIA && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setStudentPresent(student._id, testIndex)
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                                      >
                                        PRESENT
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="min-w-[400px]">
                                    <div className="grid grid-cols-7 items-center gap-1">
                                      {CO_NAMES.map((co) => {
                                        const value = record.coMarks?.[co] ?? "";
                                        const maxCO = Number(test.coMarks?.[co] || 0);

                                        return (
                                          <input
                                            key={co}
                                            type="number"
                                            min="0"
                                            max={maxCO}
                                            step="0.01"
                                            value={value}
                                            disabled={!!existingIA}
                                            onChange={(e) =>
                                              updateStudentCO(
                                                student._id,
                                                testIndex,
                                                co,
                                                e.target.value
                                              )
                                            }
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className="h-9 w-full rounded-md border border-slate-200 bg-white px-1 text-center text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            placeholder="0"
                                            aria-label={`${student.name} ${test.testName} ${co}`}
                                          />
                                        );
                                      })}

                                      <div className="flex h-9 items-center justify-center rounded-md bg-slate-900 px-1 text-xs font-bold text-white">
                                        {total}
                                      </div>
                                    </div>

                                    {!existingIA && (
                                      <div className="mt-2 flex items-center justify-between gap-2">
                                        <span className="text-[9px] text-slate-400">
                                          Enter marks up to the CO maximum.
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setStudentAbsent(student._id, testIndex)
                                          }
                                          className="shrink-0 rounded-md border border-amber-200 px-2 py-1 text-[9px] font-bold text-amber-700 hover:bg-amber-50"
                                        >
                                          Mark AB
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          <td className="sticky right-0 z-10 border-l border-slate-100 bg-white px-3 py-3 text-center">
                            <span className="inline-flex min-w-[65px] justify-center rounded-lg bg-slate-900 px-2 py-2 text-sm font-bold text-white">
                              {getStudentTotal(student._id)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ================================================= */}
              {/* SAVE */}
              {/* ================================================= */}

              {students.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Final IA: {totalIAMarks} marks
                    </p>
                    <p className="text-xs text-slate-400">
                      Once saved, the IA record will be permanently frozen.
                    </p>
                  </div>

                  {!existingIA && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={
                        saving ||
                        tests.length === 0 ||
                        tests.some((test) => !isTestValid(test))
                      }
                      className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saving ? "Saving..." : "Save & Freeze IA"}
                    </button>
                  )}

                  {existingIA && (
                    <div className="rounded-xl bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700">
                      ✓ IA Frozen
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </div>

  );
}