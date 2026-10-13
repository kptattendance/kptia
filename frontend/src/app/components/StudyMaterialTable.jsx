"use client";

import { useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Check,
  Eye,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import PdfViewer from "./PdfViewer";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const formatSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

// =====================================================
// STUDY MATERIAL TABLE
//
// Subjects with their study material: status, who
// uploaded it, and the actions the signed-in user is
// allowed (the server decides and sends canUpload /
// canManage for every subject).
//
// Used by the faculty, HOD and admin pages.
//
// rows: [{ subject, material, canUpload, canManage }]
// =====================================================

export default function StudyMaterialTable({
  rows,
  academicYear,
  maxFileSize,
  showDepartment = false,
  onChanged,
}) {
  const { getToken } = useAuth();
  const { user } = useUser();

  const fileInputRef = useRef(null);

  // Subject the chosen file is for
  const uploadSubjectRef = useRef(null);

  // { subjectId, percent }
  const [uploading, setUploading] = useState(null);

  // Material ID an approve / reject / delete is running for
  const [busyId, setBusyId] = useState("");

  // { material, version, title, subtitle }
  const [viewing, setViewing] = useState(null);

  const authHeaders = async () => ({
    Authorization: `Bearer ${await getToken()}`,
  });

  const showError = (title, err, fallback) =>
    Swal.fire({
      icon: "error",
      title,
      text: err.response?.data?.message || fallback,
      confirmButtonColor: "#0f172a",
    });

  // =====================================================
  // UPLOAD
  //
  // 1. Ask the server for a one-time Google Drive address.
  // 2. Send the PDF straight to Google Drive.
  // 3. Tell the server, which checks the file and marks
  //    it as waiting for the HOD.
  // =====================================================

  const chooseFile = (subject) => {
    uploadSubjectRef.current = subject;
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (event) => {
    const file = event.target.files?.[0];

    // Allow the same file to be chosen again later.
    event.target.value = "";

    const subject = uploadSubjectRef.current;

    if (!file || !subject) {
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !/\.pdf$/i.test(file.name)
    ) {
      await Swal.fire({
        icon: "warning",
        title: "PDF Only",
        text: "Please choose a PDF file.",
        confirmButtonColor: "#0f172a",
      });

      return;
    }

    if (file.size > maxFileSize) {
      await Swal.fire({
        icon: "warning",
        title: "File Too Large",
        text: `This file is ${formatSize(file.size)}. The limit is ${formatSize(maxFileSize)}. Please reduce its size and try again.`,
        confirmButtonColor: "#0f172a",
      });

      return;
    }

    try {
      setUploading({
        subjectId: subject._id,
        percent: 0,
      });

      const sessionResponse = await axios.post(
        `${API_URL}/api/materials/upload-session`,
        {
          subjectId: subject._id,
          academicYear,
          fileName: file.name,
          size: file.size,
        },
        { headers: await authHeaders() }
      );

      const driveResponse = await axios.put(
        sessionResponse.data.uploadUrl,
        file,
        {
          headers: {
            "Content-Type": "application/pdf",
          },
          onUploadProgress: (progress) => {
            setUploading({
              subjectId: subject._id,
              percent: Math.round(
                (progress.loaded / file.size) * 100
              ),
            });
          },
        }
      );

      const completeResponse = await axios.post(
        `${API_URL}/api/materials/complete`,
        {
          subjectId: subject._id,
          academicYear,
          driveFileId: driveResponse.data?.id,
          fileName: file.name,
        },
        { headers: await authHeaders() }
      );

      await onChanged();

      await Swal.fire({
        icon: "success",
        title: "Uploaded",
        text: completeResponse.data?.message,
        confirmButtonColor: "#0f172a",
      });
    } catch (err) {
      console.error(
        "Study material upload error:",
        err
      );

      await showError(
        "Upload Failed",
        err,
        "The file could not be uploaded. Please check your internet connection and try again."
      );
    } finally {
      setUploading(null);
    }
  };

  // =====================================================
  // APPROVE / REJECT / DELETE
  // =====================================================

  const handleApprove = async (row) => {
    const confirmation = await Swal.fire({
      icon: "question",
      title: "Approve Study Material?",
      text: `${row.subject.code} · ${row.subject.name}. Students of this semester will be able to view it.`,
      showCancelButton: true,
      confirmButtonText: "Approve",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#0f172a",
      cancelButtonColor: "#94a3b8",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setBusyId(row.material._id);

      await axios.post(
        `${API_URL}/api/materials/${row.material._id}/approve`,
        {},
        { headers: await authHeaders() }
      );

      await onChanged();
    } catch (err) {
      console.error("Approve material error:", err);

      await showError(
        "Unable to Approve",
        err,
        "Failed to approve the study material."
      );

      await onChanged();
    } finally {
      setBusyId("");
    }
  };

  const handleReject = async (row) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Reject Study Material?",
      text: `${row.subject.code} · ${row.subject.name}. The faculty will see your reason and can upload a corrected file.`,
      input: "textarea",
      inputPlaceholder: "Reason for rejecting",
      inputAttributes: {
        maxlength: "500",
        "aria-label": "Reason for rejecting",
      },
      inputValidator: (value) =>
        value.trim()
          ? undefined
          : "Please enter the reason.",
      showCancelButton: true,
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#94a3b8",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setBusyId(row.material._id);

      await axios.post(
        `${API_URL}/api/materials/${row.material._id}/reject`,
        { remark: result.value },
        { headers: await authHeaders() }
      );

      await onChanged();
    } catch (err) {
      console.error("Reject material error:", err);

      await showError(
        "Unable to Reject",
        err,
        "Failed to reject the study material."
      );

      await onChanged();
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (row) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete Study Material?",
      text: `${row.subject.code} · ${row.subject.name}. The file will be removed for everyone, including students. This cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#94a3b8",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setBusyId(row.material._id);

      await axios.delete(
        `${API_URL}/api/materials/${row.material._id}`,
        { headers: await authHeaders() }
      );

      await onChanged();
    } catch (err) {
      console.error("Delete material error:", err);

      await showError(
        "Unable to Delete",
        err,
        "Failed to delete the study material."
      );
    } finally {
      setBusyId("");
    }
  };

  // =====================================================
  // VIEW
  // =====================================================

  const openViewer = (row, version) => {
    const file = row.material[version];

    setViewing({
      material: {
        _id: row.material._id,
        size: file.size,
      },
      version,
      title: `${row.subject.code} · ${row.subject.name}`,
      subtitle:
        version === "pending"
          ? "Waiting for approval"
          : "",
    });
  };

  // =====================================================
  // UI
  // =====================================================

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  const renderStatus = (material) => {
    if (material?.pending) {
      return (
        <div>
          <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            Waiting for HOD approval
          </span>

          {material.approved && (
            <p className="mt-1 text-xs text-slate-500">
              Students still see the earlier file.
            </p>
          )}
        </div>
      );
    }

    if (material?.approved) {
      return (
        <div>
          <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            Approved
          </span>

          <p className="mt-1 text-xs text-slate-500">
            Visible to students
            {material.approved.approvedByName
              ? ` · approved by ${material.approved.approvedByName}`
              : ""}
          </p>
        </div>
      );
    }

    if (material?.rejection) {
      return (
        <div>
          <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
            Rejected
          </span>

          <p className="mt-1 max-w-xs text-xs text-slate-600">
            {material.rejection.remark}
            {material.rejection.rejectedByName
              ? ` (${material.rejection.rejectedByName})`
              : ""}
          </p>
        </div>
      );
    }

    return (
      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
        Not uploaded
      </span>
    );
  };

  return (
    <>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChosen}
        className="hidden"
      />

      <div className="overflow-x-auto">

        <table className="w-full min-w-[820px] text-sm">

          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Uploaded by</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">

            {rows.map((row) => {
              const { subject, material } = row;

              // The file the "uploaded by" column describes
              const file =
                material?.pending || material?.approved;

              const isUploading =
                uploading?.subjectId === subject._id;

              const busy =
                Boolean(material) &&
                busyId === material._id;

              const canViewPending =
                material?.pending &&
                (row.canManage ||
                  material.pending.uploadedByMe);

              return (
                <tr key={subject._id}>

                  <td className="px-5 py-3 align-top">
                    <p className="font-mono text-xs font-bold text-slate-700">
                      {subject.code}
                      {subject.subjectCategory !==
                        "REGULAR" && (
                        <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide text-slate-500">
                          {subject.subjectCategory}
                        </span>
                      )}
                    </p>

                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {subject.name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {showDepartment
                        ? `${subject.department.toUpperCase()} · `
                        : ""}
                      Semester {subject.semester}
                    </p>
                  </td>

                  <td className="px-4 py-3 align-top">
                    {renderStatus(material)}
                  </td>

                  <td className="px-4 py-3 align-top">
                    {file ? (
                      <>
                        <p className="text-sm font-medium text-slate-900">
                          {file.uploadedByName ||
                            "Faculty"}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(file.uploadedAt)}
                          {" · "}
                          {formatSize(file.size)}
                        </p>
                      </>
                    ) : (
                      <span className="text-slate-400">
                        -
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top">

                    <div className="flex flex-wrap justify-end gap-2">

                      {material?.approved && (
                        <button
                          type="button"
                          onClick={() =>
                            openViewer(row, "approved")
                          }
                          className={buttonClass}
                        >
                          <Eye size={14} />
                          View
                        </button>
                      )}

                      {canViewPending && (
                        <button
                          type="button"
                          onClick={() =>
                            openViewer(row, "pending")
                          }
                          className={buttonClass}
                        >
                          <Eye size={14} />
                          View new file
                        </button>
                      )}

                      {row.canManage &&
                        material?.pending && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleApprove(row)
                              }
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check size={14} />
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleReject(row)
                              }
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X size={14} />
                              Reject
                            </button>
                          </>
                        )}

                      {row.canUpload && (
                        <button
                          type="button"
                          onClick={() =>
                            chooseFile(subject)
                          }
                          disabled={Boolean(uploading)}
                          className={buttonClass}
                        >
                          <Upload size={14} />
                          {isUploading
                            ? `Uploading ${uploading.percent}%`
                            : file
                            ? "Replace PDF"
                            : "Upload PDF"}
                        </button>
                      )}

                      {row.canManage && material && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(row)
                          }
                          disabled={busy}
                          aria-label={`Delete study material of ${subject.code}`}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                    </div>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

      </div>

      {viewing && (
        <PdfViewer
          material={viewing.material}
          version={viewing.version}
          title={viewing.title}
          subtitle={viewing.subtitle}
          watermark={
            user?.primaryEmailAddress?.emailAddress ||
            "KPT"
          }
          onClose={() => setViewing(null)}
        />
      )}

    </>
  );
}
