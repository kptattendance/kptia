"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  User,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function HODSubjectIAMarksPage() {
  const { getToken } = useAuth();

  const params = useParams();

  const searchParams =
    useSearchParams();

  const subjectId =
    params.subjectId;

  const academicYear =
    searchParams.get(
      "academicYear"
    ) || "2026-27";

  const semester =
    searchParams.get(
      "semester"
    ) || "";

  const [selectedIA, setSelectedIA] =
    useState("");

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async (
    ia = selectedIA
  ) => {
    try {
      setLoading(true);
      setError("");

      const token =
        await getToken();

      const response =
        await axios.get(
          `${API_URL}/api/hod/ia/subject/${subjectId}`,
          {
            params: {
              academicYear,
              semester,
              ...(ia
                ? { iaNumber: ia }
                : {}),
            },
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const result =
        response.data?.data;

      setData(result || null);

      // Select first available IA
      if (
        result?.iaNumbers?.length &&
        !ia
      ) {
        setSelectedIA(
          String(
            result.iaNumbers[0]
          )
        );
      }
    } catch (err) {
      console.error(
        "Load subject IA error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load IA details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      subjectId &&
      semester
    ) {
      loadData("");
    }
  }, [
    subjectId,
    semester,
    academicYear,
  ]);

  // =====================================================
  // CHANGE IA
  // =====================================================

  const handleIAChange = async (
    value
  ) => {
    setSelectedIA(value);

    if (value) {
      await loadData(value);
    }
  };

  // =====================================================
  // SELECTED IA RECORDS
  // =====================================================

  const selectedRecords =
    useMemo(() => {
      if (!data?.records) {
        return [];
      }

      return data.records.filter(
        (record) =>
          String(
            record.iaNumber
          ) ===
          String(selectedIA)
      );
    }, [
      data,
      selectedIA,
    ]);

  // =====================================================
  // GET STUDENT IA DATA
  // =====================================================

  const getStudentIA =
    (student) => {
      return (
        student.iaMarks?.[
          `IA${selectedIA}`
        ] || null
      );
    };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">

            <RefreshCw
              size={30}
              className="mx-auto mb-3 animate-spin text-slate-400"
            />

            <p className="text-sm text-slate-500">
              Loading IA details...
            </p>

          </div>

        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          <Link
            href="/hod/ia-marks"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to IA Marks
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>

        </div>
      </div>
    );
  }

  // =====================================================
  // NO DATA
  // =====================================================

  if (!data?.subject) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">

          <Link
            href="/hod/ia-marks"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600"
          >
            <ArrowLeft size={16} />
            Back to IA Marks
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              No IA marks found.
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">

      <div className="mx-auto max-w-[1500px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-5">

          <Link
            href="/hod/ia-marks"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to IA Marks
          </Link>

          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {data.subject.name}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {data.subject.code}
                {" • "}
                Semester {semester}
                {" • "}
                {academicYear}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadData(
                  selectedIA
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

          </div>

        </div>

        {/* =================================================
            IA SELECTOR
        ================================================= */}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="max-w-sm">

            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Internal Assessment
            </label>

            <div className="relative">

              <select
                value={selectedIA}
                onChange={(e) =>
                  handleIAChange(
                    e.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="">
                  Select IA
                </option>

                {data.iaNumbers.map(
                  (ia) => (
                    <option
                      key={ia}
                      value={ia}
                    >
                      IA {ia}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

            </div>

          </div>

        </div>

        {/* =================================================
            CO DISTRIBUTION TABLE
        ================================================= */}

        {selectedIA &&
          data.students.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-5 py-4">

                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">

                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      IA {selectedIA} — CO Distribution
                    </h2>

                    <p className="text-xs text-slate-500">
                      Student-wise CO marks and
                      test details
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {
                      data.students.length
                    }{" "}
                    Students
                  </span>

                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[1100px] border-collapse text-sm">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50">

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Register No.
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Student
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Batch
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Test
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        CO1
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        CO2
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        CO3
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        CO4
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        CO5
                      </th>

                      <th className="whitespace-nowrap border-r border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        CO6
                      </th>

                      <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {data.students.map(
                      (student) => {
                        const ia =
                          getStudentIA(
                            student
                          );

                        const tests =
                          ia?.tests ||
                          [];

                        if (!ia) {
                          return (
                            <tr
                              key={
                                student.studentId
                              }
                              className="border-b border-slate-100"
                            >
                              <td className="px-4 py-4 font-medium text-slate-700">
                                {
                                  student.registerNumber
                                }
                              </td>

                              <td className="px-4 py-4 font-semibold text-slate-900">
                                {
                                  student.name
                                }
                              </td>

                              <td className="px-4 py-4 text-center">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  Batch{" "}
                                  {
                                    student.batchNumber
                                  }
                                </span>
                              </td>

                              <td
                                colSpan={7}
                                className="px-4 py-4 text-center text-slate-400"
                              >
                                No marks
                              </td>

                              <td className="px-4 py-4 text-center">
                                —
                              </td>
                            </tr>
                          );
                        }

                        return tests.map(
                          (
                            test,
                            testIndex
                          ) => {
                            const co =
                              test.coMarks ||
                              {};

                            return (
                              <tr
                                key={`${student.studentId}-${testIndex}`}
                                className="border-b border-slate-100 transition hover:bg-slate-50"
                              >

                                {/* STUDENT INFO ONLY ON FIRST TEST */}

                                <td
                                  className={`px-4 py-3 font-medium text-slate-700 ${
                                    testIndex ===
                                    0
                                      ? ""
                                      : "border-t-0"
                                  }`}
                                >
                                  {testIndex ===
                                    0 &&
                                    student.registerNumber}
                                </td>

                                <td className="px-4 py-3 font-semibold text-slate-900">
                                  {testIndex ===
                                    0 &&
                                    student.name}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {testIndex ===
                                    0 && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                      Batch{" "}
                                      {
                                        student.batchNumber
                                      }
                                    </span>
                                  )}
                                </td>

                                {/* TEST */}

                                <td className="px-4 py-3 text-center">

                                  <div className="font-medium text-slate-700">
                                    {
                                      test.testName
                                    }
                                  </div>

                                  <div className="mt-0.5 text-[11px] text-slate-400">
                                    {test.status ===
                                    "ABSENT"
                                      ? "AB"
                                      : `${test.marks ?? 0} / ${test.maxMarks}`}
                                  </div>

                                </td>

                                {/* CO1 */}

                                <td className="px-4 py-3 text-center font-medium text-slate-700">
                                  {
                                    co.CO1 ??
                                    0
                                  }
                                </td>

                                {/* CO2 */}

                                <td className="px-4 py-3 text-center font-medium text-slate-700">
                                  {
                                    co.CO2 ??
                                    0
                                  }
                                </td>

                                {/* CO3 */}

                                <td className="px-4 py-3 text-center font-medium text-slate-700">
                                  {
                                    co.CO3 ??
                                    0
                                  }
                                </td>

                                {/* CO4 */}

                                <td className="px-4 py-3 text-center font-medium text-slate-700">
                                  {
                                    co.CO4 ??
                                    0
                                  }
                                </td>

                                {/* CO5 */}

                                <td className="px-4 py-3 text-center font-medium text-slate-700">
                                  {
                                    co.CO5 ??
                                    0
                                  }
                                </td>

                                {/* CO6 */}

                                <td className="px-4 py-3 text-center font-medium text-slate-700">
                                  {
                                    co.CO6 ??
                                    0
                                  }
                                </td>

                                {/* TOTAL */}

                                <td className="px-4 py-3 text-center font-bold text-slate-900">
                                  {testIndex ===
                                    0 &&
                                    (ia.status ===
                                    "ABSENT"
                                      ? "AB"
                                      : ia.totalMarks)}
                                </td>

                              </tr>
                            );
                          }
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

        {/* =================================================
            NO STUDENTS
        ================================================= */}

        {selectedIA &&
          data.students.length ===
            0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">

              <User
                size={34}
                className="mx-auto mb-3 text-slate-300"
              />

              <h2 className="font-semibold text-slate-700">
                No Student Marks
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                No marks are available for
                IA {selectedIA}.
              </p>

            </div>
          )}

      </div>
    </div>
  );
}