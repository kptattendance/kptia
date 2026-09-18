import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },

    registerNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other"],
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
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

    // Year in which the student was admitted
    admissionYear: {
      type: Number,
      required: true,
    },

    // Academic batch
    // Example: 2023-2026
    batch: {
      type: String,
      required: true,
      trim: true,
    },

    // IA grouping
    // Batch 1 or Batch 2
    batchNumber: {
      type: Number,
      required: true,
      enum: [1, 2],
    },

    role: {
      type: String,
      default: "student",
    },

    imageUrl: {
      type: String,
    },

    imagePublicId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Student", studentSchema);