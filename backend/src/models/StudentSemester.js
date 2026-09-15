import mongoose from "mongoose";

const studentSemesterSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },

    status: {
      type: String,
      enum: [
        "CURRENT",
        "PROMOTED",
        "FAILED",
        "COMPLETED",
        "DISCONTINUED",
      ],
      default: "CURRENT",
    },
  },
  {
    timestamps: true,
  }
);

studentSemesterSchema.index(
  {
    studentId: 1,
    academicYear: 1,
    semester: 1,
  },
  { unique: true }
);

export default mongoose.model(
  "StudentSemester",
  studentSemesterSchema
);