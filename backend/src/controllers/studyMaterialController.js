import mongoose from "mongoose";
import StudyMaterial from "../models/StudyMaterial.js";
import Subject from "../models/Subject.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import CourseAllocation from "../models/CourseAllocation.js";
import {
  getAcademicYearForMonth,
  getAllocationError,
} from "./courseAllocationController.js";
import {
  DriveError,
  checkDriveConnection,
  createUploadSession,
  getFile,
  readFileRange,
  deleteFile,
} from "../config/googleDrive.js";

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

// Largest PDF a faculty can upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Largest part of a file sent in one response
const MAX_CHUNK_SIZE = 2 * 1024 * 1024;

const STAFF_ROLES = [
  "staff",
  "hod",
  "admin",
  "principal",
];

const LATERAL_ADMISSION_TYPES = [
  "lateralPUC",
  "lateralITI",
  "lateralCross",
];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getRole = (req) => {
  return String(req.user?.role || "")
    .trim()
    .toLowerCase();
};

const normalizeDepartment = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const isAcademicYear = (value) => {
  return /^\d{4}-\d{2}$/.test(
    String(value || "")
  );
};

const getCurrentAcademicYear = () => {
  const today = new Date();

  return getAcademicYearForMonth(
    today.getMonth() + 1,
    today.getFullYear()
  );
};

const getUserName = async (clerkId) => {
  const user = await User.findOne({ clerkId })
    .select("name")
    .lean();

  return user?.name || "";
};

// Google Drive problems are reported as they are.
// Anything else is an ordinary server error.
const sendError = (res, error, label, message) => {
  console.error(`${label}:`, error?.message);

  if (error instanceof DriveError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message,
  });
};

// A Drive file that could not be removed must not fail
// the request. It only leaves an unused file behind.
const deleteFileQuietly = async (fileId) => {
  try {
    await deleteFile(fileId);
  } catch (error) {
    console.error(
      "Study material file not deleted:",
      fileId,
      error?.message
    );
  }
};

// File details sent to the browser.
// The Google Drive file ID is never sent.
const publicFile = (file, req) => {
  if (!file) {
    return null;
  }

  return {
    fileName: file.fileName,
    size: file.size,
    uploadedByName: file.uploadedByName || "",
    uploadedAt: file.uploadedAt,
    uploadedByMe: file.uploadedBy === req.user.id,
    approvedByName: file.approvedByName || "",
    approvedAt: file.approvedAt || null,
  };
};

// --------------------------------------------------
// WHO CAN APPROVE / REJECT / DELETE
//
// Admin, or the HOD of the subject's department.
// --------------------------------------------------

const canManage = (req, department) => {
  const role = getRole(req);

  if (role === "admin") {
    return true;
  }

  return (
    role === "hod" &&
    normalizeDepartment(req.user?.department) ===
      normalizeDepartment(department)
  );
};

// --------------------------------------------------
// WHO CAN UPLOAD
//
// Faculty allocated to the subject (any batch), or any
// faculty when the subject is not allocated yet.
// HOD of the department and Admin.
//
// Returns an error message, or null when allowed.
// --------------------------------------------------

const getUploadError = async (
  req,
  subject,
  academicYear
) => {
  const role = getRole(req);

  if (role === "staff") {
    return getAllocationError({
      user: req.user,
      subjectId: subject._id,
      academicYear,
      batchNumbers: [],
    });
  }

  if (canManage(req, subject.department)) {
    return null;
  }

  return "You are not authorized to upload study material for this subject.";
};

// ==================================================
// GOOGLE DRIVE STATUS
//
// Admin: is the Drive connected, which account,
// how much space is used.
// ==================================================

export const getDriveStatus = async (req, res) => {
  try {
    if (getRole(req) !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only admin can view the Google Drive status.",
      });
    }

    return res.status(200).json({
      success: true,
      data: await checkDriveConnection(),
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Drive Status Error",
      "Failed to check Google Drive."
    );
  }
};

// ==================================================
// SUBJECTS WITH THEIR STUDY MATERIAL
//
// Every subject of the selection, with its study
// material if any, who uploaded it and its status.
//
// Faculty               -> department + semester
// HOD                   -> own department
// Admin / Principal     -> any, or all departments
// ==================================================

export const getMaterials = async (req, res) => {
  try {
    const role = getRole(req);

    if (!STAFF_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view this.",
      });
    }

    const { academicYear, semester } = req.query;

    if (!isAcademicYear(academicYear)) {
      return res.status(400).json({
        success: false,
        message: "Academic year is required.",
      });
    }

    const department =
      role === "hod"
        ? normalizeDepartment(req.user?.department)
        : normalizeDepartment(req.query.department);

    if (
      !department &&
      (role === "hod" || role === "staff")
    ) {
      return res.status(400).json({
        success: false,
        message: "Department is required.",
      });
    }

    const subjectFilter = {};

    if (department) {
      subjectFilter.department =
        department.toUpperCase();
    }

    if (semester) {
      subjectFilter.semester = Number(semester);
    }

    const subjects = await Subject.find(subjectFilter)
      .select(
        "code name semester department subjectCategory sequence"
      )
      .sort({
        department: 1,
        semester: 1,
        sequence: 1,
      })
      .lean();

    const subjectIds = subjects.map(
      (subject) => subject._id
    );

    const [materials, allocations] =
      await Promise.all([
        StudyMaterial.find({
          academicYear,
          week: 0,
          subjectId: { $in: subjectIds },
        }).lean(),

        // Needed only to tell a faculty which
        // subjects they may upload for.
        role === "staff"
          ? CourseAllocation.find({
              academicYear,
              subjectId: { $in: subjectIds },
            })
              .select("subjectId facultyClerkId")
              .lean()
          : [],
      ]);

    const materialBySubject = new Map(
      materials.map((material) => [
        String(material.subjectId),
        material,
      ])
    );

    // subjectId -> clerk IDs of the allocated faculty
    const allocatedTo = new Map();

    allocations.forEach((allocation) => {
      const key = String(allocation.subjectId);

      if (!allocatedTo.has(key)) {
        allocatedTo.set(key, new Set());
      }

      allocatedTo
        .get(key)
        .add(allocation.facultyClerkId);
    });

    const data = subjects.map((subject) => {
      const key = String(subject._id);

      const material = materialBySubject.get(key);

      const manage = canManage(
        req,
        subject.department
      );

      const faculty = allocatedTo.get(key);

      return {
        subject: {
          _id: subject._id,
          code: subject.code,
          name: subject.name,
          semester: subject.semester,
          department: normalizeDepartment(
            subject.department
          ),
          subjectCategory:
            subject.subjectCategory || "REGULAR",
        },

        material: material
          ? {
              _id: material._id,
              approved: publicFile(
                material.approved,
                req
              ),
              pending: publicFile(
                material.pending,
                req
              ),
              rejection: material.rejection?.remark
                ? material.rejection
                : null,
            }
          : null,

        canUpload:
          manage ||
          (role === "staff" &&
            (!faculty ||
              faculty.has(req.user.id))),

        canManage: manage,
      };
    });

    return res.status(200).json({
      success: true,
      maxFileSize: MAX_FILE_SIZE,
      count: data.length,
      data,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Get Study Materials Error",
      "Failed to fetch study material."
    );
  }
};

// ==================================================
// START AN UPLOAD
//
// Checks who is uploading and the size, then returns
// a one-time Google Drive address. The browser sends
// the PDF straight to that address.
// ==================================================

export const startUpload = async (req, res) => {
  try {
    const {
      subjectId,
      academicYear,
      fileName,
      size,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !isAcademicYear(academicYear)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject and academic year are required.",
      });
    }

    const fileSize = Number(size);

    if (
      !/\.pdf$/i.test(String(fileName || "").trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Only PDF files can be uploaded.",
      });
    }

    if (
      !Number.isInteger(fileSize) ||
      fileSize < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "The file is empty.",
      });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message:
          "The file is larger than 10 MB. Please reduce its size and try again.",
      });
    }

    const subject = await Subject.findById(
      subjectId
    )
      .select("code name semester department")
      .lean();

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    const uploadError = await getUploadError(
      req,
      subject,
      academicYear
    );

    if (uploadError) {
      return res.status(403).json({
        success: false,
        message: uploadError,
      });
    }

    const uploadUrl = await createUploadSession({
      name: `${subject.code}_${academicYear}_${Date.now()}.pdf`,
      size: fileSize,
      origin: req.headers.origin,
      properties: {
        subjectId: String(subject._id),
        academicYear,
        uploadedBy: req.user.id,
      },
    });

    return res.status(200).json({
      success: true,
      uploadUrl,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Start Study Material Upload Error",
      "Failed to start the upload."
    );
  }
};

// ==================================================
// COMPLETE AN UPLOAD
//
// Called after the browser has sent the PDF to Google
// Drive. The file is checked again here, because the
// browser cannot be trusted: it must be the file this
// user started, a real PDF, and within the size limit.
//
// The file then waits for the HOD's approval.
// ==================================================

export const completeUpload = async (req, res) => {
  try {
    const {
      subjectId,
      academicYear,
      driveFileId,
      fileName,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !isAcademicYear(academicYear) ||
      !/^[A-Za-z0-9_-]{10,100}$/.test(
        String(driveFileId || "")
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Upload details are missing.",
      });
    }

    const subject = await Subject.findById(
      subjectId
    )
      .select("code name semester department")
      .lean();

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    const uploadError = await getUploadError(
      req,
      subject,
      academicYear
    );

    if (uploadError) {
      return res.status(403).json({
        success: false,
        message: uploadError,
      });
    }

    // --------------------------------------------------
    // THE FILE MUST BE THE ONE THIS USER STARTED
    // --------------------------------------------------

    const file = await getFile(driveFileId);

    const properties = file?.appProperties || {};

    if (
      !file ||
      file.trashed ||
      !file.inFolder ||
      properties.subjectId !== String(subject._id) ||
      properties.academicYear !== academicYear ||
      properties.uploadedBy !== req.user.id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The uploaded file could not be verified. Please upload it again.",
      });
    }

    const alreadyUsed = await StudyMaterial.exists({
      $or: [
        { "approved.driveFileId": driveFileId },
        { "pending.driveFileId": driveFileId },
      ],
    });

    if (alreadyUsed) {
      return res.status(409).json({
        success: false,
        message:
          "This file has already been submitted.",
      });
    }

    // --------------------------------------------------
    // SIZE + REAL PDF
    // --------------------------------------------------

    if (file.size < 1 || file.size > MAX_FILE_SIZE) {
      await deleteFileQuietly(driveFileId);

      return res.status(400).json({
        success: false,
        message:
          "The file is larger than 10 MB. Please reduce its size and try again.",
      });
    }

    const firstBytes = await readFileRange(
      driveFileId,
      0,
      Math.min(4, file.size - 1)
    );

    if (firstBytes.toString("latin1") !== "%PDF-") {
      await deleteFileQuietly(driveFileId);

      return res.status(400).json({
        success: false,
        message:
          "The file is not a valid PDF. Please upload a PDF file.",
      });
    }

    // --------------------------------------------------
    // SAVE AS PENDING
    // --------------------------------------------------

    const existing = await StudyMaterial.findOne({
      academicYear,
      subjectId,
      week: 0,
    })
      .select("pending.driveFileId")
      .lean();

    const material =
      await StudyMaterial.findOneAndUpdate(
        {
          academicYear,
          subjectId,
          week: 0,
        },
        {
          $set: {
            department: normalizeDepartment(
              subject.department
            ),
            semester: subject.semester,
            pending: {
              driveFileId,
              fileName:
                String(fileName || "")
                  .trim()
                  .slice(0, 200) ||
                `${subject.code}.pdf`,
              size: file.size,
              uploadedBy: req.user.id,
              uploadedByName: await getUserName(
                req.user.id
              ),
              uploadedAt: new Date(),
            },
          },
          $unset: {
            rejection: "",
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
        }
      );

    // The file this one replaces was never approved.
    if (
      existing?.pending?.driveFileId &&
      existing.pending.driveFileId !== driveFileId
    ) {
      await deleteFileQuietly(
        existing.pending.driveFileId
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Study material uploaded. It will be visible to students after the HOD approves it.",
      data: {
        _id: material._id,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Complete Study Material Upload Error",
      "Failed to save the study material."
    );
  }
};

// ==================================================
// APPROVE
//
// HOD (own department) / Admin.
// The pending file becomes the one students see.
// ==================================================

export const approveMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID.",
      });
    }

    const material = await StudyMaterial.findById(
      id
    ).lean();

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found.",
      });
    }

    if (!canManage(req, material.department)) {
      return res.status(403).json({
        success: false,
        message:
          "Only the HOD of the department or Admin can approve study material.",
      });
    }

    if (!material.pending) {
      return res.status(409).json({
        success: false,
        message:
          "There is no file waiting for approval.",
      });
    }

    // Approve exactly the file that was looked at:
    // if the faculty replaced it meanwhile, nothing
    // is changed.
    const updated =
      await StudyMaterial.findOneAndUpdate(
        {
          _id: id,
          "pending.driveFileId":
            material.pending.driveFileId,
        },
        {
          $set: {
            approved: {
              ...material.pending,
              approvedBy: req.user.id,
              approvedByName: await getUserName(
                req.user.id
              ),
              approvedAt: new Date(),
            },
            pending: null,
          },
          $unset: {
            rejection: "",
          },
        },
        {
          returnDocument: "after",
        }
      );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message:
          "The file was replaced by the faculty. Please review the new file.",
      });
    }

    // The earlier approved file is no longer needed.
    if (material.approved?.driveFileId) {
      await deleteFileQuietly(
        material.approved.driveFileId
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Study material approved. Students can now view it.",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Approve Study Material Error",
      "Failed to approve the study material."
    );
  }
};

// ==================================================
// REJECT
//
// HOD (own department) / Admin.
// The pending file is removed. A file approved earlier
// stays visible to students.
// ==================================================

export const rejectMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const remark = String(
      req.body?.remark || ""
    ).trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID.",
      });
    }

    if (!remark) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter the reason for rejecting.",
      });
    }

    const material = await StudyMaterial.findById(
      id
    ).lean();

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found.",
      });
    }

    if (!canManage(req, material.department)) {
      return res.status(403).json({
        success: false,
        message:
          "Only the HOD of the department or Admin can reject study material.",
      });
    }

    if (!material.pending) {
      return res.status(409).json({
        success: false,
        message:
          "There is no file waiting for approval.",
      });
    }

    const updated =
      await StudyMaterial.findOneAndUpdate(
        {
          _id: id,
          "pending.driveFileId":
            material.pending.driveFileId,
        },
        {
          $set: {
            pending: null,
            rejection: {
              remark: remark.slice(0, 500),
              rejectedByName: await getUserName(
                req.user.id
              ),
              rejectedAt: new Date(),
            },
          },
        },
        {
          returnDocument: "after",
        }
      );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message:
          "The file was replaced by the faculty. Please review the new file.",
      });
    }

    await deleteFileQuietly(
      material.pending.driveFileId
    );

    return res.status(200).json({
      success: true,
      message: "Study material rejected.",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Reject Study Material Error",
      "Failed to reject the study material."
    );
  }
};

// ==================================================
// DELETE
//
// HOD (own department) / Admin.
// Removes the study material of the subject completely,
// including the files in Google Drive.
// ==================================================

export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID.",
      });
    }

    const material = await StudyMaterial.findById(
      id
    ).lean();

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Study material not found.",
      });
    }

    if (!canManage(req, material.department)) {
      return res.status(403).json({
        success: false,
        message:
          "Only the HOD of the department or Admin can delete study material.",
      });
    }

    await StudyMaterial.deleteOne({ _id: id });

    await deleteFileQuietly(
      material.approved?.driveFileId
    );

    await deleteFileQuietly(
      material.pending?.driveFileId
    );

    return res.status(200).json({
      success: true,
      message: "Study material deleted.",
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Delete Study Material Error",
      "Failed to delete the study material."
    );
  }
};

// ==================================================
// READ PART OF A FILE
//
// The viewer in the browser asks for the PDF in small
// parts and shows the pages itself. There is no link
// to the file and nothing to download.
//
// Student                -> approved file of a subject of
//                           their own department + semester
// Faculty                -> approved files; a pending file
//                           only if they uploaded it
// HOD                    -> own department
// Admin / Principal      -> all
// ==================================================

export const readMaterial = async (req, res) => {
  try {
    const role = getRole(req);

    const { id } = req.params;

    const version =
      req.query.version === "pending"
        ? "pending"
        : "approved";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid study material ID.",
      });
    }

    const material = await StudyMaterial.findById(
      id
    ).lean();

    const file = material?.[version];

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Study material not found.",
      });
    }

    // --------------------------------------------------
    // ACCESS
    // --------------------------------------------------

    let allowed = false;

    if (role === "student") {
      if (version === "approved") {
        const [student, subject] =
          await Promise.all([
            Student.findOne({
              clerkId: req.user.id,
            })
              .select(
                "department semester admissionType"
              )
              .lean(),

            Subject.findById(material.subjectId)
              .select("subjectCategory")
              .lean(),
          ]);

        allowed =
          Boolean(student) &&
          normalizeDepartment(
            student.department
          ) === material.department &&
          Number(student.semester) ===
            Number(material.semester) &&
          // Bridge courses are for lateral students.
          (subject?.subjectCategory !== "BRIDGE" ||
            LATERAL_ADMISSION_TYPES.includes(
              student.admissionType
            ));
      }
    } else if (
      role === "admin" ||
      role === "principal"
    ) {
      allowed = true;
    } else if (role === "hod") {
      allowed =
        version === "approved" ||
        canManage(req, material.department);
    } else if (role === "staff") {
      allowed =
        version === "approved" ||
        file.uploadedBy === req.user.id;
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view this study material.",
      });
    }

    // --------------------------------------------------
    // PART REQUESTED
    // --------------------------------------------------

    const start = Number(req.query.start);
    const end = Number(req.query.end);

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end < start ||
      end >= file.size ||
      end - start + 1 > MAX_CHUNK_SIZE
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid part of the file.",
      });
    }

    const data = await readFileRange(
      file.driveFileId,
      start,
      end
    );

    res.set({
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });

    return res.status(200).send(data);
  } catch (error) {
    return sendError(
      res,
      error,
      "Read Study Material Error",
      "Failed to open the study material."
    );
  }
};

// ==================================================
// STUDENT: STUDY MATERIAL OF MY SUBJECTS
//
// The subjects of the student's own department and
// current semester, with the approved material if any.
// ==================================================

export const getStudentMaterials = async (
  req,
  res
) => {
  try {
    if (getRole(req) !== "student") {
      return res.status(403).json({
        success: false,
        message:
          "This page is only for students.",
      });
    }

    const student = await Student.findOne({
      clerkId: req.user.id,
    })
      .select(
        "name registerNumber department semester admissionType"
      )
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    const academicYear = getCurrentAcademicYear();

    const lateral = LATERAL_ADMISSION_TYPES.includes(
      student.admissionType
    );

    const subjectFilter = {
      department: String(
        student.department || ""
      ).toUpperCase(),
      semester: student.semester,
    };

    // Bridge courses are for lateral students.
    if (!lateral) {
      subjectFilter.subjectCategory = {
        $ne: "BRIDGE",
      };
    }

    const subjects = await Subject.find(
      subjectFilter
    )
      .select("code name subjectCategory sequence")
      .sort({ sequence: 1 })
      .lean();

    const materials = await StudyMaterial.find({
      academicYear,
      week: 0,
      subjectId: {
        $in: subjects.map(
          (subject) => subject._id
        ),
      },
      approved: { $ne: null },
    })
      .select("subjectId approved")
      .lean();

    const materialBySubject = new Map(
      materials.map((material) => [
        String(material.subjectId),
        material,
      ])
    );

    return res.status(200).json({
      success: true,
      academicYear,
      student: {
        name: student.name,
        registerNumber: student.registerNumber,
        semester: student.semester,
      },
      data: subjects.map((subject) => {
        const material = materialBySubject.get(
          String(subject._id)
        );

        return {
          subject: {
            _id: subject._id,
            code: subject.code,
            name: subject.name,
          },

          material: material
            ? {
                _id: material._id,
                size: material.approved.size,
                uploadedByName:
                  material.approved
                    .uploadedByName || "",
                approvedAt:
                  material.approved.approvedAt,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Student Study Material Error",
      "Failed to fetch study material."
    );
  }
};
