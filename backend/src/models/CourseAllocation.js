import mongoose from "mongoose";

// ==========================================================
// COURSE ALLOCATION
//
// Which faculty teaches which subject, for which batch,
// in which academic year.
//
// One record per:
// Academic Year + Subject + Faculty
//
// A subject can have more than one faculty
// (for example one faculty per practical batch).
// ==========================================================

const courseAllocationSchema = new mongoose.Schema(
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

    // Faculty (MongoDB User)

    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Faculty Clerk ID.
    // Attendance and IA records store the Clerk ID
    // in enteredBy, so it is kept here as well.

    facultyClerkId: {
      type: String,
      required: true,
      index: true,
    },

    // Batch 1        -> [1]
    // Batch 2        -> [2]
    // Both Batches   -> [1, 2]

    batchNumbers: {
      type: [
        {
          type: Number,
          enum: [1, 2],
        },
      ],
      required: true,
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length >= 1 &&
          value.length <= 2 &&
          new Set(value).size === value.length,
        message:
          "Allocation must contain one or two unique batches.",
      },
    },

    allocatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

courseAllocationSchema.index(
  {
    academicYear: 1,
    subjectId: 1,
    facultyId: 1,
  },
  {
    unique: true,
  }
);

courseAllocationSchema.index({
  academicYear: 1,
  department: 1,
  semester: 1,
});

export default mongoose.model(
  "CourseAllocation",
  courseAllocationSchema
);
