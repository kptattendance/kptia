import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";



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
    } = req.body;

    // -----------------------------------------
    // ROLE CHECK
    // -----------------------------------------

    if (!["staff", "hod"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only faculty and HOD can enter attendance.",
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
      !Array.isArray(students)
    ) {
      return res.status(400).json({
        success: false,
        message: "Required attendance data is missing.",
      });
    }

    // -----------------------------------------
    // VALIDATE CLASSES CONDUCTED
    // -----------------------------------------

    if (
      !Number.isInteger(Number(classesConducted)) ||
      Number(classesConducted) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Classes conducted must be a valid number.",
      });
    }

    // -----------------------------------------
    // CHECK EXISTING RECORD
    // -----------------------------------------

    const existingAttendance = await Attendance.findOne({
      department: department.toLowerCase(),
      semester: Number(semester),
      subjectId,
      month: Number(month),
      year: Number(year),
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance has already been entered for this month and is locked. It cannot be modified.",
      });
    }

    // -----------------------------------------
    // VALIDATE STUDENTS
    // -----------------------------------------

    const conducted = Number(classesConducted);

    for (const student of students) {
      const attended = Number(student.classesAttended);

      if (!student.studentId) {
        return res.status(400).json({
          success: false,
          message: "Student ID is missing.",
        });
      }

      if (!Number.isFinite(attended)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance value.",
        });
      }

      if (attended < 0 || attended > conducted) {
        return res.status(400).json({
          success: false,
          message:
            "Classes attended cannot be less than 0 or greater than classes conducted.",
        });
      }
    }

    // -----------------------------------------
    // CREATE — NEVER UPDATE
    // -----------------------------------------

    const attendance = await Attendance.create({
      department: department.toLowerCase(),
      semester: Number(semester),
      subjectId,
      month: Number(month),
      year: Number(year),
      classesConducted: conducted,

      students: students.map((student) => ({
        studentId: student.studentId,
        classesAttended: Number(student.classesAttended),
      })),

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
    console.error("Save Attendance Error:", error);

    // Duplicate unique-index protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        locked: true,
        message:
          "Attendance already exists for this month and is locked.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save attendance.",
    });
  }
};


// GET MONTHLY ATTENDANCE
export const getAttendance = async (req, res) => {
  try {
    const {
      department,
      semester,
      subjectId,
      month,
      year,
    } = req.query;

    const attendance = await Attendance.findOne({
      department,
      semester,
      subjectId,
      month,
      year,
    }).populate(
      "students.studentId",
      "registerNumber name email"
    );

    return res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error("Get Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance.",
    });
  }
};