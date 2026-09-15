import mongoose from "mongoose";

const attendanceStudentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    classesAttended: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      required: true,
    },

    classesConducted: {
      type: Number,
      required: true,
      min: 0,
    },

    students: {
      type: [attendanceStudentSchema],
      required: true,
    },

    enteredBy: {
      type: String,
      required: true,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    lockedBy: {
      type: String,
      default: null,
    },

    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index(
  {
    department: 1,
    semester: 1,
    subjectId: 1,
    month: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model("Attendance", attendanceSchema);