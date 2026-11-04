import mongoose from "mongoose";
import IAMarks from "../models/IAMarks.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";
import { getAllocationError } from "./courseAllocationController.js";
import { validateStudents } from "./iaController.js";
import {
  CIE_MAX,
  IMPROVEMENT_BASE,
  TEST_IA_NUMBERS,
  computeCIE,
  defaultReplacedIA,
  improvementIANumber,
  isImprovementIA,
} from "../utils/ciTotal.js";

// ==========================================================
// IMPROVEMENT TEST
//
// For students whose final CIE is below the subject's
// minimum (iaMin). One improvement test per student; it
// replaces one of IA1 to IA4, with that IA's CO pattern.
//
// Saved as one IAMarks record per replaced IA:
// iaNumber 11 replaces IA1, 12 replaces IA2 and so on,
// each with only the students taking the test. The marks
// count only when higher (see utils/ciTotal.js).
// ==========================================================

const getRole = (req) =>
  String(req.user?.role || "")
    .trim()
    .toLowerCase();

const normalizeDepartment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

// Subject, its CIE maximum / minimum and the records of
// one batch, after checking the user may enter them.
const loadContext = async (req, { subjectId, academicYear, batchNumber }) => {
  const role = getRole(req);

  if (!["staff", "hod", "admin"].includes(role)) {
    return { status: 403, message: "You are not authorized to enter IA marks." };
  }

  if (!mongoose.Types.ObjectId.isValid(subjectId) || !academicYear) {
    return { status: 400, message: "Subject and academic year are required." };
  }

  const batch = Number(batchNumber);

  if (![1, 2].includes(batch)) {
    return { status: 400, message: "Batch number must be 1 or 2." };
  }

  const subject = await Subject.findById(subjectId)
    .select("code name semester department subjectCategory iaMax iaMin")
    .lean();

  if (!subject) {
    return { status: 404, message: "Subject not found." };
  }

  const department = normalizeDepartment(subject.department);

  if (
    role === "hod" &&
    normalizeDepartment(req.user?.department) !== department
  ) {
    return {
      status: 403,
      message: "HOD can enter IA marks only for their own department.",
    };
  }

  const allocationError = await getAllocationError({
    user: req.user,
    subjectId,
    academicYear,
    batchNumbers: [batch],
  });

  if (allocationError) {
    return { status: 403, message: allocationError };
  }

  const records = await IAMarks.find({
    academicYear,
    subjectId,
    batchNumber: batch,
  }).lean();

  const cieMax = Number(subject.iaMax) || CIE_MAX;

  // A subject without a minimum: 40% of the maximum
  const cieMin = Number(subject.iaMin) || cieMax * 0.4;

  return {
    subject,
    department,
    batch,
    records,
    cieMax,
    cieMin,
  };
};

// ==========================================================
// GET /api/ia/improvement?subjectId&academicYear&batchNumber
// ==========================================================

export const getImprovement = async (req, res) => {
  try {
    const context = await loadContext(req, req.query);

    if (context.status) {
      return res
        .status(context.status)
        .json({ success: false, message: context.message });
    }

    const { subject, batch, records, cieMax, cieMin } = context;

    const partRecords = records.filter(
      (record) => !isImprovementIA(record.iaNumber)
    );

    const improvementRecords = records.filter((record) =>
      isImprovementIA(record.iaNumber)
    );

    const before = computeCIE(partRecords, cieMax);
    const after = computeCIE(records, cieMax);

    const patterns = {};

    for (const record of partRecords) {
      if (TEST_IA_NUMBERS.includes(record.iaNumber)) {
        patterns[record.iaNumber] = {
          tests: record.tests,
          totalMaxMarks: record.totalMaxMarks,
        };
      }
    }

    // Saved improvement marks of each student
    const saved = new Map();

    for (const record of improvementRecords) {
      for (const studentRecord of record.students) {
        saved.set(String(studentRecord.studentId), {
          replacesIA: record.iaNumber - IMPROVEMENT_BASE,
          tests: studentRecord.tests,
          totalMarks: studentRecord.totalMarks,
        });
      }
    }

    const studentDocs = await Student.find({
      _id: { $in: [...before.keys()] },
    })
      .select("_id name registerNumber rollNumber")
      .lean();

    const students = studentDocs
      .map((student) => {
        const id = String(student._id);
        const cie = before.get(id);

        return {
          studentId: id,
          name: student.name,
          registerNumber: student.registerNumber,
          rollNumber: student.rollNumber,
          parts: cie.parts,
          finalBeforeImprovement: cie.finalBeforeImprovement,
          final: after.get(id)?.final ?? cie.final,
          eligible:
            cie.finalBeforeImprovement !== null &&
            cie.finalBeforeImprovement < cieMin,
          defaultReplacesIA: defaultReplacedIA(cie),
          improvement: saved.get(id) || null,
        };
      })
      .sort((a, b) =>
        String(a.rollNumber || a.registerNumber || "").localeCompare(
          String(b.rollNumber || b.registerNumber || ""),
          undefined,
          { numeric: true }
        )
      );

    return res.status(200).json({
      success: true,
      data: {
        subject: {
          _id: subject._id,
          code: subject.code,
          name: subject.name,
          semester: subject.semester,
          department: subject.department,
        },
        batchNumber: batch,
        cieMax,
        cieMin,
        partNumbers: [
          ...new Set(partRecords.map((record) => record.iaNumber)),
        ].sort((a, b) => a - b),
        patterns,
        saved: improvementRecords.length > 0,
        locked: improvementRecords.some(
          (record) => record.isLocked !== false
        ),
        students,
      },
    });
  } catch (error) {
    console.error("Get Improvement Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the improvement test.",
    });
  }
};

// ==========================================================
// POST /api/ia/improvement
//
// { subjectId, academicYear, batchNumber,
//   entries: [{ studentId, replacesIA,
//               tests: [{ status, coMarks }] }] }
//
// Saves and freezes the improvement test of the batch.
// Once frozen, the HOD unlocks it to allow a correction.
// ==========================================================

export const saveImprovement = async (req, res) => {
  try {
    const context = await loadContext(req, req.body);

    if (context.status) {
      return res
        .status(context.status)
        .json({ success: false, message: context.message });
    }

    const { subject, department, batch, records, cieMax, cieMin } =
      context;

    const { academicYear, entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Enter the improvement marks of at least one student.",
      });
    }

    const improvementRecords = records.filter((record) =>
      isImprovementIA(record.iaNumber)
    );

    if (improvementRecords.some((record) => record.isLocked !== false)) {
      return res.status(409).json({
        success: false,
        message:
          "The improvement test of this batch is already saved and frozen. Ask the HOD to unlock it for a correction.",
      });
    }

    const partRecords = records.filter(
      (record) => !isImprovementIA(record.iaNumber)
    );

    const before = computeCIE(partRecords, cieMax);

    const alreadyTaking = new Set(
      improvementRecords.flatMap((record) =>
        record.students.map((student) => String(student.studentId))
      )
    );

    // ------------------------------------------------
    // CHECK EACH STUDENT
    // ------------------------------------------------

    const groups = new Map();
    const seen = new Set();

    for (const entry of entries) {
      const id = String(entry.studentId || "");
      const replacesIA = Number(entry.replacesIA);
      const cie = before.get(id);

      if (!cie) {
        return res.status(400).json({
          success: false,
          message: "A student has no IA marks in this batch.",
        });
      }

      if (seen.has(id)) {
        return res.status(400).json({
          success: false,
          message: "A student can take only one improvement test.",
        });
      }

      seen.add(id);

      const eligible =
        cie.finalBeforeImprovement !== null &&
        cie.finalBeforeImprovement < cieMin;

      if (!eligible && !alreadyTaking.has(id)) {
        return res.status(400).json({
          success: false,
          message: `Only students below the CIE minimum of ${cieMin} can take the improvement test.`,
        });
      }

      if (
        !TEST_IA_NUMBERS.includes(replacesIA) ||
        !cie.partNumbers.includes(replacesIA)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The improvement test can replace only IA 1 to IA 4 that are entered.",
        });
      }

      if (!groups.has(replacesIA)) {
        groups.set(replacesIA, []);
      }

      groups.get(replacesIA).push({
        studentId: id,
        tests: entry.tests,
      });
    }

    // ------------------------------------------------
    // VALIDATE MARKS AGAINST THE REPLACED IA'S PATTERN
    // ------------------------------------------------

    const toCreate = [];

    for (const [replacesIA, groupStudents] of groups) {
      const pattern = partRecords.find(
        (record) => record.iaNumber === replacesIA
      );

      const validation = await validateStudents(
        groupStudents,
        pattern.tests,
        department,
        subject.semester,
        batch,
        subject.subjectCategory
      );

      if (!validation.valid) {
        return res
          .status(400)
          .json({ success: false, message: validation.message });
      }

      toCreate.push({
        academicYear,
        department,
        semester: subject.semester,
        subjectId: subject._id,
        iaNumber: improvementIANumber(replacesIA),
        batchNumber: batch,
        tests: pattern.tests,
        totalMaxMarks: pattern.totalMaxMarks,
        students: validation.students,
        enteredBy: req.user.id,
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: req.user.id,
        ...(improvementRecords.length > 0 && {
          correctedBy: req.user.id,
        }),
      });
    }

    // An unlocked improvement test is replaced as a whole,
    // so a student can move to another IA.
    if (improvementRecords.length > 0) {
      await IAMarks.deleteMany({
        _id: { $in: improvementRecords.map((record) => record._id) },
        isLocked: false,
      });
    }

    await IAMarks.insertMany(toCreate);

    return res.status(201).json({
      success: true,
      message: `Improvement test of Batch ${batch} saved and frozen for ${seen.size} student${seen.size === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    console.error("Save Improvement Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "The improvement test of this batch was just saved. Reload and try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save the improvement test.",
    });
  }
};
