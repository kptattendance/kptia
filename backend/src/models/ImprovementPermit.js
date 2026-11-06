import mongoose from "mongoose";

// ==========================================================
// IMPROVEMENT TEST PERMISSION
//
// The HOD lets a student take the improvement test of a
// subject although the student's CIE is not below the
// minimum, for example after missing a CIE for NCC or
// NSS. One per student, subject and academic year.
// ==========================================================

export const PERMIT_REASONS = [
  "NCC",
  "NSS",
  "Sports",
  "Medical",
  "Other",
];

const improvementPermitSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    batchNumber: {
      type: Number,
      required: true,
      enum: [1, 2],
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    reason: {
      type: String,
      required: true,
      enum: PERMIT_REASONS,
    },

    // Optional detail, e.g. "NCC camp, 10-14 Oct"
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    addedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

improvementPermitSchema.index(
  { academicYear: 1, subjectId: 1, studentId: 1 },
  { unique: true }
);

export default mongoose.model(
  "ImprovementPermit",
  improvementPermitSchema
);
