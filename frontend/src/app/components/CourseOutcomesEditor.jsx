"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { Plus, Save, Trash2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const MAX_COS = 6;

const departments = [
  { value: "at", label: "Automobile Engineering" },
  { value: "ch", label: "Chemical Engineering" },
  { value: "ce", label: "Civil Engineering" },
  { value: "cs", label: "Computer Science Engineering" },
  { value: "ec", label: "Electronics & Communication" },
  { value: "ee", label: "Electrical & Electronics" },
  { value: "me", label: "Mechanical Engineering" },
  { value: "ps", label: "Polymer Engineering" },
];

const semesters = [1, 2, 3, 4, 5, 6];

const bloomLevels = [
  { value: "L1", label: "L1 - Remember" },
  { value: "L2", label: "L2 - Understand" },
  { value: "L3", label: "L3 - Apply" },
  { value: "L4", label: "L4 - Analyse" },
  { value: "L5", label: "L5 - Evaluate" },
  { value: "L6", label: "L6 - Create" },
];

const targetFields = [
  {
    key: "marksPercent",
    label: "Marks a student must score in a CO",
  },
  {
    key: "level1",
    label: "Students needed for Level 1",
  },
  {
    key: "level2",
    label: "Students needed for Level 2",
  },
  {
    key: "level3",
    label: "Students needed for Level 3",
  },
];

// The academic year starts in July.
const getCurrentAcademicStartYear = () => {
  const today = new Date();

  return today.getMonth() >= 6
    ? today.getFullYear()
    : today.getFullYear() - 1;
};

const formatAcademicYear = (startYear) =>
  `${startYear}-${String(startYear + 1).slice(-2)}`;

const emptyCO = () => ({
  statement: "",
  bloomLevel: "",
  mapping: {},
  justification: "",
});

// =====================================================
// COURSE OUTCOMES EDITOR
//
// COs of a subject, their mapping to POs / PSOs and
// the attainment targets.
//
// fixedDepartment:
//   HOD     -> own department, cannot be changed
//   Faculty -> not passed, department is selected
// =====================================================

export default function CourseOutcomesEditor({
  fixedDepartment,
}) {
  const { getToken } = useAuth();

  const currentStartYear = getCurrentAcademicStartYear();

  const academicYears = useMemo(
    () =>
      [
        currentStartYear - 1,
        currentStartYear,
        currentStartYear + 1,
      ].map(formatAcademicYear),
    [currentStartYear]
  );

  // ---------------------------------------------------
  // SELECTION
  // ---------------------------------------------------

  const [academicYear, setAcademicYear] = useState(
    formatAcademicYear(currentStartYear)
  );

  const [selectedDepartment, setSelectedDepartment] =
    useState("");

  const [semester, setSemester] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const department =
    fixedDepartment || selectedDepartment;

  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  const [subjects, setSubjects] = useState([]);

  const [pos, setPos] = useState([]);
  const [psos, setPsos] = useState([]);

  const [cos, setCos] = useState([]);
  const [targets, setTargets] = useState({});

  // "saved" | "template" | "new" | ""
  const [source, setSource] = useState("");
  const [templateYear, setTemplateYear] = useState("");

  const [canEdit, setCanEdit] = useState(false);
  const [editMessage, setEditMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const outcomes = useMemo(
    () => [...pos, ...psos],
    [pos, psos]
  );

  // =====================================================
  // LOAD SUBJECTS
  // =====================================================

  useEffect(() => {
    const loadSubjects = async () => {
      if (!department || !semester) {
        setSubjects([]);
        return;
      }

      try {
        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/subjects/getsubjects`,
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

        setSubjects(response.data?.subjects || []);
      } catch (err) {
        console.error("Load subjects error:", err);
        setSubjects([]);
      }
    };

    loadSubjects();
  }, [department, semester, getToken]);

  // =====================================================
  // LOAD COURSE OUTCOMES
  // =====================================================

  useEffect(() => {
    const loadCourseOutcomes = async () => {
      if (!subjectId) {
        setCos([]);
        setSource("");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/course-outcomes`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              subjectId,
              academicYear,
            },
          }
        );

        const result = response.data;

        const record =
          result.data || result.template;

        setPos(result.pos || []);
        setPsos(result.psos || []);

        setCanEdit(Boolean(result.canEdit));
        setEditMessage(result.editMessage || "");

        setTargets({
          ...result.defaultTargets,
          ...(record?.targets || {}),
        });

        setCos(
          record?.cos?.length
            ? record.cos.map((co) => ({
                statement: co.statement || "",
                bloomLevel: co.bloomLevel || "",
                mapping: { ...(co.mapping || {}) },
                justification:
                  co.justification || "",
              }))
            : [emptyCO()]
        );

        setSource(
          result.data
            ? "saved"
            : result.template
            ? "template"
            : "new"
        );

        setTemplateYear(
          result.template?.academicYear || ""
        );
      } catch (err) {
        console.error(
          "Load course outcomes error:",
          err
        );

        setCos([]);
        setSource("");

        setError(
          err.response?.data?.message ||
            "Failed to load course outcomes."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourseOutcomes();
  }, [subjectId, academicYear, getToken]);

  // =====================================================
  // EDIT
  // =====================================================

  const updateCO = (index, field, value) => {
    setCos((prev) =>
      prev.map((co, coIndex) =>
        coIndex === index
          ? { ...co, [field]: value }
          : co
      )
    );
  };

  const updateMapping = (index, outcome, value) => {
    setCos((prev) =>
      prev.map((co, coIndex) => {
        if (coIndex !== index) {
          return co;
        }

        const mapping = { ...co.mapping };

        if (value === "") {
          delete mapping[outcome];
        } else {
          mapping[outcome] = Number(value);
        }

        return { ...co, mapping };
      })
    );
  };

  const addCO = () => {
    setCos((prev) =>
      prev.length >= MAX_COS
        ? prev
        : [...prev, emptyCO()]
    );
  };

  const removeCO = (index) => {
    setCos((prev) =>
      prev.filter((_, coIndex) => coIndex !== index)
    );
  };

  // =====================================================
  // AVERAGE MAPPING STRENGTH OF AN OUTCOME
  // (average of the COs that are mapped to it)
  // =====================================================

  const getAverage = (outcome) => {
    const values = cos
      .map((co) => Number(co.mapping?.[outcome] || 0))
      .filter((value) => value > 0);

    if (values.length === 0) {
      return "-";
    }

    return (
      values.reduce((total, value) => total + value, 0) /
      values.length
    ).toFixed(2);
  };

  // =====================================================
  // SAVE
  // =====================================================

  const handleSave = async () => {
    if (saving) {
      return;
    }

    for (let i = 0; i < cos.length; i++) {
      if (!cos[i].statement.trim()) {
        await Swal.fire({
          icon: "warning",
          title: "Statement Required",
          text: `Please enter the statement of CO${i + 1}.`,
          confirmButtonColor: "#0f172a",
        });

        return;
      }

      if (!cos[i].bloomLevel) {
        await Swal.fire({
          icon: "warning",
          title: "Bloom's Level Required",
          text: `Please select the Bloom's level of CO${i + 1}.`,
          confirmButtonColor: "#0f172a",
        });

        return;
      }
    }

    try {
      setSaving(true);

      const token = await getToken();

      await axios.put(
        `${API_URL}/api/course-outcomes`,
        {
          subjectId,
          academicYear,
          cos,
          targets,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSource("saved");

      await Swal.fire({
        icon: "success",
        title: "Course Outcomes Saved",
        text: "You can change them again at any time.",
        confirmButtonColor: "#0f172a",
      });
    } catch (err) {
      console.error(
        "Save course outcomes error:",
        err
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to Save",
        text:
          err.response?.data?.message ||
          "Failed to save course outcomes.",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  const cardClass =
    "mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";

  const showEditor =
    subjectId && !loading && !error && source;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Course Outcomes
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Define the course outcomes of a subject, map them to the program outcomes and fix the attainment targets.
        </p>
      </div>

      {/* SELECTION */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div>
            <label className={labelClass}>
              Academic Year
            </label>

            <select
              value={academicYear}
              onChange={(e) =>
                setAcademicYear(e.target.value)
              }
              className={selectClass}
            >
              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Department
            </label>

            <select
              value={department}
              disabled={Boolean(fixedDepartment)}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSubjectId("");
              }}
              className={selectClass}
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

          <div>
            <label className={labelClass}>
              Semester
            </label>

            <select
              value={semester}
              disabled={!department}
              onChange={(e) => {
                setSemester(e.target.value);
                setSubjectId("");
              }}
              className={selectClass}
            >
              <option value="">
                Select semester
              </option>

              {semesters.map((item) => (
                <option key={item} value={item}>
                  Semester {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Subject
            </label>

            <select
              value={subjectId}
              disabled={!semester}
              onChange={(e) =>
                setSubjectId(e.target.value)
              }
              className={selectClass}
            >
              <option value="">
                Select subject
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

        </div>

      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!subjectId && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Select a subject to define its course outcomes.
        </div>
      )}

      {subjectId && loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Loading course outcomes...
        </div>
      )}

      {showEditor && (
        <>

          {/* STATUS */}

          {source === "template" && (
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900">
              Nothing is saved for {academicYear} yet. The course outcomes of {templateYear} are shown below. Review them and save to use them for {academicYear}.
            </div>
          )}

          {source === "new" && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
              Course outcomes are not defined for this subject yet.
            </div>
          )}

          {!canEdit && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4 text-sm leading-6 text-slate-700">
              View only. {editMessage}
            </div>
          )}

          {/* COURSE OUTCOMES */}

          <div className={cardClass}>

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Course Outcomes
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  CO1 to CO6 are the same codes used while entering IA marks.
                </p>
              </div>

              {canEdit && cos.length < MAX_COS && (
                <button
                  type="button"
                  onClick={addCO}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={16} />
                  Add CO
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">

              {cos.map((co, index) => (
                <div
                  key={index}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[64px_minmax(0,1fr)_200px_40px]"
                >

                  <div className="flex h-9 w-14 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                    CO{index + 1}
                  </div>

                  <div className="space-y-3">
                    <textarea
                      value={co.statement}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateCO(
                          index,
                          "statement",
                          e.target.value
                        )
                      }
                      rows={2}
                      placeholder="After completing this course, the student will be able to..."
                      className={selectClass}
                    />

                    <textarea
                      value={co.justification}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateCO(
                          index,
                          "justification",
                          e.target.value
                        )
                      }
                      rows={1}
                      placeholder="Justification for the PO / PSO mapping (optional)"
                      className={selectClass}
                    />
                  </div>

                  <select
                    value={co.bloomLevel}
                    disabled={!canEdit}
                    onChange={(e) =>
                      updateCO(
                        index,
                        "bloomLevel",
                        e.target.value
                      )
                    }
                    className={`${selectClass} h-fit`}
                  >
                    <option value="">
                      Bloom&apos;s level
                    </option>

                    {bloomLevels.map((level) => (
                      <option
                        key={level.value}
                        value={level.value}
                      >
                        {level.label}
                      </option>
                    ))}
                  </select>

                  {canEdit && cos.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeCO(index)}
                      aria-label={`Remove CO${index + 1}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <span />
                  )}

                </div>
              ))}

            </div>

          </div>

          {/* CO - PO / PSO MAPPING */}

          <div className={cardClass}>

            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                CO - PO / PSO Mapping
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                3 = High, 2 = Medium, 1 = Low, blank = not mapped.
              </p>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[720px] text-sm">

                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      CO
                    </th>

                    {outcomes.map((outcome) => (
                      <th
                        key={outcome.code}
                        title={
                          outcome.title ||
                          outcome.statement
                        }
                        className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        {outcome.code}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {cos.map((co, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-xs font-bold text-slate-700">
                        CO{index + 1}
                      </td>

                      {outcomes.map((outcome) => (
                        <td
                          key={outcome.code}
                          className="px-1 py-2 text-center"
                        >
                          <select
                            value={
                              co.mapping?.[
                                outcome.code
                              ] ?? ""
                            }
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateMapping(
                                index,
                                outcome.code,
                                e.target.value
                              )
                            }
                            aria-label={`CO${index + 1} to ${outcome.code}`}
                            className="w-14 rounded-lg border border-slate-200 bg-white px-1 py-1.5 text-center text-sm text-slate-700 outline-none focus:border-slate-500 disabled:bg-slate-50"
                          >
                            <option value="">-</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}

                  <tr className="bg-slate-50">
                    <td className="px-4 py-3 text-xs font-bold text-slate-700">
                      Average
                    </td>

                    {outcomes.map((outcome) => (
                      <td
                        key={outcome.code}
                        className="px-1 py-3 text-center text-xs font-bold text-slate-700"
                      >
                        {getAverage(outcome.code)}
                      </td>
                    ))}
                  </tr>

                </tbody>

              </table>

            </div>

            <div className="border-t border-slate-100 px-5 py-4">

              <div className="grid gap-x-8 gap-y-1.5 text-xs leading-5 text-slate-500 md:grid-cols-2">
                {outcomes.map((outcome) => (
                  <p key={outcome.code}>
                    <span className="font-bold text-slate-700">
                      {outcome.code}
                    </span>
                    {": "}
                    {outcome.title || outcome.statement}
                  </p>
                ))}
              </div>

              {psos.length === 0 && (
                <p className="mt-3 text-xs font-medium text-amber-700">
                  The HOD has not defined the program specific outcomes (PSOs) of this department yet, so only POs can be mapped.
                </p>
              )}

            </div>

          </div>

          {/* ATTAINMENT TARGETS */}

          <div className={cardClass}>

            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Attainment Targets
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                A student attains a CO by scoring at least the marks percentage below. The attainment level of the CO depends on how many students attained it.
              </p>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">

              {targetFields.map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>
                    {field.label}
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={targets[field.key] ?? ""}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setTargets((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className={`${selectClass} pr-9`}
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              ))}

            </div>

          </div>

          {/* SAVE */}

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={17} />
                {saving
                  ? "Saving..."
                  : "Save Course Outcomes"}
              </button>
            </div>
          )}

        </>
      )}

    </div>
  );
}
