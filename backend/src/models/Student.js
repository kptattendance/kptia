import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    // =====================================================
    // CANONICAL MONGODB USER ID
    // =====================================================
    // This is the common application-level user identity.
    // Student._id remains the Student profile ID.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      unique: true,
      sparse: true,
    },

    // =====================================================
    // CLERK AUTHENTICATION ID
    // =====================================================
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // =====================================================
    // STUDENT DETAILS
    // =====================================================

    registerNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      required: true,
      trim: true,
    },

    motherName: {
      type: String,
      required: true,
      trim: true,
    },

    dob: {
      type: Date,
      required: true,
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
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    parentPhone: {
      type: String,
      trim: true,
      default: "",
    },

    caste: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },

    aadhaarNumber: {
      type: String,
      trim: true,
      default: "",
    },

    satsNumber: {
      type: String,
      trim: true,
      default: "",
    },

    // =====================================================
    // ACADEMIC DETAILS
    // =====================================================

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

    batchNumber: {
      type: Number,
      required: true,
      enum: [1, 2],
    },

    admissionType: {
      type: String,
      required: true,
      enum: [
        "regular",
        "lateralPUC",
        "lateralITI",
        "lateralCross",
        "workingProfessional",
      ],
      trim: true,
    },

    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },

    // =====================================================
    // STATUS
    // =====================================================

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "passed",
        "detained",
        "discontinued",
        "transferred",
      ],
      default: "active",
      index: true,
    },

    role: {
      type: String,
      default: "student",
      enum: ["student"],
    },

    // =====================================================
    // PHOTO
    // =====================================================

    imageUrl: {
      type: String,
      default: "",
    },

    imagePublicId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// INDEXES
// =====================================================

studentSchema.index({
  semester: 1,
  registerNumber: 1,
  name: 1,
});

studentSchema.index({
  department: 1,
  semester: 1,
  batch: 1,
});

const Student =
  mongoose.models.Student ||
  mongoose.model("Student", studentSchema);

export default Student;