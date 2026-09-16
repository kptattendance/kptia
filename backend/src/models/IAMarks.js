// models/IAMarks.js

import mongoose from "mongoose";

// --------------------------------------------------
// CO MARKS
// --------------------------------------------------

const coMarksSchema = new mongoose.Schema(
  {
    CO1: {
      type: Number,
      default: 0,
      min: 0,
    },

    CO2: {
      type: Number,
      default: 0,
      min: 0,
    },

    CO3: {
      type: Number,
      default: 0,
      min: 0,
    },

    CO4: {
      type: Number,
      default: 0,
      min: 0,
    },

    CO5: {
      type: Number,
      default: 0,
      min: 0,
    },

    CO6: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

// --------------------------------------------------
// TEST CONFIGURATION
// This is common for the entire class.
// --------------------------------------------------

const testSchema = new mongoose.Schema(
  {
    testName: {
      type: String,
      required: true,
      trim: true,
    },

    // Example: 50
    maxMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    // Example:
    // CO1: 20
    // CO2: 30
    // CO3: 0
    // ...
    // Total = 50
    coMarks: {
      type: coMarksSchema,
      required: true,
    },
  },
  { _id: false }
);

// --------------------------------------------------
// STUDENT TEST MARKS
// --------------------------------------------------

const studentTestSchema = new mongoose.Schema(
  {
    // Actual marks obtained by student in this test.
    //
    // Example:
    // CO1 = 16
    // CO2 = 24
    // Total = 40
    //
    // If ABSENT, marks will be null.
    marks: {
      type: Number,
      default: null,
      min: 0,
    },

    status: {
      type: String,
      enum: ["PRESENT", "ABSENT"],
      default: "PRESENT",
    },

    // Actual CO-wise marks obtained
    coMarks: {
      type: coMarksSchema,
      required: true,
    },
  },
  { _id: false }
);

// --------------------------------------------------
// STUDENT IA
// --------------------------------------------------

const studentIASchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // Must have same number of entries
    // as the main tests array.
    tests: {
      type: [studentTestSchema],
      required: true,
    },

    // Calculated total obtained by student.
    totalMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

// --------------------------------------------------
// IA MARKS
// --------------------------------------------------

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

    // All tests for this IA
    tests: {
      type: [testSchema],
      required: true,
    },

    // Automatically calculated:
    //
    // Test 1 = 50
    // Test 2 = 25
    // Test 3 = 25
    //
    // Total = 100
    totalMaxMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    students: {
      type: [studentIASchema],
      required: true,
    },

    // Clerk ID of person who entered it
    enteredBy: {
      type: String,
      required: true,
    },

    // ------------------------------------------------
    // FREEZE
    // ------------------------------------------------

    isLocked: {
      type: Boolean,
      default: true,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    lockedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// --------------------------------------------------
// ONE IA RECORD PER
// DEPARTMENT + SEMESTER + SUBJECT + ACADEMIC YEAR
// --------------------------------------------------

iaMarksSchema.index(
  {
    department: 1,
    semester: 1,
    subjectId: 1,
    academicYear: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model("IAMarks", iaMarksSchema);