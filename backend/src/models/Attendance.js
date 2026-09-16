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

    // -----------------------------------------
    // BATCHES INCLUDED IN THIS ATTENDANCE RECORD
    //
    // Batch 1        -> [1]
    // Batch 2        -> [2]
    // Both Batches   -> [1, 2]
    // -----------------------------------------

    batchNumbers: {
      type: [
        {
          type: Number,
          enum: [1, 2],
        },
      ],
      required: true,
      validate: {
        validator: function (value) {
          return (
            Array.isArray(value) &&
            value.length >= 1 &&
            value.length <= 2
          );
        },
        message:
          "At least one batch must be selected.",
      },
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

// -----------------------------------------
// NON-UNIQUE INDEX
// -----------------------------------------
//
// Multiple records are allowed for:
// Batch 1
// Batch 2
//
// Overlap checking is handled in controller.
// -----------------------------------------

attendanceSchema.index({
  department: 1,
  semester: 1,
  subjectId: 1,
  month: 1,
  year: 1,
});

export default mongoose.model(
  "Attendance",
  attendanceSchema
);