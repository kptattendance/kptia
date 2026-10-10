"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import { Plus, Save, Trash2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const MAX_PSOS = 5;

export default function HODProgramOutcomesPage() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();

  // HOD department comes from Clerk metadata.
  const department = String(
    user?.publicMetadata?.department || ""
  )
    .trim()
    .toLowerCase();

  const [pos, setPos] = useState([]);
  const [psos, setPsos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD
  // =====================================================

  useEffect(() => {
    const loadProgram = async () => {
      if (!isLoaded) {
        return;
      }

      if (!department) {
        setError("Your department is not assigned.");
        setLoading(false);
        return;
      }

      try {
        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/course-outcomes/program/${department}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setPos(response.data?.data?.pos || []);

        setPsos(
          (response.data?.data?.psos || []).map(
            (pso) => ({
              statement: pso.statement || "",
            })
          )
        );
      } catch (err) {
        console.error(
          "Load program outcomes error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to load program outcomes."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProgram();
  }, [isLoaded, department, getToken]);

  // =====================================================
  // EDIT
  // =====================================================

  const updatePSO = (index, value) => {
    setPsos((prev) =>
      prev.map((pso, psoIndex) =>
        psoIndex === index
          ? { statement: value }
          : pso
      )
    );
  };

  const addPSO = () => {
    setPsos((prev) =>
      prev.length >= MAX_PSOS
        ? prev
        : [...prev, { statement: "" }]
    );
  };

  const removePSO = (index) => {
    setPsos((prev) =>
      prev.filter((_, psoIndex) => psoIndex !== index)
    );
  };

  // =====================================================
  // SAVE
  // =====================================================

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const emptyIndex = psos.findIndex(
      (pso) => !pso.statement.trim()
    );

    if (emptyIndex !== -1) {
      await Swal.fire({
        icon: "warning",
        title: "Statement Required",
        text: `Please enter the statement of PSO${emptyIndex + 1}, or remove it.`,
        confirmButtonColor: "#0f172a",
      });

      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      await axios.put(
        `${API_URL}/api/course-outcomes/program/${department}`,
        { psos },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await Swal.fire({
        icon: "success",
        title: "PSOs Saved",
        text: "Faculty can now map their course outcomes to these PSOs.",
        confirmButtonColor: "#0f172a",
      });
    } catch (err) {
      console.error("Save PSOs error:", err);

      await Swal.fire({
        icon: "error",
        title: "Unable to Save",
        text:
          err.response?.data?.message ||
          "Failed to save program specific outcomes.",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  const cardClass =
    "mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8">
        <p className="text-sm font-semibold text-slate-500">
          {department
            ? `${department.toUpperCase()} Department`
            : "HOD Portal"}
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Program Outcomes
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Program outcomes are common to every diploma programme. Program specific outcomes are defined by the department.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Loading program outcomes...
        </div>
      ) : (
        !error && (
          <>

            {/* PSOs */}

            <div className={cardClass}>

              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Program Specific Outcomes (PSOs)
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Up to {MAX_PSOS} PSOs. Removing a PSO also removes it from the CO mapping the next time a subject is saved.
                  </p>
                </div>

                {psos.length < MAX_PSOS && (
                  <button
                    type="button"
                    onClick={addPSO}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={16} />
                    Add PSO
                  </button>
                )}
              </div>

              {psos.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  No PSOs defined yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {psos.map((pso, index) => (
                    <div
                      key={index}
                      className="flex gap-4 px-5 py-5"
                    >
                      <div className="flex h-9 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                        PSO{index + 1}
                      </div>

                      <textarea
                        value={pso.statement}
                        onChange={(e) =>
                          updatePSO(
                            index,
                            e.target.value
                          )
                        }
                        rows={2}
                        placeholder="Statement of the program specific outcome"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500"
                      />

                      <button
                        type="button"
                        onClick={() => removePSO(index)}
                        aria-label={`Remove PSO${index + 1}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save PSOs"}
                </button>
              </div>

            </div>

            {/* POs */}

            <div className={cardClass}>

              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Program Outcomes (POs)
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Prescribed by NBA for diploma programmes. These cannot be edited.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {pos.map((po) => (
                  <div
                    key={po.code}
                    className="flex gap-4 px-5 py-4"
                  >
                    <div className="flex h-9 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                      {po.code}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {po.title}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {po.statement}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </>
        )
      )}

    </div>
  );
}
