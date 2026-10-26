import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import CourseAllocation from "../models/CourseAllocation.js";
import IAMarks from "../models/IAMarks.js";
import Subject from "../models/Subject.js";
import { getAllocationError } from "./courseAllocationController.js";

// ==========================================================
// MY ENTRIES (faculty)
//
// What the faculty has entered for the subjects allocated
// to them, so they can see what is still pending, and one
// consolidated IA sheet per subject.
// ==========================================================

const CO_NAMES = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"];

const getRole = (req) =>
  String(req.user?.role || "")
    .trim()
    .toLowerCase();

const normalizeDepartment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isAcademicYear = (value) =>
  /^\d{4}-\d{2}$/.test(String(value || ""));

// July of the start year to June of the next year
const getAcademicYearMonths = (academicYear) => {
  const startYear = Number(academicYear.slice(0, 4));

  return [
    { year: startYear, month: { $gte: 7 } },
    { year: startYear + 1, month: { $lte: 6 } },
  ];
};

// ==========================================================
// STATUS OF MY SUBJECTS
//
// GET /api/my-entries/status?academicYear=2026-27
//
// For every subject allocated to the user:
//   ia:         { "1": { "1": { entered, locked } } }
//               IA number -> batch -> status
//   attendance: { "2026-07": { "1": { entered, locked } } }
//               month -> batch -> status
// Only the batches allocated to the user are reported.
// ==========================================================

export const getMyEntryStatus = async (req, res) => {
  try {
    if (!["staff", "hod"].includes(getRole(req))) {
      return res.status(403).json({
        success: false,
        message: "Only faculty can view this.",
      });
    }

    const { academicYear } = req.query;

    if (!isAcademicYear(academicYear)) {
      return res.status(400).json({
        success: false,
        message: "Academic year is required.",
      });
    }

    const allocations = await CourseAllocation.find({
      academicYear,
      facultyClerkId: req.user.id,
    })
      .populate(
        "subjectId",
        "code name semester department subjectCategory sequence"
      )
      .lean();

    // One entry per subject, with every batch the user
    // is allocated for it.
    const subjectMap = new Map();

    allocations.forEach((allocation) => {
      const subject = allocation.subjectId;

      if (!subject?._id) {
        return;
      }

      const key = String(subject._id);

      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
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
            sequence: subject.sequence || "",
          },
          batchNumbers: new Set(),
          ia: {},
          attendance: {},
        });
      }

      (allocation.batchNumbers || []).forEach((batch) =>
        subjectMap.get(key).batchNumbers.add(Number(batch))
      );
    });

    const subjectIds = [...subjectMap.keys()].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    if (subjectIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const [iaRecords, attendanceRecords] =
      await Promise.all([
        IAMarks.find({
          academicYear,
          subjectId: { $in: subjectIds },
        })
          .select("subjectId iaNumber batchNumber isLocked")
          .lean(),

        Attendance.find({
          subjectId: { $in: subjectIds },
          $or: getAcademicYearMonths(academicYear),
        })
          .select("subjectId month year batchNumbers isLocked")
          .lean(),
      ]);

    iaRecords.forEach((record) => {
      const item = subjectMap.get(String(record.subjectId));
      const batch = Number(record.batchNumber);

      if (!item || !item.batchNumbers.has(batch)) {
        return;
      }

      const iaKey = String(record.iaNumber);

      item.ia[iaKey] = item.ia[iaKey] || {};

      item.ia[iaKey][batch] = {
        entered: true,
        locked: record.isLocked !== false,
      };
    });

    attendanceRecords.forEach((record) => {
      const item = subjectMap.get(String(record.subjectId));

      if (!item) {
        return;
      }

      const monthKey = `${record.year}-${String(
        record.month
      ).padStart(2, "0")}`;

      (record.batchNumbers || []).forEach((rawBatch) => {
        const batch = Number(rawBatch);

        if (!item.batchNumbers.has(batch)) {
          return;
        }

        item.attendance[monthKey] =
          item.attendance[monthKey] || {};

        item.attendance[monthKey][batch] = {
          entered: true,
          locked: record.isLocked !== false,
        };
      });
    });

    const data = [...subjectMap.values()]
      .map((item) => ({
        ...item,
        batchNumbers: [...item.batchNumbers].sort(),
      }))
      .sort(
        (a, b) =>
          a.subject.semester - b.subject.semester ||
          String(a.subject.sequence).localeCompare(
            String(b.subject.sequence)
          )
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("My Entry Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your entry status.",
    });
  }
};

// ==========================================================
// CONSOLIDATED IA SHEET OF A SUBJECT
//
// GET /api/my-entries/ia-sheet
//     ?subjectId=...&academicYear=2026-27&batch=1|2|both
//
// Every IA of the subject side by side. For each IA only
// the COs that carry marks are returned (a CO is used
// when any test of the IA gives it maximum marks).
//
// Faculty: only the subjects and batches allocated to
// them. HOD: own department. Admin / Principal: any.
// ==========================================================

export const getMyIASheet = async (req, res) => {
  try {
    const role = getRole(req);

    if (
      !["staff", "hod", "admin", "principal"].includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view IA marks.",
      });
    }

    const { subjectId, academicYear, batch } = req.query;

    if (
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !isAcademicYear(academicYear)
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject and academic year are required.",
      });
    }

    const batchNumbers =
      String(batch || "both") === "both"
        ? [1, 2]
        : [Number(batch)];

    if (batchNumbers.some((value) => ![1, 2].includes(value))) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch.",
      });
    }

    const subject = await Subject.findById(subjectId)
      .select("code name semester department subjectCategory")
      .lean();

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    if (
      role === "hod" &&
      normalizeDepartment(req.user?.department) !==
        normalizeDepartment(subject.department)
    ) {
      // A HOD can also teach a subject of another
      // department; then the allocation decides.
      const allocated = await CourseAllocation.exists({
        academicYear,
        subjectId,
        facultyClerkId: req.user.id,
        batchNumbers: { $all: batchNumbers },
      });

      if (!allocated) {
        return res.status(403).json({
          success: false,
          message:
            "You can only view IA marks of your own department or of subjects allocated to you.",
        });
      }
    }

    if (role === "staff") {
      const allocationError = await getAllocationError({
        user: req.user,
        subjectId,
        academicYear,
        batchNumbers,
      });

      if (allocationError) {
        return res.status(403).json({
          success: false,
          message: allocationError,
        });
      }
    }

    const records = await IAMarks.find({
      academicYear,
      subjectId,
      batchNumber: { $in: batchNumbers },
    })
      .populate(
        "students.studentId",
        "registerNumber rollNumber name batchNumber"
      )
      .sort({ iaNumber: 1, batchNumber: 1 })
      .lean();

    // ------------------------------------------------------
    // IA COLUMNS
    //
    // The COs of an IA come from its question paper
    // (test CO maximum marks). Both batches write the same
    // paper; if they differ, the larger maximum is kept.
    // ------------------------------------------------------

    const iaMap = new Map();

    records.forEach((record) => {
      const iaNumber = Number(record.iaNumber);

      const coMax = {};

      (record.tests || []).forEach((test) => {
        CO_NAMES.forEach((co) => {
          coMax[co] =
            (coMax[co] || 0) +
            Number(test.coMarks?.[co] || 0);
        });
      });

      const ia = iaMap.get(iaNumber) || {
        iaNumber,
        coMax: {},
        totalMax: 0,
        batches: [],
      };

      CO_NAMES.forEach((co) => {
        ia.coMax[co] = Math.max(
          ia.coMax[co] || 0,
          coMax[co] || 0
        );
      });

      ia.totalMax = Math.max(
        ia.totalMax,
        Number(record.totalMaxMarks || 0)
      );

      ia.batches.push({
        batchNumber: Number(record.batchNumber),
        locked: record.isLocked !== false,
      });

      iaMap.set(iaNumber, ia);
    });

    const ias = [...iaMap.values()]
      .sort((a, b) => a.iaNumber - b.iaNumber)
      .map((ia) => ({
        iaNumber: ia.iaNumber,
        totalMax: ia.totalMax,
        batches: ia.batches,
        cos: CO_NAMES.filter((co) => ia.coMax[co] > 0).map(
          (co) => ({ co, max: ia.coMax[co] })
        ),
      }));

    // ------------------------------------------------------
    // STUDENTS
    //
    // ia: { "1": { coMarks: { CO1: 8 }, total: 15,
    //              absent: false } }
    // ------------------------------------------------------

    const studentMap = new Map();

    records.forEach((record) => {
      (record.students || []).forEach((entry) => {
        const student = entry.studentId;

        if (!student?._id) {
          return;
        }

        const key = String(student._id);

        if (!studentMap.has(key)) {
          studentMap.set(key, {
            _id: key,
            registerNumber: student.registerNumber || "",
            rollNumber: student.rollNumber || "",
            name: student.name || "",
            batchNumber: Number(
              student.batchNumber || record.batchNumber
            ),
            ia: {},
          });
        }

        const coMarks = {};

        (entry.tests || []).forEach((test) => {
          if (test.status === "ABSENT") {
            return;
          }

          CO_NAMES.forEach((co) => {
            coMarks[co] =
              (coMarks[co] || 0) +
              Number(test.coMarks?.[co] || 0);
          });
        });

        const tests = entry.tests || [];

        studentMap.get(key).ia[record.iaNumber] = {
          coMarks,
          total: Number(entry.totalMarks || 0),
          absent:
            tests.length > 0 &&
            tests.every((test) => test.status === "ABSENT"),
        };
      });
    });

    const students = [...studentMap.values()].sort(
      (a, b) => {
        const rollA = Number(a.rollNumber);
        const rollB = Number(b.rollNumber);

        if (
          Number.isFinite(rollA) &&
          Number.isFinite(rollB) &&
          rollA !== rollB
        ) {
          return rollA - rollB;
        }

        return String(a.registerNumber).localeCompare(
          String(b.registerNumber)
        );
      }
    );

    return res.status(200).json({
      success: true,
      data: {
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
        academicYear,
        batchNumbers,
        ias,
        students,
      },
    });
  } catch (error) {
    console.error("My IA Sheet Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch the IA sheet.",
    });
  }
};
