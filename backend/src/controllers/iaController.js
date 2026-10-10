import mongoose from "mongoose";
import IAMarks from "../models/IAMarks.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";
import { getAllocationError } from "./courseAllocationController.js";

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

const LATERAL_ADMISSION_TYPES = [
  "lateralPUC",
  "lateralITI",
  "lateralCross",
];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getRole = (req) => {
  return req.user?.role?.toLowerCase();
};

const normalizeDepartment = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const normalizeSubjectCategory = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const isLateralStudent = (admissionType) => {
  return LATERAL_ADMISSION_TYPES.includes(
    String(admissionType || "").trim()
  );
};

const getCOTotal = (coMarks = {}) => {
  return CO_NAMES.reduce(
    (total, co) =>
      total + Number(coMarks[co] || 0),
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
  batchNumber,
  subjectCategory
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

  // --------------------------------------------------
  // NORMALIZE VALUES
  // --------------------------------------------------

  const requestedDepartment =
    normalizeDepartment(department);

  const normalizedSubjectCategory =
    normalizeSubjectCategory(subjectCategory);

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

  const studentIds = students.map(
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

  const validObjectIds = students
    .map(
      (student) =>
        student.studentId
    )
    .filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
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
      "_id department batchNumber admissionType"
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
  // VERIFY EVERY STUDENT
  // --------------------------------------------------

  for (const dbStudent of existingStudents) {
    // ------------------------------------------------
    // DEPARTMENT
    // ------------------------------------------------

    if (
      normalizeDepartment(
        dbStudent.department
      ) !== requestedDepartment
    ) {
      return {
        valid: false,
        message:
          "One or more students do not belong to the selected department.",
      };
    }

    // ------------------------------------------------
    // BATCH
    // ------------------------------------------------

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

    // ------------------------------------------------
    // BRIDGE COURSE
    // ------------------------------------------------
    //
    // Bridge courses are ONLY for:
    //
    // lateralPUC
    // lateralITI
    // lateralCross
    //
    // Regular students cannot receive
    // bridge course IA marks.
    // ------------------------------------------------

    if (
      normalizedSubjectCategory ===
      "BRIDGE"
    ) {
      if (
        !isLateralStudent(
          dbStudent.admissionType
        )
      ) {
        return {
          valid: false,
          message:
            "Bridge course IA marks can only be entered for lateral students.",
        };
      }
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
      ![
        "staff",
        "hod",
        "admin",
      ].includes(role)
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
    // NORMALIZE DEPARTMENT
    // --------------------------------------------------

    const requestedDepartment =
      normalizeDepartment(
        department
      );

    if (!requestedDepartment) {
      return res.status(400).json({
        success: false,
        message:
          "Department is required.",
      });
    }

    // --------------------------------------------------
    // HOD OWN DEPARTMENT
    // --------------------------------------------------

    if (role === "hod") {
      const hodDepartment =
        normalizeDepartment(
          req.user?.department
        );

      if (
        !hodDepartment ||
        hodDepartment !==
          requestedDepartment
      ) {
        return res.status(403).json({
          success: false,
          message:
            "HOD can enter IA marks only for their own department.",
        });
      }
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
    // FIND SUBJECT
    // --------------------------------------------------

    const subject =
      await Subject.findById(
        subjectId
      ).select(
        "code name semester department subjectCategory"
      );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message:
          "Subject not found.",
      });
    }

    // --------------------------------------------------
    // VERIFY SUBJECT DEPARTMENT
    // --------------------------------------------------

    const subjectDepartment =
      normalizeDepartment(
        subject.department
      );

    if (
      subjectDepartment !==
      requestedDepartment
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected subject does not belong to the selected department.",
      });
    }

    // --------------------------------------------------
    // VERIFY SUBJECT SEMESTER
    // --------------------------------------------------

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
    // SUBJECT CATEGORY
    // --------------------------------------------------

    const subjectCategory =
      normalizeSubjectCategory(
        subject.subjectCategory
      );

    // --------------------------------------------------
    // COURSE ALLOCATION
    // --------------------------------------------------

    const allocationError =
      await getAllocationError({
        user: req.user,
        subjectId,
        academicYear,
        batchNumbers: [batchNumberValue],
      });

    if (allocationError) {
      return res.status(403).json({
        success: false,
        message: allocationError,
      });
    }

    // --------------------------------------------------
    // CHECK EXISTING RECORD
    //
    // IA1 Batch1 and IA1 Batch2 are different.
    // IA1 and IA2 are also different.
    // --------------------------------------------------

    const existing =
      await IAMarks.findOne({
        academicYear,
        department:
          requestedDepartment,
        semester:
          semesterNumber,
        subjectId,
        iaNumber:
          iaNumberValue,
        batchNumber:
          batchNumberValue,
      });

    // A record unlocked by the HOD (isLocked === false)
    // can be corrected and is frozen again below.

    if (existing && existing.isLocked !== false) {
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
    batchNumberValue,
    subject.subjectCategory
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

    // --------------------------------------------------
    // CORRECT AN UNLOCKED IA RECORD
    // --------------------------------------------------

    if (existing) {
      const corrected =
        await IAMarks.findOneAndUpdate(
          {
            _id: existing._id,
            isLocked: false,
          },
          {
            $set: {
              tests:
                testValidation.tests,
              totalMaxMarks:
                testValidation.totalMaxMarks,
              students:
                studentValidation.students,
              isLocked: true,
              lockedAt: now,
              lockedBy: req.user.id,
              correctedBy: req.user.id,
            },
          },
          {
            returnDocument: "after",
            runValidators: true,
          }
        );

      if (!corrected) {
        return res.status(409).json({
          success: false,
          message:
            `IA ${iaNumberValue} for Batch ${batchNumberValue} has already been saved and frozen.`,
        });
      }

      return res.status(200).json({
        success: true,
        message:
          `IA ${iaNumberValue} Batch ${batchNumberValue} corrected and frozen successfully.`,
        data: corrected,
      });
    }

    const iaMarks =
      await IAMarks.create({
        academicYear,

        department:
          requestedDepartment,

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
// UNLOCK IA MARKS FOR CORRECTION
//
// HOD (own department) or Admin.
//
// The record is kept as it is. The faculty can then
// correct it and save again, which freezes it again.
// ==================================================

export const unlockIAMarks = async (
  req,
  res
) => {
  try {
    const role =
      getRole(req);

    if (
      !["hod", "admin"].includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only HOD or Admin can unlock IA marks.",
      });
    }

    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IA record ID.",
      });
    }

    const filter = {
      _id: id,
    };

    if (role === "hod") {
      const hodDepartment =
        normalizeDepartment(
          req.user?.department
        );

      if (!hodDepartment) {
        return res.status(403).json({
          success: false,
          message:
            "HOD department is not assigned.",
        });
      }

      filter.department =
        hodDepartment;
    }

    const iaMarks =
      await IAMarks.findOneAndUpdate(
        filter,
        {
          $set: {
            isLocked: false,
            unlockedAt: new Date(),
            unlockedBy: req.user.id,
          },
        },
        {
          returnDocument: "after",
        }
      ).select(
        "iaNumber batchNumber isLocked"
      );

    if (!iaMarks) {
      return res.status(404).json({
        success: false,
        message:
          "IA record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        `IA ${iaMarks.iaNumber} Batch ${iaMarks.batchNumber} unlocked. The faculty can now correct and save it again.`,
      data: iaMarks,
    });
  } catch (error) {
    console.error(
      "Unlock IA Marks Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to unlock IA marks.",
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

    const requestedDepartment =
      normalizeDepartment(
        department
      );

    // --------------------------------------------------
    // HOD RESTRICTION
    // --------------------------------------------------

    if (role === "hod") {
      const hodDepartment =
        normalizeDepartment(
          req.user?.department
        );

      if (
        !hodDepartment ||
        hodDepartment !==
          requestedDepartment
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only view IA marks for your own department.",
        });
      }
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
        department:
          requestedDepartment,
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
          "code name semester department subjectCategory"
        )
        .populate(
          "students.studentId",
          "registerNumber name email department batch batchNumber admissionType imageUrl"
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

    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
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
          "code name semester department subjectCategory"
        )
        .populate(
          "students.studentId",
          "registerNumber name email department batch batchNumber admissionType imageUrl"
        )
        .lean();

    if (!iaMarks) {
      return res.status(404).json({
        success: false,
        message:
          "IA marks not found.",
      });
    }

    // --------------------------------------------------
    // HOD RESTRICTION
    // --------------------------------------------------

    if (role === "hod") {
      const hodDepartment =
        normalizeDepartment(
          req.user?.department
        );

      const recordDepartment =
        normalizeDepartment(
          iaMarks.department
        );

      if (
        !hodDepartment ||
        hodDepartment !==
          recordDepartment
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only view IA marks for your own department.",
        });
      }
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
      !mongoose.Types.ObjectId.isValid(id)
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

    const requestedDepartment =
      normalizeDepartment(
        department
      );

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
          "Invalid batch number.",
      });
    }

    // --------------------------------------------------
    // EXISTING RECORD
    // --------------------------------------------------

    const existing =
      await IAMarks.findById(id);

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
        "code name semester department subjectCategory"
      );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message:
          "Subject not found.",
      });
    }

    // --------------------------------------------------
    // VERIFY SUBJECT DEPARTMENT
    // --------------------------------------------------

    const subjectDepartment =
      normalizeDepartment(
        subject.department
      );

    if (
      subjectDepartment !==
      requestedDepartment
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject does not match the selected department.",
      });
    }

    // --------------------------------------------------
    // VERIFY SUBJECT SEMESTER
    // --------------------------------------------------

    if (
      Number(subject.semester) !==
      semesterNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject does not match the selected semester.",
      });
    }

    // --------------------------------------------------
    // SUBJECT CATEGORY
    // --------------------------------------------------

    const subjectCategory =
      normalizeSubjectCategory(
        subject.subjectCategory
      );

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
    //
    // This also checks:
    // Regular student + BRIDGE = rejected
    // Lateral student + BRIDGE = allowed
    // --------------------------------------------------

    const studentValidation =
      await validateStudents(
        students,
        testValidation.tests,
        requestedDepartment,
        semesterNumber,
        batchNumberValue,
        subjectCategory
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
    // Do not allow another record with the
    // same academic year + subject + IA + batch.
    // --------------------------------------------------

    const duplicate =
      await IAMarks.findOne({
        _id: {
          $ne: id,
        },

        academicYear,

        department:
          requestedDepartment,

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
      requestedDepartment;

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

    // --------------------------------------------------
    // KEEP FROZEN
    // --------------------------------------------------

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
    const role =
      getRole(req);

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only admin can delete frozen IA marks.",
      });
    }

    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid IA record ID.",
      });
    }

    const iaMarks =
      await IAMarks.findByIdAndDelete(
        id
      );

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
        "_id registerNumber name email department batch batchNumber admissionType"
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
          "code name semester department subjectCategory"
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

// ============================================================
// ADMIN IA MONITORING STATUS
// ============================================================
// Returns one matrix-friendly dataset for Admin.
//
// Filters:
// academicYear
// department = all OR department code
// semesterType = all / odd / even
// iaNumber
//
// Odd  -> 1, 3, 5
// Even -> 2, 4, 6
//
// Batch 1 and Batch 2 are checked independently.
// ============================================================

export const getAdminIAStatus = async (req, res) => {
  try {
    const role = getRole(req);

    // --------------------------------------------------------
    // ADMIN ONLY
    // --------------------------------------------------------

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only admin can view the IA monitoring status.",
      });
    }

   



const {
  academicYear,
  department = "all",
  semester = "all",
  semesterType = "all",
  iaNumber,
} = req.query;

if (!academicYear) {
  return res.status(400).json({
    success: false,
    message: "Academic year is required.",
  });
}

if (
  iaNumber === undefined ||
  iaNumber === null ||
  iaNumber === ""
) {
  return res.status(400).json({
    success: false,
    message: "IA number is required.",
  });
}

const iaNumberValue = Number(iaNumber);

if (
  !Number.isInteger(iaNumberValue) ||
  iaNumberValue < 1
) {
  return res.status(400).json({
    success: false,
    message: "Invalid IA number.",
  });
}

const requestedDepartment = String(
  department || "all"
)
  .trim()
  .toLowerCase();

const requestedSemester = String(
  semester || "all"
)
  .trim()
  .toLowerCase();

const requestedSemesterType = String(
  semesterType || "all"
)
  .trim()
  .toLowerCase();


// =====================================================
// SEMESTER FILTER
// =====================================================

let semesterNumbers = [1, 2, 3, 4, 5, 6];


// If exact semester is selected
if (requestedSemester !== "all") {
  const semesterValue = Number(requestedSemester);

  if (
    !Number.isInteger(semesterValue) ||
    semesterValue < 1 ||
    semesterValue > 6
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid semester.",
    });
  }

  semesterNumbers = [semesterValue];
}


// If semester is All, optionally use Odd/Even
else {
  if (requestedSemesterType === "odd") {
    semesterNumbers = [1, 3, 5];
  } else if (requestedSemesterType === "even") {
    semesterNumbers = [2, 4, 6];
  } else if (requestedSemesterType === "all") {
    semesterNumbers = [1, 2, 3, 4, 5, 6];
  } else {
    return res.status(400).json({
      success: false,
      message:
        "Semester type must be all, odd or even.",
    });
  }
}
    // --------------------------------------------------------
    // SUBJECT QUERY
    // --------------------------------------------------------

const subjectQuery = {
  semester: { $in: semesterNumbers },
};

if (requestedDepartment !== "all") {
  subjectQuery.department =
    requestedDepartment.toUpperCase();
}

    // --------------------------------------------------------
    // GET SUBJECTS
    // --------------------------------------------------------

    const subjects =
      await Subject.find(subjectQuery)
        .select(
          "_id code subjectId name sequence semester department subjectCategory electiveGroup"
        )
        .sort({
          department: 1,
          semester: 1,
          sequence: 1,
          code: 1,
        })
        .lean();

    // --------------------------------------------------------
    // IA QUERY
    // --------------------------------------------------------
const iaQuery = {
  academicYear,
  iaNumber: iaNumberValue,
  semester: { $in: semesterNumbers },
};

if (requestedDepartment !== "all") {
  iaQuery.department = requestedDepartment;
}

    // --------------------------------------------------------
    // GET ALL MATCHING IA RECORDS
    // --------------------------------------------------------

    const iaRecords =
      await IAMarks.find(iaQuery)
        .select(
          "_id department semester subjectId batchNumber isLocked createdAt"
        )
        .lean();

    // --------------------------------------------------------
    // FAST LOOKUP
    // --------------------------------------------------------

    const statusMap = new Map();

    iaRecords.forEach((record) => {
      const key =
        `${String(record.subjectId)}_${Number(
          record.batchNumber
        )}`;

      statusMap.set(key, record);
    });

    // --------------------------------------------------------
    // BUILD SUBJECT INFORMATION
    // --------------------------------------------------------

    const subjectMap = new Map();

    subjects.forEach((subject) => {
      const subjectId =
        String(subject._id);

      subjectMap.set(subjectId, {
        subjectId:
          subject._id,

        code:
          subject.code || "",

        subjectIdCode:
          subject.subjectId || "",

        name:
          subject.name || "",

        sequence:
          subject.sequence || "",

        semester:
          Number(subject.semester),

        department:
          String(
            subject.department || ""
          )
            .trim()
            .toLowerCase(),

        subjectCategory:
          String(
            subject.subjectCategory ||
              "REGULAR"
          ).toUpperCase(),

        electiveGroup:
          subject.electiveGroup || null,
      });
    });

    // --------------------------------------------------------
    // BUILD MATRIX ROWS
    // --------------------------------------------------------
    //
    // One row = Department + Semester.
    //
    // subjects = only subjects belonging to that
    // department + semester.
    //
    // --------------------------------------------------------

    const rowMap = new Map();

    subjects.forEach((subject) => {
      const dept =
        String(
          subject.department || ""
        )
          .trim()
          .toLowerCase();

      const sem =
        Number(subject.semester);

      const rowKey =
        `${dept}_${sem}`;

      if (!rowMap.has(rowKey)) {
        rowMap.set(rowKey, {
          department: dept,

          departmentLabel:
            dept.toUpperCase(),

          semester: sem,

          subjects: [],
        });
      }

      const batch1Record =
        statusMap.get(
          `${String(subject._id)}_1`
        );

      const batch2Record =
        statusMap.get(
          `${String(subject._id)}_2`
        );

      rowMap.get(rowKey).subjects.push({
        subjectId:
          subject._id,

        code:
          subject.code || "",

        name:
          subject.name || "",

        sequence:
          subject.sequence || "",

        subjectCategory:
          String(
            subject.subjectCategory ||
              "REGULAR"
          ).toUpperCase(),

        batch1: {
          entered:
            Boolean(batch1Record),

          recordId:
            batch1Record?._id ||
            null,

          locked:
            batch1Record
              ? Boolean(
                  batch1Record.isLocked
                )
              : false,
        },

        batch2: {
          entered:
            Boolean(batch2Record),

          recordId:
            batch2Record?._id ||
            null,

          locked:
            batch2Record
              ? Boolean(
                  batch2Record.isLocked
                )
              : false,
        },
      });
    });

    // --------------------------------------------------------
    // SORT SUBJECTS INSIDE EACH ROW
    // --------------------------------------------------------

    rowMap.forEach((row) => {
      row.subjects.sort((a, b) => {
        const sequenceCompare =
          String(
            a.sequence || ""
          ).localeCompare(
            String(
              b.sequence || ""
            ),
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          );

        if (sequenceCompare !== 0) {
          return sequenceCompare;
        }

        return String(
          a.code || ""
        ).localeCompare(
          String(
            b.code || ""
          )
        );
      });
    });

    // --------------------------------------------------------
    // FINAL ROW ORDER
    // --------------------------------------------------------

    const rows =
      Array.from(
        rowMap.values()
      ).sort((a, b) => {
        const deptCompare =
          a.department.localeCompare(
            b.department
          );

        if (deptCompare !== 0) {
          return deptCompare;
        }

        return (
          a.semester -
          b.semester
        );
      });

    // --------------------------------------------------------
    // SUMMARY
    // --------------------------------------------------------

    let totalSubjects = 0;
    let batch1Entered = 0;
    let batch2Entered = 0;

    rows.forEach((row) => {
      row.subjects.forEach(
        (subject) => {
          totalSubjects += 1;

          if (
            subject.batch1.entered
          ) {
            batch1Entered += 1;
          }

          if (
            subject.batch2.entered
          ) {
            batch2Entered += 1;
          }
        }
      );
    });

    const totalPossible =
      totalSubjects * 2;

    const totalEntered =
      batch1Entered +
      batch2Entered;

    const percentage =
      totalPossible > 0
        ? Number(
            (
              (totalEntered /
                totalPossible) *
              100
            ).toFixed(1)
          )
        : 0;

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      filters: {
        academicYear,

        department:
          requestedDepartment,

        semesterType:
          requestedSemesterType,

        semesters:
          semesterNumbers,

        iaNumber:
          iaNumberValue,
      },

      summary: {
        totalRows:
          rows.length,

        totalSubjects,

        batch1Entered,

        batch2Entered,

        totalEntered,

        totalPossible,

        percentage,
      },

      rows,
    });
  } catch (error) {
    console.error(
      "Get Admin IA Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch admin IA monitoring status.",
    });
  }
};