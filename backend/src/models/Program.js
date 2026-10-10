import mongoose from "mongoose";

// ==========================================================
// PROGRAM (DEPARTMENT)
//
// Program level NBA information of a department.
//
// POs are common to every diploma programme and are
// kept in config/programOutcomes.js.
// PSOs are specific to the department and are kept here.
// ==========================================================

const psoSchema = new mongoose.Schema(
  {
    // PSO1, PSO2, ...
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
  },
  {
    _id: false,
  }
);

const programSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    psos: {
      type: [psoSchema],
      default: [],
    },

    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Program",
  programSchema
);
