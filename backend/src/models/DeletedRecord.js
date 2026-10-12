import mongoose from "mongoose";

// ==========================================================
// DELETED RECORD
//
// A full copy of an attendance or IA record that the
// admin deleted, with who deleted it and when.
//
// Deleting is permanent for the users of the system.
// This copy exists so that a record deleted by mistake
// can still be recovered from the database.
// ==========================================================

const deletedRecordSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: ["attendance", "ia"],
    },

    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // The record exactly as it was when deleted.
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    deletedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "DeletedRecord",
  deletedRecordSchema
);
