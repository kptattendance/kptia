"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { RefreshCw } from "lucide-react";
import StudyMaterialTable from "./StudyMaterialTable";

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
];

const semesters = [1, 2, 3, 4, 5, 6];

// The academic year starts in July.
const getCurrentAcademicStartYear = () => {
  const today = new Date();

  return today.getMonth() >= 6
    ? today.getFullYear()
    : today.getFullYear() - 1;
};

const formatAcademicYear = (startYear) =>
  `${startYear}-${String(startYear + 1).slice(-2)}`;

// =====================================================
// STUDY MATERIAL MANAGER
//
// Faculty: upload the notes PDF of a subject.
// HOD:     see who has uploaded, approve or reject.
//
// fixedDepartment:
//   HOD     -> own department, cannot be changed
//   Faculty -> not passed, department is selected
// =====================================================

export default function StudyMaterialManager({
  fixedDepartment,
  description,
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

  const [academicYear, setAcademicYear] = useState(
    formatAcademicYear(currentStartYear)
  );

  const [selectedDepartment, setSelectedDepartment] =
    useState("");

  const [semester, setSemester] = useState("");

  const department =
    fixedDepartment || selectedDepartment;

  const [rows, setRows] = useState([]);
  const [maxFileSize, setMaxFileSize] = useState(
    10 * 1024 * 1024
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD
  // =====================================================

  const loadMaterials = useCallback(async () => {
    if (!department) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = await getToken();

      const response = await axios.get(
        `${API_URL}/api/materials`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            academicYear,
            department,
            ...(semester ? { semester } : {}),
          },
        }
      );

      setRows(response.data?.data || []);

      if (response.data?.maxFileSize) {
        setMaxFileSize(response.data.maxFileSize);
      }
    } catch (err) {
      console.error(
        "Load study material error:",
        err
      );

      setRows([]);

      setError(
        err.response?.data?.message ||
          "Failed to load study material."
      );
    } finally {
      setLoading(false);
    }
  }, [academicYear, department, semester, getToken]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // =====================================================
  // SUMMARY
  // =====================================================

  const summary = useMemo(() => {
    let approved = 0;
    let pending = 0;

    rows.forEach((row) => {
      if (row.material?.pending) {
        pending += 1;
      }

      if (row.material?.approved) {
        approved += 1;
      }
    });

    return { approved, pending };
  }, [rows]);

  // =====================================================
  // UI
  // =====================================================

  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 disabled:bg-slate-50 disabled:text-slate-500";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Study Material
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={loadMaterials}
          disabled={!department || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>

      </div>

      {/* SELECTION */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid gap-4 sm:grid-cols-3 lg:max-w-3xl">

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
              onChange={(e) =>
                setSelectedDepartment(e.target.value)
              }
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
              onChange={(e) =>
                setSemester(e.target.value)
              }
              className={selectClass}
            >
              <option value="">All semesters</option>

              {semesters.map((item) => (
                <option key={item} value={item}>
                  Semester {item}
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

      {/* SUBJECTS */}

      {!department ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Select a department to see its subjects.
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Loading subjects...
        </div>
      ) : rows.length === 0 ? (
        !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
            No subjects found for this selection.
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-slate-900">
              {summary.approved} of {rows.length} subjects have approved study material
              {summary.pending > 0
                ? ` · ${summary.pending} waiting for approval`
                : ""}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              One PDF per subject, up to {Math.round(maxFileSize / (1024 * 1024))} MB. Students can view it on the website but cannot download it.
            </p>
          </div>

          <StudyMaterialTable
            rows={rows}
            academicYear={academicYear}
            maxFileSize={maxFileSize}
            onChanged={loadMaterials}
          />

        </div>
      )}

    </div>
  );
}
