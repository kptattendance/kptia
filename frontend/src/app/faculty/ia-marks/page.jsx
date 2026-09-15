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

export default function FacultyIAMarksPage() {
  const { getToken } = useAuth();

  const currentYear = new Date().getFullYear();

  const [academicYear, setAcademicYear] = useState(
    `${currentYear}-${String(currentYear + 1).slice(-2)}`
  );

  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [tests, setTests] = useState([]);

  const [marks, setMarks] = useState({});

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const academicYears = useMemo(() => {
    const result = [];

    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      result.push(
        `${i}-${String(i + 1).slice(-2)}`
      );
    }

    return result;
  }, [currentYear]);

  // --------------------------------------------------
  // Load subjects
  // --------------------------------------------------

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
        console.error("Failed to load subjects:", error);

        setSubjects([]);

        setMessage("Unable to load subjects.");
        setMessageType("error");
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [department, semester, getToken]);

  // --------------------------------------------------
  // Load students
  // --------------------------------------------------

  useEffect(() => {
    const loadStudents = async () => {
      if (!department || !semester || !subjectId) {
        setStudents([]);
        setMarks({});
        return;
      }

      try {
        setLoadingStudents(true);

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

        setStudents(data);

        const initialMarks = {};

        data.forEach((student) => {
          initialMarks[student._id] = {};
        });

        setMarks(initialMarks);
      } catch (error) {
        console.error("Failed to load students:", error);

        setStudents([]);

        setMessage("Unable to load students.");
        setMessageType("error");
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [department, semester, subjectId, getToken]);

  // --------------------------------------------------
  // Add test
  // --------------------------------------------------

  const addTest = () => {
    const testNumber = tests.length + 1;

    setTests((prev) => [
      ...prev,
      {
        testName: `IA Test ${testNumber}`,
        maxMarks: 25,
      },
    ]);
  };

  // --------------------------------------------------
  // Remove test
  // --------------------------------------------------

  const removeTest = (index) => {
    setTests((prev) =>
      prev.filter((_, testIndex) => testIndex !== index)
    );

    setMarks((prev) => {
      const updated = {};

      Object.entries(prev).forEach(([studentId, studentMarks]) => {
        const newMarks = {};

        Object.entries(studentMarks).forEach(
          ([testIndex, value]) => {
            const numericIndex = Number(testIndex);

            if (numericIndex < index) {
              newMarks[numericIndex] = value;
            } else if (numericIndex > index) {
              newMarks[numericIndex - 1] = value;
            }
          }
        );

        updated[studentId] = newMarks;
      });

      return updated;
    });
  };

  // --------------------------------------------------
  // Update test
  // --------------------------------------------------

  const updateTest = (index, field, value) => {
    setTests((prev) =>
      prev.map((test, testIndex) =>
        testIndex === index
          ? {
              ...test,
              [field]:
                field === "maxMarks"
                  ? Number(value)
                  : value,
            }
          : test
      )
    );
  };

  // --------------------------------------------------
  // Update student mark
  // --------------------------------------------------

  const updateMark = (
    studentId,
    testIndex,
    value
  ) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [testIndex]: value,
      },
    }));
  };

  // --------------------------------------------------
  // Save IA marks
  // --------------------------------------------------

  const handleSave = async () => {
    if (!department || !semester || !subjectId) {
      setMessage("Please select department, semester and subject.");
      setMessageType("error");
      return;
    }

    if (tests.length === 0) {
      setMessage("Please add at least one IA test.");
      setMessageType("error");
      return;
    }

    for (const test of tests) {
      if (!test.testName.trim()) {
        setMessage("Every test must have a name.");
        setMessageType("error");
        return;
      }

      if (!test.maxMarks || test.maxMarks <= 0) {
        setMessage(
          `Enter a valid maximum mark for ${test.testName}.`
        );
        setMessageType("error");
        return;
      }
    }

    for (const student of students) {
      for (let i = 0; i < tests.length; i++) {
        const value = marks[student._id]?.[i];

        if (value === undefined || value === "") {
          setMessage(
            `Please enter all marks for ${student.name}.`
          );
          setMessageType("error");
          return;
        }

        const numericValue = Number(value);

        if (
          numericValue < 0 ||
          numericValue > tests[i].maxMarks
        ) {
          setMessage(
            `${student.name}: ${tests[i].testName} must be between 0 and ${tests[i].maxMarks}.`
          );
          setMessageType("error");
          return;
        }
      }
    }

    try {
      setSaving(true);
      setMessage("");

      const token = await getToken();

      const payload = {
        department,
        semester: Number(semester),
        subjectId,
        academicYear,

        students: students.map((student) => ({
          studentId: student._id,

          tests: tests.map((test, index) => ({
            testName: test.testName,
            maxMarks: Number(test.maxMarks),
            marks: Number(
              marks[student._id]?.[index]
            ),
          })),
        })),
      };

      await axios.post(
        `${API_URL}/api/ia/save`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage("IA marks saved successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Save IA error:", error);

      setMessage(
        error.response?.data?.message ||
          "Failed to save IA marks."
      );

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const selectedSubject = subjects.find(
    (subject) => subject._id === subjectId
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-xl text-white shadow-sm">
            ▤
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">
              Faculty Portal
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              IA Marks
            </h1>
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Configure any number of internal assessment tests and enter
          student marks.
        </p>
      </div>

      {/* Selection */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
              1
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Select Class
              </h2>

              <p className="text-xs text-slate-500">
                Choose the academic year, department, semester and subject.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2 lg:grid-cols-4">

          {/* Academic Year */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Academic Year
            </label>

            <select
              value={academicYear}
              onChange={(e) =>
                setAcademicYear(e.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
            >
              {academicYears.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Department
            </label>

            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setSemester("");
                setSubjectId("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">Select department</option>

              {departments.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Semester
            </label>

            <select
              value={semester}
              disabled={!department}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select semester</option>

              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Subject
            </label>

            <select
              value={subjectId}
              disabled={!semester || loadingSubjects}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {loadingSubjects
                  ? "Loading subjects..."
                  : "Select subject"}
              </option>

              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Test Configuration */}
      {subjectId && (
        <>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                  2
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    IA Tests
                  </h2>

                  <p className="text-xs text-slate-500">
                    Add as many tests as required.
                  </p>
                </div>
              </div>

              <button
                onClick={addTest}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                + Add Test
              </button>
            </div>

            {tests.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg">
                  +
                </div>

                <p className="mt-4 font-medium text-slate-700">
                  No IA tests added
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Click "Add Test" to configure your first test.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tests.map((test, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-end"
                  >
                    <div className="flex-1">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Test Name
                      </label>

                      <input
                        value={test.testName}
                        onChange={(e) =>
                          updateTest(
                            index,
                            "testName",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                      />
                    </div>

                    <div className="w-full md:w-48">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Maximum Marks
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={test.maxMarks}
                        onChange={(e) =>
                          updateTest(
                            index,
                            "maxMarks",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                      />
                    </div>

                    <button
                      onClick={() => removeTest(index)}
                      className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student Marks */}
          {tests.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                    3
                  </div>

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Enter Student Marks
                    </h2>

                    {selectedSubject && (
                      <p className="text-xs text-slate-500">
                        {selectedSubject.code} —{" "}
                        {selectedSubject.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">

                {loadingStudents ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    Loading students...
                  </div>
                ) : students.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    No students found.
                  </div>
                ) : (
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          #
                        </th>

                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Register No.
                        </th>

                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Student
                        </th>

                        {tests.map((test, index) => (
                          <th
                            key={index}
                            className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                          >
                            <div>{test.testName}</div>

                            <div className="mt-1 text-[10px] font-normal text-slate-400">
                              Max: {test.maxMarks}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {students.map((student, studentIndex) => (
                        <tr
                          key={student._id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {studentIndex + 1}
                          </td>

                          <td className="px-4 py-4 text-sm font-medium text-slate-700">
                            {student.registerNumber}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {student.name
                                  ?.charAt(0)
                                  ?.toUpperCase()}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {student.name}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {tests.map((test, testIndex) => (
                            <td
                              key={testIndex}
                              className="px-4 py-4 text-center"
                            >
                              <input
                                type="number"
                                min="0"
                                max={test.maxMarks}
                                value={
                                  marks[student._id]?.[
                                    testIndex
                                  ] ?? ""
                                }
                                onChange={(e) =>
                                  updateMark(
                                    student._id,
                                    testIndex,
                                    e.target.value
                                  )
                                }
                                className="mx-auto w-24 rounded-xl border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                                placeholder="—"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {students.length > 0 && (
                <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

                  <div className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-900">
                      {students.length}
                    </span>{" "}
                    students ·{" "}
                    <span className="font-semibold text-slate-900">
                      {tests.length}
                    </span>{" "}
                    tests
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl bg-slate-950 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save IA Marks"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}