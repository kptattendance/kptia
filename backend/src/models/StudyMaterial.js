import mongoose from "mongoose";

// ==========================================================
// STUDY MATERIAL
//
// One PDF of notes per subject per academic year.
//
// A file uploaded by the faculty waits in "pending" until
// the HOD approves it. Students see only "approved".
//
// When a faculty replaces the file, the earlier approved
// file stays visible to students until the new one is
// approved.
// ==========================================================

const fileSchema = new mongoose.Schema(
  {
    // Google Drive file ID
    driveFileId: {
      type: String,
      required: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    // Bytes
    size: {
      type: Number,
      required: true,
      min: 1,
    },

    // Clerk ID + name of the faculty
    uploadedBy: {
      type: String,
      required: true,
    },

    uploadedByName: {
      type: String,
      default: "",
    },

    uploadedAt: {
      type: Date,
      required: true,
    },

    // Only on an approved file
    approvedBy: {
      type: String,
    },

    approvedByName: {
      type: String,
    },

    approvedAt: {
      type: Date,
    },
  },
  {
    _id: false,
  }
);

const studyMaterialSchema = new mongoose.Schema(
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

    // Kept at 0: one file for the whole subject.
    // Allows week-wise files later without changing
    // the existing records.
    week: {
      type: Number,
      default: 0,
      min: 0,
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

    // Shown to students
    approved: {
      type: fileSchema,
      default: null,
    },

    // Waiting for the HOD
    pending: {
      type: fileSchema,
      default: null,
    },

    // The last rejection, shown to the faculty
    // until a new file is uploaded.
    rejection: {
      remark: {
        type: String,
        trim: true,
      },

      rejectedByName: {
        type: String,
      },

      rejectedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

studyMaterialSchema.index(
  {
    academicYear: 1,
    subjectId: 1,
    week: 1,
  },
  {
    unique: true,
  }
);

studyMaterialSchema.index({
  academicYear: 1,
  department: 1,
  semester: 1,
});

export default mongoose.model(
  "StudyMaterial",
  studyMaterialSchema
);
