"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { BookOpen } from "lucide-react";
import PdfViewer from "../../components/PdfViewer";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

export default function StudentStudyMaterialPage() {
  const { getToken } = useAuth();

  const [student, setStudent] = useState(null);
  const [academicYear, setAcademicYear] = useState("");
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // { material, title }
  const [viewing, setViewing] = useState(null);

  // =====================================================
  // LOAD
  // =====================================================

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const token = await getToken();

        const response = await axios.get(
          `${API_URL}/api/materials/student`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setStudent(response.data?.student || null);
        setAcademicYear(
          response.data?.academicYear || ""
        );
        setSubjects(response.data?.data || []);
      } catch (err) {
        console.error(
          "Student study material error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to load study material."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMaterials();
  }, [getToken]);

  return (
    <div className="min-h-screen p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Study Material
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {student
            ? `Notes for your Semester ${student.semester} subjects, ${academicYear}. They can be read here but not downloaded.`
            : "Notes uploaded by your faculty."}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Loading study material...
        </div>
      ) : (
        !error &&
        (subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
            No subjects found for your semester.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {subjects.map(({ subject, material }) => (
              <div
                key={subject._id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >

                <p className="font-mono text-xs font-bold text-slate-500">
                  {subject.code}
                </p>

                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  {subject.name}
                </h2>

                {material ? (
                  <>
                    <p className="mt-2 text-xs text-slate-500">
                      {material.uploadedByName
                        ? `By ${material.uploadedByName} · `
                        : ""}
                      {formatDate(material.approvedAt)}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setViewing({
                          material,
                          title: `${subject.code} · ${subject.name}`,
                        })
                      }
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <BookOpen size={16} />
                      Read notes
                    </button>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    Notes are not available yet.
                  </p>
                )}

              </div>
            ))}

          </div>
        ))
      )}

      {viewing && (
        <PdfViewer
          material={viewing.material}
          title={viewing.title}
          watermark={
            student
              ? `${student.registerNumber} · ${student.name}`
              : ""
          }
          onClose={() => setViewing(null)}
        />
      )}

    </div>
  );
}
