import mongoose from "mongoose";

// ==========================================================
// CO MARKS
// ==========================================================

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
  {
    _id: false,
  }
);

// ==========================================================
// IA TEST
// ==========================================================

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

    // Maximum marks allocated to each CO
    coMarks: {
      type: coMarksSchema,
      required: true,
    },
  },
  {
    _id: false,
  }
);

// ==========================================================
// STUDENT TEST MARKS
// ==========================================================

const studentTestSchema = new mongoose.Schema(
  {
    marks: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["PRESENT", "ABSENT"],
      default: "PRESENT",
    },

    // Actual CO marks obtained by the student
    coMarks: {
      type: coMarksSchema,
      required: true,
    },
  },
  {
    _id: false,
  }
);

// ==========================================================
// STUDENT IA RECORD
// ==========================================================

const studentIASchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    tests: {
      type: [studentTestSchema],
      required: true,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

// ==========================================================
// IA MARKS
// ==========================================================

const iaMarksSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------
    // ACADEMIC INFORMATION
    // ------------------------------------------------------

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

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

    // ------------------------------------------------------
    // IA NUMBER
    //
    // 1 = IA1
    // 2 = IA2
    // 3 = IA3
    // 4 = IA4
    // 5 = IA5
    // etc.
    //
    // No fixed maximum.
    // Subject.iaCount decides how many IAs
    // are actually available for that subject.
    // ------------------------------------------------------

    iaNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    // ------------------------------------------------------
    // STUDENT GROUP
    //
    // 1 = Batch 1
    // 2 = Batch 2
    // ------------------------------------------------------

    batchNumber: {
      type: Number,
      required: true,
      enum: [1, 2],
    },

    // ------------------------------------------------------
    // IA TESTS
    // ------------------------------------------------------

    tests: {
      type: [testSchema],
      required: true,
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length > 0,
        message:
          "At least one IA test is required.",
      },
    },

    totalMaxMarks: {
      type: Number,
      required: true,
      min: 0,
    },

    // ------------------------------------------------------
    // STUDENT MARKS
    // ------------------------------------------------------

    students: {
      type: [studentIASchema],
      required: true,
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length > 0,
        message:
          "At least one student is required.",
      },
    },

    // ------------------------------------------------------
    // ENTERED / LOCKED
    // ------------------------------------------------------

    enteredBy: {
      type: String,
      required: true,
    },

    isLocked: {
      type: Boolean,
      default: true,
    },

    lockedAt: {
      type: Date,
    },

    lockedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================================
// UNIQUE IA RECORD
//
// One record for:
// Academic Year + Department + Semester +
// Subject + IA Number + Batch Number
//
// Example:
//
// 2026-27 + CS + Sem 5 + Java + IA1 + Batch1
//
// is different from:
//
// 2026-27 + CS + Sem 5 + Java + IA2 + Batch1
//
// and:
//
// 2026-27 + CS + Sem 5 + Java + IA1 + Batch2
// ==========================================================

iaMarksSchema.index(
  {
    academicYear: 1,
    department: 1,
    semester: 1,
    subjectId: 1,
    iaNumber: 1,
    batchNumber: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.model(
  "IAMarks",
  iaMarksSchema
);