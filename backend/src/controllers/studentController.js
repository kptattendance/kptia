import Student from "../models/Student.js";
import User from "../models/User.js";
import { clerkClient } from "@clerk/express";
import cloudinary from "../config/cloudinary.js";

import XLSX from "xlsx";
import axios from "axios";

// =====================================================
// GOOGLE DRIVE FILE ID
// =====================================================

const getGoogleDriveFileId = (url) => {
  if (!url) return null;

  const value = String(url).trim();

  // https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = value.match(
    /\/file\/d\/([a-zA-Z0-9_-]+)/
  );

  if (fileMatch) {
    return fileMatch[1];
  }

  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  const idMatch = value.match(
    /[?&]id=([a-zA-Z0-9_-]+)/
  );

  if (idMatch) {
    return idMatch[1];
  }

  return null;
};

// =====================================================
// DOWNLOAD GOOGLE DRIVE IMAGE
// AND UPLOAD TO CLOUDINARY
// =====================================================

const uploadGoogleDrivePhoto = async (driveUrl) => {
  if (!driveUrl) {
    return {
      secure_url: "",
      public_id: "",
    };
  }

  const fileId = getGoogleDriveFileId(driveUrl);

  if (!fileId) {
    throw new Error(
      "Invalid Google Drive photo link."
    );
  }

  const downloadUrl =
    `https://drive.google.com/uc?export=download&id=${fileId}`;

  const response = await axios.get(
    downloadUrl,
    {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 10 * 1024 * 1024,
      maxBodyLength: 10 * 1024 * 1024,
    }
  );

  const contentType =
    response.headers["content-type"] || "";

  if (!contentType.startsWith("image/")) {
    throw new Error(
      "Google Drive file is not a valid image or is not publicly accessible."
    );
  }

  const base64 =
    Buffer.from(response.data).toString("base64");

  const dataUri =
    `data:${contentType};base64,${base64}`;

  const result =
    await cloudinary.uploader.upload(
      dataUri,
      {
        folder: "kpt-examination/students",
        resource_type: "image",
      }
    );

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  };
};

// =====================================================
// COMMON CONSTANTS
// =====================================================

const VALID_DEPARTMENTS = [
  "at",
  "ch",
  "ce",
  "cs",
  "ec",
  "ee",
  "me",
  "ps",
  "sc",
  "ot",
];

const VALID_STATUSES = [
  "active",
  "inactive",
  "passed",
  "detained",
  "discontinued",
  "transferred",
];

const VALID_ADMISSION_TYPES = [
  "regular",
  "lateralPUC",
  "lateralITI",
  "lateralCross",
  "workingProfessional",
];

const STUDENT_MANAGEMENT_ROLES = [
  "admin",
  "principal",
  "coe",
  "exam_officer",
  "hod",
];

const BULK_UPLOAD_ROLES = [
  "admin",
  "principal",
  "coe",
  "exam_officer",
];

// =====================================================
// RESOURCE HELPERS
// =====================================================

const isNotFoundError = (error) =>
  error?.status === 404 ||
  error?.statusCode === 404;

// =====================================================
// DELETE CLERK SAFELY
// =====================================================

const deleteClerkSafely = async (clerkId) => {
  if (!clerkId) {
    return false;
  }

  try {
    await clerkClient.users.deleteUser(
      clerkId
    );

    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return true;
    }

    throw error;
  }
};

// =====================================================
// DELETE CLOUDINARY SAFELY
// =====================================================

const deleteCloudinarySafely = async (
  publicId
) => {
  if (!publicId) {
    return false;
  }

  try {
    await cloudinary.uploader.destroy(
      publicId
    );

    return true;
  } catch (error) {
    console.error(
      "Cloudinary cleanup warning:",
      error
    );

    return false;
  }
};

// =====================================================
// DELETE MONGODB USER SAFELY
// =====================================================
// First tries Student.userId.
// Falls back to Clerk ID for old records.
// =====================================================

const deleteMongoUserSafely = async ({
  userId,
  clerkId,
}) => {
  let deletedUser = null;

  if (userId) {
    deletedUser =
      await User.findByIdAndDelete(
        userId
      );
  }

  if (!deletedUser && clerkId) {
    deletedUser =
      await User.findOneAndDelete({
        clerkId,
      });
  }

  return deletedUser;
};

// =====================================================
// CREATE / FIND MONGODB USER FOR STUDENT
// =====================================================

const createMongoUserForStudent = async ({
  clerkUser,
  name,
  email,
  phone,
  department,
  imageUrl,
  imagePublicId,
}) => {
  const normalizedEmail =
    String(email)
      .trim()
      .toLowerCase();

  const normalizedDepartment =
    String(department || "")
      .trim()
      .toLowerCase();

  // ---------------------------------------------------
  // First search by Clerk ID
  // ---------------------------------------------------

  let user =
    await User.findOne({
      clerkId: clerkUser.id,
    });

  // ---------------------------------------------------
  // If not found, search by email.
  // This protects against an already existing
  // MongoDB User record.
  // ---------------------------------------------------

  if (!user) {
    user =
      await User.findOne({
        email: normalizedEmail,
      });
  }

  // ---------------------------------------------------
  // Existing MongoDB User
  // ---------------------------------------------------

  if (user) {
    if (
      user.clerkId &&
      user.clerkId !== clerkUser.id
    ) {
      throw new Error(
        "A MongoDB User already exists with this email."
      );
    }

    user.clerkId =
      clerkUser.id;

    user.name =
      String(name).trim();

    user.phone =
      String(phone || "").trim();

    user.department =
      normalizedDepartment;

    user.role = "student";

    if (imageUrl) {
      user.imageUrl =
        imageUrl;
    }

    if (imagePublicId) {
      user.imagePublicId =
        imagePublicId;
    }

    await user.save();

    return user;
  }

  // ---------------------------------------------------
  // Create new MongoDB User
  // ---------------------------------------------------

  user = new User({
    name:
      String(name).trim(),

    email:
      normalizedEmail,

    phone:
      String(phone || "").trim(),

    department:
      normalizedDepartment,

    role: "student",

    clerkId:
      clerkUser.id,

    imageUrl:
      imageUrl || "",

    imagePublicId:
      imagePublicId || "",
  });

  await user.save();

  return user;
};

// =====================================================
// SYNC OLD STUDENT TO MONGODB USER
// =====================================================
// This is important for students created BEFORE
// userId was introduced.
// =====================================================

const syncStudentUser = async (
  student
) => {
  // ---------------------------------------------------
  // Already linked
  // ---------------------------------------------------

  if (student.userId) {
    const linkedUser =
      await User.findById(
        student.userId
      );

    if (linkedUser) {
      return linkedUser;
    }
  }

  // ---------------------------------------------------
  // Find by Clerk ID
  // ---------------------------------------------------

  if (student.clerkId) {
    const byClerk =
      await User.findOne({
        clerkId:
          student.clerkId,
      });

    if (byClerk) {
      student.userId =
        byClerk._id;

      await student.save();

      return byClerk;
    }
  }

  // ---------------------------------------------------
  // Find by email
  // ---------------------------------------------------

  if (student.email) {
    const byEmail =
      await User.findOne({
        email:
          student.email,
      });

    if (byEmail) {
      if (
        student.clerkId &&
        byEmail.clerkId &&
        byEmail.clerkId !==
          student.clerkId
      ) {
        throw new Error(
          "Student email is linked to a different MongoDB User."
        );
      }

      if (
        !byEmail.clerkId &&
        student.clerkId
      ) {
        byEmail.clerkId =
          student.clerkId;

        await byEmail.save();
      }

      student.userId =
        byEmail._id;

      await student.save();

      return byEmail;
    }
  }

  return null;
};

// =====================================================
// BULK UPLOAD STUDENTS
// =====================================================
//
// Excel columns:
//
// RollNumber
// RegisterNumber
// Name
// FatherName
// MotherName
// DOB
// Gender
// Email
// Phone
// ParentPhone
// Caste
// Category
// AadhaarNumber
// SATSNumber
// Department
// AdmissionYear
// Batch
// BatchNumber
// AdmissionType
// Semester
// Status
// Photo
//
// Photo = Google Drive sharing link
// =====================================================

export const bulkUploadStudents = async (
  req,
  res
) => {
  try {
    // =================================================
    // PERMISSION
    // =================================================

    const requesterRole =
      (
        req.user?.role || ""
      ).toLowerCase();

    if (
      !BULK_UPLOAD_ROLES.includes(
        requesterRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to bulk upload students.",
      });
    }

    // =================================================
    // FILE CHECK
    // =================================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload an Excel or CSV file.",
      });
    }

    // =================================================
    // READ EXCEL
    // =================================================

    const workbook =
      XLSX.read(
        req.file.buffer,
        {
          type: "buffer",
          cellDates: true,
        }
      );

    const sheetName =
      workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message:
          "The uploaded file contains no worksheet.",
      });
    }

    const worksheet =
      workbook.Sheets[
        sheetName
      ];

    const rows =
      XLSX.utils.sheet_to_json(
        worksheet,
        {
          defval: "",
        }
      );

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message:
          "The uploaded file contains no student data.",
      });
    }

    // =================================================
    // LIMIT
    // =================================================

    if (rows.length > 5000) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum 5000 students can be uploaded at once.",
      });
    }

    // =================================================
    // RESULT
    // =================================================

    const results = {
      total: rows.length,
      created: 0,
      failed: 0,
      errors: [],
      createdStudents: [],
    };

    // =================================================
    // DUPLICATES INSIDE EXCEL
    // =================================================

    const excelRegisterNumbers =
      new Set();

    const excelEmails =
      new Set();

    // =================================================
    // PROCESS EACH ROW
    // =================================================

    for (
      let i = 0;
      i < rows.length;
      i++
    ) {
      const row = rows[i];

      const excelRow =
        i + 2;

      // =================================================
      // READ VALUES
      // =================================================

      const rollNumber =
        String(
          row.RollNumber ||
            row.rollNumber ||
            ""
        ).trim();

      const registerNumber =
        String(
          row.RegisterNumber ||
            row.registerNumber ||
            ""
        )
          .trim()
          .toUpperCase();

      const name =
        String(
          row.Name ||
            row.name ||
            ""
        ).trim();

      const fatherName =
        String(
          row.FatherName ||
            row.fatherName ||
            ""
        ).trim();

      const motherName =
        String(
          row.MotherName ||
            row.motherName ||
            ""
        ).trim();

      const email =
        String(
          row.Email ||
            row.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const phone =
        String(
          row.Phone ||
            row.phone ||
            ""
        ).trim();

      const parentPhone =
        String(
          row.ParentPhone ||
            row.parentPhone ||
            ""
        ).trim();

      const caste =
        String(
          row.Caste ||
            row.caste ||
            ""
        ).trim();

      const category =
        String(
          row.Category ||
            row.category ||
            ""
        ).trim();

      const aadhaarNumber =
        String(
          row.AadhaarNumber ||
            row.aadhaarNumber ||
            ""
        ).trim();

      const satsNumber =
        String(
          row.SATSNumber ||
            row.satsNumber ||
            ""
        ).trim();

      const department =
        String(
          row.Department ||
            row.department ||
            ""
        )
          .trim()
          .toLowerCase();

      const batch =
        String(
          row.Batch ||
            row.batch ||
            ""
        ).trim();

      const gender =
        String(
          row.Gender ||
            row.gender ||
            ""
        )
          .trim()
          .toLowerCase();

      const admissionType =
        String(
          row.AdmissionType ||
            row.admissionType ||
            ""
        ).trim();

      const status =
        String(
          row.Status ||
            row.status ||
            "active"
        )
          .trim()
          .toLowerCase();

      const photo =
        String(
          row.Photo ||
            row.photo ||
            ""
        ).trim();

      // =================================================
      // NUMERIC VALUES
      // =================================================

      const admissionYear =
        Number(
          row.AdmissionYear ??
            row.admissionYear
        );

      const batchNumber =
        Number(
          row.BatchNumber ??
            row.batchNumber
        );

      const semester =
        Number(
          row.Semester ??
            row.semester
        );

      // =================================================
      // DATE
      // =================================================

      const dobValue =
        row.DOB ??
        row.dob;

      let dobDate;

      if (
        dobValue instanceof Date
      ) {
        dobDate =
          dobValue;
      } else {
        dobDate =
          new Date(
            String(
              dobValue || ""
            ).trim()
          );
      }

      // =================================================
      // VALIDATION
      // =================================================

      if (!rollNumber) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          message:
            "Roll number is required.",
        });

        continue;
      }

      if (!registerNumber) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          message:
            "Register number is required.",
        });

        continue;
      }

      if (!name) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          message:
            "Name is required.",
        });

        continue;
      }

      if (!fatherName) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Father name is required.",
        });

        continue;
      }

      if (!motherName) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Mother name is required.",
        });

        continue;
      }

      if (
        !dobValue ||
        Number.isNaN(
          dobDate.getTime()
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Valid date of birth is required.",
        });

        continue;
      }

      if (
        ![
          "male",
          "female",
          "other",
        ].includes(gender)
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Gender must be male, female or other.",
        });

        continue;
      }

      if (!email) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Email is required.",
        });

        continue;
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          email,
          message:
            "Invalid email address.",
        });

        continue;
      }

      if (
        !/^\d{10}$/.test(
          phone
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Student phone number must contain exactly 10 digits.",
        });

        continue;
      }

      if (
        parentPhone &&
        !/^\d{10}$/.test(
          parentPhone
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Parent phone number must contain exactly 10 digits.",
        });

        continue;
      }

      if (
        aadhaarNumber &&
        !/^\d{12}$/.test(
          aadhaarNumber
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Aadhaar number must contain exactly 12 digits.",
        });

        continue;
      }

      if (
        !VALID_DEPARTMENTS.includes(
          department
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            `Invalid department: ${department}`,
        });

        continue;
      }

      if (
        !Number.isInteger(
          admissionYear
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Admission year is required.",
        });

        continue;
      }

      if (!batch) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Batch is required.",
        });

        continue;
      }

      if (
        ![1, 2].includes(
          batchNumber
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Batch number must be 1 or 2.",
        });

        continue;
      }

      if (
        !VALID_ADMISSION_TYPES.includes(
          admissionType
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            `Invalid admission type: ${admissionType}`,
        });

        continue;
      }

      if (
        !Number.isInteger(
          semester
        ) ||
        semester < 1 ||
        semester > 6
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Semester must be between 1 and 6.",
        });

        continue;
      }

      if (
        !VALID_STATUSES.includes(
          status
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            `Invalid status: ${status}`,
        });

        continue;
      }

      // =================================================
      // DUPLICATE INSIDE EXCEL
      // =================================================

      if (
        excelRegisterNumbers.has(
          registerNumber
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "Duplicate register number found inside Excel file.",
        });

        continue;
      }

      if (
        excelEmails.has(
          email
        )
      ) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          email,
          message:
            "Duplicate email found inside Excel file.",
        });

        continue;
      }

      excelRegisterNumbers.add(
        registerNumber
      );

      excelEmails.add(
        email
      );

      // =================================================
      // CHECK EXISTING MONGODB STUDENT
      // =================================================

      const existingRegister =
        await Student.findOne({
          registerNumber,
        });

      if (existingRegister) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          message:
            "A student with this register number already exists.",
        });

        continue;
      }

      const existingEmail =
        await Student.findOne({
          email,
        });

      if (existingEmail) {
        results.failed++;

        results.errors.push({
          row: excelRow,
          registerNumber,
          name,
          email,
          message:
            "A student with this email already exists.",
        });

        continue;
      }

      // =================================================
      // CREATE RESOURCES
      // =================================================

      let clerkUser = null;
      let mongoUser = null;
      let cloudinaryResult = null;

      try {
        // ---------------------------------------------
        // PHOTO
        // ---------------------------------------------

        if (photo) {
          cloudinaryResult =
            await uploadGoogleDrivePhoto(
              photo
            );
        }

        // ---------------------------------------------
        // CLERK
        // ---------------------------------------------

        clerkUser =
          await clerkClient.users.createUser({
            emailAddress: [
              email,
            ],

            firstName:
              name,

            publicMetadata: {
              role: "student",
              department,
              registerNumber,
            },
          });

        // ---------------------------------------------
        // MONGODB USER
        // ---------------------------------------------

        mongoUser =
          await createMongoUserForStudent({
            clerkUser,
            name,
            email,
            phone,
            department,
            imageUrl:
              cloudinaryResult
                ?.secure_url || "",
            imagePublicId:
              cloudinaryResult
                ?.public_id || "",
          });

        // ---------------------------------------------
        // MONGODB STUDENT
        // ---------------------------------------------

        const student =
          new Student({
            userId:
              mongoUser._id,

            clerkId:
              clerkUser.id,

            rollNumber,

            registerNumber,

            name,

            fatherName,

            motherName,

            dob:
              dobDate,

            gender,

            email,

            phone,

            parentPhone,

            caste,

            category,

            aadhaarNumber,

            satsNumber,

            department,

            admissionYear,

            batch,

            batchNumber,

            admissionType,

            semester,

            status,

            role:
              "student",

            imageUrl:
              cloudinaryResult
                ?.secure_url || "",

            imagePublicId:
              cloudinaryResult
                ?.public_id || "",
          });

        await student.save();

        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        results.created++;

        results.createdStudents.push({
          row: excelRow,
          rollNumber,
          registerNumber,
          name,
          email,
          department,
          clerkId:
            clerkUser.id,
          userId:
            mongoUser._id,
        });

      } catch (error) {
        console.error(
          `Bulk student row ${excelRow} error:`,
          error
        );

        // ---------------------------------------------
        // CLEANUP MONGODB USER
        // ---------------------------------------------

        if (
          mongoUser?._id
        ) {
          try {
            await User.findByIdAndDelete(
              mongoUser._id
            );
          } catch (
            cleanupError
          ) {
            console.error(
              "Mongo User cleanup error:",
              cleanupError
            );
          }
        }

        // ---------------------------------------------
        // CLEANUP CLERK
        // ---------------------------------------------

        if (
          clerkUser?.id
        ) {
          try {
            await deleteClerkSafely(
              clerkUser.id
            );
          } catch (
            cleanupError
          ) {
            console.error(
              "Clerk cleanup error:",
              cleanupError
            );
          }
        }

        // ---------------------------------------------
        // CLEANUP CLOUDINARY
        // ---------------------------------------------

        if (
          cloudinaryResult
            ?.public_id
        ) {
          await deleteCloudinarySafely(
            cloudinaryResult.public_id
          );
        }

        results.failed++;

        results.errors.push({
          row: excelRow,
          rollNumber,
          registerNumber,
          name,
          email,
          message:
            error?.errors?.[0]
              ?.message ||
            error?.message ||
            "Failed to create student.",
        });
      }
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      message:
        "Bulk student upload completed.",

      data:
        results,
    });

  } catch (error) {
    console.error(
      "Bulk Student Upload Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Failed to process bulk student upload.",
    });
  }
};

// =====================================================
// CREATE STUDENT
// =====================================================

export const createStudent = async (
  req,
  res
) => {
  let clerkUser = null;
  let mongoUser = null;

  try {
    const requesterRole =
      (
        req.user?.role || ""
      ).toLowerCase();

    // -------------------------------------------------
    // PERMISSION
    // -------------------------------------------------

    if (
      !STUDENT_MANAGEMENT_ROLES.includes(
        requesterRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create students.",
      });
    }

    // -------------------------------------------------
    // GET FORM DATA
    // -------------------------------------------------

    const {
      rollNumber,
      registerNumber,
      name,
      fatherName,
      motherName,
      dob,
      gender,

      email,
      phone,
      parentPhone,

      caste,
      category,

      aadhaarNumber,
      satsNumber,

      department,
      admissionYear,
      batch,
      batchNumber,
      admissionType,
      semester,

      status,
    } = req.body;

    // -------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------

    const requiredFields = [
      [
        "rollNumber",
        rollNumber,
      ],
      [
        "registerNumber",
        registerNumber,
      ],
      [
        "name",
        name,
      ],
      [
        "fatherName",
        fatherName,
      ],
      [
        "motherName",
        motherName,
      ],
      [
        "dob",
        dob,
      ],
      [
        "gender",
        gender,
      ],
      [
        "email",
        email,
      ],
      [
        "phone",
        phone,
      ],
      [
        "department",
        department,
      ],
      [
        "admissionYear",
        admissionYear,
      ],
      [
        "batch",
        batch,
      ],
      [
        "batchNumber",
        batchNumber,
      ],
      [
        "admissionType",
        admissionType,
      ],
      [
        "semester",
        semester,
      ],
    ];

    for (
      const [
        field,
        value,
      ] of requiredFields
    ) {
      if (
        value ===
          undefined ||
        value === null ||
        String(value).trim() ===
          ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${field} is required.`,
        });
      }
    }

    // -------------------------------------------------
    // NORMALIZE
    // -------------------------------------------------

    const normalizedRollNumber =
      String(
        rollNumber
      ).trim();

    const normalizedRegisterNumber =
      String(
        registerNumber
      )
        .trim()
        .toUpperCase();

    const normalizedName =
      String(
        name
      ).trim();

    const normalizedFatherName =
      String(
        fatherName
      ).trim();

    const normalizedMotherName =
      String(
        motherName
      ).trim();

    const normalizedEmail =
      String(
        email
      )
        .trim()
        .toLowerCase();

    const normalizedPhone =
      String(
        phone
      ).trim();

    const normalizedParentPhone =
      String(
        parentPhone || ""
      ).trim();

    const normalizedDepartment =
      String(
        department
      )
        .trim()
        .toLowerCase();

    const normalizedGender =
      String(
        gender
      )
        .trim()
        .toLowerCase();

    const normalizedStatus =
      String(
        status ||
          "active"
      )
        .trim()
        .toLowerCase();

    const normalizedSemester =
      Number(
        semester
      );

    const normalizedBatchNumber =
      Number(
        batchNumber
      );

    const normalizedAdmissionType =
      String(
        admissionType
      ).trim();

    const normalizedAdmissionYear =
      Number(
        admissionYear
      );

    // -------------------------------------------------
    // GENDER
    // -------------------------------------------------

    if (
      ![
        "male",
        "female",
        "other",
      ].includes(
        normalizedGender
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid gender.",
      });
    }

    // -------------------------------------------------
    // DEPARTMENT
    // -------------------------------------------------

    if (
      !VALID_DEPARTMENTS.includes(
        normalizedDepartment
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Invalid department: ${normalizedDepartment}`,
      });
    }

    // -------------------------------------------------
    // SEMESTER
    // -------------------------------------------------

    if (
      !Number.isInteger(
        normalizedSemester
      ) ||
      normalizedSemester < 1 ||
      normalizedSemester > 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Semester must be between 1 and 6.",
      });
    }

    // -------------------------------------------------
    // BATCH NUMBER
    // -------------------------------------------------

    if (
      ![
        1,
        2,
      ].includes(
        normalizedBatchNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Batch number must be either 1 or 2.",
      });
    }

    // -------------------------------------------------
    // ADMISSION TYPE
    // -------------------------------------------------

    if (
      !VALID_ADMISSION_TYPES.includes(
        normalizedAdmissionType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid admission type.",
      });
    }

    // -------------------------------------------------
    // STATUS
    // -------------------------------------------------

    if (
      !VALID_STATUSES.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid student status.",
      });
    }

    // -------------------------------------------------
    // ADMISSION YEAR
    // -------------------------------------------------

    if (
      !Number.isInteger(
        normalizedAdmissionYear
      ) ||
      normalizedAdmissionYear <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid admission year.",
      });
    }

    // -------------------------------------------------
    // DATE
    // -------------------------------------------------

    const dobDate =
      new Date(
        dob
      );

    if (
      Number.isNaN(
        dobDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid date of birth.",
      });
    }

    // -------------------------------------------------
    // EMAIL
    // -------------------------------------------------

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid email address.",
      });
    }

    // -------------------------------------------------
    // PHONE
    // -------------------------------------------------

    if (
      !/^\d{10}$/.test(
        normalizedPhone
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student phone number must contain exactly 10 digits.",
      });
    }

    // -------------------------------------------------
    // PARENT PHONE
    // -------------------------------------------------

    if (
      normalizedParentPhone &&
      !/^\d{10}$/.test(
        normalizedParentPhone
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Parent phone number must contain exactly 10 digits.",
      });
    }

    // -------------------------------------------------
    // AADHAAR
    // -------------------------------------------------

    const normalizedAadhaar =
      String(
        aadhaarNumber ||
          ""
      ).trim();

    if (
      normalizedAadhaar &&
      !/^\d{12}$/.test(
        normalizedAadhaar
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Aadhaar number must contain exactly 12 digits.",
      });
    }

    // -------------------------------------------------
    // DUPLICATE REGISTER NUMBER
    // -------------------------------------------------

    const existingRegisterNumber =
      await Student.findOne({
        registerNumber:
          normalizedRegisterNumber,
      });

    if (
      existingRegisterNumber
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A student with this register number already exists.",
      });
    }

    // -------------------------------------------------
    // DUPLICATE EMAIL IN STUDENT
    // -------------------------------------------------

    const existingEmail =
      await Student.findOne({
        email:
          normalizedEmail,
      });

    if (
      existingEmail
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A student with this email already exists.",
      });
    }

    // -------------------------------------------------
    // CHECK USER EMAIL TOO
    // -------------------------------------------------

    const existingUser =
      await User.findOne({
        email:
          normalizedEmail,
      });

    if (
      existingUser
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A MongoDB User already exists with this email.",
      });
    }

    // =================================================
    // CREATE CLERK
    // =================================================

    clerkUser =
      await clerkClient.users.createUser({
        emailAddress: [
          normalizedEmail,
        ],

        firstName:
          normalizedName,

        publicMetadata: {
          role:
            "student",

          department:
            normalizedDepartment,

          registerNumber:
            normalizedRegisterNumber,
        },
      });

    // =================================================
    // CREATE MONGODB USER
    // =================================================

    mongoUser =
      await createMongoUserForStudent({
        clerkUser,

        name:
          normalizedName,

        email:
          normalizedEmail,

        phone:
          normalizedPhone,

        department:
          normalizedDepartment,

        imageUrl:
          req.cloudinaryResult
            ?.secure_url ||
          "",

        imagePublicId:
          req.cloudinaryResult
            ?.public_id ||
          "",
      });

    // =================================================
    // CREATE STUDENT PROFILE
    // =================================================

    const student =
      new Student({
        // IMPORTANT:
        // Same MongoDB User ID
        userId:
          mongoUser._id,

        // Clerk authentication ID
        clerkId:
          clerkUser.id,

        rollNumber:
          normalizedRollNumber,

        registerNumber:
          normalizedRegisterNumber,

        name:
          normalizedName,

        fatherName:
          normalizedFatherName,

        motherName:
          normalizedMotherName,

        dob:
          dobDate,

        gender:
          normalizedGender,

        email:
          normalizedEmail,

        phone:
          normalizedPhone,

        parentPhone:
          normalizedParentPhone,

        caste:
          String(
            caste || ""
          ).trim(),

        category:
          String(
            category || ""
          ).trim(),

        aadhaarNumber:
          normalizedAadhaar,

        satsNumber:
          String(
            satsNumber || ""
          ).trim(),

        department:
          normalizedDepartment,

        admissionYear:
          normalizedAdmissionYear,

        batch:
          String(
            batch
          ).trim(),

        batchNumber:
          normalizedBatchNumber,

        admissionType:
          normalizedAdmissionType,

        semester:
          normalizedSemester,

        status:
          normalizedStatus,

        role:
          "student",

        imageUrl:
          req.cloudinaryResult
            ?.secure_url ||
          "",

        imagePublicId:
          req.cloudinaryResult
            ?.public_id ||
          "",
      });

    await student.save();

    // =================================================
    // SUCCESS
    // =================================================

    return res.status(201).json({
      success: true,

      message:
        "Student created successfully.",

      data:
        student,
    });

  } catch (error) {
    console.error(
      "Create Student Error:",
      error
    );

    // =================================================
    // CLEANUP MONGODB USER
    // =================================================

    if (
      mongoUser?._id
    ) {
      try {
        await User.findByIdAndDelete(
          mongoUser._id
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "Mongo User cleanup error:",
          cleanupError
        );
      }
    }

    // =================================================
    // CLEANUP CLERK
    // =================================================

    if (
      clerkUser?.id
    ) {
      try {
        await deleteClerkSafely(
          clerkUser.id
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "Clerk cleanup error:",
          cleanupError
        );
      }
    }

    // =================================================
    // CLEANUP CLOUDINARY
    // =================================================

    if (
      req.cloudinaryResult
        ?.public_id
    ) {
      await deleteCloudinarySafely(
        req.cloudinaryResult.public_id
      );
    }

    // =================================================
    // DUPLICATE KEY
    // =================================================

    if (
      error?.code ===
      11000
    ) {
      const duplicateField =
        Object.keys(
          error.keyPattern ||
            {}
        )[0];

      return res.status(409).json({
        success: false,
        message:
          `A student with this ${duplicateField} already exists.`,
      });
    }

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Failed to create student.",
    });
  }
};
// =====================================================
// GET STUDENTS
// GET /api/students
// =====================================================

export const getStudents = async (
  req,
  res
) => {
  try {
    const {
      search,
      department,
      semester,
      batch,
      admissionYear,
      admissionType,
      status,
    } = req.query;

    const requesterRole =
      (
        req.user?.role || ""
      ).toLowerCase();

    const filter = {};

    // -------------------------------------------------
    // SEARCH
    // -------------------------------------------------

    if (
      search?.trim()
    ) {
      const regex =
        new RegExp(
          search.trim(),
          "i"
        );

      filter.$or = [
        {
          name: regex,
        },
        {
          registerNumber:
            regex,
        },
        {
          email: regex,
        },
        {
          phone: regex,
        },
        {
          satsNumber:
            regex,
        },
      ];
    }

    // -------------------------------------------------
    // HOD RESTRICTION
    // -------------------------------------------------

    if (
      requesterRole ===
      "hod"
    ) {
      const hodDepartment =
        String(
          req.user?.department ||
            ""
        )
          .trim()
          .toLowerCase();

      if (!hodDepartment) {
        return res.status(403).json({
          success: false,
          message:
            "HOD department is not assigned.",
        });
      }

      // HOD cannot override department
      // through query parameters.

      filter.department =
        hodDepartment;
    }

    // -------------------------------------------------
    // OTHER ROLES
    // -------------------------------------------------

    else if (
      department?.trim()
    ) {
      filter.department =
        department
          .trim()
          .toLowerCase();
    }

    // -------------------------------------------------
    // SEMESTER
    // -------------------------------------------------

    if (semester) {
      filter.semester =
        Number(
          semester
        );
    }

    // -------------------------------------------------
    // BATCH
    // -------------------------------------------------

    if (batch) {
      filter.batch =
        batch;
    }

    // -------------------------------------------------
    // ADMISSION YEAR
    // -------------------------------------------------

    if (admissionYear) {
      filter.admissionYear =
        Number(
          admissionYear
        );
    }

    // -------------------------------------------------
    // ADMISSION TYPE
    // -------------------------------------------------

    if (
      admissionType?.trim()
    ) {
      filter.admissionType =
        admissionType.trim();
    }

    // -------------------------------------------------
    // STATUS
    // -------------------------------------------------

    if (status) {
      filter.status =
        status;
    }

    // -------------------------------------------------
    // FETCH
    // -------------------------------------------------

   const students = await Student.aggregate([
  { $match: filter },
  {
    $addFields: {
      rollNumberSort: {
        $convert: {
          input: "$rollNumber",
          to: "int",
          onError: 999999999,
          onNull: 999999999,
        },
      },
    },
  },
  {
    $sort: {
      rollNumberSort: 1,
      registerNumber: 1,
      name: 1,
    },
  },
  {
    $project: {
      rollNumberSort: 0,
    },
  },
]);

    return res.status(200).json({
      success: true,
      count:
        students.length,
      data:
        students,
    });

  } catch (error) {
    console.error(
      "Get students error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching students.",
      error:
        error.message,
    });
  }
};

// =====================================================
// GET ONE STUDENT
// GET /api/students/:id
// =====================================================

export const getStudentById =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const student =
        await Student.findById(
          id
        ).lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      return res.status(200).json({
        success: true,
        data:
          student,
      });

    } catch (error) {
      console.error(
        "Get student by ID error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching student.",
        error:
          error.message,
      });
    }
  };

// =====================================================
// UPDATE STUDENT
// PUT /api/students/:id
//
// registerNumber and email CANNOT be changed.
// =====================================================

export const updateStudent =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      // -------------------------------------------------
      // FIND STUDENT
      // -------------------------------------------------

      const student =
        await Student.findById(
          id
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      // -------------------------------------------------
      // KEEP OLD PHOTO ID
      // -------------------------------------------------

      const oldImagePublicId =
        student.imagePublicId;

      // -------------------------------------------------
      // LINK OLD RECORD IF NECESSARY
      // -------------------------------------------------

      const linkedUser =
        await syncStudentUser(
          student
        );

      // -------------------------------------------------
      // ONLY THESE FIELDS CAN CHANGE
      // -------------------------------------------------

      const allowedFields = [
        "rollNumber",
  "registerNumber",
        "name",
        "fatherName",
        "motherName",
        "dob",
        "gender",
        "phone",
        "parentPhone",
        "caste",
        "category",
        "aadhaarNumber",
        "satsNumber",
        "department",
        "admissionYear",
        "batch",
        "batchNumber",
        "admissionType",
        "semester",
        "status",
      ];

      for (
        const field of allowedFields
      ) {
        if (
          req.body[field] !==
          undefined
        ) {
          student[field] =
            req.body[field];
        }
      }

      // -------------------------------------------------
      // NORMALIZE
      // -------------------------------------------------

      student.name =
        String(
          student.name || ""
        ).trim();

      student.fatherName =
        String(
          student.fatherName ||
            ""
        ).trim();

      student.motherName =
        String(
          student.motherName ||
            ""
        ).trim();

      student.phone =
        String(
          student.phone || ""
        ).trim();

      student.parentPhone =
        String(
          student.parentPhone ||
            ""
        ).trim();

      student.department =
        String(
          student.department ||
            ""
        )
          .trim()
          .toLowerCase();

      student.gender =
        String(
          student.gender ||
            ""
        )
          .trim()
          .toLowerCase();

      student.rollNumber =
        String(
          student.rollNumber ||
            ""
        ).trim();

      student.batch =
        String(
          student.batch ||
            ""
        ).trim();

      student.admissionYear =
        Number(
          student.admissionYear
        );

      student.batchNumber =
        Number(
          student.batchNumber
        );

      student.semester =
        Number(
          student.semester
        );

      student.admissionType =
        String(
          student.admissionType ||
            ""
        ).trim();

      student.status =
        String(
          student.status ||
            "active"
        )
          .trim()
          .toLowerCase();

      // -------------------------------------------------
      // DATE
      // -------------------------------------------------

      if (
        req.body.dob !==
        undefined
      ) {
        const newDob =
          new Date(
            req.body.dob
          );

        if (
          Number.isNaN(
            newDob.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid date of birth.",
          });
        }

        student.dob =
          newDob;
      }

      // -------------------------------------------------
      // GENDER
      // -------------------------------------------------

      if (
        ![
          "male",
          "female",
          "other",
        ].includes(
          student.gender
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid gender.",
        });
      }

      // -------------------------------------------------
      // DEPARTMENT
      // -------------------------------------------------

      if (
        !VALID_DEPARTMENTS.includes(
          student.department
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid department: ${student.department}`,
        });
      }

      // -------------------------------------------------
      // ADMISSION YEAR
      // -------------------------------------------------

      if (
        !Number.isInteger(
          student.admissionYear
        ) ||
        student.admissionYear <=
          0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid admission year.",
        });
      }

      // -------------------------------------------------
      // BATCH NUMBER
      // -------------------------------------------------

      if (
        ![
          1,
          2,
        ].includes(
          student.batchNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Batch number must be either 1 or 2.",
        });
      }

      // -------------------------------------------------
      // SEMESTER
      // -------------------------------------------------

      if (
        !Number.isInteger(
          student.semester
        ) ||
        student.semester <
          1 ||
        student.semester >
          6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Semester must be between 1 and 6.",
        });
      }


      // -----------------------------------------
// REGISTER NUMBER
// -----------------------------------------
// Register number can be changed, but it must
// remain unique.
if (req.body.registerNumber !== undefined) {
  const newRegisterNumber = String(
    req.body.registerNumber
  )
    .trim()
    .toUpperCase();

  if (!newRegisterNumber) {
    return res.status(400).json({
      success: false,
      message: "Register number is required.",
    });
  }

  const existingStudent =
    await Student.findOne({
      registerNumber: newRegisterNumber,
      _id: { $ne: id },
    });

  if (existingStudent) {
    return res.status(409).json({
      success: false,
      message:
        "This register number is already assigned to another student.",
    });
  }

  student.registerNumber = newRegisterNumber;
}

      // -------------------------------------------------
      // ADMISSION TYPE
      // -------------------------------------------------

      if (
        !VALID_ADMISSION_TYPES.includes(
          student.admissionType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid admission type.",
        });
      }

      // -------------------------------------------------
      // STATUS
      // -------------------------------------------------

      if (
        !VALID_STATUSES.includes(
          student.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student status.",
        });
      }

      // -------------------------------------------------
      // PHONE
      // -------------------------------------------------

      if (
        !/^\d{10}$/.test(
          student.phone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Student phone number must contain exactly 10 digits.",
        });
      }

      // -------------------------------------------------
      // PARENT PHONE
      // -------------------------------------------------

      if (
        student.parentPhone &&
        !/^\d{10}$/.test(
          student.parentPhone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Parent phone number must contain exactly 10 digits.",
        });
      }

      // -------------------------------------------------
      // AADHAAR
      // -------------------------------------------------

      student.aadhaarNumber =
        String(
          student.aadhaarNumber ||
            ""
        ).trim();

      if (
        student.aadhaarNumber &&
        !/^\d{12}$/.test(
          student.aadhaarNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Aadhaar number must contain exactly 12 digits.",
        });
      }

      // -------------------------------------------------
      // PHOTO
      // -------------------------------------------------

      if (
        req.cloudinaryResult
      ) {
        student.imageUrl =
          req.cloudinaryResult
            .secure_url;

        student.imagePublicId =
          req.cloudinaryResult
            .public_id;
      }

      // -------------------------------------------------
      // SAVE STUDENT
      // -------------------------------------------------

      await student.save();

      // -------------------------------------------------
      // UPDATE MONGODB USER
      // -------------------------------------------------

      if (linkedUser) {
        linkedUser.name =
          student.name;

        linkedUser.phone =
          student.phone;

        linkedUser.department =
          student.department;

        linkedUser.role =
          "student";

        if (
          req.cloudinaryResult
        ) {
          linkedUser.imageUrl =
            student.imageUrl;

          linkedUser.imagePublicId =
            student.imagePublicId;
        }

        await linkedUser.save();
      }

      // -------------------------------------------------
      // DELETE OLD PHOTO
      // -------------------------------------------------

      if (
        req.cloudinaryResult
          ?.public_id &&
        oldImagePublicId &&
        oldImagePublicId !==
          req.cloudinaryResult
            .public_id
      ) {
        await deleteCloudinarySafely(
          oldImagePublicId
        );
      }

      // -------------------------------------------------
      // UPDATE CLERK
      // -------------------------------------------------

      if (
        student.clerkId
      ) {
        try {
          await clerkClient.users.updateUser(
            student.clerkId,
            {
              firstName:
                student.name,

              publicMetadata: {
                role:
                  "student",

                department:
                  student.department,

                registerNumber:
                  student.registerNumber,
              },
            }
          );
        } catch (
          clerkError
        ) {
          console.error(
            "Clerk update warning:",
            clerkError
          );
        }
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Student updated successfully.",
        data:
          student,
      });

    } catch (error) {
      console.error(
        "Update student error:",
        error
      );

      if (
        error?.code ===
        11000
      ) {
        const duplicateField =
          Object.keys(
            error.keyPattern ||
              {}
          )[0];

        return res.status(409).json({
          success: false,
          message:
            `A student with this ${duplicateField} already exists.`,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error while updating student.",
        error:
          error.message,
      });
    }
  };

// =====================================================
// DELETE STUDENT
// DELETE /api/students/:id
//
// Deletes:
// 1. Student MongoDB document
// 2. MongoDB User document
// 3. Clerk account
// 4. Cloudinary image
// =====================================================

export const deleteStudent =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      // -------------------------------------------------
      // FIND STUDENT
      // -------------------------------------------------

      const student =
        await Student.findById(
          id
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const clerkId =
        student.clerkId;

      const userId =
        student.userId;

      const imagePublicId =
        student.imagePublicId;

      console.log(
        "=========================================="
      );

      console.log(
        "DELETE STUDENT"
      );

      console.log(
        "Student Mongo ID:",
        student._id
      );

      console.log(
        "User Mongo ID:",
        userId || "N/A"
      );

      console.log(
        "Clerk ID:",
        clerkId || "N/A"
      );

      console.log(
        "Image Public ID:",
        imagePublicId || "N/A"
      );

      console.log(
        "=========================================="
      );

      // -------------------------------------------------
      // DELETE CLERK FIRST
      // -------------------------------------------------

      if (clerkId) {
        try {
          await deleteClerkSafely(
            clerkId
          );
        } catch (
          clerkError
        ) {
          console.error(
            "Clerk deletion failed:",
            clerkError
          );

          return res.status(500).json({
            success: false,
            message:
              "Failed to delete Clerk account. Student was not removed from MongoDB.",
            error:
              clerkError?.message ||
              "Clerk deletion failed.",
          });
        }
      }

      // -------------------------------------------------
      // DELETE CLOUDINARY
      // -------------------------------------------------

      if (
        imagePublicId
      ) {
        await deleteCloudinarySafely(
          imagePublicId
        );
      }

      // -------------------------------------------------
      // DELETE STUDENT
      // -------------------------------------------------

      await Student.findByIdAndDelete(
        id
      );

      // -------------------------------------------------
      // DELETE MONGODB USER
      // -------------------------------------------------

      const deletedUser =
        await deleteMongoUserSafely({
          userId,
          clerkId,
        });

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          "Student, User, Clerk account and associated image cleanup completed successfully.",

        data: {
          studentMongoId:
            id,

          userMongoId:
            userId || null,

          clerkId:
            clerkId || null,

          studentDeleted:
            true,

          userDeleted:
            !!deletedUser,

          cloudinaryDeleted:
            !!imagePublicId,

          clerkDeleted:
            !!clerkId,
        },
      });

    } catch (error) {
      console.error(
        "Delete student error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while deleting student.",
        error:
          error.message,
      });
    }
  };

// =====================================================
// UPDATE STUDENT STATUS
// PATCH /api/students/:id/status
// =====================================================

export const updateStudentStatus =
  async (
    req,
    res
  ) => {
    try {
      const {
        id,
      } = req.params;

      const {
        status,
      } = req.body;

      // -------------------------------------------------
      // VALIDATE STATUS
      // -------------------------------------------------

      if (
        !VALID_STATUSES.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student status.",
        });
      }

      // -------------------------------------------------
      // FIND STUDENT
      // -------------------------------------------------

      const student =
        await Student.findById(
          id
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      // -------------------------------------------------
      // LINK OLD USER IF NECESSARY
      // -------------------------------------------------

      await syncStudentUser(
        student
      );

      // -------------------------------------------------
      // UPDATE STATUS
      // -------------------------------------------------

      student.status =
        status;

      await student.save();

      return res.status(200).json({
        success: true,
        message:
          "Student status updated successfully.",
        data:
          student,
      });

    } catch (error) {
      console.error(
        "Update status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while updating status.",
        error:
          error.message,
      });
    }
  };

// =====================================================
// DELETE MULTIPLE STUDENTS
// DELETE /api/students/bulk-delete
//
// Deletes:
// 1. Student MongoDB records
// 2. User MongoDB records
// 3. Clerk accounts
// 4. Cloudinary images
// =====================================================

export const deleteMultipleStudents =
  async (
    req,
    res
  ) => {
    try {
      const {
        ids,
      } = req.body;

      // -------------------------------------------------
      // VALIDATION
      // -------------------------------------------------

      if (
        !Array.isArray(
          ids
        ) ||
        ids.length ===
          0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No students selected.",
        });
      }

      // -------------------------------------------------
      // FIND STUDENTS
      // -------------------------------------------------

      const students =
        await Student.find({
          _id: {
            $in: ids,
          },
        });

      if (
        !students.length
      ) {
        return res.status(404).json({
          success: false,
          message:
            "No students found.",
        });
      }

      let clerkDeletedCount =
        0;

      let userDeletedCount =
        0;

      let cloudinaryDeletedCount =
        0;

      let studentDeletedCount =
        0;

      // -------------------------------------------------
      // PROCESS EACH STUDENT
      // -------------------------------------------------

      for (
        const student of students
      ) {
        // =============================================
        // CLERK
        // =============================================

        if (
          student.clerkId
        ) {
          try {
            await deleteClerkSafely(
              student.clerkId
            );

            clerkDeletedCount++;

          } catch (
            error
          ) {
            console.error(
              `Failed to delete Clerk user ${student.clerkId}:`,
              error
            );
          }
        }

        // =============================================
        // CLOUDINARY
        // =============================================

        if (
          student.imagePublicId
        ) {
          const deleted =
            await deleteCloudinarySafely(
              student.imagePublicId
            );

          if (deleted) {
            cloudinaryDeletedCount++;
          }
        }

        // =============================================
        // MONGODB USER
        // =============================================

        if (
          student.userId ||
          student.clerkId
        ) {
          try {
            const deletedUser =
              await deleteMongoUserSafely({
                userId:
                  student.userId,

                clerkId:
                  student.clerkId,
              });

            if (
              deletedUser
            ) {
              userDeletedCount++;

              console.log(
                `User MongoDB record deleted: ${deletedUser._id}`
              );
            }

          } catch (
            error
          ) {
            console.error(
              `Failed to delete User MongoDB record for ${student.clerkId}:`,
              error
            );
          }
        }

        // =============================================
        // STUDENT MONGODB
        // =============================================

        try {
          await Student.findByIdAndDelete(
            student._id
          );

          studentDeletedCount++;

        } catch (
          error
        ) {
          console.error(
            `Failed to delete Student ${student._id}:`,
            error
          );
        }
      }

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          `${studentDeletedCount} student(s) deleted successfully.`,

        deletedCount:
          studentDeletedCount,

        details: {
          studentsDeleted:
            studentDeletedCount,

          usersDeleted:
            userDeletedCount,

          clerkUsersDeleted:
            clerkDeletedCount,

          cloudinaryImagesDeleted:
            cloudinaryDeletedCount,
        },
      });

    } catch (error) {
      console.error(
        "Bulk delete students error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete selected students.",
        error:
          error.message,
      });
    }
  };