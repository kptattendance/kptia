import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";
import DeletedRecord from "../models/DeletedRecord.js";
import {
  getAcademicYearForMonth,
  getAllocationError,
} from "./courseAllocationController.js";

// =====================================================
// SAVE ATTENDANCE
// =====================================================

export const saveAttendance = async (req, res) => {
  try {
    const {
      department,
      semester,
      subjectId,
      month,
      year,
      classesConducted,
      students,
      batchNumbers,
    } = req.body;

    // -----------------------------------------
    // ROLE CHECK
    // -----------------------------------------

    if (!["staff", "hod"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only faculty and HOD can enter attendance.",
      });
    }

    // -----------------------------------------
    // REQUIRED FIELDS
    // -----------------------------------------

    if (
      !department ||
      !semester ||
      !subjectId ||
      !month ||
      !year ||
      classesConducted === undefined ||
      !Array.isArray(students) ||
      !Array.isArray(batchNumbers) ||
      batchNumbers.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Required attendance data is missing.",
      });
    }

    // -----------------------------------------
    // VALIDATE BATCH NUMBERS
    // -----------------------------------------

    const selectedBatches = [
      ...new Set(
        batchNumbers.map((value) =>
          Number(value)
        )
      ),
    ].sort();

    if (
      selectedBatches.length < 1 ||
      selectedBatches.length > 2 ||
      selectedBatches.some(
        (batch) => ![1, 2].includes(batch)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid batch selection.",
      });
    }

    // -----------------------------------------
    // VALIDATE CLASSES CONDUCTED
    // -----------------------------------------

    if (
      !Number.isInteger(
        Number(classesConducted)
      ) ||
      Number(classesConducted) < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Classes conducted must be a valid number.",
      });
    }

    const conducted =
      Number(classesConducted);

    // -----------------------------------------
    // VALIDATE SUBJECT
    // -----------------------------------------

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject.",
      });
    }

    // -----------------------------------------
    // COURSE ALLOCATION
    // -----------------------------------------

    const allocationError = await getAllocationError({
      user: req.user,
      subjectId,
      academicYear: getAcademicYearForMonth(
        month,
        year
      ),
      batchNumbers: selectedBatches,
    });

    if (allocationError) {
      return res.status(403).json({
        success: false,
        message: allocationError,
      });
    }

    // -----------------------------------------
    // CHECK EXISTING ATTENDANCE
    // -----------------------------------------
    //
    // A locked record that covers any selected
    // batch blocks the save.
    //
    // A record unlocked by the HOD can be corrected,
    // but only with the same batch selection it was
    // originally entered with.
    //
    // Old records without batchNumbers cover the
    // entire subject.
    // -----------------------------------------

    const existingRecords =
      await Attendance.find({
        department: department.toLowerCase(),
        semester: Number(semester),
        subjectId,
        month: Number(month),
        year: Number(year),
      })
        .select("batchNumbers isLocked")
        .lean();

    const overlappingRecords = existingRecords.filter(
      (existing) =>
        !Array.isArray(existing.batchNumbers) ||
        existing.batchNumbers.length === 0 ||
        existing.batchNumbers.some((batch) =>
          selectedBatches.includes(Number(batch))
        )
    );

    if (
      overlappingRecords.some(
        (existing) => existing.isLocked !== false
      )
    ) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance has already been entered for the selected batch and is locked.",
      });
    }

    let recordToCorrect = null;

    if (overlappingRecords.length > 0) {
      const sameSelection =
        overlappingRecords.length === 1 &&
        [...(overlappingRecords[0].batchNumbers || [])]
          .map(Number)
          .sort()
          .join(",") === selectedBatches.join(",");

      if (!sameSelection) {
        return res.status(409).json({
          success: false,
          locked: false,
          message:
            "This attendance was unlocked for correction. Please select the same batch it was originally entered for.",
        });
      }

      recordToCorrect = overlappingRecords[0];
    }

    // -----------------------------------------
    // VALIDATE STUDENTS
    // -----------------------------------------

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No students were selected.",
      });
    }

    const studentIds = students.map((student) =>
      String(student.studentId || "")
    );

    if (
      studentIds.some(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Student ID is missing.",
      });
    }

    if (new Set(studentIds).size !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "A student appears more than once in the attendance.",
      });
    }

    const cleanedStudents = [];

    for (const student of students) {
      const attended = Number(student.classesAttended);

      const eligible =
        student.classesEligible !== undefined &&
        student.classesEligible !== null &&
        student.classesEligible !== ""
          ? Number(student.classesEligible)
          : conducted;

      if (!Number.isInteger(eligible)) {
        return res.status(400).json({
          success: false,
          message: "Invalid maximum classes value.",
        });
      }

      if (eligible < 0) {
        return res.status(400).json({
          success: false,
          message: "Maximum classes cannot be negative.",
        });
      }

      if (eligible > conducted) {
        return res.status(400).json({
          success: false,
          message:
            "A student's maximum classes cannot exceed classes conducted.",
        });
      }

      if (
        student.classesAttended === "" ||
        student.classesAttended === null ||
        student.classesAttended === undefined ||
        !Number.isFinite(attended)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance value.",
        });
      }

      if (attended < 0 || attended > eligible) {
        return res.status(400).json({
          success: false,
          message:
            "Classes attended cannot exceed the student's maximum eligible classes.",
        });
      }

      cleanedStudents.push({
        studentId: student.studentId,
        classesEligible: eligible,
        classesAttended: attended,
      });
    }

    // -----------------------------------------
    // VERIFY STUDENTS EXIST AND BATCH MATCHES
    // (one query for the whole class)
    // -----------------------------------------

    const dbStudents = await Student.find({
      _id: { $in: studentIds },
    })
      .select("name department batchNumber")
      .lean();

    if (dbStudents.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "One or more selected students do not exist.",
      });
    }

    for (const dbStudent of dbStudents) {
      if (
        !selectedBatches.includes(
          Number(dbStudent.batchNumber)
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Student ${dbStudent.name} does not belong to the selected batch.`,
        });
      }

      if (
        dbStudent.department?.toLowerCase() !==
        department.toLowerCase()
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Student ${dbStudent.name} does not belong to the selected department.`,
        });
      }
    }

    // -----------------------------------------
    // CORRECT AN UNLOCKED RECORD
    // -----------------------------------------

    if (recordToCorrect) {
      const corrected =
        await Attendance.findOneAndUpdate(
          {
            _id: recordToCorrect._id,
            isLocked: false,
          },
          {
            $set: {
              classesConducted: conducted,
              students: cleanedStudents,
              isLocked: true,
              lockedAt: new Date(),
              lockedBy: req.user.id,
              correctedBy: req.user.id,
            },
          },
          {
            returnDocument: "after",
            runValidators: true,
          }
        );

      if (!corrected) {
        return res.status(409).json({
          success: false,
          locked: true,
          message:
            "Attendance has already been entered for the selected batch and is locked.",
        });
      }

      return res.status(200).json({
        success: true,
        locked: true,
        message:
          "Attendance corrected successfully and is now locked.",
        data: corrected,
      });
    }

    // -----------------------------------------
    // CREATE
    // -----------------------------------------

    const attendance = await Attendance.create({
      department: department.toLowerCase(),
      semester: Number(semester),
      subjectId,
      month: Number(month),
      year: Number(year),
      batchNumbers: selectedBatches,
      classesConducted: conducted,
      students: cleanedStudents,
      enteredBy: req.user.id,
      lockedAt: new Date(),
      lockedBy: req.user.id,
      isLocked: true,
    });

    return res.status(201).json({
      success: true,
      locked: true,
      message:
        "Attendance saved successfully and is now locked.",
      data: attendance,
    });
  } catch (error) {
    console.error(
      "Save Attendance Error:",
      error
    );

    // Two saves for the same batch arrived together.
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance has already been entered for the selected batch and is locked.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to save attendance.",
    });
  }
};

// =====================================================
// ATTENDANCE OF ONE SUBJECT, AS SHOWN ON THE PAGES
// =====================================================
//
// Combines the saved records of a subject + month
// (one per batch selection) into one list of students.
// Returns null when no record covers the requested
// batches.
//
// Used by getAttendance (one subject) and
// getSemesterAttendance (every subject at once).
//
// =====================================================

const ATTENDANCE_VIEW_ROLES = [
  "staff",
  "hod",
  "admin",
  "principal",
  "coe",
  "exam_officer",
];

// "1,2" -> [1, 2]; nothing -> both batches
const parseBatchNumbers = (batchNumbers) => {
  const batches = String(batchNumbers || "")
    .split(",")
    .map((value) => Number(value))
    .filter((value) => [1, 2].includes(value));

  return batches.length > 0 ? batches : [1, 2];
};

const buildAttendanceView = (
  records,
  requestedBatches,
  meta
) => {
  // Records created by the current system
  // always have batchNumbers.
  const matchingRecords = records.filter(
    (record) =>
      Array.isArray(record.batchNumbers) &&
      record.batchNumbers.length > 0 &&
      record.batchNumbers.some((batch) =>
        requestedBatches.includes(Number(batch))
      )
  );

  if (matchingRecords.length === 0) {
    return null;
  }

  // Each student keeps the classes conducted of
  // their own batch's record.
  const studentMap = new Map();

  for (const record of matchingRecords) {
    const conducted = Number(
      record.classesConducted || 0
    );

    for (const studentEntry of record.students || []) {
      const populatedStudent = studentEntry.studentId;

      if (!populatedStudent) {
        continue;
      }

      // Never show a student from another batch
      if (
        !requestedBatches.includes(
          Number(populatedStudent.batchNumber)
        )
      ) {
        continue;
      }

      studentMap.set(String(populatedStudent._id), {
        studentId: populatedStudent,

        classesAttended: Number(
          studentEntry.classesAttended || 0
        ),

        // The individual maximum if there is one,
        // otherwise classes conducted.
        classesEligible:
          studentEntry.classesEligible !== undefined &&
          studentEntry.classesEligible !== null
            ? Number(studentEntry.classesEligible)
            : conducted,

        classesConducted: conducted,
      });
    }
  }

  // Header value: the highest classes conducted
  // when the batches differ.
  const classesConducted = Math.max(
    0,
    ...matchingRecords.map((record) =>
      Number(record.classesConducted || 0)
    )
  );

  // Locked unless every matching record has been
  // unlocked by the HOD for correction.
  const isLocked = matchingRecords.some(
    (record) => record.isLocked !== false
  );

  return {
    ...meta,
    classesConducted,
    batchNumbers: [
      ...new Set(
        matchingRecords.flatMap(
          (record) => record.batchNumbers || []
        )
      ),
    ].sort(),
    students: Array.from(studentMap.values()),
    isLocked,
    lockedAt: matchingRecords[0]?.lockedAt || null,
    lockedBy: matchingRecords[0]?.lockedBy || null,
  };
};

// =====================================================
// ATTENDANCE OF EVERY SUBJECT OF A SEMESTER
// =====================================================
//
// GET /api/attendance/semester
//   ?department&semester&month&year&batchNumbers
//
// One request instead of one per subject.
// Returns { [subjectId]: view or null }.
// HOD: own department only.
//
// =====================================================

export const getSemesterAttendance = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();

    if (!ATTENDANCE_VIEW_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view attendance.",
      });
    }

    const { semester, month, year, batchNumbers } =
      req.query;

    const department =
      role === "hod"
        ? String(req.user?.department || "")
            .trim()
            .toLowerCase()
        : String(req.query.department || "")
            .trim()
            .toLowerCase();

    if (!department || !semester || !month || !year) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance selection data is missing.",
      });
    }

    const records = await Attendance.find({
      department,
      semester: Number(semester),
      month: Number(month),
      year: Number(year),
    })
      .populate(
        "students.studentId",
        "registerNumber name email department batchNumber imageUrl"
      )
      .lean();

    const bySubject = new Map();

    records.forEach((record) => {
      const key = String(record.subjectId);

      if (!bySubject.has(key)) {
        bySubject.set(key, []);
      }

      bySubject.get(key).push(record);
    });

    const requestedBatches =
      parseBatchNumbers(batchNumbers);

    const data = {};

    for (const [subjectId, subjectRecords] of bySubject) {
      data[subjectId] = buildAttendanceView(
        subjectRecords,
        requestedBatches,
        {
          department,
          semester: Number(semester),
          subjectId,
          month: Number(month),
          year: Number(year),
        }
      );
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Get Semester Attendance Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance.",
    });
  }
};

// =====================================================
// GET MONTHLY ATTENDANCE
// =====================================================

export const getAttendance = async (req, res) => {
  try {
    // -----------------------------------------
    // ROLE CHECK
    // Students see only their own attendance,
    // through /api/students/me/academic.
    // -----------------------------------------

    if (
      !ATTENDANCE_VIEW_ROLES.includes(
        String(req.user?.role || "").toLowerCase()
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view attendance.",
      });
    }

    const {
      department,
      semester,
      subjectId,
      month,
      year,
      batchNumbers,
    } = req.query;

    if (
      !department ||
      !semester ||
      !subjectId ||
      !month ||
      !year
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance selection data is missing.",
      });
    }

    // -----------------------------------------
    // GET ALL ATTENDANCE RECORDS FOR THIS
    // SUBJECT + MONTH + YEAR
    // -----------------------------------------

    const existingRecords =
      await Attendance.find({
        department: department.toLowerCase(),
        semester: Number(semester),
        subjectId,
        month: Number(month),
        year: Number(year),
      })
        .populate(
          "students.studentId",
          "registerNumber name email department batchNumber imageUrl"
        )
        .lean();

    const view = buildAttendanceView(
      existingRecords,
      parseBatchNumbers(batchNumbers),
      {
        department: department.toLowerCase(),
        semester: Number(semester),
        subjectId,
        month: Number(month),
        year: Number(year),
      }
    );

    if (!view) {
      return res.status(200).json({
        success: true,
        exists: false,
        locked: false,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      locked: view.isLocked,
      data: view,
    });
  } catch (error) {
    console.error(
      "Get Attendance Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch attendance.",
    });
  }
};

// =====================================================
// UNLOCK ATTENDANCE FOR CORRECTION
// =====================================================
//
// HOD (own department) or Admin.
//
// The record is kept as it is. The faculty can then
// correct it and save again, which locks it again.
//
// =====================================================

export const unlockAttendance = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();

    if (!["hod", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only HOD or Admin can unlock attendance.",
      });
    }

    const {
      department,
      semester,
      subjectId,
      month,
      year,
      batchNumbers,
    } = req.body;

    if (
      !department ||
      !semester ||
      !month ||
      !year ||
      !mongoose.Types.ObjectId.isValid(subjectId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance selection data is missing.",
      });
    }

    const requestedDepartment =
      String(department).trim().toLowerCase();

    if (
      role === "hod" &&
      String(req.user?.department || "")
        .trim()
        .toLowerCase() !== requestedDepartment
    ) {
      return res.status(403).json({
        success: false,
        message:
          "HOD can unlock attendance only for their own department.",
      });
    }

    const filter = {
      department: requestedDepartment,
      semester: Number(semester),
      subjectId,
      month: Number(month),
      year: Number(year),
      isLocked: { $ne: false },
    };

    const requestedBatches = (
      Array.isArray(batchNumbers) ? batchNumbers : []
    )
      .map(Number)
      .filter((batch) => [1, 2].includes(batch));

    if (requestedBatches.length > 0) {
      filter.batchNumbers = { $in: requestedBatches };
    }

    const result = await Attendance.updateMany(filter, {
      $set: {
        isLocked: false,
        unlockedAt: new Date(),
        unlockedBy: req.user.id,
      },
    });

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No locked attendance was found for this selection.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Attendance unlocked. The faculty can now correct and save it again.",
    });
  } catch (error) {
    console.error("Unlock Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unlock attendance.",
    });
  }
};

// =====================================================
// ADMIN: MONTHS THAT HAVE ATTENDANCE
// =====================================================
//
// Number of attendance records in each month of a year,
// so that the admin page can open on a month that has
// data instead of an empty one.
//
// =====================================================

const ADMIN_VIEW_ROLES = [
  "admin",
  "principal",
  "coe",
  "exam_officer",
];

const isAdmin = (req) =>
  String(req.user?.role || "").toLowerCase() === "admin";

export const getAdminAttendanceMonths = async (
  req,
  res
) => {
  try {
    if (
      !ADMIN_VIEW_ROLES.includes(
        String(req.user?.role || "").toLowerCase()
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view attendance statistics.",
      });
    }

    const year = Number(req.query.year);

    if (!Number.isInteger(year)) {
      return res.status(400).json({
        success: false,
        message: "Year is required.",
      });
    }

    const months = await Attendance.aggregate([
      {
        $match: { year },
      },
      {
        $group: {
          _id: "$month",
          records: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: months.map((item) => ({
        month: item._id,
        records: item.records,
      })),
    });
  } catch (error) {
    console.error(
      "Admin Attendance Months Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch attendance months.",
    });
  }
};

// =====================================================
// ADMIN: ATTENDANCE RECORDS OF A SUBJECT + MONTH
// =====================================================
//
// Every saved record separately (one per batch
// selection), with who entered it, so that the admin
// can correct or delete a particular record.
//
// =====================================================

export const getAdminAttendanceRecords = async (
  req,
  res
) => {
  try {
    if (
      !ADMIN_VIEW_ROLES.includes(
        String(req.user?.role || "").toLowerCase()
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view attendance records.",
      });
    }

    const { subjectId, month, year } = req.query;

    if (
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !month ||
      !year
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject, month and year are required.",
      });
    }

    const records = await Attendance.find({
      subjectId,
      month: Number(month),
      year: Number(year),
    })
      .populate(
        "students.studentId",
        "registerNumber rollNumber name batchNumber"
      )
      .sort({
        batchNumbers: 1,
        createdAt: 1,
      })
      .lean();

    // Names of the faculty who entered the records
    const enteredBy = await User.find({
      clerkId: {
        $in: [
          ...new Set(
            records.map((record) => record.enteredBy)
          ),
        ],
      },
    })
      .select("clerkId name")
      .lean();

    const nameByClerkId = new Map(
      enteredBy.map((user) => [
        user.clerkId,
        user.name,
      ])
    );

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records.map((record) => ({
        ...record,
        isLocked: record.isLocked !== false,
        enteredByName:
          nameByClerkId.get(record.enteredBy) || "",
      })),
    });
  } catch (error) {
    console.error(
      "Admin Attendance Records Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch attendance records.",
    });
  }
};

// =====================================================
// ADMIN: CORRECT AN ATTENDANCE RECORD
// =====================================================
//
// Changes classes conducted and the attended / maximum
// classes of the students already in the record.
// Students cannot be added or removed here.
//
// =====================================================

export const updateAttendance = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only admin can correct saved attendance.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance record ID.",
      });
    }

    const { classesConducted, students } = req.body;

    const conducted = Number(classesConducted);

    if (
      classesConducted === "" ||
      classesConducted === null ||
      classesConducted === undefined ||
      !Number.isInteger(conducted) ||
      conducted < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Classes conducted must be a valid number.",
      });
    }

    if (!Array.isArray(students)) {
      return res.status(400).json({
        success: false,
        message: "Student attendance is required.",
      });
    }

    const record = await Attendance.findById(id)
      .select("students")
      .lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    // Names, for the error messages
    const dbStudents = await Student.find({
      _id: {
        $in: record.students.map(
          (entry) => entry.studentId
        ),
      },
    })
      .select("name")
      .lean();

    const nameById = new Map(
      dbStudents.map((student) => [
        String(student._id),
        student.name,
      ])
    );

    const submitted = new Map(
      students.map((student) => [
        String(student.studentId),
        student,
      ])
    );

    const cleanedStudents = [];

    for (const entry of record.students) {
      const studentId = String(entry.studentId);

      const name =
        nameById.get(studentId) || "A student";

      const change = submitted.get(studentId);

      // Not sent (for example a student who has since
      // been deleted): keep what was saved.
      if (!change) {
        cleanedStudents.push({
          studentId,
          classesEligible: Math.min(
            Number(
              entry.classesEligible ?? conducted
            ),
            conducted
          ),
          classesAttended: Math.min(
            Number(entry.classesAttended || 0),
            conducted
          ),
        });

        continue;
      }

      const blank = (value) =>
        value === "" ||
        value === null ||
        value === undefined;

      const eligible = blank(change.classesEligible)
        ? conducted
        : Number(change.classesEligible);

      const attended = Number(
        change.classesAttended
      );

      if (
        !Number.isInteger(eligible) ||
        eligible < 0 ||
        eligible > conducted
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${name}: maximum classes must be between 0 and ${conducted}.`,
        });
      }

      if (
        blank(change.classesAttended) ||
        !Number.isFinite(attended) ||
        attended < 0 ||
        attended > eligible
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${name}: classes attended must be between 0 and ${eligible}.`,
        });
      }

      cleanedStudents.push({
        studentId,
        classesEligible: eligible,
        classesAttended: attended,
      });
    }

    await Attendance.updateOne(
      { _id: id },
      {
        $set: {
          classesConducted: conducted,
          students: cleanedStudents,
          isLocked: true,
          lockedAt: new Date(),
          lockedBy: req.user.id,
          correctedBy: req.user.id,
        },
      },
      { runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Attendance corrected successfully.",
    });
  } catch (error) {
    console.error(
      "Update Attendance Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to correct attendance.",
    });
  }
};

// =====================================================
// ADMIN: DELETE AN ATTENDANCE RECORD
// =====================================================
//
// For attendance entered under the wrong subject,
// month or batch. The faculty can enter it again
// afterwards. A copy is kept in DeletedRecord.
//
// =====================================================

export const deleteAttendance = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only admin can delete saved attendance.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance record ID.",
      });
    }

    const record = await Attendance.findById(id).lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    // Keep a copy before deleting.
    await DeletedRecord.create({
      kind: "attendance",
      recordId: record._id,
      data: record,
      deletedBy: req.user.id,
    });

    await Attendance.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Attendance deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete Attendance Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete attendance.",
    });
  }
};

// =====================================================
// ADMIN ATTENDANCE STATISTICS
// =====================================================
//
// Returns subject-wise attendance statistics.
//
// Filters supported:
//   year
//   month
//   department
//   semester
//   batch
//
// BRIDGE subjects are excluded because bridge subjects
// do not have attendance.
//
// Percentage:
//   total classes attended
//   ----------------------- x 100
//   total eligible classes
//
// Batch 1 and Batch 2 are calculated separately.
//
// =====================================================

export const getAdminAttendanceStatistics = async (
  req,
  res
) => {
  try {
    const {
      year,
      month,
      department = "all",
      semester = "all",
      batch = "all",
    } = req.query;

    // =================================================
    // ROLE CHECK
    // =================================================

    const allowedRoles = [
      "admin",
      "principal",
      "coe",
      "exam_officer",
    ];

    const userRole = String(
      req.user?.role || ""
    )
      .trim()
      .toLowerCase();

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view attendance statistics.",
      });
    }

    // =================================================
    // REQUIRED YEAR
    // =================================================

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year is required.",
      });
    }

    const selectedYear = Number(year);

    if (
      !Number.isInteger(selectedYear) ||
      selectedYear < 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid year.",
      });
    }

    // =================================================
    // MONTH VALIDATION
    // =================================================

    let selectedMonth = null;

    if (
      month !== undefined &&
      month !== null &&
      String(month).trim() !== "" &&
      String(month).toLowerCase() !== "all"
    ) {
      selectedMonth = Number(month);

      if (
        !Number.isInteger(selectedMonth) ||
        selectedMonth < 1 ||
        selectedMonth > 12
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid month.",
        });
      }
    }

    // =================================================
    // SEMESTER VALIDATION
    // =================================================

    let semesterNumbers = [
      1,
      2,
      3,
      4,
      5,
      6,
    ];

    const requestedSemester = String(
      semester || "all"
    )
      .trim()
      .toLowerCase();

    if (requestedSemester !== "all") {
      const semesterValue = Number(
        requestedSemester
      );

      if (
        !Number.isInteger(semesterValue) ||
        semesterValue < 1 ||
        semesterValue > 6
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester.",
        });
      }

      semesterNumbers = [semesterValue];
    }

    // =================================================
    // DEPARTMENT
    // =================================================

    const requestedDepartment = String(
      department || "all"
    )
      .trim()
      .toLowerCase();

    // =================================================
    // BATCH
    // =================================================

    const requestedBatch = String(
      batch || "all"
    )
      .trim()
      .toLowerCase();

    let requestedBatches = [1, 2];

    if (requestedBatch !== "all") {
      const batchNumber = Number(
        requestedBatch
      );

      if (![1, 2].includes(batchNumber)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch.",
        });
      }

      requestedBatches = [batchNumber];
    }

    // =================================================
    // FIND SUBJECTS
    // =================================================
    //
    // Subject department is stored uppercase.
    //
    // BRIDGE subjects are deliberately excluded.
    // =================================================

    const subjectQuery = {
      semester: {
        $in: semesterNumbers,
      },

      subjectCategory: {
        $ne: "BRIDGE",
      },
    };

    if (
      requestedDepartment !== "all"
    ) {
      subjectQuery.department =
        requestedDepartment.toUpperCase();
    }

    const subjects =
      await Subject.find(subjectQuery)
        .select(
          "_id code name sequence semester department subjectCategory"
        )
        .sort({
          department: 1,
          semester: 1,
          sequence: 1,
          name: 1,
        })
        .lean();

    // =================================================
    // NO SUBJECTS
    // =================================================

    if (subjects.length === 0) {
      return res.status(200).json({
        success: true,
        filters: {
          year: selectedYear,
          month: selectedMonth,
          department:
            requestedDepartment,
          semester:
            requestedSemester,
          batch: requestedBatch,
        },
        summary: {
          subjects: 0,
          attendanceEntered: 0,
          notEntered: 0,
          below75: 0,
          averageAttendance: 0,
        },
        data: [],
      });
    }

    // =================================================
    // FIND ATTENDANCE RECORDS
    // =================================================
    //
    // One query instead of one query per subject.
    // =================================================

    const attendanceQuery = {
      year: selectedYear,

      semester: {
        $in: semesterNumbers,
      },

      subjectId: {
        $in: subjects.map(
          (subject) => subject._id
        ),
      },
    };

    if (
      selectedMonth !== null
    ) {
      attendanceQuery.month =
        selectedMonth;
    }

    if (
      requestedDepartment !== "all"
    ) {
      attendanceQuery.department =
        requestedDepartment;
    }

    const attendanceRecords =
      await Attendance.find(
        attendanceQuery
      )
        .select(
          [
            "department",
            "semester",
            "subjectId",
            "month",
            "year",
            "batchNumbers",
            "classesConducted",
            "students",
          ].join(" ")
        )
        .lean();

    // =================================================
    // GROUP ATTENDANCE BY SUBJECT + BATCH
    // =================================================

    const statisticsMap =
      new Map();

    // -------------------------------------------------
    // Initialize every subject first.
    //
    // This is important because subjects with no
    // attendance must still appear as "Not Entered".
    // -------------------------------------------------

    for (const subject of subjects) {
      const subjectKey =
        String(subject._id);

      statisticsMap.set(
        subjectKey,
        {
          subjectId:
            subject._id,

          subject:
            subject.name || "",

          code:
            subject.code || "",

          sequence:
            subject.sequence || "",

          category:
            subject.subjectCategory ||
            "REGULAR",

          department:
            subject.department || "",

          semester:
            Number(subject.semester),

          batch1: {
            entered: false,
            attended: 0,
            eligible: 0,
            conducted: 0,
            percentage: null,
          },

          batch2: {
            entered: false,
            attended: 0,
            eligible: 0,
            conducted: 0,
            percentage: null,
          },
        }
      );
    }

    // =================================================
    // PROCESS ATTENDANCE RECORDS
    // =================================================

    for (
      const record of attendanceRecords
    ) {
      const subjectKey =
        String(record.subjectId);

      const statistics =
        statisticsMap.get(
          subjectKey
        );

      if (!statistics) {
        continue;
      }

      const recordBatches =
        Array.isArray(
          record.batchNumbers
        )
          ? record.batchNumbers
              .map((value) =>
                Number(value)
              )
              .filter((value) =>
                [1, 2].includes(value)
              )
          : [];

      // ------------------------------------------------
      // Ignore old records which do not contain
      // batchNumbers.
      // ------------------------------------------------

      if (
        recordBatches.length === 0
      ) {
        continue;
      }

      // ------------------------------------------------
      // Determine which requested batches this record
      // belongs to.
      // ------------------------------------------------

      const matchingBatches =
        recordBatches.filter(
          (recordBatch) =>
            requestedBatches.includes(
              recordBatch
            )
        );

      if (
        matchingBatches.length === 0
      ) {
        continue;
      }

      // ------------------------------------------------
      // Process each batch separately.
      // ------------------------------------------------

      for (
        const currentBatch of matchingBatches
      ) {
        const batchKey =
          currentBatch === 1
            ? "batch1"
            : "batch2";

        const batchStatistics =
          statistics[batchKey];

        batchStatistics.entered =
          true;

        batchStatistics.conducted +=
          Number(
            record.classesConducted || 0
          );

        // ------------------------------------------------
        // Students in this attendance record belong to
        // the selected batch.
        //
        // studentId may be populated or may simply be
        // an ObjectId.
        // ------------------------------------------------

        for (
          const studentEntry of
            record.students || []
        ) {
          if (
            !studentEntry
              .studentId
          ) {
            continue;
          }

          const populatedStudent =
            typeof studentEntry
              .studentId ===
            "object"
              ? studentEntry.studentId
              : null;

          // ------------------------------------------------
          // If student information is populated and has
          // batchNumber, make sure it belongs to this batch.
          // ------------------------------------------------

          if (
            populatedStudent &&
            populatedStudent.batchNumber !==
              undefined &&
            Number(
              populatedStudent.batchNumber
            ) !== currentBatch
          ) {
            continue;
          }

          const attended =
            Number(
              studentEntry.classesAttended ||
                0
            );

          const eligible =
            studentEntry.classesEligible !==
              undefined &&
            studentEntry.classesEligible !==
              null
              ? Number(
                  studentEntry.classesEligible
                )
              : Number(
                  record.classesConducted ||
                    0
                );

          if (
            Number.isFinite(attended)
          ) {
            batchStatistics.attended +=
              attended;
          }

          if (
            Number.isFinite(eligible)
          ) {
            batchStatistics.eligible +=
              eligible;
          }
        }
      }
    }

    // =================================================
    // CALCULATE PERCENTAGES
    // =================================================

    const calculatePercentage = (
      batchStatistics
    ) => {
      if (
        !batchStatistics.entered
      ) {
        return null;
      }

      if (
        batchStatistics.eligible <=
        0
      ) {
        return null;
      }

      return Number(
        (
          (batchStatistics.attended /
            batchStatistics.eligible) *
          100
        ).toFixed(2)
      );
    };

    for (
      const statistics of
        statisticsMap.values()
    ) {
      statistics.batch1.percentage =
        calculatePercentage(
          statistics.batch1
        );

      statistics.batch2.percentage =
        calculatePercentage(
          statistics.batch2
        );
    }

    // =================================================
    // CREATE FINAL RESPONSE
    // =================================================

    const finalData =
      Array.from(
        statisticsMap.values()
      ).map(
        (statistics) => {
          const batchPercentages =
            [];

          if (
            statistics.batch1.entered &&
            statistics.batch1.percentage !==
              null
          ) {
            batchPercentages.push(
              statistics.batch1
                .percentage
            );
          }

          if (
            statistics.batch2.entered &&
            statistics.batch2.percentage !==
              null
          ) {
            batchPercentages.push(
              statistics.batch2
                .percentage
            );
          }

          const overallPercentage =
            batchPercentages.length >
            0
              ? Number(
                  (
                    batchPercentages.reduce(
                      (
                        total,
                        value
                      ) =>
                        total + value,
                      0
                    ) /
                    batchPercentages.length
                  ).toFixed(2)
                )
              : null;

          const entered =
            statistics.batch1
              .entered ||
            statistics.batch2
              .entered;

          const below75 =
            entered &&
            overallPercentage !==
              null &&
            overallPercentage < 75;

          return {
            subjectId:
              statistics.subjectId,

            subject:
              statistics.subject,

            code:
              statistics.code,

            sequence:
              statistics.sequence,

            category:
              statistics.category,

            department:
              statistics.department,

            semester:
              statistics.semester,

            batch1: {
              entered:
                statistics.batch1
                  .entered,

              percentage:
                statistics.batch1
                  .percentage,

              attended:
                statistics.batch1
                  .attended,

              eligible:
                statistics.batch1
                  .eligible,

              conducted:
                statistics.batch1
                  .conducted,
            },

            batch2: {
              entered:
                statistics.batch2
                  .entered,

              percentage:
                statistics.batch2
                  .percentage,

              attended:
                statistics.batch2
                  .attended,

              eligible:
                statistics.batch2
                  .eligible,

              conducted:
                statistics.batch2
                  .conducted,
            },

            overall: {
              entered,

              percentage:
                overallPercentage,

              below75,
            },
          };
        }
      );

    // =================================================
    // SUMMARY
    // =================================================

    const totalSubjects =
      finalData.length;

    const attendanceEntered =
      finalData.filter(
        (item) =>
          item.overall.entered
      ).length;

    const notEntered =
      finalData.filter(
        (item) =>
          !item.overall.entered
      ).length;

    const below75 =
      finalData.filter(
        (item) =>
          item.overall.below75
      ).length;

    const validOverallPercentages =
      finalData
        .map(
          (item) =>
            item.overall
              .percentage
        )
        .filter(
          (value) =>
            value !== null &&
            Number.isFinite(value)
        );

    const averageAttendance =
      validOverallPercentages.length >
      0
        ? Number(
            (
              validOverallPercentages.reduce(
                (
                  total,
                  value
                ) =>
                  total + value,
                0
              ) /
              validOverallPercentages.length
            ).toFixed(2)
          )
        : 0;

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      filters: {
        year:
          selectedYear,

        month:
          selectedMonth,

        department:
          requestedDepartment,

        semester:
          requestedSemester,

        batch:
          requestedBatch,
      },

      summary: {
        subjects:
          totalSubjects,

        attendanceEntered:
          attendanceEntered,

        notEntered:
          notEntered,

        below75:
          below75,

        averageAttendance:
          averageAttendance,
      },

      data: finalData,
    });
  } catch (error) {
    console.error(
      "Admin Attendance Statistics Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch attendance statistics.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};