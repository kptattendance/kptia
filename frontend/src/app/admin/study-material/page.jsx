"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { RefreshCw } from "lucide-react";
import EntryStatusGrid, {
  getDepartmentLabel,
} from "../components/EntryStatusGrid";
import StudyMaterialTable from "../../components/StudyMaterialTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const terms = {
  odd: [1, 3, 5],
  even: [2, 4, 6],
};

// The academic year starts in July.
const getCurrentAcademicStartYear = () => {
  const today = new Date();

  return today.getMonth() >= 6
    ? today.getFullYear()
    : today.getFullYear() - 1;
};

const formatAcademicYear = (startYear) =>
  `${startYear}-${String(startYear + 1).slice(-2)}`;

const formatGB = (bytes) =>
  `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;

export default function AdminStudyMaterialPage() {
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
  // FILTERS
  // ---------------------------------------------------

  const [academicYear, setAcademicYear] = useState(
    formatAcademicYear(currentStartYear)
  );

  // Odd semesters run from July to December.
  const [term, setTerm] = useState(
    new Date().getMonth() >= 6 ? "odd" : "even"
  );

  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  const [rows, setRows] = useState([]);
  const [maxFileSize, setMaxFileSize] = useState(
    10 * 1024 * 1024
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Google Drive connection
  const [drive, setDrive] = useState(null);

  // { department, semester }
  const [selected, setSelected] = useState(null);

  // =====================================================
  // GOOGLE DRIVE STATUS
  // =====================================================

  useEffect(() => {
    const loadDriveStatus = async () => {
      try {
        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/materials/drive-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setDrive(response.data?.data || null);
      } catch (err) {
        console.error("Drive status error:", err);

        setDrive({
          connected: false,
          message:
            "Could not check the Google Drive connection.",
        });
      }
    };

    loadDriveStatus();
  }, [getToken]);

  // =====================================================
  // LOAD EVERY SUBJECT WITH ITS STUDY MATERIAL
  // =====================================================

  const loadMaterials = useCallback(async () => {
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
          params: { academicYear },
        }
      );

      setRows(response.data?.data || []);

      if (response.data?.maxFileSize) {
        setMaxFileSize(response.data.maxFileSize);
      }
    } catch (err) {
      console.error(
        "Admin study material error:",
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
  }, [academicYear, getToken]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // =====================================================
  // GRID CELLS
  // approved subjects out of all subjects
  // =====================================================

  const cells = useMemo(() => {
    const result = {};

    rows.forEach((row) => {
      const key = `${row.subject.department}_${row.subject.semester}`;

      if (!result[key]) {
        result[key] = {
          entered: 0,
          total: 0,
        };
      }

      result[key].total += 1;

      if (row.material?.approved) {
        result[key].entered += 1;
      }
    });

    return result;
  }, [rows]);

  const semesters = terms[term];

  const summary = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let total = 0;

    rows.forEach((row) => {
      if (!semesters.includes(row.subject.semester)) {
        return;
      }

      total += 1;

      if (row.material?.approved) {
        approved += 1;
      }

      if (row.material?.pending) {
        pending += 1;
      }
    });

    return { approved, pending, total };
  }, [rows, semesters]);

  const selectedRows = useMemo(() => {
    if (!selected) {
      return [];
    }

    return rows.filter(
      (row) =>
        row.subject.department ===
          selected.department &&
        row.subject.semester === selected.semester
    );
  }, [rows, selected]);

  // =====================================================
  // UI
  // =====================================================

  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500";

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="min-h-screen p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Study Material
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            See which departments have uploaded and approved study material, and who uploaded it.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMaterials}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>

      </div>

      {/* GOOGLE DRIVE */}

      {drive &&
        (drive.connected ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            <span className="font-semibold">
              Google Drive connected
            </span>
            {drive.account ? ` · ${drive.account}` : ""}
            {drive.storageLimit
              ? ` · ${formatGB(drive.storageUsed)} of ${formatGB(drive.storageLimit)} used`
              : ""}
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            <span className="font-semibold">
              Google Drive is not connected.
            </span>{" "}
            {drive.message} Faculty cannot upload and students cannot open study material until it is connected.
          </div>
        ))}

      {/* FILTERS */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">

          <div>
            <label className={labelClass}>
              Academic Year
            </label>

            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setSelected(null);
              }}
              className={selectClass}
            >
              {academicYears.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Semesters
            </label>

            <select
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setSelected(null);
              }}
              className={selectClass}
            >
              <option value="odd">Odd (1, 3, 5)</option>
              <option value="even">Even (2, 4, 6)</option>
            </select>
          </div>

        </div>

      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      {!error && (
        <p className="mb-3 text-sm font-semibold text-slate-700">
          {loading && rows.length === 0
            ? "Loading study material..."
            : `${academicYear}: ${summary.approved} of ${summary.total} subjects have approved study material${
                summary.pending > 0
                  ? ` · ${summary.pending} waiting for HOD approval`
                  : ""
              }`}
        </p>
      )}

      {/* GRID */}

      {!error && (
        <EntryStatusGrid
          cells={cells}
          semesters={semesters}
          selectedKey={
            selected
              ? `${selected.department}_${selected.semester}`
              : ""
          }
          onSelect={(department, semester) =>
            setSelected({ department, semester })
          }
          note="Each cell shows subjects with approved study material out of all subjects. Click a cell to see its subjects."
        />
      )}

      {/* SUBJECTS OF THE SELECTED CELL */}

      {selected && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              {getDepartmentLabel(selected.department)} · Semester {selected.semester}
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {academicYear}
            </p>
          </div>

          <StudyMaterialTable
            rows={selectedRows}
            academicYear={academicYear}
            maxFileSize={maxFileSize}
            onChanged={loadMaterials}
          />

        </div>
      )}

    </div>
  );
}
