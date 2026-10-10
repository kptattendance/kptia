import mongoose from "mongoose";

// ==========================================================
// COURSE OUTCOMES
//
// The COs of a subject for one academic year, their
// mapping to POs / PSOs, and the attainment targets
// fixed by the faculty.
//
// One record per:
// Academic Year + Subject
// ==========================================================

const coSchema = new mongoose.Schema(
  {
    // CO1 ... CO6
    // Same codes that are used in IA marks.
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    statement: {
      type: String,
      required: true,
      trim: true,
    },

    // Bloom's taxonomy level
    //
    // L1 = Remember
    // L2 = Understand
    // L3 = Apply
    // L4 = Analyse
    // L5 = Evaluate
    // L6 = Create
    bloomLevel: {
      type: String,
      required: true,
      enum: ["L1", "L2", "L3", "L4", "L5", "L6"],
    },

    // CO - PO / PSO MAPPING
    //
    // { PO1: 3, PO2: 2, PSO1: 1 }
    //
    // 1 = Low
    // 2 = Medium
    // 3 = High
    //
    // An outcome that is not mapped is not stored.
    mapping: {
      type: Map,
      of: {
        type: Number,
        min: 1,
        max: 3,
      },
      default: {},
    },

    // Why the CO is mapped to those POs / PSOs
    justification: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const courseOutcomeSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}$/,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    // Copied from the subject for quick filtering.

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

    cos: {
      type: [coSchema],
      required: true,
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length >= 1 &&
          value.length <= 6,
        message:
          "A subject must have between one and six course outcomes.",
      },
    },

    // ------------------------------------------------------
    // ATTAINMENT TARGETS
    //
    // A student attains a CO by scoring at least
    // marksPercent of the marks of that CO.
    //
    // The CO attainment level is decided by the
    // percentage of students who attained it:
    //
    // >= level3 %  -> Level 3
    // >= level2 %  -> Level 2
    // >= level1 %  -> Level 1
    // otherwise    -> Level 0
    // ------------------------------------------------------

    targets: {
      marksPercent: {
        type: Number,
        default: 60,
        min: 1,
        max: 100,
      },

      level1: {
        type: Number,
        default: 50,
        min: 1,
        max: 100,
      },

      level2: {
        type: Number,
        default: 60,
        min: 1,
        max: 100,
      },

      level3: {
        type: Number,
        default: 70,
        min: 1,
        max: 100,
      },
    },

    updatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

courseOutcomeSchema.index(
  {
    academicYear: 1,
    subjectId: 1,
  },
  {
    unique: true,
  }
);

courseOutcomeSchema.index({
  academicYear: 1,
  department: 1,
  semester: 1,
});

export default mongoose.model(
  "CourseOutcome",
  courseOutcomeSchema
);
