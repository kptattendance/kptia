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

   // -----------------------------------------
// VALIDATE STUDENTS
// -----------------------------------------

if (students.length === 0) {
  return res.status(400).json({
    success: false,
    message: "No students were selected.",
  });
}

for (const student of students) {
  const attended = Number(student.classesAttended);

  const eligible =
    student.classesEligible !== undefined &&
    student.classesEligible !== null &&
    student.classesEligible !== ""
      ? Number(student.classesEligible)
      : conducted;

  if (!student.studentId) {
    return res.status(400).json({
      success: false,
      message: "Student ID is missing.",
    });
  }

  if (!Number.isFinite(eligible) || !Number.isInteger(eligible)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid maximum classes value.",
    });
  }

  if (eligible < 0) {
    return res.status(400).json({
      success: false,
      message:
        "Maximum classes cannot be negative.",
    });
  }

  if (eligible > conducted) {
    return res.status(400).json({
      success: false,
      message:
        "A student's maximum classes cannot exceed classes conducted.",
    });
  }

  if (!Number.isFinite(attended)) {
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

  // -----------------------------------------
  // VERIFY STUDENT EXISTS AND BATCH MATCHES
  // -----------------------------------------

  const dbStudent =
    await Student.findById(student.studentId).lean();

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
students: students.map((student) => ({
  studentId: student.studentId,

  classesEligible:
    student.classesEligible !== undefined &&
    student.classesEligible !== null &&
    student.classesEligible !== ""
      ? Number(student.classesEligible)
      : conducted,

  classesAttended: Number(
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

// =====================================================
// GET MONTHLY ATTENDANCE
// =====================================================

export const getAttendance = async (req, res) => {
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

    // -----------------------------------------
    // NO ATTENDANCE
    // -----------------------------------------

    if (existingRecords.length === 0) {
      return res.status(200).json({
        success: true,
        exists: false,
        locked: false,
        data: null,
      });
    }

    // -----------------------------------------
    // REQUESTED BATCHES
    // -----------------------------------------

    let requestedBatches = [];

    if (batchNumbers) {
      requestedBatches = String(batchNumbers)
        .split(",")
        .map((value) => Number(value))
        .filter((value) =>
          [1, 2].includes(value)
        );
    }

    // If no batch is supplied, include all.
    if (requestedBatches.length === 0) {
      requestedBatches = [1, 2];
    }

    // -----------------------------------------
    // FIND ALL RELEVANT ATTENDANCE RECORDS
    // -----------------------------------------

const matchingRecords =
  existingRecords.filter((record) => {
    // Records created by the current system
    // must always have batchNumbers.

    if (
      !Array.isArray(record.batchNumbers) ||
      record.batchNumbers.length === 0
    ) {
      return false;
    }

    return record.batchNumbers.some(
      (batch) =>
        requestedBatches.includes(
          Number(batch)
        )
    );
  });
    // -----------------------------------------
    // NO MATCHING RECORD
    // -----------------------------------------

    if (matchingRecords.length === 0) {
      return res.status(200).json({
        success: true,
        exists: false,
        locked: false,
        data: null,
      });
    }

    // -----------------------------------------
    // COMBINE STUDENTS FROM ALL MATCHING
    // BATCH RECORDS
    //
    // IMPORTANT:
    // Each student keeps the classesConducted
    // value belonging to that student's batch.
    // -----------------------------------------

    const studentMap = new Map();

    for (const record of matchingRecords) {
      const conducted =
        Number(record.classesConducted || 0);

      for (
  const studentEntry of
    record.students || []
) {
  const populatedStudent =
    studentEntry.studentId;

  if (!populatedStudent) {
    continue;
  }

  // -------------------------------------------------
  // NEVER SHOW A STUDENT FROM ANOTHER BATCH
  // -------------------------------------------------

  if (
    !requestedBatches.includes(
      Number(populatedStudent.batchNumber)
    )
  ) {
    continue;
  }

  const studentId =
    String(populatedStudent._id);
        studentMap.set(
          studentId,
          {
            studentId: populatedStudent,

            classesAttended:
              Number(
                studentEntry.classesAttended || 0
              ),

            // Use the individual maximum if it
            // exists. Otherwise use classesConducted.
            classesEligible:
              studentEntry.classesEligible !==
                undefined &&
              studentEntry.classesEligible !==
                null
                ? Number(
                    studentEntry.classesEligible
                  )
                : conducted,

            // IMPORTANT:
            // Keep the classes conducted for
            // THIS student's attendance record.
            classesConducted: conducted,
          }
        );
      }
    }

    // -----------------------------------------
    // DETERMINE TOP-LEVEL CLASSES CONDUCTED
    //
    // If both batches have different values,
    // use the highest value for the header.
    // The individual student value above is
    // what must be used for percentage.
    // -----------------------------------------

    const allConducted =
      matchingRecords.map((record) =>
        Number(
          record.classesConducted || 0
        )
      );

    const classesConducted =
      allConducted.length > 0
        ? Math.max(...allConducted)
        : 0;

    // -----------------------------------------
    // RETURN COMBINED ATTENDANCE
    // -----------------------------------------

    const combinedStudents =
      Array.from(
        studentMap.values()
      );

    return res.status(200).json({
      success: true,
      exists: true,
      locked: true,

      data: {
        // Keep the existing fields
        // so current frontend continues
        // to work.

        department:
          department.toLowerCase(),

        semester:
          Number(semester),

        subjectId,

        month:
          Number(month),

        year:
          Number(year),

        // Header value.
        // Individual students have their
        // own classesConducted below.
        classesConducted,

        // Combine all batches.
        batchNumbers:
          [
            ...new Set(
              matchingRecords.flatMap(
                (record) =>
                  record.batchNumbers ||
                  []
              )
            ),
          ].sort(),

        students:
          combinedStudents,

        // Attendance is locked if any matching
        // attendance record exists.
        isLocked: true,

        lockedAt:
          matchingRecords[0]?.lockedAt ||
          null,

        lockedBy:
          matchingRecords[0]?.lockedBy ||
          null,
      },
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