"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { Check, RotateCcw, Save, Wand2 } from "lucide-react";
import { BRIDGE_GROUPS } from "../../utils/bridgeEligibility";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// =====================================================
// BRIDGE COURSES - WHO TAKES EACH ONE
//
// Every bridge subject with a tick for each student
// group: PUC, ITI same trade, ITI cross trade, branch
// change. The faculty IA page then lists only the
// students of the ticked groups. A subject with nothing
// saved yet goes to all lateral students.
// =====================================================

const examType = (code) => {
  const value = String(code || "").toUpperCase();

  if (/P$/.test(value)) return "Practical only";
  if (/T\d?$/.test(value)) return "Written";

  return "—";
};

// The approved Sem 3 list (department meeting):
// Maths and English: ITI same + ITI cross
// Graphics / drawing: PUC
// Core subject of the branch: PUC + ITI cross
//   (Electrical: also branch change)
const approvedGroups = (subject) => {
  if (Number(subject.semester) !== 3) {
    return null;
  }

  const code = String(subject.code || "").toUpperCase();
  const department = String(subject.department || "").toUpperCase();

  if (code === "25SC11T0" || code === "25EG010P") {
    return ["lateralITI", "lateralCross"];
  }

  if (/^25(AT|CE|CH|CS|EC|EE|ME|PS)11T0$/.test(code)) {
    return department === "EE"
      ? ["lateralPUC", "lateralCross", "branchChange"]
      : ["lateralPUC", "lateralCross"];
  }

  // Engineering graphics / drawing
  return ["lateralPUC"];
};

const sameGroups = (a = [], b = []) =>
  a.length === b.length && a.every((group) => b.includes(group));

export default function BridgeCoursesPage() {
  const { getToken } = useAuth();

  const [subjects, setSubjects] = useState([]);
  // subjectId -> groups being edited
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [semester, setSemester] = useState("3");
  const [department, setDepartment] = useState("all");

  const load = useCallback(async () => {
    try {
      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/subjects/bridge-courses`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const list = response.data?.data || [];

      setSubjects(list);
      setDraft(
        Object.fromEntries(
          list.map((subject) => [subject._id, subject.bridgeFor || []])
        )
      );
    } catch (error) {
      console.error("Bridge courses load error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to Load",
        text:
          error.response?.data?.message ||
          "The bridge courses could not be loaded.",
      });
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const semesters = useMemo(
    () => [...new Set(subjects.map((subject) => Number(subject.semester)))].sort(),
    [subjects]
  );

  const departments = useMemo(
    () => [...new Set(subjects.map((subject) => subject.department))].sort(),
    [subjects]
  );

  const shown = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          (semester === "all" || Number(subject.semester) === Number(semester)) &&
          (department === "all" || subject.department === department)
      ),
    [subjects, semester, department]
  );

  const changedIds = useMemo(
    () =>
      subjects
        .filter((subject) => !sameGroups(subject.bridgeFor || [], draft[subject._id] || []))
        .map((subject) => subject._id),
    [subjects, draft]
  );

  const toggle = (id, group) => {
    setDraft((previous) => {
      const current = previous[id] || [];

      return {
        ...previous,
        [id]: current.includes(group)
          ? current.filter((value) => value !== group)
          : [...current, group],
      };
    });
  };

  // Header tick: give / take a group for every subject shown
  const allShownHave = (group) =>
    shown.length > 0 &&
    shown.every((subject) => (draft[subject._id] || []).includes(group));

  const toggleAllShown = (group) => {
    const give = !allShownHave(group);

    setDraft((previous) => {
      const next = { ...previous };

      shown.forEach((subject) => {
        const current = next[subject._id] || [];
        next[subject._id] = give
          ? [...new Set([...current, group])]
          : current.filter((value) => value !== group);
      });

      return next;
    });
  };

  const fillApproved = async () => {
    const result = await Swal.fire({
      icon: "question",
      title: "Fill Semester 3 from the approved list?",
      html:
        "Maths and English: <b>ITI Same + ITI Cross</b><br/>" +
        "Graphics / Drawing: <b>PUC</b><br/>" +
        "Core subject of the branch: <b>PUC + ITI Cross</b> (Electrical also <b>Branch Change</b>)<br/><br/>" +
        "Nothing is saved until you press Save.",
      showCancelButton: true,
      confirmButtonText: "Fill",
      confirmButtonColor: "#283618",
    });

    if (!result.isConfirmed) {
      return;
    }

    setDraft((previous) => {
      const next = { ...previous };

      subjects.forEach((subject) => {
        const groups = approvedGroups(subject);

        if (groups) {
          next[subject._id] = groups;
        }
      });

      return next;
    });
  };

  const resetChanges = () => {
    setDraft(
      Object.fromEntries(
        subjects.map((subject) => [subject._id, subject.bridgeFor || []])
      )
    );
  };

  const save = async () => {
    if (changedIds.length === 0 || saving) {
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      const response = await axios.put(
        `${API_URL}/api/subjects/bridge-courses`,
        {
          updates: changedIds.map((id) => ({ id, bridgeFor: draft[id] || [] })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await Swal.fire({
        icon: "success",
        title: "Saved",
        text: response.data?.message || "Bridge courses saved.",
        timer: 1600,
        showConfirmButton: false,
      });

      await load();
    } catch (error) {
      console.error("Bridge courses save error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to Save",
        text:
          error.response?.data?.message ||
          "The bridge courses could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">Loading bridge courses...</div>
    );
  }

  const headCell =
    "px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500";

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Bridge Courses
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Tick who takes each bridge subject. The faculty IA page then lists only those students. A subject with nothing ticked goes to all lateral students. Mark a student as <b>Branch change</b> in Admin → Students.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fillApproved}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Wand2 size={16} />
              Fill Sem 3 (approved list)
            </button>

            <button
              type="button"
              onClick={resetChanges}
              disabled={changedIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              <RotateCcw size={16} />
              Undo changes
            </button>

            <button
              type="button"
              onClick={save}
              disabled={changedIds.length === 0 || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40"
            >
              <Save size={16} />
              {saving
                ? "Saving..."
                : changedIds.length > 0
                ? `Save ${changedIds.length} change${changedIds.length === 1 ? "" : "s"}`
                : "Saved"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            <option value="all">All semesters</option>
            {semesters.map((value) => (
              <option key={value} value={value}>
                Semester {value}
              </option>
            ))}
          </select>

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            <option value="all">All departments</option>
            {departments.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <span className="self-center text-xs text-slate-500">
            {shown.length} subject{shown.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                <tr>
                  <th className={`${headCell} text-left`}>Sl.</th>
                  <th className={`${headCell} text-left`}>Dept</th>
                  <th className={`${headCell} text-left`}>Sem</th>
                  <th className={`${headCell} text-left`}>Seq.</th>
                  <th className={`${headCell} text-left`}>Subject</th>
                  <th className={`${headCell} text-left`}>Exam</th>
                  {BRIDGE_GROUPS.map((group) => (
                    <th key={group.key} className={`${headCell} text-center`}>
                      {group.label}
                      <label className="mt-1 flex items-center justify-center gap-1 text-[10px] font-medium normal-case tracking-normal text-slate-500">
                        <input
                          type="checkbox"
                          checked={allShownHave(group.key)}
                          onChange={() => toggleAllShown(group.key)}
                          className="h-3 w-3"
                        />
                        all shown
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {shown.map((subject, index) => {
                  const groups = draft[subject._id] || [];
                  const changed = changedIds.includes(subject._id);
                  const notSet = !changed && !(subject.bridgeFor || []).length;
                  const exam = examType(subject.code);

                  return (
                    <tr
                      key={subject._id}
                      className={
                        changed
                          ? "bg-rose-50"
                          : notSet
                          ? "bg-amber-50/60"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-3 py-3 font-bold text-slate-800">{subject.department}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{subject.semester}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-500">{subject.sequence}</td>
                      <td className="px-3 py-3">
                        <p className="font-bold text-slate-900">{subject.code}</p>
                        <p className="text-xs text-slate-500">{subject.name}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            exam === "Written"
                              ? "bg-indigo-50 text-indigo-700"
                              : exam === "Practical only"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {exam}
                        </span>
                      </td>
                      {BRIDGE_GROUPS.map((group) => {
                        const on = groups.includes(group.key);

                        return (
                          <td key={group.key} className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggle(subject._id, group.key)}
                              aria-pressed={on}
                              aria-label={`${subject.code} ${group.label}`}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                on
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-300 bg-white text-transparent hover:border-slate-400"
                              }`}
                            >
                              <Check size={16} strokeWidth={3} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-4 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-200" />
              not set yet (goes to all laterals)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-200" />
              changed, not saved
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
