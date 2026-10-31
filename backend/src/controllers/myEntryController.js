import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import CourseAllocation from "../models/CourseAllocation.js";
import IAMarks from "../models/IAMarks.js";
import StudyMaterial from "../models/StudyMaterial.js";
import Subject from "../models/Subject.js";
import { getAllocationError } from "./courseAllocationController.js";

// ==========================================================
// MY ENTRIES (faculty and HOD)
//
// Whether IA marks and attendance are entered, for the
// Entry Status grids (a faculty sees the subjects
// allocated to them, a HOD every subject), and one
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
// ENTRY GRID
//
// GET /api/my-entries/grid?academicYear=2026-27&term=odd
//
// What the department x semester grids of the faculty
// and HOD Entry Status pages need: whether IA marks,
// attendance and study material are entered for every
// subject of the term, never the marks.
//
// Everyone sees every subject. myBatches are the batches
// of a subject allocated to the user (empty if none).
//
// subjects:   [{ subjectId, code, name, sequence,
//                department, semester, subjectCategory,
//                myBatches }]
// ia:         { [subjectId]: { [iaNumber]: [batches] } }
// attendance: { [subjectId]: { "2026-10": [batches] } }
// material:   { [subjectId]: "approved" | "pending" |
//                             "rejected" }
// ==========================================================

const TERM_SEMESTERS = {
  odd: [1, 3, 5],
  even: [2, 4, 6],
};

export const getEntryGrid = async (req, res) => {
  try {
    const role = getRole(req);

    if (
      !["staff", "hod", "admin", "principal"].includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this.",
      });
    }

    const { academicYear, term } = req.query;

    if (
      !isAcademicYear(academicYear) ||
      !TERM_SEMESTERS[term]
    ) {
      return res.status(400).json({
        success: false,
        message: "Academic year and term are required.",
      });
    }

    const semesters = TERM_SEMESTERS[term];

    const [subjects, myAllocations] = await Promise.all([
      Subject.find({
        semester: { $in: semesters },
      })
        .select(
          "code name sequence semester department subjectCategory"
        )
        .lean(),

      CourseAllocation.find({
        academicYear,
        facultyClerkId: req.user.id,
      })
        .select("subjectId batchNumbers")
        .lean(),
    ]);

    // subjectId -> batches allocated to the user
    const myBatches = new Map();

    myAllocations.forEach((allocation) => {
      const key = String(allocation.subjectId);

      const batches = myBatches.get(key) || new Set();

      (allocation.batchNumbers || []).forEach((batch) =>
        batches.add(Number(batch))
      );

      myBatches.set(key, batches);
    });

    const subjectIds = subjects.map((subject) => subject._id);

    const [iaRecords, attendanceRecords, materials] =
      subjectIds.length === 0
        ? [[], [], []]
        : await Promise.all([
            IAMarks.find({
              academicYear,
              subjectId: { $in: subjectIds },
            })
              .select("subjectId iaNumber batchNumber")
              .lean(),

            Attendance.find({
              subjectId: { $in: subjectIds },
              $or: getAcademicYearMonths(academicYear),
            })
              .select("subjectId month year batchNumbers")
              .lean(),

            // Same record the Study Material page uses
            StudyMaterial.find({
              academicYear,
              week: 0,
              subjectId: { $in: subjectIds },
            })
              .select("subjectId approved pending rejection")
              .lean(),
          ]);

    const ia = {};

    iaRecords.forEach((record) => {
      const key = String(record.subjectId);

      ia[key] = ia[key] || {};
      ia[key][record.iaNumber] =
        ia[key][record.iaNumber] || [];

      ia[key][record.iaNumber].push(
        Number(record.batchNumber)
      );
    });

    const attendance = {};

    attendanceRecords.forEach((record) => {
      const key = String(record.subjectId);

      const monthKey = `${record.year}-${String(
        record.month
      ).padStart(2, "0")}`;

      attendance[key] = attendance[key] || {};
      attendance[key][monthKey] =
        attendance[key][monthKey] || [];

      attendance[key][monthKey].push(
        ...(record.batchNumbers || []).map(Number)
      );
    });

    const material = {};

    materials.forEach((record) => {
      material[String(record.subjectId)] = record.approved
        ? "approved"
        : record.pending
        ? "pending"
        : record.rejection?.remark
        ? "rejected"
        : undefined;
    });

    return res.status(200).json({
      success: true,
      data: {
        academicYear,
        semesters,
        subjects: subjects.map((subject) => ({
          subjectId: subject._id,
          code: subject.code,
          name: subject.name,
          sequence: subject.sequence || "",
          department: normalizeDepartment(
            subject.department
          ),
          semester: Number(subject.semester),
          subjectCategory:
            subject.subjectCategory || "REGULAR",
          myBatches: [
            ...(myBatches.get(String(subject._id)) || []),
          ].sort(),
        })),
        ia,
        attendance,
        material,
      },
    });
  } catch (error) {
    console.error("Entry Grid Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch the entry status.",
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
