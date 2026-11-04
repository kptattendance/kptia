"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { iaShortLabel, TEST_IA_NUMBERS } from "../utils/iaLabels";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CO_NAMES = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"];

const formatScore = (value) =>
  value === null || value === undefined
    ? "—"
    : Number(value).toFixed(2).replace(/\.?0+$/, "");

// COs of a test that carry marks
const testCOs = (test) =>
  CO_NAMES.filter((co) => Number(test.coMarks?.[co] || 0) > 0);

// Empty marks for a pattern: one entry per test
const emptyTests = (pattern) =>
  (pattern?.tests || []).map(() => ({
    status: "PRESENT",
    coMarks: {},
  }));

const entryTotal = (tests) =>
  tests.reduce(
    (sum, test) =>
      test.status === "ABSENT"
        ? sum
        : sum +
          CO_NAMES.reduce(
            (coSum, co) => coSum + Number(test.coMarks?.[co] || 0),
            0
          ),
    0
  );

// =====================================================
// IMPROVEMENT TEST
//
// Shown on the faculty IA page when "Improvement Test"
// is chosen. Lists the students of a batch whose final
// CIE is below the subject minimum. Each takes one
// improvement test that replaces one of IA1 to IA4
// (their absent IA, else their lowest), with that IA's
// CO pattern. The marks count only when higher.
// =====================================================

export default function ImprovementTest({
  academicYear,
  subject,
  isBridge,
}) {
  const { getToken } = useAuth();

  const [batchNumber, setBatchNumber] = useState(
    isBridge ? "2" : ""
  );
  const [data, setData] = useState(null);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const showAlert = (icon, title, text) =>
    Swal.fire({ icon, title, text, confirmButtonColor: "#283618" });

  // =====================================================
  // LOAD
  // =====================================================

  const load = async () => {
    if (!subject || !batchNumber) {
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/ia/improvement`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            subjectId: subject._id,
            academicYear,
            batchNumber,
          },
        }
      );

      const result = response.data?.data;

      // Saved marks, or the default IA for an
      // eligible student
      const initial = {};

      result.students.forEach((student) => {
        if (student.improvement) {
          initial[student.studentId] = {
            takes: true,
            replacesIA: student.improvement.replacesIA,
            tests: student.improvement.tests.map((test) => ({
              status: test.status,
              coMarks: { ...test.coMarks },
            })),
          };
        } else if (student.eligible && student.defaultReplacesIA) {
          initial[student.studentId] = {
            takes: true,
            replacesIA: student.defaultReplacesIA,
            tests: emptyTests(
              result.patterns[student.defaultReplacesIA]
            ),
          };
        }
      });

      setData(result);
      setEntries(initial);
    } catch (err) {
      console.error("Load improvement error:", err);

      setData(null);

      showAlert(
        "error",
        "Unable to Load",
        err.response?.data?.message ||
          "The improvement test could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  // Students on the list: eligible or already saved
  const listed = useMemo(
    () =>
      data
        ? data.students.filter(
            (student) => student.eligible || student.improvement
          )
        : [],
    [data]
  );

  const testNumbers = useMemo(
    () =>
      data
        ? data.partNumbers.filter((number) =>
            TEST_IA_NUMBERS.includes(number)
          )
        : [],
    [data]
  );

  const readOnly = Boolean(data?.locked);

  const updateEntry = (studentId, change) =>
    setEntries((current) => ({
      ...current,
      [studentId]: { ...current[studentId], ...change },
    }));

  const setReplacesIA = (studentId, replacesIA) =>
    updateEntry(studentId, {
      replacesIA,
      tests: emptyTests(data.patterns[replacesIA]),
    });

  const setCOMark = (studentId, testIndex, co, value) => {
    const entry = entries[studentId];

    const tests = entry.tests.map((test, index) =>
      index === testIndex
        ? {
            ...test,
            coMarks: { ...test.coMarks, [co]: value },
          }
        : test
    );

    updateEntry(studentId, { tests });
  };

  const setAbsent = (studentId, testIndex, absent) => {
    const entry = entries[studentId];

    const tests = entry.tests.map((test, index) =>
      index === testIndex
        ? {
            status: absent ? "ABSENT" : "PRESENT",
            coMarks: absent ? {} : test.coMarks,
          }
        : test
    );

    updateEntry(studentId, { tests });
  };

  // =====================================================
  // SAVE
  // =====================================================

  const save = async () => {
    const chosen = listed.filter(
      (student) => entries[student.studentId]?.takes
    );

    if (chosen.length === 0) {
      showAlert(
        "warning",
        "No Students",
        "Tick at least one student who took the improvement test."
      );
      return;
    }

    // Every CO mark must be within its maximum
    for (const student of chosen) {
      const entry = entries[student.studentId];
      const pattern = data.patterns[entry.replacesIA];

      for (const [index, test] of entry.tests.entries()) {
        if (test.status === "ABSENT") {
          continue;
        }

        for (const co of testCOs(pattern.tests[index])) {
          const value = test.coMarks?.[co];
          const max = Number(pattern.tests[index].coMarks[co]);

          if (value === "" || value === undefined) {
            showAlert(
              "warning",
              "Marks Missing",
              `${student.name}: enter ${co} marks or mark the test absent.`
            );
            return;
          }

          if (Number(value) < 0 || Number(value) > max) {
            showAlert(
              "warning",
              "Invalid Marks",
              `${student.name}: ${co} marks must be between 0 and ${max}.`
            );
            return;
          }
        }
      }
    }

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Save Improvement Test?",
      text: `${chosen.length} student${chosen.length === 1 ? "" : "s"} of Batch ${batchNumber}. The marks will be frozen; the HOD can unlock them for a correction.`,
      showCancelButton: true,
      confirmButtonText: "Save",
      confirmButtonColor: "#283618",
      cancelButtonColor: "#9a9474",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      const response = await axios.post(
        `${API_URL}/api/ia/improvement`,
        {
          subjectId: subject._id,
          academicYear,
          batchNumber: Number(batchNumber),
          entries: chosen.map((student) => {
            const entry = entries[student.studentId];

            return {
              studentId: student.studentId,
              replacesIA: entry.replacesIA,
              tests: entry.tests.map((test) => ({
                status: test.status,
                coMarks: Object.fromEntries(
                  CO_NAMES.map((co) => [
                    co,
                    Number(test.coMarks?.[co] || 0),
                  ])
                ),
              })),
            };
          }),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await showAlert(
        "success",
        "Saved",
        response.data?.message || "Improvement test saved."
      );

      await load();
    } catch (err) {
      console.error("Save improvement error:", err);

      showAlert(
        "error",
        "Unable to Save",
        err.response?.data?.message ||
          "The improvement test could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  if (!subject) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        Select a subject first.
      </div>
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Improvement Test
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            For students whose final CIE is below the minimum. One test per student; it replaces the chosen IA only if the new mark is higher.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <select
            value={batchNumber}
            onChange={(e) => {
              setBatchNumber(e.target.value);
              setData(null);
              setEntries({});
            }}
            aria-label="Batch"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="">Select Batch</option>
            {!isBridge && <option value="1">Batch 1</option>}
            <option value="2">Batch 2</option>
          </select>

          <button
            type="button"
            onClick={load}
            disabled={!batchNumber || loading}
            className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Loading..." : "Load Students"}
          </button>
        </div>
      </div>

      {data && (
        <div className="p-4">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              Minimum {formatScore(data.cieMin)} / {formatScore(data.cieMax)}
            </span>
            <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
              {listed.length} of {data.students.length} students below the minimum
            </span>
            {readOnly && (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
                Saved and frozen. Ask the HOD to unlock it for a correction.
              </span>
            )}
          </div>

          {testNumbers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No IA is entered for this batch yet.
            </p>
          ) : listed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              Every student of this batch has the minimum CIE. No improvement test is needed.
            </p>
          ) : (
            <div className="space-y-3">
              {listed.map((student, index) => {
                const entry = entries[student.studentId];
                const pattern = entry
                  ? data.patterns[entry.replacesIA]
                  : null;

                return (
                  <div
                    key={student.studentId}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    {/* STUDENT + CURRENT SCORES */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(entry?.takes)}
                          disabled={readOnly}
                          onChange={(e) =>
                            entry
                              ? updateEntry(student.studentId, {
                                  takes: e.target.checked,
                                })
                              : setEntries((current) => ({
                                  ...current,
                                  [student.studentId]: {
                                    takes: e.target.checked,
                                    replacesIA: student.defaultReplacesIA,
                                    tests: emptyTests(
                                      data.patterns[student.defaultReplacesIA]
                                    ),
                                  },
                                }))
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-xs font-semibold text-slate-400">
                          {index + 1}.
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {student.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          {student.registerNumber || student.rollNumber}
                        </span>
                      </label>

                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {data.partNumbers.map((number) => (
                          <span
                            key={number}
                            className="rounded-md bg-slate-50 px-2 py-0.5 text-slate-600"
                          >
                            {iaShortLabel(number)}:{" "}
                            <b>
                              {student.parts[number]?.absent
                                ? "AB"
                                : formatScore(
                                    student.parts[number]?.scaled ?? 0
                                  )}
                            </b>
                          </span>
                        ))}
                        <span className="rounded-md bg-red-50 px-2 py-0.5 font-bold text-red-700">
                          CIE {formatScore(student.finalBeforeImprovement)}
                        </span>
                        {student.improvement && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                            After improvement {formatScore(student.final)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* IMPROVEMENT MARKS */}
                    {entry?.takes && pattern && (
                      <div className="mt-3 flex flex-wrap items-start gap-3 border-t border-slate-100 pt-3">
                        <label className="text-xs font-semibold text-slate-600">
                          Replaces
                          <select
                            value={entry.replacesIA}
                            disabled={readOnly}
                            onChange={(e) =>
                              setReplacesIA(
                                student.studentId,
                                Number(e.target.value)
                              )
                            }
                            className="ml-2 h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                          >
                            {testNumbers.map((number) => (
                              <option key={number} value={number}>
                                IA {number}
                              </option>
                            ))}
                          </select>
                        </label>

                        {pattern.tests.map((test, testIndex) => {
                          const marks = entry.tests[testIndex] || {};
                          const absent = marks.status === "ABSENT";

                          return (
                            <div
                              key={testIndex}
                              className="rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <div className="mb-1.5 flex items-center gap-3 text-xs">
                                <span className="font-bold text-slate-700">
                                  {test.testName} ({test.maxMarks})
                                </span>
                                <label className="flex items-center gap-1 text-slate-500">
                                  <input
                                    type="checkbox"
                                    checked={absent}
                                    disabled={readOnly}
                                    onChange={(e) =>
                                      setAbsent(
                                        student.studentId,
                                        testIndex,
                                        e.target.checked
                                      )
                                    }
                                  />
                                  Absent
                                </label>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {testCOs(test).map((co) => (
                                  <label
                                    key={co}
                                    className="text-[11px] font-semibold text-slate-500"
                                  >
                                    {co} /{test.coMarks[co]}
                                    <input
                                      type="number"
                                      min="0"
                                      max={test.coMarks[co]}
                                      step="0.5"
                                      value={marks.coMarks?.[co] ?? ""}
                                      disabled={readOnly || absent}
                                      onChange={(e) =>
                                        setCOMark(
                                          student.studentId,
                                          testIndex,
                                          co,
                                          e.target.value
                                        )
                                      }
                                      className="mt-0.5 block h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-sm disabled:bg-slate-100"
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        <span className="self-center text-sm font-bold text-slate-700">
                          Total {formatScore(entryTotal(entry.tests))} / {pattern.totalMaxMarks}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {!readOnly && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save & Freeze"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
