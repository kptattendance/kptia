import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";

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
    // CHECK EXISTING ATTENDANCE
    // -----------------------------------------
    //
    // Batch 1 selected:
    //   Existing [1]     -> locked
    //   Existing [1,2]   -> locked
    //   Existing [2]     -> allowed
    //
    // Batch 2 selected:
    //   Existing [2]     -> locked
    //   Existing [1,2]   -> locked
    //   Existing [1]     -> allowed
    //
    // Both selected:
    //   Any existing batch -> locked
    //
    // Old records without batchNumbers are
    // considered locked for the entire subject.
    // -----------------------------------------

    const existingRecords =
      await Attendance.find({
        department:
          department.toLowerCase(),

        semester:
          Number(semester),

        subjectId,

        month:
          Number(month),

        year:
          Number(year),
      }).lean();

    for (const existing of existingRecords) {
      // Old attendance record
      // without batchNumbers
      if (
        !Array.isArray(
          existing.batchNumbers
        ) ||
        existing.batchNumbers.length === 0
      ) {
        return res.status(409).json({
          success: false,
          locked: true,
          message:
            "Attendance has already been entered for this month and subject and is locked.",
        });
      }

      const overlap =
        existing.batchNumbers.some(
          (batch) =>
            selectedBatches.includes(
              Number(batch)
            )
        );

      if (overlap) {
        return res.status(409).json({
          success: false,
          locked: true,
          message:
            "Attendance has already been entered for the selected batch and is locked.",
        });
      }
    }

    // -----------------------------------------
    // VALIDATE STUDENTS
    // -----------------------------------------

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No students were selected.",
      });
    }

    for (const student of students) {
      const attended =
        Number(
          student.classesAttended
        );

      if (!student.studentId) {
        return res.status(400).json({
          success: false,
          message:
            "Student ID is missing.",
        });
      }

      if (!Number.isFinite(attended)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance value.",
        });
      }

      if (
        attended < 0 ||
        attended > conducted
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Classes attended cannot be less than 0 or greater than classes conducted.",
        });
      }

      // -----------------------------------------
      // VERIFY STUDENT EXISTS AND BATCH MATCHES
      // -----------------------------------------

      const dbStudent =
        await Student.findById(
          student.studentId
        ).lean();

      if (!dbStudent) {
        return res.status(400).json({
          success: false,
          message:
            "One or more selected students do not exist.",
        });
      }

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
    // CREATE — NEVER UPDATE
    // -----------------------------------------

    const attendance =
      await Attendance.create({
        department:
          department.toLowerCase(),

        semester:
          Number(semester),

        subjectId,

        month:
          Number(month),

        year:
          Number(year),

        batchNumbers:
          selectedBatches,

        classesConducted:
          conducted,

        students:
          students.map((student) => ({
            studentId:
              student.studentId,

            classesAttended:
              Number(
                student.classesAttended
              ),
          })),

        enteredBy:
          req.user.id,

        lockedAt:
          new Date(),

        lockedBy:
          req.user.id,

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

    return res.status(500).json({
      success: false,
      message:
        "Failed to save attendance.",
    });
  }
};

// =====================================================
// GET MONTHLY ATTENDANCE
// =====================================================

export const getAttendance = async (
  req,
  res
) => {
  try {
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

    const existingRecords =
      await Attendance.find({
        department:
          department.toLowerCase(),

        semester:
          Number(semester),

        subjectId,

        month:
          Number(month),

        year:
          Number(year),
      })
        .populate(
          "students.studentId",
          "registerNumber name email batchNumber"
        )
        .lean();

    // -----------------------------------------
    // No attendance
    // -----------------------------------------

    if (
      existingRecords.length === 0
    ) {
      return res.status(200).json({
        success: true,
        exists: false,
        locked: false,
        data: null,
      });
    }

    // -----------------------------------------
    // Requested batches
    // -----------------------------------------

    let requestedBatches = [];

    if (batchNumbers) {
      requestedBatches =
        String(batchNumbers)
          .split(",")
          .map((value) =>
            Number(value)
          )
          .filter((value) =>
            [1, 2].includes(value)
          );
    }

    // -----------------------------------------
    // Find overlapping record
    // -----------------------------------------

    let matchingRecord = null;

    for (const record of existingRecords) {
      // Old records without batchNumbers
      // lock everything.
      if (
        !Array.isArray(
          record.batchNumbers
        ) ||
        record.batchNumbers.length === 0
      ) {
        matchingRecord = record;
        break;
      }

      // If no batch was supplied,
      // any existing record counts.
      if (
        requestedBatches.length === 0
      ) {
        matchingRecord = record;
        break;
      }

      const overlap =
        record.batchNumbers.some(
          (batch) =>
            requestedBatches.includes(
              Number(batch)
            )
        );

      if (overlap) {
        matchingRecord = record;
        break;
      }
    }

    if (!matchingRecord) {
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
      locked: true,
      data: matchingRecord,
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