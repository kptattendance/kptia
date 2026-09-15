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
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
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

    admissionYear: {
      type: Number,
      required: true,
    },

    batch: {
      type: String,
      required: true,
      trim: true,
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