import mongoose from "mongoose";
import IAMarks from "../models/IAMarks.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";

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

    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
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

      if (!Number.isFinite(value) || value < 0) {
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

// ==================================================
// VALIDATE STUDENT IA MARKS
// ==================================================

const validateStudents = async (
  students,
  tests,
  department,
  semester,
  batchNumber
) => {
  if (
    !Array.isArray(students) ||
    students.length === 0
  ) {
    return {
      valid: false,
      message:
        "Student IA marks are required.",
    };
  }

  // --------------------------------------------------
  // VALIDATE BATCH NUMBER
  // --------------------------------------------------

  const parsedBatchNumber =
    Number(batchNumber);

  if (
    !Number.isInteger(parsedBatchNumber) ||
    ![1, 2].includes(parsedBatchNumber)
  ) {
    return {
      valid: false,
      message:
        "Invalid batch number. Batch number must be 1 or 2.",
    };
  }

  // --------------------------------------------------
  // DUPLICATE STUDENTS
  // --------------------------------------------------

  const studentIds =
    students.map(
      (student) =>
        String(student.studentId)
    );

  const duplicateIds =
    studentIds.filter(
      (id, index) =>
        studentIds.indexOf(id) !== index
    );

  if (duplicateIds.length > 0) {
    return {
      valid: false,
      message:
        "Duplicate student found in IA marks.",
    };
  }

  // --------------------------------------------------
  // VALIDATE OBJECT IDS
  // --------------------------------------------------

  const validObjectIds =
    students
      .map(
        (student) =>
          student.studentId
      )
      .filter((id) =>
        mongoose.Types.ObjectId.isValid(
          id
        )
      );

  if (
    validObjectIds.length !==
    students.length
  ) {
    return {
      valid: false,
      message:
        "One or more student IDs are invalid.",
    };
  }

  // --------------------------------------------------
  // GET STUDENTS FROM DATABASE
  // --------------------------------------------------

  const existingStudents =
    await Student.find({
      _id: {
        $in: validObjectIds,
      },
    }).select(
      "_id department batchNumber"
    );

  if (
    existingStudents.length !==
    students.length
  ) {
    return {
      valid: false,
      message:
        "One or more selected students were not found.",
    };
  }

  // --------------------------------------------------
  // VERIFY EVERY STUDENT BELONGS TO
  // SELECTED DEPARTMENT AND BATCH
  // --------------------------------------------------

  for (const dbStudent of existingStudents) {
    if (
      dbStudent.department !==
      department
    ) {
      return {
        valid: false,
        message:
          "One or more students do not belong to the selected department.",
      };
    }

    if (
      Number(dbStudent.batchNumber) !==
      parsedBatchNumber
    ) {
      return {
        valid: false,
        message:
          `Student ${dbStudent._id} does not belong to Batch ${parsedBatchNumber}.`,
      };
    }
  }

  // --------------------------------------------------
  // VALIDATE EACH STUDENT
  // --------------------------------------------------

  const cleanedStudents = [];

  for (const student of students) {
    if (
      !Array.isArray(student.tests)
    ) {
      return {
        valid: false,
        message:
          `Invalid test data for student ${student.studentId}.`,
      };
    }

    if (
      student.tests.length !==
      tests.length
    ) {
      return {
        valid: false,
        message:
          `Number of tests for student ${student.studentId} does not match the IA tests.`,
      };
    }

    const cleanedStudentTests = [];

    let studentTotal = 0;

    // ------------------------------------------------
    // EACH TEST
    // ------------------------------------------------

    for (
      let testIndex = 0;
      testIndex < tests.length;
      testIndex++
    ) {
      const mainTest =
        tests[testIndex];

      const studentTest =
        student.tests[testIndex] || {};

      const status =
        String(
          studentTest.status ||
            "PRESENT"
        ).toUpperCase();

      // ----------------------------------------------
      // ABSENT
      // ----------------------------------------------

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

      // ----------------------------------------------
      // PRESENT
      // ----------------------------------------------

      const coMarks =
        studentTest.coMarks || {};

      const cleanedCO = {};

      for (const co of CO_NAMES) {
        const value =
          Number(
            coMarks[co] ?? 0
          );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          return {
            valid: false,
            message:
              `Invalid ${co} marks for student ${student.studentId} in ${mainTest.testName}.`,
          };
        }

        const maxCO =
          Number(
            mainTest.coMarks?.[co] ||
              0
          );

        if (value > maxCO) {
          return {
            valid: false,
            message:
              `Student ${student.studentId}: ${co} marks cannot exceed ${maxCO} in ${mainTest.testName}.`,
          };
        }

        cleanedCO[co] =
          value;
      }

      // ----------------------------------------------
      // STUDENT TEST TOTAL
      // ----------------------------------------------

      const obtainedMarks =
        getCOTotal(
          cleanedCO
        );

      if (
        obtainedMarks >
        Number(
          mainTest.maxMarks
        )
      ) {
        return {
          valid: false,
          message:
            `Student ${student.studentId}: ${mainTest.testName} marks cannot exceed ${mainTest.maxMarks}.`,
        };
      }

      cleanedStudentTests.push({
        marks:
          obtainedMarks,

        status:
          "PRESENT",

        coMarks:
          cleanedCO,
      });

      studentTotal +=
        obtainedMarks;
    }

    // ----------------------------------------------
    // STUDENT RECORD
    // ----------------------------------------------

    cleanedStudents.push({
      studentId:
        student.studentId,

      tests:
        cleanedStudentTests,

      totalMarks:
        studentTotal,
    });
  }

  return {
    valid: true,

    students:
      cleanedStudents,
  };
};
// ==================================================
// CREATE / SAVE IA MARKS
// ==================================================

export const saveIAMarks = async (
  req,
  res
) => {
  try {
    const role =
      getRole(req);

    // --------------------------------------------------
    // AUTHORIZATION
    // --------------------------------------------------

    if (
      !["staff", "hod", "admin"].includes(
        role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to enter IA marks.",
      });
    }

    // --------------------------------------------------
    // REQUEST DATA
    // --------------------------------------------------

    const {
      department,
      semester,
      subjectId,
      academicYear,
      iaNumber,
      batchNumber,
      tests,
      students,
    } = req.body;

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------

    if (
      !department ||
      !semester ||
      !subjectId ||
      !academicYear ||
      iaNumber === undefined ||
      iaNumber === null ||
      batchNumber === undefined ||
      batchNumber === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, department, semester, subject, IA number and batch number are required.",
      });
    }

    // --------------------------------------------------
    // SUBJECT ID
    // --------------------------------------------------

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

    // --------------------------------------------------
    // SEMESTER
    // --------------------------------------------------

    const semesterNumber =
      Number(semester);

    if (
      !Number.isInteger(
        semesterNumber
      ) ||
      semesterNumber < 1 ||
      semesterNumber > 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid semester.",
      });
    }

    // --------------------------------------------------
    // IA NUMBER
    // --------------------------------------------------

    const iaNumberValue =
      Number(iaNumber);

    if (
      !Number.isInteger(
        iaNumberValue
      ) ||
      iaNumberValue < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IA number.",
      });
    }

    // --------------------------------------------------
    // BATCH NUMBER
    // --------------------------------------------------

    const batchNumberValue =
      Number(batchNumber);

    if (
      !Number.isInteger(
        batchNumberValue
      ) ||
      ![1, 2].includes(
        batchNumberValue
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid batch number. Batch number must be 1 or 2.",
      });
    }

    // --------------------------------------------------
    // HOD OWN DEPARTMENT
    // --------------------------------------------------

    if (
      role === "hod" &&
      req.user.department &&
      req.user.department !==
        department
    ) {
      return res.status(403).json({
        success: false,
        message:
          "HOD can enter IA marks only for their own department.",
      });
    }

    // --------------------------------------------------
    // FIND SUBJECT
    // --------------------------------------------------

   const subject =
  await Subject.findById(
    subjectId
  ).select(
    "code name semester department"
  );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message:
          "Subject not found.",
      });
    }

    // --------------------------------------------------
    // VERIFY SUBJECT
    // --------------------------------------------------

    if (
      subject.department !==
      department
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected subject does not belong to the selected department.",
      });
    }

    if (
      Number(subject.semester) !==
      semesterNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected subject does not belong to the selected semester.",
      });
    }

  

    // --------------------------------------------------
    // CHECK EXISTING RECORD
    //
    // IMPORTANT:
    // IA1 Batch1 and IA1 Batch2 are different records.
    // IA1 and IA2 are also different records.
    // --------------------------------------------------

    const existing =
      await IAMarks.findOne({
        academicYear,
        department,
        semester:
          semesterNumber,
        subjectId,
        iaNumber:
          iaNumberValue,
        batchNumber:
          batchNumberValue,
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          `IA ${iaNumberValue} for Batch ${batchNumberValue} has already been saved and frozen.`,
        data: existing,
      });
    }

    // --------------------------------------------------
    // VALIDATE TESTS
    // --------------------------------------------------

    const testValidation =
      validateTests(tests);

    if (
      !testValidation.valid
    ) {
      return res.status(400).json({
        success: false,
        message:
          testValidation.message,
      });
    }

    // --------------------------------------------------
    // VALIDATE STUDENTS
    // --------------------------------------------------

    const studentValidation =
      await validateStudents(
        students,
        testValidation.tests,
        department,
        semesterNumber,
        batchNumberValue
      );

    if (
      !studentValidation.valid
    ) {
      return res.status(400).json({
        success: false,
        message:
          studentValidation.message,
      });
    }

    // --------------------------------------------------
    // CREATE IA RECORD
    // --------------------------------------------------

    const now =
      new Date();

    const iaMarks =
      await IAMarks.create({
        academicYear,

        department,

        semester:
          semesterNumber,

        subjectId,

        iaNumber:
          iaNumberValue,

        batchNumber:
          batchNumberValue,

        tests:
          testValidation.tests,

        totalMaxMarks:
          testValidation.totalMaxMarks,

        students:
          studentValidation.students,

        enteredBy:
          req.user.id,

        isLocked:
          true,

        lockedAt:
          now,

        lockedBy:
          req.user.id,
      });

    return res.status(201).json({
      success: true,

      message:
        `IA ${iaNumberValue} Batch ${batchNumberValue} saved and frozen successfully.`,

      data:
        iaMarks,
    });

  } catch (error) {

    console.error(
      "Save IA Marks Error:",
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "IA marks for this academic year, subject, IA number and batch already exist.",
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

export const getIAMarks = async (
  req,
  res
) => {
  try {
    const role =
      getRole(req);

    if (
      ![
        "admin",
        "principal",
        "hod",
        "staff",
      ].includes(role)
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
      iaNumber,
      batchNumber,
    } = req.query;

    // --------------------------------------------------
    // REQUIRED
    // --------------------------------------------------

    if (
      !department ||
      !semester ||
      !subjectId ||
      !academicYear ||
      iaNumber === undefined ||
      batchNumber === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, department, semester, subject, IA number and batch number are required.",
      });
    }

    // --------------------------------------------------
    // HOD RESTRICTION
    // --------------------------------------------------

    if (
      role === "hod" &&
      req.user.department &&
      req.user.department !==
        department
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only view IA marks for your own department.",
      });
    }

    // --------------------------------------------------
    // VALIDATE IDS
    // --------------------------------------------------

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

    const semesterNumber =
      Number(semester);

    const iaNumberValue =
      Number(iaNumber);

    const batchNumberValue =
      Number(batchNumber);

    if (
      !Number.isInteger(
        semesterNumber
      ) ||
      semesterNumber < 1 ||
      semesterNumber > 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid semester.",
      });
    }

    if (
      !Number.isInteger(
        iaNumberValue
      ) ||
      iaNumberValue < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IA number.",
      });
    }

    if (
      ![1, 2].includes(
        batchNumberValue
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid batch number.",
      });
    }

    // --------------------------------------------------
    // FIND
    // --------------------------------------------------

    const iaMarks =
      await IAMarks.findOne({
        academicYear,
        department,
        semester:
          semesterNumber,
        subjectId,
        iaNumber:
          iaNumberValue,
        batchNumber:
          batchNumberValue,
      })
        .populate(
          "subjectId",
          "code name semester department "
        )
        .populate(
          "students.studentId",
          "registerNumber name email department batch batchNumber imageUrl"
        )
        .lean();

    // --------------------------------------------------
    // NOT FOUND
    // --------------------------------------------------

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

export const updateIAMarks = async (
  req,
  res
) => {
  try {
    const role =
      getRole(req);

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "IA marks are frozen. Only admin can make corrections.",
      });
    }

    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IA record ID.",
      });
    }

    const {
      academicYear,
      department,
      semester,
      subjectId,
      iaNumber,
      batchNumber,
      tests,
      students,
    } = req.body;

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------

    if (
      !academicYear ||
      !department ||
      !semester ||
      !subjectId ||
      iaNumber === undefined ||
      batchNumber === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, department, semester, subject, IA number and batch number are required.",
      });
    }

    const semesterNumber =
      Number(semester);

    const iaNumberValue =
      Number(iaNumber);

    const batchNumberValue =
      Number(batchNumber);

    if (
      !Number.isInteger(
        semesterNumber
      ) ||
      semesterNumber < 1 ||
      semesterNumber > 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid semester.",
      });
    }

    if (
      !Number.isInteger(
        iaNumberValue
      ) ||
      iaNumberValue < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IA number.",
      });
    }

    if (
      ![1, 2].includes(
        batchNumberValue
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid batch number.",
      });
    }

    // --------------------------------------------------
    // EXISTING RECORD
    // --------------------------------------------------

    const existing =
      await IAMarks.findById(
        id
      );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message:
          "IA marks not found.",
      });
    }

    // --------------------------------------------------
    // SUBJECT
    // --------------------------------------------------

 const subject =
  await Subject.findById(
    subjectId
  ).select(
    "semester department"
  );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message:
          "Subject not found.",
      });
    }

    if (
      subject.department !==
      department ||
      Number(subject.semester) !==
        semesterNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject does not match the selected department and semester.",
      });
    }

 

    // --------------------------------------------------
    // VALIDATE TESTS
    // --------------------------------------------------

    const testValidation =
      validateTests(tests);

    if (
      !testValidation.valid
    ) {
      return res.status(400).json({
        success: false,
        message:
          testValidation.message,
      });
    }

    // --------------------------------------------------
    // VALIDATE STUDENTS
    // --------------------------------------------------

    const studentValidation =
      await validateStudents(
        students,
        testValidation.tests,
        department,
        semesterNumber,
        batchNumberValue
      );

    if (
      !studentValidation.valid
    ) {
      return res.status(400).json({
        success: false,
        message:
          studentValidation.message,
      });
    }

    // --------------------------------------------------
    // CHECK DUPLICATE
    //
    // Do not allow another record to have
    // the same IA + Batch combination.
    // --------------------------------------------------

    const duplicate =
      await IAMarks.findOne({
        _id: {
          $ne: id,
        },

        academicYear,

        department,

        semester:
          semesterNumber,

        subjectId,

        iaNumber:
          iaNumberValue,

        batchNumber:
          batchNumberValue,
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Another IA record already exists for this IA number and batch.",
      });
    }

    // --------------------------------------------------
    // UPDATE
    // --------------------------------------------------

    existing.academicYear =
      academicYear;

    existing.department =
      department;

    existing.semester =
      semesterNumber;

    existing.subjectId =
      subjectId;

    existing.iaNumber =
      iaNumberValue;

    existing.batchNumber =
      batchNumberValue;

    existing.tests =
      testValidation.tests;

    existing.totalMaxMarks =
      testValidation.totalMaxMarks;

    existing.students =
      studentValidation.students;

    // Keep frozen
    existing.isLocked =
      true;

    existing.lockedAt =
      new Date();

    existing.lockedBy =
      req.user.id;

    await existing.save();

    return res.status(200).json({
      success: true,
      message:
        "IA marks corrected successfully.",
      data:
        existing,
    });

  } catch (error) {

    console.error(
      "Update IA Marks Error:",
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Another IA record already exists for this IA and batch.",
      });
    }

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

export const getStudentIAMarks = async (
  req,
  res
) => {
  try {
    const role =
      getRole(req);

    if (role !== "student") {
      return res.status(403).json({
        success: false,
        message:
          "This endpoint is only for students.",
      });
    }

    // --------------------------------------------------
    // FIND STUDENT USING CLERK ID
    // --------------------------------------------------

    const student =
      await Student.findOne({
        clerkId:
          req.user.id,

        role:
          "student",
      }).select(
        "_id registerNumber name email department batch batchNumber"
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
      iaNumber,
    } = req.query;

    // --------------------------------------------------
    // QUERY
    // --------------------------------------------------

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

    if (
      iaNumber !== undefined &&
      iaNumber !== ""
    ) {
      const iaNumberValue =
        Number(iaNumber);

      if (
        !Number.isInteger(
          iaNumberValue
        ) ||
        iaNumberValue < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid IA number.",
        });
      }

      query.iaNumber =
        iaNumberValue;
    }

    // --------------------------------------------------
    // IMPORTANT:
    // STUDENT'S OWN BATCH ONLY
    // --------------------------------------------------

    query.batchNumber =
      Number(
        student.batchNumber
      );

    // --------------------------------------------------
    // FIND RECORDS
    // --------------------------------------------------

    const records =
      await IAMarks.find(
        query
      )
        .populate(
          "subjectId",
          "code name semester department"
        )
        .lean();

    // --------------------------------------------------
    // ONLY THIS STUDENT'S MARKS
    // --------------------------------------------------

    const result =
      records
        .map(
          (record) => {

            const studentRecord =
              record.students.find(
                (item) =>
                  String(
                    item.studentId
                  ) ===
                  String(
                    student._id
                  )
              );

            if (!studentRecord) {
              return null;
            }

            return {
              _id:
                record._id,

              academicYear:
                record.academicYear,

              department:
                record.department,

              semester:
                record.semester,

              subject:
                record.subjectId,

              iaNumber:
                record.iaNumber,

              batchNumber:
                record.batchNumber,

              tests:
                studentRecord.tests,

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
        )
        .filter(Boolean);

    return res.status(200).json({
      success: true,
      data:
        result,
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