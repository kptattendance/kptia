import mongoose from "mongoose";

// ==========================================================
// MENTOR ASSIGNMENT
//
// The faculty mentor of a student for an academic year,
// assigned by the HOD. A mentor looks after a group of
// students; each student has one mentor.
//
// One record per:
// Academic Year + Student
// ==========================================================

const mentorAssignmentSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}$/,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // Copied from the student for quick filtering.
    department: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // Faculty (MongoDB User)
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

mentorAssignmentSchema.index(
  {
    academicYear: 1,
    studentId: 1,
  },
  {
    unique: true,
  }
);

mentorAssignmentSchema.index({
  academicYear: 1,
  mentorId: 1,
});

export default mongoose.model(
  "MentorAssignment",
  mentorAssignmentSchema
);
