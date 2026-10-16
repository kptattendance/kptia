import mongoose from "mongoose";
import MentorAssignment from "../models/MentorAssignment.js";
import Student from "../models/Student.js";
import User from "../models/User.js";

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

// HOD -> own department. Admin -> the department asked for.
// Returns "" when not allowed.
const getManagedDepartment = (req, requested) => {
  const role = getRole(req);

  if (role === "hod") {
    return normalizeDepartment(req.user?.department);
  }

  if (role === "admin") {
    return normalizeDepartment(requested);
  }

  return "";
};

// ==================================================
// STUDENTS WITH THEIR MENTOR
//
// HOD (own department) / Admin
// ==================================================

export const getMentorAssignments = async (
  req,
  res
) => {
  try {
    const { academicYear, semester } = req.query;

    const department = getManagedDepartment(
      req,
      req.query.department
    );

    if (!department) {
      return res.status(403).json({
        success: false,
        message:
          "Only the HOD or Admin can manage mentors.",
      });
    }

    if (!isAcademicYear(academicYear)) {
      return res.status(400).json({
        success: false,
        message: "Academic year is required.",
      });
    }

    const studentFilter = {
      department,
      status: "active",
    };

    if (semester) {
      studentFilter.semester = Number(semester);
    }

    const students = await Student.find(studentFilter)
      .select(
        "name registerNumber rollNumber semester batchNumber imageUrl"
      )
      .lean();

    // Roll number order, as on the attendance sheet
    students.sort(
      (a, b) =>
        String(a.rollNumber || "").localeCompare(
          String(b.rollNumber || ""),
          undefined,
          { numeric: true }
        ) ||
        String(a.registerNumber).localeCompare(
          String(b.registerNumber)
        )
    );

    const assignments = await MentorAssignment.find({
      academicYear,
      studentId: {
        $in: students.map((student) => student._id),
      },
    })
      .populate("mentorId", "name department")
      .lean();

    const mentorByStudent = new Map(
      assignments.map((assignment) => [
        String(assignment.studentId),
        assignment.mentorId,
      ])
    );

    return res.status(200).json({
      success: true,
      department,
      data: students.map((student) => {
        const mentor = mentorByStudent.get(
          String(student._id)
        );

        return {
          ...student,
          mentor: mentor
            ? {
                _id: mentor._id,
                name: mentor.name,
                department: mentor.department,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error(
      "Get Mentor Assignments Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch mentors.",
    });
  }
};

// ==================================================
// ASSIGN A MENTOR TO SELECTED STUDENTS
//
// A student who already has a mentor gets the new one.
// ==================================================

export const assignMentor = async (req, res) => {
  try {
    const {
      academicYear,
      mentorId,
      studentIds,
    } = req.body;

    const department = getManagedDepartment(
      req,
      req.body.department
    );

    if (!department) {
      return res.status(403).json({
        success: false,
        message:
          "Only the HOD or Admin can manage mentors.",
      });
    }

    if (
      !isAcademicYear(academicYear) ||
      !mongoose.Types.ObjectId.isValid(mentorId) ||
      !Array.isArray(studentIds) ||
      studentIds.length === 0 ||
      studentIds.some(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Select the mentor and at least one student.",
      });
    }

    const mentor = await User.findById(mentorId)
      .select("name role")
      .lean();

    if (
      !mentor ||
      !["staff", "hod"].includes(mentor.role)
    ) {
      return res.status(404).json({
        success: false,
        message: "Mentor not found.",
      });
    }

    // Only students of the managed department
    const students = await Student.find({
      _id: { $in: studentIds },
      department,
    })
      .select("_id")
      .lean();

    if (students.length !== new Set(studentIds.map(String)).size) {
      return res.status(403).json({
        success: false,
        message:
          "Mentors can be assigned only to students of your own department.",
      });
    }

    await MentorAssignment.bulkWrite(
      students.map((student) => ({
        updateOne: {
          filter: {
            academicYear,
            studentId: student._id,
          },
          update: {
            $set: {
              department,
              mentorId,
              assignedBy: req.user.id,
            },
          },
          upsert: true,
        },
      }))
    );

    return res.status(200).json({
      success: true,
      message: `${mentor.name} is now the mentor of ${students.length} ${
        students.length === 1 ? "student" : "students"
      }.`,
    });
  } catch (error) {
    console.error("Assign Mentor Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign the mentor.",
    });
  }
};

// ==================================================
// REMOVE THE MENTOR OF SELECTED STUDENTS
// ==================================================

export const removeMentor = async (req, res) => {
  try {
    const { academicYear, studentIds } = req.body;

    const department = getManagedDepartment(
      req,
      req.body.department
    );

    if (!department) {
      return res.status(403).json({
        success: false,
        message:
          "Only the HOD or Admin can manage mentors.",
      });
    }

    if (
      !isAcademicYear(academicYear) ||
      !Array.isArray(studentIds) ||
      studentIds.length === 0 ||
      studentIds.some(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Select at least one student.",
      });
    }

    const result = await MentorAssignment.deleteMany({
      academicYear,
      department,
      studentId: { $in: studentIds },
    });

    return res.status(200).json({
      success: true,
      message: `Mentor removed for ${result.deletedCount} ${
        result.deletedCount === 1 ? "student" : "students"
      }.`,
    });
  } catch (error) {
    console.error("Remove Mentor Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove the mentor.",
    });
  }
};

// ==================================================
// MENTOR OF A STUDENT (used by the progress report)
// ==================================================

export const getMentorName = async (
  studentId,
  academicYear
) => {
  const assignment = await MentorAssignment.findOne({
    academicYear,
    studentId,
  })
    .populate("mentorId", "name")
    .lean();

  return assignment?.mentorId?.name || "";
};
