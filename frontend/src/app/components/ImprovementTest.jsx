"use client";

import { useImperativeHandle, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { RefreshCw } from "lucide-react";
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

  // Rounded up to a whole number, as the final CIE
  return Math.ceil(
    Math.round(
      (parts.reduce((sum, value) => sum + value, 0) / parts.length) * 100
    ) / 100
  );
};

// =====================================================
// IMPROVEMENT TEST
//
// Shown on the faculty IA page when "Improvement Test"
// is chosen. The page's Load Students button calls
// ref.load() for its batch (batchChoice "1", "2" or
// "both"); the page gives it a new key when the
// selection changes, which clears it. A table of the students whose final CIE is
// below the subject minimum, for one batch or both. Each
// takes one improvement test that replaces one of IA1
// to IA4 (their absent IA, else their lowest), with that
// IA's CO pattern. The marks count only when higher.
// =====================================================

export default function ImprovementTest({
  academicYear,
  subject,
  batchChoice,
  ref,
}) {
  const { getToken } = useAuth();

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

  // Load Students on the page
  useImperativeHandle(ref, () => ({ load }));

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

  // The IA being replaced: a clay pill
  const replacePill =
    "inline-flex items-center gap-1 rounded-full bg-[#fbeee0] px-2 py-0.5 text-sm font-semibold text-[#9c4f14] ring-1 ring-[#e8c39e]";

  // The improvement test columns sit on a soft band
  const bandHead = "bg-[#ebe6d2] px-2 py-2 text-center";
  const bandCell = "bg-[#fdfbf5] px-2 py-2.5 group-hover:bg-[#f7f3e6]";

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
            Choose the batch above and click Load Students. Students below the CIE minimum are listed; one test per student, and it replaces the chosen IA only if the new mark is higher.
          </p>
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

          {/* LEGEND */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 pt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className={replacePill}>
                <RefreshCw size={10} strokeWidth={2.5} />
                4
              </span>
              IA being replaced
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-5 w-8 rounded-md border border-dashed border-slate-400 bg-white" />
              Marks still to enter
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-5 w-8 rounded-md border border-[#a3b18a] bg-[#f3f6ea]" />
              Marks entered
            </span>
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
              <div className="mx-4 mt-3 overflow-x-auto rounded-xl border border-[#e6e0c8]">
                <table className="w-full min-w-max border-collapse text-sm">
                  <thead>
                    {/* GROUPS */}
                    <tr className="bg-[#283618] text-[11px] font-bold uppercase tracking-wider text-[#fefae0]">
                      <th colSpan={2} className="sticky left-0 z-10 bg-[#283618] px-3 py-2 text-left">
                        Student
                      </th>
                      <th colSpan={partNumbers.length + 1} className="border-l border-white/15 px-3 py-2 text-center">
                        Current scores (/{formatScore(firstBatch.cieMax)})
                      </th>
                      <th colSpan={4} className="border-l border-white/15 bg-[#3b4a26] px-3 py-2 text-center">
                        Improvement test
                      </th>
                      <th className="border-l border-white/15 px-3 py-2 text-center">
                        Result
                      </th>
                    </tr>

                    {/* COLUMNS */}
                    <tr className="border-b border-[#e6e0c8] bg-[#f4f1e4] text-[11px] font-bold uppercase tracking-wide text-[#4a5a2a]">
                      <th className="w-10 px-2 py-2 text-center">#</th>
                      <th className="sticky left-0 z-10 bg-[#f4f1e4] px-3 py-2 text-left">Name</th>
                      {partNumbers.map((number) => (
                        <th
                          key={number}
                          className={`px-2 py-2 text-center ${number === partNumbers[0] ? "border-l border-[#e6e0c8]" : ""}`}
                        >
                          {iaShortLabel(number)}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center">CIE</th>
                      <th className={`${bandHead} border-l border-[#e6e0c8]`}>Takes</th>
                      <th className={bandHead}>Replaces</th>
                      <th className={`${bandHead} text-left`}>Marks (CO-wise)</th>
                      <th className={bandHead}>Total</th>
                      <th className="border-l border-[#e6e0c8] px-2 py-2 text-center">New CIE</th>
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
                      const improved =
                        after !== null &&
                        after > (student.finalBeforeImprovement ?? 0);

                      return (
                        <tr
                          key={student.studentId}
                          className="group border-b border-[#efeadb] bg-white last:border-0 hover:bg-[#faf8f0]"
                        >
                          <td className="px-2 py-2.5 text-center text-xs text-slate-400">
                            {index + 1}
                          </td>

                          <td className="sticky left-0 z-10 bg-white px-3 py-2.5 group-hover:bg-[#faf8f0]">
                            <div className="flex items-center gap-2.5">
                              <StudentPhoto
                                imageUrl={student.imageUrl}
                                name={student.name}
                                registerNumber={student.registerNumber}
                              />
                              <div className="min-w-0">
                                <p className="max-w-[170px] truncate text-sm font-semibold text-slate-800">
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
                            const replaced = takes && entry.replacesIA === number;
                            const value = !batchData.partNumbers.includes(number)
                              ? "—"
                              : part?.absent
                              ? "AB"
                              : formatScore(part?.scaled ?? 0);

                            return (
                              <td
                                key={number}
                                className={`px-2 py-2.5 text-center text-sm ${number === partNumbers[0] ? "border-l border-[#efeadb]" : ""}`}
                              >
                                {replaced ? (
                                  <span className={replacePill} title="Replaced by the improvement test">
                                    <RefreshCw size={10} strokeWidth={2.5} />
                                    {value}
                                  </span>
                                ) : (
                                  <span className={part?.absent ? "font-semibold text-red-500" : "text-slate-600"}>
                                    {value}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-2 py-2.5 text-center">
                            <span className="inline-block min-w-9 rounded-full bg-red-50 px-2 py-0.5 text-sm font-bold text-red-600">
                              {formatScore(student.finalBeforeImprovement)}
                            </span>
                          </td>

                          {/* IMPROVEMENT TEST BAND */}

                          <td className={`${bandCell} border-l border-[#efeadb] text-center`}>
                            <input
                              type="checkbox"
                              checked={takes}
                              disabled={readOnly}
                              onChange={(e) =>
                                toggleTakes(student, batchData, e.target.checked)
                              }
                              className="h-4 w-4 cursor-pointer accent-[#283618]"
                              aria-label={`${student.name} takes the improvement test`}
                            />
                          </td>

                          <td className={`${bandCell} text-center`}>
                            {takes ? (
                              <select
                                value={entry.replacesIA}
                                title="IA that this improvement test replaces"
                                disabled={readOnly}
                                onChange={(e) =>
                                  setReplacesIA(
                                    student.studentId,
                                    batchData,
                                    Number(e.target.value)
                                  )
                                }
                                className="h-8 cursor-pointer rounded-full border border-[#e8c39e] bg-[#fbeee0] px-3 text-xs font-semibold text-[#9c4f14] outline-none focus:ring-2 focus:ring-[#e8c39e]/60"
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

                          <td className={bandCell}>
                            {pattern ? (
                              <div className="flex flex-wrap items-end gap-2">
                                {pattern.tests.map((test, testIndex) =>
                                  testCOs(test).map((co) => {
                                    const value =
                                      entry.tests[testIndex]?.coMarks?.[co] ?? "";

                                    return (
                                      <label
                                        key={`${testIndex}-${co}`}
                                        className="flex flex-col items-center gap-0.5"
                                      >
                                        <span className="text-[10px] font-medium text-slate-400">
                                          {pattern.tests.length > 1
                                            ? `${test.testName} ${co}`
                                            : co}
                                          <span className="text-slate-300"> /{test.coMarks[co]}</span>
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          max={test.coMarks[co]}
                                          step="0.5"
                                          value={value}
                                          disabled={readOnly || absent}
                                          placeholder={`/${test.coMarks[co]}`}
                                          onChange={(e) =>
                                            setCOMark(
                                              student.studentId,
                                              testIndex,
                                              co,
                                              e.target.value
                                            )
                                          }
                                          className={`h-8 w-14 rounded-md px-1 text-center text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-[#606c38] focus:ring-2 focus:ring-[#606c38]/20 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 ${
                                            value === ""
                                              ? "border border-dashed border-slate-400 bg-white"
                                              : "border border-[#a3b18a] bg-[#f3f6ea]"
                                          }`}
                                        />
                                      </label>
                                    );
                                  })
                                )}

                                <button
                                  type="button"
                                  disabled={readOnly}
                                  onClick={() => setAbsent(student.studentId, !absent)}
                                  className={`h-8 rounded-full border px-3 text-xs font-semibold transition disabled:cursor-not-allowed ${
                                    absent
                                      ? "border-red-200 bg-red-50 text-red-600"
                                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                  }`}
                                >
                                  {absent ? "Absent ✓" : "Absent"}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">Not taking</span>
                            )}
                          </td>

                          <td className={`${bandCell} text-center`}>
                            {pattern ? (
                              absent ? (
                                <span className="text-sm font-semibold text-red-500">AB</span>
                              ) : (
                                <span className="text-sm font-bold text-slate-800">
                                  {formatScore(entryTotal(entry.tests))}
                                  <span className="font-normal text-slate-400"> / {pattern.totalMaxMarks}</span>
                                </span>
                              )
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* RESULT */}

                          <td className="border-l border-[#efeadb] px-3 py-2.5 text-center">
                            {after === null ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <span
                                className={`inline-flex min-w-11 items-center justify-center gap-0.5 rounded-full px-2.5 py-0.5 text-sm font-bold ring-1 ${
                                  after >= batchData.cieMin
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                    : "bg-red-50 text-red-600 ring-red-100"
                                }`}
                              >
                                {improved && <span className="text-[10px]">▲</span>}
                                {formatScore(after)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  New CIE turns green once the student reaches the minimum of {formatScore(firstBatch.cieMin)}; it is rounded up to a whole number. Click a photo to see it large.
                </p>

                {canSave && (
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="rounded-xl bg-[#283618] px-6 py-2.5 text-sm font-bold text-[#fefae0] shadow-sm transition hover:bg-[#3b4a26] disabled:opacity-50"
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
