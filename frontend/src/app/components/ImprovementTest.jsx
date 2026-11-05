"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import StudentPhoto from "./StudentPhoto";
import { iaShortLabel, TEST_IA_NUMBERS } from "../utils/iaLabels";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CO_NAMES = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"];

const formatScore = (value) =>
  value === null || value === undefined
    ? "—"
    : String(Math.round(Number(value) * 100) / 100);

// COs of a test that carry marks
const testCOs = (test) =>
  CO_NAMES.filter((co) => Number(test.coMarks?.[co] || 0) > 0);

// Empty marks for a pattern: one entry per test
const emptyTests = (pattern) =>
  (pattern?.tests || []).map(() => ({
    status: "PRESENT",
    coMarks: {},
  }));

const entryTotal = (tests = []) =>
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

// The CIE with this improvement mark, the same rule as
// the backend: it replaces the chosen IA only if higher.
const newCIE = (batchData, student, entry) => {
  const pattern = batchData.patterns[entry.replacesIA];

  if (!pattern || !pattern.totalMaxMarks) {
    return student.finalBeforeImprovement;
  }

  const scaled =
    (entryTotal(entry.tests) / pattern.totalMaxMarks) * batchData.cieMax;

  const parts = batchData.partNumbers.map((number) => {
    const current = student.parts[number]?.scaled || 0;

    return number === entry.replacesIA
      ? Math.max(current, scaled)
      : current;
  });

  return parts.reduce((sum, value) => sum + value, 0) / parts.length;
};

// =====================================================
// IMPROVEMENT TEST
//
// Shown on the faculty IA page when "Improvement Test"
// is chosen. A table of the students whose final CIE is
// below the subject minimum, for one batch or both. Each
// takes one improvement test that replaces one of IA1
// to IA4 (their absent IA, else their lowest), with that
// IA's CO pattern. The marks count only when higher.
// =====================================================

export default function ImprovementTest({
  academicYear,
  subject,
  isBridge,
}) {
  const { getToken } = useAuth();

  const [batchChoice, setBatchChoice] = useState(
    isBridge ? "2" : ""
  );

  // { 1: data, 2: data } for the loaded batches
  const [batches, setBatches] = useState(null);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const showAlert = (icon, title, text) =>
    Swal.fire({ icon, title, text, confirmButtonColor: "#283618" });

  // =====================================================
  // LOAD
  // =====================================================

  const load = async () => {
    if (!subject || !batchChoice) {
      return;
    }

    const batchNumbers = batchChoice === "both" ? [1, 2] : [Number(batchChoice)];

    try {
      setLoading(true);

      const token = await getToken();

      const results = await Promise.all(
        batchNumbers.map((batchNumber) =>
          axios.get(`${API_URL}/api/ia/improvement`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              subjectId: subject._id,
              academicYear,
              batchNumber,
            },
          })
        )
      );

      const loaded = {};
      const initial = {};

      results.forEach((response, index) => {
        const result = response.data?.data;

        loaded[batchNumbers[index]] = result;

        // Saved marks, or the default IA for an
        // eligible student
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
      });

      setBatches(loaded);
      setEntries(initial);
    } catch (err) {
      console.error("Load improvement error:", err);

      setBatches(null);

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

  // Rows: students below the minimum or already saved,
  // with their batch's data
  const rows = useMemo(
    () =>
      batches
        ? Object.values(batches).flatMap((batchData) =>
            batchData.students
              .filter((student) => student.eligible || student.improvement)
              .map((student) => ({ student, batchData }))
          )
        : [],
    [batches]
  );

  // Every assessment entered in any loaded batch
  const partNumbers = useMemo(
    () =>
      batches
        ? [
            ...new Set(
              Object.values(batches).flatMap((data) => data.partNumbers)
            ),
          ].sort((a, b) => a - b)
        : [],
    [batches]
  );

  const totalStudents = batches
    ? Object.values(batches).reduce(
        (sum, data) => sum + data.students.length,
        0
      )
    : 0;

  const firstBatch = batches ? Object.values(batches)[0] : null;

  const lockedBatches = batches
    ? Object.values(batches)
        .filter((data) => data.locked)
        .map((data) => data.batchNumber)
    : [];

  const updateEntry = (studentId, change) =>
    setEntries((current) => ({
      ...current,
      [studentId]: { ...current[studentId], ...change },
    }));

  const toggleTakes = (student, batchData, takes) =>
    entries[student.studentId]
      ? updateEntry(student.studentId, { takes })
      : setEntries((current) => ({
          ...current,
          [student.studentId]: {
            takes,
            replacesIA: student.defaultReplacesIA,
            tests: emptyTests(batchData.patterns[student.defaultReplacesIA]),
          },
        }));

  const setReplacesIA = (studentId, batchData, replacesIA) =>
    updateEntry(studentId, {
      replacesIA,
      tests: emptyTests(batchData.patterns[replacesIA]),
    });

  const setCOMark = (studentId, testIndex, co, value) =>
    updateEntry(studentId, {
      tests: entries[studentId].tests.map((test, index) =>
        index === testIndex
          ? { ...test, coMarks: { ...test.coMarks, [co]: value } }
          : test
      ),
    });

  const setAbsent = (studentId, absent) =>
    updateEntry(studentId, {
      tests: entries[studentId].tests.map(() => ({
        status: absent ? "ABSENT" : "PRESENT",
        coMarks: {},
      })),
    });

  // =====================================================
  // SAVE (one request per batch with students ticked)
  // =====================================================

  const save = async () => {
    const chosen = rows.filter(
      ({ student, batchData }) =>
        !batchData.locked && entries[student.studentId]?.takes
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
    for (const { student, batchData } of chosen) {
      const entry = entries[student.studentId];
      const pattern = batchData.patterns[entry.replacesIA];

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
              `${student.name}: enter ${co} marks or mark the student absent.`
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

    const byBatch = new Map();

    chosen.forEach(({ student, batchData }) => {
      if (!byBatch.has(batchData.batchNumber)) {
        byBatch.set(batchData.batchNumber, []);
      }

      const entry = entries[student.studentId];

      byBatch.get(batchData.batchNumber).push({
        studentId: student.studentId,
        replacesIA: entry.replacesIA,
        tests: entry.tests.map((test) => ({
          status: test.status,
          coMarks: Object.fromEntries(
            CO_NAMES.map((co) => [co, Number(test.coMarks?.[co] || 0)])
          ),
        })),
      });
    });

    const summary = [...byBatch.entries()]
      .map(([batch, list]) => `Batch ${batch}: ${list.length}`)
      .join(", ");

    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Save and Freeze?",
      text: `Improvement test for ${chosen.length} student${chosen.length === 1 ? "" : "s"} (${summary}). Once frozen, only the HOD can unlock it for a correction.`,
      showCancelButton: true,
      confirmButtonText: "Yes, Save & Freeze",
      cancelButtonText: "Check Again",
      confirmButtonColor: "#283618",
      cancelButtonColor: "#9a9474",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      const messages = [];

      for (const [batchNumber, list] of byBatch) {
        const response = await axios.post(
          `${API_URL}/api/ia/improvement`,
          {
            subjectId: subject._id,
            academicYear,
            batchNumber,
            entries: list,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        messages.push(response.data?.message);
      }

      await showAlert("success", "Saved", messages.join(" "));

      await load();
    } catch (err) {
      console.error("Save improvement error:", err);

      showAlert(
        "error",
        "Unable to Save",
        err.response?.data?.message ||
          "The improvement test could not be saved."
      );

      // Show what was saved before the error
      await load();
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

  const thClass =
    "border-b border-slate-200 bg-[#283618] px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-[#fefae0]";

  const canSave = rows.some(({ batchData }) => !batchData.locked);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Improvement Test
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Students below the CIE minimum. One test per student; it replaces the chosen IA only if the new mark is higher.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={batchChoice}
            onChange={(e) => {
              setBatchChoice(e.target.value);
              setBatches(null);
              setEntries({});
            }}
            aria-label="Batch"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="">Select Batch</option>
            {!isBridge && <option value="1">Batch 1</option>}
            <option value="2">Batch 2</option>
            {!isBridge && <option value="both">Both Batches</option>}
          </select>

          <button
            type="button"
            onClick={load}
            disabled={!batchChoice || loading}
            className="h-9 rounded-lg bg-[#283618] px-4 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Loading..." : "Load Students"}
          </button>
        </div>
      </div>

      {batches && (
        <>
          {/* SUMMARY */}
          <div className="flex flex-wrap gap-2 px-4 pt-3 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              Minimum {formatScore(firstBatch.cieMin)} / {formatScore(firstBatch.cieMax)}
            </span>
            <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
              {rows.length} of {totalStudents} students below the minimum
            </span>
            {lockedBatches.length > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
                Batch {lockedBatches.join(" & ")} saved and frozen. Ask the HOD to unlock for a correction.
              </span>
            )}
          </div>

          {partNumbers.length === 0 ? (
            <p className="m-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No IA is entered for this batch yet.
            </p>
          ) : rows.length === 0 ? (
            <p className="m-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              Every student has the minimum CIE. No improvement test is needed.
            </p>
          ) : (
            <>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className={`${thClass} w-12 text-center`}>Sl.</th>
                      <th className={`${thClass} sticky left-0 z-10 text-left`}>Student</th>
                      {partNumbers.map((number) => (
                        <th key={number} className={`${thClass} text-center`}>
                          {iaShortLabel(number)}
                        </th>
                      ))}
                      <th className={`${thClass} text-center`}>CIE</th>
                      <th className={`${thClass} text-center`}>Takes</th>
                      <th className={`${thClass} text-center`}>Replaces</th>
                      <th className={`${thClass} text-left`}>Improvement Marks</th>
                      <th className={`${thClass} text-center`}>Total</th>
                      <th className={`${thClass} text-center`}>New CIE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map(({ student, batchData }, index) => {
                      const entry = entries[student.studentId];
                      const readOnly = batchData.locked;
                      const takes = Boolean(entry?.takes);
                      const pattern = takes
                        ? batchData.patterns[entry.replacesIA]
                        : null;
                      const absent =
                        takes &&
                        entry.tests.length > 0 &&
                        entry.tests.every((test) => test.status === "ABSENT");
                      const after = takes
                        ? newCIE(batchData, student, entry)
                        : null;
                      const testNumbers = batchData.partNumbers.filter(
                        (number) => TEST_IA_NUMBERS.includes(number)
                      );
                      const rowClass =
                        index % 2 === 0 ? "bg-white" : "bg-[#fbf9f0]";

                      return (
                        <tr
                          key={student.studentId}
                          className={`${rowClass} border-b border-slate-100 align-middle`}
                        >
                          <td className="px-2 py-2 text-center text-xs font-semibold text-slate-400">
                            {index + 1}
                          </td>

                          <td className={`${rowClass} sticky left-0 z-10 px-2 py-2`}>
                            <div className="flex items-center gap-2">
                              <StudentPhoto
                                imageUrl={student.imageUrl}
                                name={student.name}
                                registerNumber={student.registerNumber}
                              />
                              <div className="min-w-0">
                                <p className="max-w-[170px] truncate font-semibold text-slate-900">
                                  {student.name}
                                </p>
                                <p className="font-mono text-[11px] text-slate-400">
                                  {student.registerNumber || student.rollNumber}
                                  {batches[1] && batches[2] && ` · B${batchData.batchNumber}`}
                                </p>
                              </div>
                            </div>
                          </td>

                          {partNumbers.map((number) => {
                            const part = student.parts[number];

                            return (
                              <td
                                key={number}
                                className={`px-2 py-2 text-center text-xs ${
                                  part?.absent ? "font-bold text-red-600" : "text-slate-700"
                                } ${takes && entry.replacesIA === number ? "bg-amber-50 font-bold" : ""}`}
                              >
                                {!batchData.partNumbers.includes(number)
                                  ? "—"
                                  : part?.absent
                                  ? "AB"
                                  : formatScore(part?.scaled ?? 0)}
                              </td>
                            );
                          })}

                          <td className="px-2 py-2 text-center font-bold text-red-700">
                            {formatScore(student.finalBeforeImprovement)}
                          </td>

                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={takes}
                              disabled={readOnly}
                              onChange={(e) =>
                                toggleTakes(student, batchData, e.target.checked)
                              }
                              className="h-4 w-4"
                              aria-label={`${student.name} takes the improvement test`}
                            />
                          </td>

                          <td className="px-2 py-2 text-center">
                            {takes ? (
                              <select
                                value={entry.replacesIA}
                                disabled={readOnly}
                                onChange={(e) =>
                                  setReplacesIA(
                                    student.studentId,
                                    batchData,
                                    Number(e.target.value)
                                  )
                                }
                                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
                              >
                                {testNumbers.map((number) => (
                                  <option key={number} value={number}>
                                    IA {number}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td className="px-2 py-2">
                            {pattern ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {pattern.tests.map((test, testIndex) =>
                                  testCOs(test).map((co) => (
                                    <label
                                      key={`${testIndex}-${co}`}
                                      className="flex flex-col items-center text-[10px] font-semibold text-slate-500"
                                    >
                                      {pattern.tests.length > 1
                                        ? `${test.testName} ${co}`
                                        : co}{" "}
                                      /{test.coMarks[co]}
                                      <input
                                        type="number"
                                        min="0"
                                        max={test.coMarks[co]}
                                        step="0.5"
                                        value={entry.tests[testIndex]?.coMarks?.[co] ?? ""}
                                        disabled={readOnly || absent}
                                        onChange={(e) =>
                                          setCOMark(
                                            student.studentId,
                                            testIndex,
                                            co,
                                            e.target.value
                                          )
                                        }
                                        className="mt-0.5 h-8 w-14 rounded-md border border-slate-200 bg-white px-1 text-center text-sm disabled:bg-slate-100"
                                      />
                                    </label>
                                  ))
                                )}

                                <label className="ml-1 flex items-center gap-1 text-xs text-slate-500">
                                  <input
                                    type="checkbox"
                                    checked={absent}
                                    disabled={readOnly}
                                    onChange={(e) =>
                                      setAbsent(student.studentId, e.target.checked)
                                    }
                                  />
                                  Absent
                                </label>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">Not taking</span>
                            )}
                          </td>

                          <td className="px-2 py-2 text-center text-sm font-bold text-slate-800">
                            {pattern
                              ? absent
                                ? "AB"
                                : `${formatScore(entryTotal(entry.tests))}/${pattern.totalMaxMarks}`
                              : "—"}
                          </td>

                          <td
                            className={`px-2 py-2 text-center font-bold ${
                              after === null
                                ? "text-slate-300"
                                : after >= batchData.cieMin
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {after === null ? "—" : formatScore(after)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Scores are out of {formatScore(firstBatch.cieMax)}. The highlighted cell is the IA being replaced. New CIE is green when the student reaches the minimum. Click a photo to see it large.
                </p>

                {canSave && (
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save & Freeze"}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
