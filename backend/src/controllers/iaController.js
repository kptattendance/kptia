// controllers/iaController.js

import mongoose from "mongoose";
import IAMarks from "../models/IAMarks.js";
import Student from "../models/Student.js";

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const CO_NAMES = [
  "CO1",
  "CO2",
  "CO3",
  "CO4",
  "CO5",
  "CO6",
];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getRole = (req) => {
  return req.user?.role?.toLowerCase();
};

const getCOTotal = (coMarks = {}) => {
  return CO_NAMES.reduce(
    (total, co) => total + Number(coMarks[co] || 0),
    0
  );
};

// --------------------------------------------------
// VALIDATE IA TEST CONFIGURATION
// --------------------------------------------------
//
// For every test:
//
// CO1 + CO2 + CO3 + CO4 + CO5 + CO6
//              = maxMarks
//
// --------------------------------------------------

const validateTests = (tests) => {
  if (!Array.isArray(tests) || tests.length === 0) {
    return {
      valid: false,
      message: "At least one IA test is required.",
    };
  }

  let totalMaxMarks = 0;

  const cleanedTests = [];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];

    if (!test.testName?.trim()) {
      return {
        valid: false,
        message: `Test ${i + 1} name is required.`,
      };
    }

    const maxMarks = Number(test.maxMarks);

    if (
      !Number.isFinite(maxMarks) ||
      maxMarks <= 0
    ) {
      return {
        valid: false,
        message:
          `${test.testName}: Maximum marks must be greater than 0.`,
      };
    }

    const coMarks = test.coMarks || {};

    const cleanedCO = {};

    for (const co of CO_NAMES) {
      const value = Number(coMarks[co] ?? 0);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return {
          valid: false,
          message:
            `${test.testName}: Invalid marks entered for ${co}.`,
        };
      }

      cleanedCO[co] = value;
    }

    const coTotal = getCOTotal(cleanedCO);

    if (coTotal !== maxMarks) {
      return {
        valid: false,
        message:
          `${test.testName}: CO total must be ${maxMarks}. ` +
          `Current CO total is ${coTotal}.`,
      };
    }

    totalMaxMarks += maxMarks;

    cleanedTests.push({
      testName: test.testName.trim(),
      maxMarks,
      coMarks: cleanedCO,
    });
  }

  return {
    valid: true,
    totalMaxMarks,
    tests: cleanedTests,
  };
};

// --------------------------------------------------
// VALIDATE STUDENT MARKS
// --------------------------------------------------
//
// For every student/test:
//
// CO1 + CO2 + ... + CO6 = obtained marks
//
// AND
//
// obtained marks <= test maximum
//
// AB:
//
// status = ABSENT
// marks = null
// CO1...CO6 = 0
//
// --------------------------------------------------

const validateStudents = async (
  students,
  tests
) => {
  if (
    !Array.isArray(students) ||
    students.length === 0
  ) {
    return {
      valid: false,
      message: "Student IA marks are required.",
    };
  }

  const cleanedStudents = [];

  // Check duplicate students
  const studentIds = students.map(
    (student) => String(student.studentId)
  );

  const duplicateIds = studentIds.filter(
    (id, index) =>
      studentIds.indexOf(id) !== index
  );

  if (duplicateIds.length > 0) {
    return {
      valid: false,
      message: "Duplicate student found in IA marks.",
    };
  }

  // Check that students actually exist
  const validObjectIds = students
    .map((student) => student.studentId)
    .filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

  if (validObjectIds.length !== students.length) {
    return {
      valid: false,
      message: "One or more student IDs are invalid.",
    };
  }

  const existingStudents = await Student.find({
    _id: { $in: validObjectIds },
  }).select("_id");

  const existingStudentIds = new Set(
    existingStudents.map((student) =>
      String(student._id)
    )
  );

  for (const student of students) {
    if (
      !existingStudentIds.has(
        String(student.studentId)
      )
    ) {
      return {
        valid: false,
        message:
          `Student ${student.studentId} was not found.`,
      };
    }
  }

  // Validate each student
  for (const student of students) {
    if (!Array.isArray(student.tests)) {
      return {
        valid: false,
        message:
          `Invalid test data for student ${student.studentId}.`,
      };
    }

    if (student.tests.length !== tests.length) {
      return {
        valid: false,
        message:
          `Number of tests for student ${student.studentId} ` +
          `does not match the IA tests.`,
      };
    }

    const cleanedStudentTests = [];
    let studentTotal = 0;

    for (
      let testIndex = 0;
      testIndex < tests.length;
      testIndex++
    ) {
      const mainTest = tests[testIndex];
      const studentTest =
        student.tests[testIndex] || {};

      const status =
        String(studentTest.status || "PRESENT")
          .toUpperCase();

      // ------------------------------------------
      // ABSENT
      // ------------------------------------------

      if (status === "ABSENT") {
        cleanedStudentTests.push({
          marks: null,
          status: "ABSENT",

          coMarks: {
            CO1: 0,
            CO2: 0,
            CO3: 0,
            CO4: 0,
            CO5: 0,
            CO6: 0,
          },
        });

        continue;
      }

      // ------------------------------------------
      // PRESENT
      // ------------------------------------------

      const coMarks =
        studentTest.coMarks || {};

      const cleanedCO = {};

      for (const co of CO_NAMES) {
        const value = Number(
          coMarks[co] ?? 0
        );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          return {
            valid: false,
            message:
              `Invalid ${co} marks for student ` +
              `${student.studentId} in ${mainTest.testName}.`,
          };
        }

        const maxCO = Number(
          mainTest.coMarks?.[co] || 0
        );

        if (value > maxCO) {
          return {
            valid: false,
            message:
              `Student ${student.studentId}: ${co} ` +
              `marks cannot exceed ${maxCO} in ` +
              `${mainTest.testName}.`,
          };
        }

        cleanedCO[co] = value;
      }

      const obtainedMarks =
        getCOTotal(cleanedCO);

      // Student total cannot exceed test total
      if (
        obtainedMarks >
        Number(mainTest.maxMarks)
      ) {
        return {
          valid: false,
          message:
            `Student ${student.studentId}: ` +
            `${mainTest.testName} marks cannot exceed ` +
            `${mainTest.maxMarks}.`,
        };
      }

      cleanedStudentTests.push({
        marks: obtainedMarks,
        status: "PRESENT",
        coMarks: cleanedCO,
      });

      studentTotal += obtainedMarks;
    }

    cleanedStudents.push({
      studentId: student.studentId,
      tests: cleanedStudentTests,
      totalMarks: studentTotal,
    });
  }

  return {
    valid: true,
    students: cleanedStudents,
  };
};

// ==================================================
// CREATE / SAVE IA MARKS
// ==================================================

export const saveIAMarks = async (req, res) => {
  try {
    const role = getRole(req);

    // Staff, HOD and Admin can create
    if (!["staff", "hod", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to enter IA marks.",
      });
    }

    const {
      department,
      semester,
      subjectId,
      academicYear,
      tests,
      students,
    } = req.body;

    // ----------------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------------

    if (
      !department ||
      !semester ||
      !subjectId ||
      !academicYear
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Department, semester, subject and academic year are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(subjectId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID.",
      });
    }

    const semesterNumber = Number(semester);

    if (
      !Number.isInteger(semesterNumber) ||
      semesterNumber < 1 ||
      semesterNumber > 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid semester.",
      });
    }

    // ----------------------------------------------
    // HOD OWN DEPARTMENT
    // ----------------------------------------------

    if (
      role === "hod" &&
      req.user.department &&
      req.user.department !== department
    ) {
      return res.status(403).json({
        success: false,
        message:
          "HOD can enter IA marks only for their own department.",
      });
    }

    // ----------------------------------------------
    // CHECK EXISTING IA
    // ----------------------------------------------

    const existing = await IAMarks.findOne({
      department,
      semester: semesterNumber,
      subjectId,
      academicYear,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "IA marks already exist for this subject and academic year. They are frozen and cannot be changed.",
      });
    }

    // ----------------------------------------------
    // VALIDATE TESTS
    // ----------------------------------------------

    const testValidation =
      validateTests(tests);

    if (!testValidation.valid) {
      return res.status(400).json({
        success: false,
        message: testValidation.message,
      });
    }

    // ----------------------------------------------
    // VALIDATE STUDENTS
    // ----------------------------------------------

    const studentValidation =
      await validateStudents(
        students,
        testValidation.tests
      );

    if (!studentValidation.valid) {
      return res.status(400).json({
        success: false,
        message: studentValidation.message,
      });
    }

    // ----------------------------------------------
    // CREATE IA
    // ----------------------------------------------

    const now = new Date();

    const iaMarks = await IAMarks.create({
      department,
      semester: semesterNumber,
      subjectId,
      academicYear,

      tests: testValidation.tests,

      totalMaxMarks:
        testValidation.totalMaxMarks,

      students:
        studentValidation.students,

      enteredBy: req.user.id,

      isLocked: true,
      lockedAt: now,
      lockedBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message:
        "IA marks saved and frozen successfully.",
      data: iaMarks,
    });
  } catch (error) {
    console.error(
      "Save IA Marks Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "IA marks already exist for this subject and academic year.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to save IA marks.",
    });
  }
};

// ==================================================
// GET IA MARKS BY FILTERS
// ==================================================

export const getIAMarks = async (req, res) => {
  try {
    const role = getRole(req);

    if (
      !["admin", "principal", "hod", "staff"]
        .includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view IA marks.",
      });
    }

    const {
      department,
      semester,
      subjectId,
      academicYear,
    } = req.query;

    if (
      !department ||
      !semester ||
      !subjectId ||
      !academicYear
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Department, semester, subject and academic year are required.",
      });
    }

    // HOD restriction
    if (
      role === "hod" &&
      req.user.department &&
      req.user.department !== department
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only view IA marks for your own department.",
      });
    }

    const iaMarks = await IAMarks.findOne({
      department,
      semester: Number(semester),
      subjectId,
      academicYear,
    })
      .populate(
        "subjectId",
        "code name semester department"
      )
      .populate(
        "students.studentId",
        "registerNumber name email department"
      )
      .lean();

    if (!iaMarks) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: iaMarks,
    });
  } catch (error) {
    console.error(
      "Get IA Marks Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch IA marks.",
    });
  }
};

// ==================================================
// GET IA MARKS BY ID
// ==================================================

export const getIAMarksById = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (
      !["admin", "principal", "hod", "staff"]
        .includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view IA marks.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IA record ID.",
      });
    }

    const iaMarks =
      await IAMarks.findById(id)
        .populate(
          "subjectId",
          "code name semester department"
        )
        .populate(
          "students.studentId",
          "registerNumber name email department"
        )
        .lean();

    if (!iaMarks) {
      return res.status(404).json({
        success: false,
        message:
          "IA marks not found.",
      });
    }

    // HOD restriction
    if (
      role === "hod" &&
      req.user.department &&
      req.user.department !==
        iaMarks.department
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only view IA marks for your own department.",
      });
    }

    return res.status(200).json({
      success: true,
      data: iaMarks,
    });
  } catch (error) {
    console.error(
      "Get IA Marks By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch IA marks.",
    });
  }
};

// ==================================================
// UPDATE IA MARKS
// ADMIN ONLY
// ==================================================
//
// This is intentionally restricted because normal
// IA records are frozen after staff saves them.
//
// Admin can use this for a genuine correction.
// The record remains frozen after correction.
// ==================================================

export const updateIAMarks = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "IA marks are frozen. Only admin can make corrections.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IA record ID.",
      });
    }

    const {
      department,
      semester,
      subjectId,
      academicYear,
      tests,
      students,
    } = req.body;

    if (
      !department ||
      !semester ||
      !subjectId ||
      !academicYear
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Department, semester, subject and academic year are required.",
      });
    }

    const existing =
      await IAMarks.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message:
          "IA marks not found.",
      });
    }

    // ----------------------------------------------
    // VALIDATE TESTS
    // ----------------------------------------------

    const testValidation =
      validateTests(tests);

    if (!testValidation.valid) {
      return res.status(400).json({
        success: false,
        message: testValidation.message,
      });
    }

    // ----------------------------------------------
    // VALIDATE STUDENTS
    // ----------------------------------------------

    const studentValidation =
      await validateStudents(
        students,
        testValidation.tests
      );

    if (!studentValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          studentValidation.message,
      });
    }

    // ----------------------------------------------
    // UPDATE
    // ----------------------------------------------

    existing.department =
      department;

    existing.semester =
      Number(semester);

    existing.subjectId =
      subjectId;

    existing.academicYear =
      academicYear;

    existing.tests =
      testValidation.tests;

    existing.totalMaxMarks =
      testValidation.totalMaxMarks;

    existing.students =
      studentValidation.students;

    // Keep frozen
    existing.isLocked = true;
    existing.lockedAt = new Date();
    existing.lockedBy = req.user.id;

    await existing.save();

    return res.status(200).json({
      success: true,
      message:
        "IA marks corrected successfully.",
      data: existing,
    });
  } catch (error) {
    console.error(
      "Update IA Marks Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update IA marks.",
    });
  }
};

// ==================================================
// DELETE IA MARKS
// ADMIN ONLY
// ==================================================

export const deleteIAMarks = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only admin can delete frozen IA marks.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IA record ID.",
      });
    }

    const iaMarks =
      await IAMarks.findByIdAndDelete(id);

    if (!iaMarks) {
      return res.status(404).json({
        success: false,
        message:
          "IA marks not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "IA marks deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete IA Marks Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete IA marks.",
    });
  }
};

// ==================================================
// STUDENT - GET OWN IA MARKS
// ==================================================
//
// Student ID is NEVER accepted from frontend.
//
// Clerk ID -> Student -> own IA records
//
// ==================================================

export const getStudentIAMarks = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (role !== "student") {
      return res.status(403).json({
        success: false,
        message:
          "This endpoint is only for students.",
      });
    }

    // ----------------------------------------------
    // FIND STUDENT USING CLERK ID
    // ----------------------------------------------

    const student =
      await Student.findOne({
        clerkId: req.user.id,
        role: "student",
      }).select(
        "_id registerNumber name email department"
      );

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student profile not found.",
      });
    }

    const {
      academicYear,
      semester,
      subjectId,
    } = req.query;

    // ----------------------------------------------
    // QUERY
    // ----------------------------------------------

    const query = {
      "students.studentId":
        student._id,
    };

    if (academicYear) {
      query.academicYear =
        academicYear;
    }

    if (semester) {
      query.semester =
        Number(semester);
    }

    if (subjectId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          subjectId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subject ID.",
        });
      }

      query.subjectId =
        subjectId;
    }

    const records =
      await IAMarks.find(query)
        .populate(
          "subjectId",
          "code name semester department"
        )
        .lean();

    // ----------------------------------------------
    // ONLY RETURN THIS STUDENT'S MARKS
    // ----------------------------------------------

    const result = records.map(
      (record) => {
        const studentRecord =
          record.students.find(
            (item) =>
              String(item.studentId) ===
              String(student._id)
          );

        if (!studentRecord) {
          return null;
        }

        return {
          _id: record._id,

          academicYear:
            record.academicYear,

          department:
            record.department,

          semester:
            record.semester,

          subject:
            record.subjectId,

          tests: studentRecord.tests,

          totalMarks:
            studentRecord.totalMarks,

          totalMaxMarks:
            record.totalMaxMarks,

          isLocked:
            record.isLocked,

          lockedAt:
            record.lockedAt,
        };
      }
    ).filter(Boolean);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Get Student IA Marks Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch student IA marks.",
    });
  }
};