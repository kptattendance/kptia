import Student from "../models/Student.js";
import StudentSemester from "../models/StudentSemester.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { clerkClient } from "@clerk/express";
import mongoose from "mongoose";

// ==========================================================
// BULK ADD STUDENTS FROM CSV
// ==========================================================

// ==========================================================
// BULK ADD STUDENTS FROM CSV
// ==========================================================

export const bulkAddStudents = async (req, res) => {
  try {
    const { role, department: hodDept } = req.user;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }

    if (role !== "admin" && role !== "hod") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add students",
      });
    }

    const { parse } = await import("csv-parse/sync");

    const students = parse(
      req.file.buffer.toString("utf-8"),
      {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }
    );

    if (!students.length) {
      return res.status(400).json({
        success: false,
        message: "CSV file contains no student records",
      });
    }

    const results = [];

    for (const s of students) {
      let {
        registerNumber,
        name,
        gender,
        email,
        phone,
        department,
        admissionYear,
        semester,
        batch,
        batchNumber,
      } = s;

      // ------------------------------------------------------
      // NORMALIZE
      // ------------------------------------------------------

      registerNumber =
        registerNumber?.trim().toUpperCase();

      name =
        name?.trim().toUpperCase();

      gender =
        gender?.trim().toLowerCase();

      email =
        email?.trim().toLowerCase();

      phone =
        phone?.trim();

      department =
        department?.trim().toLowerCase();

      admissionYear =
        admissionYear?.trim();

      semester =
        semester?.trim();

      batch =
        batch?.trim();

      batchNumber =
        batchNumber?.trim();

      // ------------------------------------------------------
      // REQUIRED FIELDS
      // ------------------------------------------------------

      if (
        !registerNumber ||
        !name ||
        !gender ||
        !email ||
        !phone ||
        !department ||
        !admissionYear ||
        !semester ||
        !batch ||
        !batchNumber
      ) {
        results.push({
          registerNumber: registerNumber || "",
          success: false,
          message: "Missing required fields",
        });

        continue;
      }

      // ------------------------------------------------------
      // VALIDATE GENDER
      // ------------------------------------------------------

      const validGenders = [
        "male",
        "female",
        "other",
      ];

      if (!validGenders.includes(gender)) {
        results.push({
          registerNumber,
          success: false,
          message:
            "Invalid gender. Gender must be male, female or other",
        });

        continue;
      }

      // ------------------------------------------------------
      // VALIDATE ADMISSION YEAR
      // ------------------------------------------------------

      const parsedAdmissionYear =
        Number(admissionYear);

      if (
        !Number.isInteger(parsedAdmissionYear) ||
        parsedAdmissionYear < 2000 ||
        parsedAdmissionYear > 2100
      ) {
        results.push({
          registerNumber,
          success: false,
          message: "Invalid admission year",
        });

        continue;
      }

      // ------------------------------------------------------
      // VALIDATE SEMESTER
      // ------------------------------------------------------

      const parsedSemester =
        Number(semester);

      if (
        !Number.isInteger(parsedSemester) ||
        parsedSemester < 1 ||
        parsedSemester > 8
      ) {
        results.push({
          registerNumber,
          success: false,
          message:
            "Invalid semester. Semester must be between 1 and 8",
        });

        continue;
      }

      // ------------------------------------------------------
      // VALIDATE BATCH NUMBER
      // ------------------------------------------------------

      const parsedBatchNumber =
        Number(batchNumber);

      if (
        !Number.isInteger(parsedBatchNumber) ||
        ![1, 2].includes(parsedBatchNumber)
      ) {
        results.push({
          registerNumber,
          success: false,
          message:
            "Invalid batch number. Batch number must be 1 or 2",
        });

        continue;
      }

      // ------------------------------------------------------
      // VALIDATE DEPARTMENT
      // ------------------------------------------------------

      const validDepartments = [
        "at",
        "ch",
        "ce",
        "cs",
        "ec",
        "ee",
        "me",
        "ps",
        "sc",
      ];

      if (!validDepartments.includes(department)) {
        results.push({
          registerNumber,
          success: false,
          message:
            `Invalid department: ${department}`,
        });

        continue;
      }

      // ------------------------------------------------------
      // HOD RESTRICTIONS
      // ------------------------------------------------------

      if (role === "hod") {
        if (hodDept === "sc") {
          results.push({
            registerNumber,
            success: false,
            message:
              "Science HOD cannot add students",
          });

          continue;
        }

        if (
          department !== hodDept.toLowerCase()
        ) {
          results.push({
            registerNumber,
            success: false,
            message:
              "HOD can only add students from their department",
          });

          continue;
        }
      }

      try {
        // ----------------------------------------------------
        // DUPLICATE REGISTER NUMBER
        // ----------------------------------------------------

        const existingRegister =
          await Student.findOne({
            registerNumber,
          });

        if (existingRegister) {
          results.push({
            registerNumber,
            success: false,
            message:
              "Register number already exists",
          });

          continue;
        }

        // ----------------------------------------------------
        // DUPLICATE EMAIL
        // ----------------------------------------------------

        const existingEmail =
          await Student.findOne({
            email,
          });

        if (existingEmail) {
          results.push({
            registerNumber,
            success: false,
            message:
              "Email already exists",
          });

          continue;
        }

        // ----------------------------------------------------
        // CHECK CLERK
        // ----------------------------------------------------

        const existingUsers =
          await clerkClient.users.getUserList({
            emailAddress: [email],
            includeDeleted: true,
          });

        if (existingUsers.length > 0) {
          results.push({
            registerNumber,
            success: false,
            message:
              "Email already exists in Clerk",
          });

          continue;
        }

        // ----------------------------------------------------
        // CREATE CLERK USER
        // ----------------------------------------------------

        const clerkUser =
          await clerkClient.users.createUser({
            emailAddress: [email],
            firstName: name,

            publicMetadata: {
              role: "student",
              department,
              gender,
              admissionYear:
                parsedAdmissionYear,
              semester:
                parsedSemester,
              batch,
              batchNumber:
                parsedBatchNumber,
            },
          });

        try {
          // --------------------------------------------------
          // CREATE USER DOCUMENT
          // --------------------------------------------------

          const user = new User({
            clerkId: clerkUser.id,
            name,
            email,
            phone,
            role: "student",
            department,
          });

          await user.save();

          // --------------------------------------------------
          // CREATE STUDENT DOCUMENT
          // --------------------------------------------------

          const student = new Student({
            clerkId: clerkUser.id,
            registerNumber,
            name,
            gender,
            email,
            phone,
            department,
            admissionYear:
              parsedAdmissionYear,
            batch,
            batchNumber:
              parsedBatchNumber,
            role: "student",
          });

          await student.save();

          // --------------------------------------------------
          // CREATE INITIAL SEMESTER RECORD
          // --------------------------------------------------

          const academicYear =
            `${parsedAdmissionYear}-${String(
              parsedAdmissionYear + 1
            ).slice(-2)}`;

          await StudentSemester.create({
            studentId: student._id,
            academicYear,
            semester: parsedSemester,
            status: "CURRENT",
          });

          results.push({
            registerNumber,
            success: true,
            message:
              "Student added successfully",
            student,
          });
        } catch (mongoError) {
          // --------------------------------------------------
          // ROLLBACK USER DOCUMENT
          // --------------------------------------------------

          try {
            await User.deleteOne({
              clerkId: clerkUser.id,
            });
          } catch (userDeleteError) {
            console.error(
              "Failed to rollback User document:",
              userDeleteError.message
            );
          }

          // --------------------------------------------------
          // ROLLBACK CLERK USER
          // --------------------------------------------------

          try {
            await clerkClient.users.deleteUser(
              clerkUser.id
            );
          } catch (deleteError) {
            console.error(
              "Failed to rollback Clerk user:",
              deleteError.message
            );
          }

          throw mongoError;
        }
      } catch (err) {
        console.error(
          `Error adding student ${registerNumber}:`,
          err
        );

        results.push({
          registerNumber,
          success: false,
          message:
            err.message ||
            "Failed to add student",
        });
      }
    }

    const added =
      results.filter(
        (r) => r.success
      ).length;

    const skipped =
      results.filter(
        (r) => !r.success
      ).length;

    const errors =
      results
        .filter(
          (r) => !r.success
        )
        .map((r) => ({
          registerNumber:
            r.registerNumber,
          message:
            r.message,
        }));

    return res.status(201).json({
      success: skipped === 0,

      message:
        skipped === 0
          ? "All students added successfully"
          : "Bulk upload completed with some errors",

      summary: {
        total: results.length,
        added,
        skipped,
        errors: errors.length,
      },

      results,
      errors,
    });
  } catch (err) {
    console.error(
      "BulkAdd Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to process bulk student upload",
    });
  }
};

// ==========================================================
// CREATE STUDENT
// ==========================================================

export const createStudent = async (req, res) => {
  try {
    const {
      role,
      department: hodDept,
    } = req.user;

    const {
      registerNumber,
      name,
      gender,
      email,
      phone,
      department,
      admissionYear,
      semester,
      batch,
      batchNumber,
    } = req.body;

    // ------------------------------------------------------
    // AUTHORIZATION
    // ------------------------------------------------------

    if (
      role !== "admin" &&
      role !== "hod"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized to add students",
      });
    }

    // ------------------------------------------------------
    // HOD RESTRICTION
    // ------------------------------------------------------

    if (role === "hod") {
      if (hodDept === "sc") {
        return res.status(403).json({
          success: false,
          message:
            "Science HOD cannot add students",
        });
      }

      if (
        department?.toLowerCase() !==
        hodDept?.toLowerCase()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only add students from your department",
        });
      }
    }

    // ------------------------------------------------------
    // REQUIRED FIELDS
    // ------------------------------------------------------

    if (
      !registerNumber ||
      !name ||
      !gender ||
      !email ||
      !phone ||
      !department ||
      !admissionYear ||
      !semester ||
      !batch ||
      batchNumber === undefined ||
      batchNumber === null ||
      batchNumber === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All required fields including gender must be provided",
      });
    }

    // ------------------------------------------------------
    // VALIDATE GENDER
    // ------------------------------------------------------

    const normalizedGender =
      gender
        .trim()
        .toLowerCase();

    const validGenders = [
      "male",
      "female",
      "other",
    ];

    if (
      !validGenders.includes(
        normalizedGender
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid gender. Gender must be male, female or other",
      });
    }

    // ------------------------------------------------------
    // VALIDATE SEMESTER
    // ------------------------------------------------------

    const parsedSemester =
      Number(semester);

    if (
      !Number.isInteger(parsedSemester) ||
      parsedSemester < 1 ||
      parsedSemester > 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid semester. Semester must be between 1 and 8",
      });
    }

    // ------------------------------------------------------
    // VALIDATE ADMISSION YEAR
    // ------------------------------------------------------

    const parsedAdmissionYear =
      Number(admissionYear);

    if (
      !Number.isInteger(
        parsedAdmissionYear
      ) ||
      parsedAdmissionYear < 2000 ||
      parsedAdmissionYear > 2100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid admission year",
      });
    }

    // ------------------------------------------------------
    // VALIDATE BATCH NUMBER
    // ------------------------------------------------------

    const parsedBatchNumber =
      Number(batchNumber);

    if (
      !Number.isInteger(
        parsedBatchNumber
      ) ||
      ![1, 2].includes(
        parsedBatchNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid batch number. Batch number must be 1 or 2",
      });
    }

    // ------------------------------------------------------
    // NORMALIZE VALUES
    // ------------------------------------------------------

    const normalizedRegisterNumber =
      registerNumber
        .trim()
        .toUpperCase();

    const normalizedName =
      name
        .trim()
        .toUpperCase();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const normalizedPhone =
      phone.trim();

    const normalizedDepartment =
      department
        .trim()
        .toLowerCase();

    const normalizedBatch =
      batch.trim();

    // ------------------------------------------------------
    // CHECK DUPLICATE REGISTER NUMBER
    // ------------------------------------------------------

    const existingRegister =
      await Student.findOne({
        registerNumber:
          normalizedRegisterNumber,
      });

    if (existingRegister) {
      return res.status(400).json({
        success: false,
        message:
          "Register number already exists",
      });
    }

    // ------------------------------------------------------
    // CHECK DUPLICATE EMAIL
    // ------------------------------------------------------

    const existingEmail =
      await Student.findOne({
        email:
          normalizedEmail,
      });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Email already exists",
      });
    }

    // ------------------------------------------------------
    // CHECK CLERK
    // ------------------------------------------------------

    const existingUsers =
      await clerkClient.users.getUserList({
        emailAddress: [
          normalizedEmail,
        ],
        includeDeleted: true,
      });

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Email already exists in Clerk",
      });
    }

    // ------------------------------------------------------
    // CREATE CLERK USER
    // ------------------------------------------------------

    const clerkUser =
      await clerkClient.users.createUser({
        emailAddress: [
          normalizedEmail,
        ],

        firstName:
          normalizedName,

        publicMetadata: {
          role: "student",

          department:
            normalizedDepartment,

          gender:
            normalizedGender,

          admissionYear:
            parsedAdmissionYear,

          semester:
            parsedSemester,

          batch:
            normalizedBatch,

          batchNumber:
            parsedBatchNumber,
        },
      });

    try {
      // ----------------------------------------------------
      // CREATE USER DOCUMENT
      // ----------------------------------------------------

      const user = new User({
        clerkId: clerkUser.id,
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        role: "student",
        department:
          normalizedDepartment,
      });

      await user.save();

      // ----------------------------------------------------
      // CREATE STUDENT DOCUMENT
      // ----------------------------------------------------

      const student = new Student({
        clerkId: clerkUser.id,
        registerNumber:
          normalizedRegisterNumber,
        name:
          normalizedName,
        gender:
          normalizedGender,
        email:
          normalizedEmail,
        phone:
          normalizedPhone,
        department:
          normalizedDepartment,
        admissionYear:
          parsedAdmissionYear,
        batch:
          normalizedBatch,
        batchNumber:
          parsedBatchNumber,
        role: "student",
      });

      await student.save();

      // ----------------------------------------------------
      // INITIAL SEMESTER
      // ----------------------------------------------------

      const academicYear =
        `${parsedAdmissionYear}-${String(
          parsedAdmissionYear + 1
        ).slice(-2)}`;

      await StudentSemester.create({
        studentId:
          student._id,

        academicYear,

        semester:
          parsedSemester,

        status:
          "CURRENT",
      });

      return res.status(201).json({
        success: true,

        message:
          "Student added successfully",

        data:
          student,
      });
    } catch (mongoError) {
      // ----------------------------------------------------
      // ROLLBACK USER DOCUMENT
      // ----------------------------------------------------

      try {
        await User.deleteOne({
          clerkId:
            clerkUser.id,
        });
      } catch (userDeleteError) {
        console.error(
          "Failed to rollback User document:",
          userDeleteError.message
        );
      }

      // ----------------------------------------------------
      // ROLLBACK CLERK USER
      // ----------------------------------------------------

      try {
        await clerkClient.users.deleteUser(
          clerkUser.id
        );
      } catch (deleteError) {
        console.error(
          "Failed to rollback Clerk user:",
          deleteError.message
        );
      }

      throw mongoError;
    }
  } catch (err) {
    console.error(
      "CreateStudent Error:",
      err
    );

    if (err.code === 11000) {
      const field =
        Object.keys(
          err.keyPattern || {}
        )[0];

      return res.status(400).json({
        success: false,
        message:
          `${field || "Field"} already exists.`,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to add student.",
    });
  }
};
// ==========================================================
// GET STUDENTS
// ==========================================================

export const getStudents = async (req, res) => {
  try {
    const {
      role,
      department: userDepartment,
    } = req.user;

    const {
      department,
      semester,
      academicYear,
      batch,
      batchNumber,
    } = req.query;

    let filter = {};

    // ------------------------------------------------------
    // ADMIN
    // ------------------------------------------------------

    if (role === "admin") {
      if (department) {
        filter.department =
          department.toLowerCase();
      }
    }

    // ------------------------------------------------------
    // HOD / STAFF
    // ------------------------------------------------------

    else if (
      role === "hod" ||
      role === "staff"
    ) {
      if (userDepartment === "sc") {
        if (department) {
          filter.department =
            department.toLowerCase();
        }
      } else {
        filter.department =
          userDepartment;
      }
    }

    // ------------------------------------------------------
    // OTHER ROLES
    // ------------------------------------------------------

    else {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized to view students",
      });
    }

    // ------------------------------------------------------
    // BATCH FILTER
    // ------------------------------------------------------

    if (batch) {
      filter.batch =
        batch.trim();
    }

    // ------------------------------------------------------
    // BATCH NUMBER FILTER
    // ------------------------------------------------------

    if (
      batchNumber !== undefined &&
      batchNumber !== null &&
      batchNumber !== ""
    ) {
      const parsedBatchNumber =
        Number(batchNumber);

      if (
        !Number.isInteger(parsedBatchNumber) ||
        ![1, 2].includes(
          parsedBatchNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid batch number. Batch number must be 1 or 2",
        });
      }

      filter.batchNumber =
        parsedBatchNumber;
    }

    // ------------------------------------------------------
    // SEMESTER FILTER
    //
    // Semester information is stored in
    // StudentSemester collection.
    // ------------------------------------------------------

    let students;

    if (
      semester ||
      academicYear
    ) {
      const semesterFilter = {};

      if (semester) {
        semesterFilter.semester =
          Number(semester);
      }

      if (academicYear) {
        semesterFilter.academicYear =
          academicYear;
      }

      semesterFilter.status =
        "CURRENT";

      const semesterRecords =
        await StudentSemester.find(
          semesterFilter
        ).select("studentId");

      const studentIds =
        semesterRecords.map(
          (record) =>
            record.studentId
        );

      filter._id = {
        $in: studentIds,
      };
    }

    // ------------------------------------------------------
    // FETCH STUDENTS
    // ------------------------------------------------------

    students =
      await Student.find(filter)
        .sort({
          registerNumber: 1,
        })
        .lean();

    // ------------------------------------------------------
    // GET CURRENT SEMESTER
    // ------------------------------------------------------

    const studentIds =
      students.map(
        (student) =>
          student._id
      );

    const semesterRecords =
      await StudentSemester.find({
        studentId: {
          $in: studentIds,
        },

        status: "CURRENT",
      }).lean();

    const semesterMap =
      new Map(
        semesterRecords.map(
          (record) => [
            String(
              record.studentId
            ),
            record.semester,
          ]
        )
      );

    // ------------------------------------------------------
    // ADD SEMESTER TO RESPONSE
    // ------------------------------------------------------

    students =
      students.map(
        (student) => ({
          ...student,

          semester:
            semesterMap.get(
              String(student._id)
            ) || "",
        })
      );

    return res.json({
      success: true,
      data: students,
    });

  } catch (err) {

    console.error(
      "GetStudents Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to fetch students.",
    });
  }
};


// ==========================================================
// UPDATE STUDENT
// ==========================================================

export const updateStudent = async (req, res) => {
  try {
    const {
      role,
      department,
    } = req.user;

    const student =
      await Student.findById(
        req.params.id
      );

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    // ------------------------------------------------------
    // HOD ACCESS
    // ------------------------------------------------------

    if (
      role === "hod" &&
      department !== "sc" &&
      student.department !== department
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot edit student outside your department",
      });
    }

    if (
      role === "hod" &&
      department === "sc"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Science HOD cannot modify students",
      });
    }

    // ------------------------------------------------------
    // GET SEMESTER FROM REQUEST
    // ------------------------------------------------------

    const semester =
      req.body.semester;

    let parsedSemester = null;

    if (
      semester !== undefined &&
      semester !== null &&
      semester !== ""
    ) {
      parsedSemester =
        Number(semester);

      if (
        !Number.isInteger(
          parsedSemester
        ) ||
        parsedSemester < 1 ||
        parsedSemester > 8
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid semester. Semester must be between 1 and 8.",
        });
      }
    }

    // ------------------------------------------------------
    // OLD PHOTO
    // ------------------------------------------------------

    const oldImagePublicId =
      student.imagePublicId;

    // ------------------------------------------------------
    // UPDATE STUDENT DETAILS
    // ------------------------------------------------------

    const updateData = {
      ...req.body,
    };

    // Never allow these fields
    delete updateData.clerkId;
    delete updateData.role;

    // Semester belongs to StudentSemester
    delete updateData.semester;

    // ------------------------------------------------------
    // NORMALIZE
    // ------------------------------------------------------

    if (
      updateData.registerNumber
    ) {
      updateData.registerNumber =
        updateData.registerNumber
          .trim()
          .toUpperCase();
    }

    if (updateData.name) {
      updateData.name =
        updateData.name
          .trim()
          .toUpperCase();
    }

    if (updateData.email) {
      updateData.email =
        updateData.email
          .trim()
          .toLowerCase();
    }

  if (updateData.phone) {
  updateData.phone =
    updateData.phone.trim();
}

if (updateData.gender) {
  updateData.gender =
    updateData.gender
      .trim()
      .toLowerCase();

  const validGenders = [
    "male",
    "female",
    "other",
  ];

  if (
    !validGenders.includes(
      updateData.gender
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid gender. Gender must be male, female or other",
    });
  }
}

if (updateData.department) {
  updateData.department =
    updateData.department
      .trim()
      .toLowerCase();
}

    if (updateData.department) {
      updateData.department =
        updateData.department
          .trim()
          .toLowerCase();
    }

    if (updateData.batch) {
      updateData.batch =
        updateData.batch.trim();
    }

    // ------------------------------------------------------
    // BATCH NUMBER
    // ------------------------------------------------------

    if (
      updateData.batchNumber !==
        undefined &&
      updateData.batchNumber !==
        null &&
      updateData.batchNumber !== ""
    ) {
      const parsedBatchNumber =
        Number(
          updateData.batchNumber
        );

      if (
        !Number.isInteger(
          parsedBatchNumber
        ) ||
        ![1, 2].includes(
          parsedBatchNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid batch number. Batch number must be 1 or 2",
        });
      }

      updateData.batchNumber =
        parsedBatchNumber;
    }

    if (
      updateData.admissionYear
    ) {
      updateData.admissionYear =
        Number(
          updateData.admissionYear
        );

      if (
        !Number.isInteger(
          updateData.admissionYear
        ) ||
        updateData.admissionYear <
          2000 ||
        updateData.admissionYear >
          2100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid admission year",
        });
      }
    }

    // ------------------------------------------------------
    // PHOTO
    // ------------------------------------------------------

    let newImagePublicId = null;

    if (req.cloudinaryResult) {
      updateData.imageUrl =
        req.cloudinaryResult.secure_url;

      updateData.imagePublicId =
        req.cloudinaryResult.public_id;

      newImagePublicId =
        req.cloudinaryResult.public_id;
    }

    // ------------------------------------------------------
    // UPDATE STUDENT
    // ------------------------------------------------------

    let updated;

    try {
      updated =
        await Student.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );

    } catch (dbError) {

      if (newImagePublicId) {
        try {
          await cloudinary.uploader.destroy(
            newImagePublicId
          );
        } catch (rollbackError) {
          console.error(
            "Failed to rollback image:",
            rollbackError.message
          );
        }
      }

      throw dbError;
    }

    // ------------------------------------------------------
    // UPDATE CURRENT SEMESTER
    // ------------------------------------------------------

    if (parsedSemester !== null) {
      const currentSemester =
        await StudentSemester.findOne({
          studentId:
            student._id,
          status:
            "CURRENT",
        });

      if (currentSemester) {

        currentSemester.semester =
          parsedSemester;

        await currentSemester.save();

      } else {

        const academicYear =
          `${student.admissionYear}-${String(
            student.admissionYear + 1
          ).slice(-2)}`;

        await StudentSemester.create({
          studentId:
            student._id,

          academicYear,

          semester:
            parsedSemester,

          status:
            "CURRENT",
        });
      }
    }

    // ------------------------------------------------------
    // DELETE OLD PHOTO
    // ------------------------------------------------------

    if (
      newImagePublicId &&
      oldImagePublicId &&
      oldImagePublicId !==
        newImagePublicId
    ) {
      try {
        await cloudinary.uploader.destroy(
          oldImagePublicId
        );
      } catch (imageError) {
        console.warn(
          "Old image deletion failed:",
          imageError.message
        );
      }
    }

    // ------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        newImagePublicId
          ? "Student details, semester and photo updated successfully"
          : "Student details and semester updated successfully",

      data:
        updated,
    });

  } catch (err) {

    console.error(
      "UpdateStudent Error:",
      err
    );

    if (err.code === 11000) {
      const duplicateField =
        Object.keys(
          err.keyPattern || {}
        )[0];

      return res.status(400).json({
        success: false,
        message:
          `${duplicateField || "Field"} already exists.`,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to update student.",
    });
  }
};
// ==========================================================
// DELETE STUDENT
// ==========================================================

// ==========================================================
// DELETE STUDENT
// ==========================================================

export const deleteStudent = async (req, res) => {
  try {
    const {
      role,
      department,
    } = req.user;

    // ------------------------------------------------------
    // FIND STUDENT
    // ------------------------------------------------------

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // ------------------------------------------------------
    // HOD ACCESS
    // ------------------------------------------------------

    if (
      role === "hod" &&
      student.department !== department
    ) {
      return res.status(403).json({
        success: false,
        message:
          "HOD cannot delete student from another department.",
      });
    }

    if (
      role === "hod" &&
      department === "sc"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Science HOD cannot modify students",
      });
    }

    // ------------------------------------------------------
    // DELETE CLERK USER
    // ------------------------------------------------------

    if (student.clerkId) {
      try {
        await clerkClient.users.deleteUser(
          student.clerkId
        );

        console.log(
          `Clerk user deleted: ${student.clerkId}`
        );

      } catch (clerkErr) {

        if (clerkErr?.status === 404) {
          console.warn(
            `Clerk user ${student.clerkId} already deleted`
          );
        } else {
          console.error(
            "Clerk deletion failed:",
            clerkErr
          );
        }
      }
    }

    // ------------------------------------------------------
    // DELETE USER DOCUMENT
    // ------------------------------------------------------

    if (student.clerkId) {
      try {
        const userDeleteResult =
          await User.deleteOne({
            clerkId: student.clerkId,
          });

        console.log(
          `User collection deletion result:`,
          userDeleteResult
        );

      } catch (userErr) {
        console.error(
          "User collection deletion failed:",
          userErr
        );
      }
    }

    // ------------------------------------------------------
    // DELETE CLOUDINARY PHOTO
    // ------------------------------------------------------

    if (student.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(
          student.imagePublicId
        );

      } catch (imgErr) {
        console.warn(
          "Cloudinary deletion failed:",
          imgErr.message
        );
      }
    }

    // ------------------------------------------------------
    // DELETE ACADEMIC RECORDS
    // ------------------------------------------------------

    await StudentSemester.deleteMany({
      studentId: student._id,
    });

    // ------------------------------------------------------
    // DELETE STUDENT
    // ------------------------------------------------------

    await student.deleteOne();

    // ------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------

    return res.json({
      success: true,
      message:
        "Student, User and Clerk account deleted successfully",
    });

  } catch (err) {

    console.error(
      "DeleteStudent Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to delete student.",
    });
  }
};


// ==========================================================
// GET STUDENT BY ID
// ==========================================================

export const getStudentById = async (
  req,
  res
) => {
  try {
    const {
      role,
      department,
    } = req.user;

    let studentId =
      req.params.id;

    // Resolve Clerk ID
    if (
      !mongoose.Types.ObjectId.isValid(
        studentId
      )
    ) {
      const student =
        await Student.findOne({
          clerkId: studentId,
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }

      studentId =
        student._id;
    }

    const student =
      await Student.findById(
        studentId
      );

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    if (
      role === "hod" &&
      department !== "sc" &&
      student.department !== department
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only view students from your own department",
      });
    }

    if (
      role !== "admin" &&
      role !== "hod"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized to view student",
      });
    }

 const currentSemester =
  await StudentSemester.findOne({
    studentId: student._id,
    status: "CURRENT",
  });

return res.json({
  success: true,
  data: {
    ...student.toObject(),
    semester: currentSemester?.semester || "",
  },
});
  } catch (err) {
    console.error(
      "GetStudentById Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to fetch student details.",
    });
  }
};


// ==========================================================
// SEARCH STUDENTS
// ==========================================================

export const searchStudents = async (
  req,
  res
) => {
  try {
    const {
      department,
      semester,
      academicYear,
      registerNumber,
      batch,
      batchNumber,
    } = req.query;

    const filter = {};

    // ------------------------------------------------------
    // DEPARTMENT
    // ------------------------------------------------------

    if (department) {
      filter.department =
        department.toLowerCase();
    }

    // ------------------------------------------------------
    // REGISTER NUMBER
    // ------------------------------------------------------

    if (registerNumber) {
      filter.registerNumber =
        registerNumber
          .trim()
          .toUpperCase();
    }

    // ------------------------------------------------------
    // ACADEMIC BATCH
    // ------------------------------------------------------

    if (batch) {
      filter.batch =
        batch.trim();
    }

    // ------------------------------------------------------
    // BATCH NUMBER
    // ------------------------------------------------------

    if (
      batchNumber !== undefined &&
      batchNumber !== null &&
      batchNumber !== ""
    ) {
      const parsedBatchNumber =
        Number(batchNumber);

      if (
        !Number.isInteger(
          parsedBatchNumber
        ) ||
        ![1, 2].includes(
          parsedBatchNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid batch number. Batch number must be 1 or 2",
        });
      }

      filter.batchNumber =
        parsedBatchNumber;
    }

    // ------------------------------------------------------
    // SEMESTER FILTER
    // ------------------------------------------------------

    if (
      semester ||
      academicYear
    ) {
      const semesterFilter = {
        status: "CURRENT",
      };

      if (semester) {
        semesterFilter.semester =
          Number(semester);
      }

      if (academicYear) {
        semesterFilter.academicYear =
          academicYear;
      }

      const records =
        await StudentSemester.find(
          semesterFilter
        ).select("studentId");

      filter._id = {
        $in: records.map(
          (record) =>
            record.studentId
        ),
      };
    }

    // ------------------------------------------------------
    // FETCH STUDENTS
    // ------------------------------------------------------

    const students =
      await Student.find(filter)
        .select(
          "name registerNumber department admissionYear batch batchNumber _id clerkId imageUrl"
        )
        .sort({
          registerNumber: 1,
        });

    return res.json({
      success: true,
      data: students,
    });

  } catch (err) {

    console.error(
      "SearchStudents Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to search students",
      error:
        err.message,
    });
  }
};