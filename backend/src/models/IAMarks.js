// models/IAMarks.js

import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    testName: {
      type: String,
      required: true,
      trim: true,
    },

    maxMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    marks: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const studentIASchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    tests: {
      type: [testSchema],
      required: true,
    },
  },
  { _id: false }
);

const iaMarksSchema = new mongoose.Schema(
  {
    department: {
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

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    students: {
      type: [studentIASchema],
      required: true,
    },

    enteredBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

iaMarksSchema.index(
  {
    department: 1,
    semester: 1,
    subjectId: 1,
    academicYear: 1,
  },
  { unique: true }
);

export default mongoose.model("IAMarks", iaMarksSchema);