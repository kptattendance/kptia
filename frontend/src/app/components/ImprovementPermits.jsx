"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { ChevronDown, ShieldCheck } from "lucide-react";
import StudentPhoto from "./StudentPhoto";
import { iaShortLabel, TEST_IA_NUMBERS } from "../utils/iaLabels";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const REASONS = ["NCC", "NSS", "Sports", "Medical", "Other"];

const FILTERS = [
  { value: "absent", label: "Absent in an IA" },
  { value: "allowed", label: "Allowed" },
  { value: "all", label: "All students" },
];

const formatScore = (value) =>
  value === null || value === undefined
    ? "—"
    : String(Math.round(Number(value) * 100) / 100);

// IA tests (not Activity) the student was absent for
const absentIAs = (student, partNumbers) =>
  partNumbers.filter(
    (number) =>
      TEST_IA_NUMBERS.includes(number) &&
      (!student.parts[number] || student.parts[number].absent)
  );

// =====================================================
// IMPROVEMENT TEST: SPECIAL PERMISSION (HOD)
//
// Students below the CIE minimum take the improvement
// test anyway. Here the HOD also allows students who
// are not below it, for example after missing a CIE for
// NCC or NSS. The faculty then sees them on the
// Improvement Test with the reason.
//
// Data: /api/ia/improvement (both batches) and
//       /api/ia/improvement/permits
// =====================================================

export default function ImprovementPermits({
  subjectId,
  academicYear,
}) {
  const { getToken } = useAuth();

  const [open, setOpen] = useState(false);
  const [batches, setBatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState("absent");
  const [search, setSearch] = useState("");

  // studentId -> { reason, note } being chosen
  const [choices, setChoices] = useState({});

  const showAlert = (icon, title, text) =>
    Swal.fire({ icon, title, text, confirmButtonColor: "#283618" });

  const load = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      // Both batches; a batch without marks has no students
      const results = await Promise.all(
        [1, 2].map((batchNumber) =>
          axios.get(`${API_URL}/api/ia/improvement`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { subjectId, academicYear, batchNumber },
          })
        )
      );

      setBatches(results.map((response) => response.data?.data));
    } catch (err) {
      console.error("Load improvement permits error:", err);

      showAlert(
        "error",
        "Unable to Load",
        err.response?.data?.message || "The students could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open && !batches) {
      load();
    }

    setOpen(!open);
  };

  const rows = useMemo(
    () =>
      (batches || []).flatMap((batchData) =>
        batchData.students.map((student) => ({ student, batchData }))
      ),
    [batches]
  );

  const visibleRows = rows.filter(({ student, batchData }) => {
    const text = search.trim().toLowerCase();

    if (
      text &&
      !String(student.name || "").toLowerCase().includes(text) &&
      !String(student.registerNumber || "").toLowerCase().includes(text)
    ) {
      return false;
    }

    if (filter === "allowed") {
      return Boolean(student.special);
    }

    if (filter === "absent") {
      return (
        Boolean(student.special) ||
        absentIAs(student, batchData.partNumbers).length > 0
      );
    }

    return true;
  });

  const allowedCount = rows.filter(({ student }) => student.special).length;

  const setChoice = (studentId, change) =>
    setChoices((current) => ({
      ...current,
      [studentId]: { reason: "", note: "", ...current[studentId], ...change },
    }));

  // =====================================================
  // ALLOW / REMOVE
  // =====================================================

  const allow = async (student, batchData) => {
    const choice = choices[student.studentId] || {};

    if (!choice.reason) {
      showAlert("warning", "Reason Required", `Choose why ${student.name} is allowed the improvement test.`);
      return;
    }

    if (choice.reason === "Other" && !String(choice.note || "").trim()) {
      showAlert("warning", "Reason Required", "Write the reason when choosing Other.");
      return;
    }

    try {
      setBusyId(student.studentId);

      const token = await getToken();

      await axios.post(
        `${API_URL}/api/ia/improvement/permits`,
        {
          subjectId,
          academicYear,
          batchNumber: batchData.batchNumber,
          studentId: student.studentId,
          reason: choice.reason,
          note: choice.note || "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await load();
    } catch (err) {
      console.error("Allow improvement error:", err);

      showAlert(
        "error",
        "Unable to Allow",
        err.response?.data?.message || "The student could not be allowed."
      );
    } finally {
      setBusyId("");
    }
  };

  const remove = async (student) => {
    const confirmation = await Swal.fire({
      icon: "question",
      title: "Remove Permission?",
      text: `${student.name} will no longer be on the improvement test.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Keep",
      confirmButtonColor: "#b91c1c",
      cancelButtonColor: "#9a9474",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setBusyId(student.studentId);

      const token = await getToken();

      await axios.delete(
        `${API_URL}/api/ia/improvement/permits/${student.special.permitId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await load();
    } catch (err) {
      console.error("Remove improvement permit error:", err);

      showAlert(
        "error",
        "Unable to Remove",
        err.response?.data?.message || "The permission could not be removed."
      );
    } finally {
      setBusyId("");
    }
  };

  // =====================================================
  // UI
  // =====================================================

  const firstBatch = batches?.find((data) => data.students.length > 0) || batches?.[0];

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbeee0] text-[#9c4f14]">
            <ShieldCheck size={18} />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">
              Improvement Test — Special Permission
            </span>
            <span className="block text-xs text-slate-500">
              Allow students who missed a CIE for NCC, NSS, sports or medical reasons, though they are not below the minimum.
            </span>
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4">
          {loading && !batches && (
            <p className="py-8 text-center text-sm text-slate-500">Loading students...</p>
          )}

          {batches && rows.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              No IA marks are entered for this subject yet.
            </p>
          )}

          {batches && rows.length > 0 && (
            <>
              {/* FILTERS */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filter === item.value
                        ? "bg-[#283618] text-[#fefae0]"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                    {item.value === "allowed" && ` (${allowedCount})`}
                  </button>
                ))}

                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or register no."
                  className="ml-auto h-8 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#606c38] sm:w-64"
                />
              </div>

              {visibleRows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  {filter === "absent"
                    ? "No student was absent in an IA. Choose All students to allow someone else."
                    : filter === "allowed"
                    ? "No student is allowed yet."
                    : "No student matches the search."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#e6e0c8]">
                  <table className="w-full min-w-max border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#283618] text-[11px] font-bold uppercase tracking-wider text-[#fefae0]">
                        <th className="w-10 px-2 py-2 text-center">#</th>
                        <th className="px-3 py-2 text-left">Student</th>
                        <th className="px-3 py-2 text-center">Absent in</th>
                        <th className="px-3 py-2 text-center">CIE</th>
                        <th className="px-3 py-2 text-left">Improvement test</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map(({ student, batchData }, index) => {
                        const absent = absentIAs(student, batchData.partNumbers);
                        const choice = choices[student.studentId] || {};
                        const busy = busyId === student.studentId;

                        return (
                          <tr
                            key={student.studentId}
                            className="border-b border-[#efeadb] last:border-0 hover:bg-[#faf8f0]"
                          >
                            <td className="px-2 py-2.5 text-center text-xs text-slate-400">
                              {index + 1}
                            </td>

                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <StudentPhoto
                                  imageUrl={student.imageUrl}
                                  name={student.name}
                                  registerNumber={student.registerNumber}
                                />
                                <div>
                                  <p className="font-semibold text-slate-800">{student.name}</p>
                                  <p className="font-mono text-[11px] text-slate-400">
                                    {student.registerNumber} · B{batchData.batchNumber}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              {absent.length === 0 ? (
                                <span className="text-slate-300">—</span>
                              ) : (
                                <span className="flex flex-wrap justify-center gap-1">
                                  {absent.map((number) => (
                                    <span
                                      key={number}
                                      className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600"
                                    >
                                      {iaShortLabel(number)}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-block min-w-9 rounded-full px-2 py-0.5 text-sm font-bold ${
                                  student.belowMinimum
                                    ? "bg-red-50 text-red-600"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {formatScore(student.finalBeforeImprovement)}
                              </span>
                            </td>

                            <td className="px-3 py-2.5">
                              {student.special ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                    <ShieldCheck size={12} />
                                    Allowed · {student.special.reason}
                                    {student.special.note && ` (${student.special.note})`}
                                  </span>
                                  {!student.improvement && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => remove(student)}
                                      className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                                    >
                                      Remove
                                    </button>
                                  )}
                                  {student.improvement && (
                                    <span className="text-xs text-slate-400">Marks saved</span>
                                  )}
                                </div>
                              ) : student.belowMinimum ? (
                                <span className="text-xs font-medium text-slate-500">
                                  Below the minimum of {formatScore(firstBatch?.cieMin)}; already on the improvement test
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={choice.reason || ""}
                                    onChange={(e) =>
                                      setChoice(student.studentId, { reason: e.target.value })
                                    }
                                    aria-label={`Reason for ${student.name}`}
                                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#606c38]"
                                  >
                                    <option value="">Reason...</option>
                                    {REASONS.map((reason) => (
                                      <option key={reason} value={reason}>
                                        {reason}
                                      </option>
                                    ))}
                                  </select>

                                  {choice.reason && (
                                    <input
                                      type="text"
                                      value={choice.note || ""}
                                      maxLength={200}
                                      onChange={(e) =>
                                        setChoice(student.studentId, { note: e.target.value })
                                      }
                                      placeholder={
                                        choice.reason === "Other"
                                          ? "Write the reason"
                                          : "Detail (optional)"
                                      }
                                      className="h-8 w-48 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-[#606c38]"
                                    />
                                  )}

                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => allow(student, batchData)}
                                    className="h-8 rounded-lg bg-[#283618] px-3 text-xs font-bold text-[#fefae0] transition hover:bg-[#3b4a26] disabled:opacity-50"
                                  >
                                    {busy ? "Saving..." : "Allow"}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-3 text-xs text-slate-500">
                Allowed students appear on the faculty&apos;s Improvement Test with the reason. A permission can be removed until their improvement marks are saved.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
