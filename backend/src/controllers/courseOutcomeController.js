import mongoose from "mongoose";
import CourseOutcome from "../models/CourseOutcome.js";
import Program from "../models/Program.js";
import Subject from "../models/Subject.js";
import { getAllocationError } from "./courseAllocationController.js";
import {
  PROGRAM_OUTCOMES,
  MAX_PSOS,
  MAX_COS,
  BLOOM_LEVELS,
} from "../config/programOutcomes.js";

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const VIEW_ROLES = [
  "staff",
  "hod",
  "admin",
  "principal",
];

const DEFAULT_TARGETS = {
  marksPercent: 60,
  level1: 50,
  level2: 60,
  level3: 70,
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getRole = (req) => {
  return String(req.user?.role || "")
    .trim()
    .toLowerCase();
};

const normalizeDepartment = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const isAcademicYear = (value) => {
  return /^\d{4}-\d{2}$/.test(
    String(value || "")
  );
};

const getPsos = async (department) => {
  const program = await Program.findOne({
    department,
  })
    .select("psos")
    .lean();

  return program?.psos || [];
};

// --------------------------------------------------
// CAN THE USER EDIT THE COs OF THIS SUBJECT?
//
// Admin                 -> yes
// HOD                   -> own department
// Faculty               -> allocated to the subject, or
//                          the subject is not allocated
//                          to anyone yet
//
// Returns an error message, or null when allowed.
// --------------------------------------------------

const getEditError = async (
  req,
  subject,
  academicYear
) => {
  const role = getRole(req);

  if (role === "admin") {
    return null;
  }

  if (role === "hod") {
    return normalizeDepartment(
      req.user?.department
    ) === normalizeDepartment(subject.department)
      ? null
      : "HOD can edit course outcomes only for their own department.";
  }

  if (role === "staff") {
    return getAllocationError({
      user: req.user,
      subjectId: subject._id,
      academicYear,
      batchNumbers: [],
    });
  }

  return "You are not authorized to edit course outcomes.";
};

// --------------------------------------------------
// VALIDATE COURSE OUTCOMES
// --------------------------------------------------

const validateCOs = (cos, allowedOutcomes) => {
  if (
    !Array.isArray(cos) ||
    cos.length === 0
  ) {
    return {
      valid: false,
      message:
        "At least one course outcome is required.",
    };
  }

  if (cos.length > MAX_COS) {
    return {
      valid: false,
      message:
        `A subject can have at most ${MAX_COS} course outcomes.`,
    };
  }

  const cleaned = [];

  for (let i = 0; i < cos.length; i++) {
    const co = cos[i] || {};

    const code = `CO${i + 1}`;

    const statement = String(
      co.statement || ""
    ).trim();

    if (!statement) {
      return {
        valid: false,
        message: `${code}: Statement is required.`,
      };
    }

    if (statement.length > 1000) {
      return {
        valid: false,
        message: `${code}: Statement is too long.`,
      };
    }

    if (!BLOOM_LEVELS.includes(co.bloomLevel)) {
      return {
        valid: false,
        message:
          `${code}: Please select the Bloom's level.`,
      };
    }

    const mapping = {};

    for (const [outcome, rawValue] of Object.entries(
      co.mapping || {}
    )) {
      // Outcomes that no longer exist
      // (for example a removed PSO) are dropped.
      if (!allowedOutcomes.includes(outcome)) {
        continue;
      }

      const value = Number(rawValue);

      if (!value) {
        continue;
      }

      if (![1, 2, 3].includes(value)) {
        return {
          valid: false,
          message:
            `${code}: Mapping with ${outcome} must be 1, 2 or 3.`,
        };
      }

      mapping[outcome] = value;
    }

    cleaned.push({
      code,
      statement,
      bloomLevel: co.bloomLevel,
      mapping,
      justification: String(
        co.justification || ""
      )
        .trim()
        .slice(0, 2000),
    });
  }

  return {
    valid: true,
    cos: cleaned,
  };
};

// --------------------------------------------------
// VALIDATE ATTAINMENT TARGETS
// --------------------------------------------------

const validateTargets = (targets = {}) => {
  const cleaned = {};

  for (const key of Object.keys(DEFAULT_TARGETS)) {
    const value =
      targets[key] === undefined ||
      targets[key] === null ||
      targets[key] === ""
        ? DEFAULT_TARGETS[key]
        : Number(targets[key]);

    if (
      !Number.isFinite(value) ||
      value < 1 ||
      value > 100
    ) {
      return {
        valid: false,
        message:
          "Attainment targets must be between 1 and 100.",
      };
    }

    cleaned[key] = value;
  }

  if (
    cleaned.level1 > cleaned.level2 ||
    cleaned.level2 > cleaned.level3
  ) {
    return {
      valid: false,
      message:
        "Level 1 target cannot be higher than Level 2, and Level 2 cannot be higher than Level 3.",
    };
  }

  return {
    valid: true,
    targets: cleaned,
  };
};

// ==================================================
// GET COURSE OUTCOMES OF A SUBJECT
//
// When nothing is saved for the academic year, the
// most recent earlier record is returned as a
// template so that it need not be typed again.
// ==================================================

export const getCourseOutcomes = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (!VIEW_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view course outcomes.",
      });
    }

    const {
      subjectId,
      academicYear,
    } = req.query;

    if (
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !isAcademicYear(academicYear)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject and academic year are required.",
      });
    }

    const subject = await Subject.findById(
      subjectId
    )
      .select(
        "code name semester department subjectCategory"
      )
      .lean();

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    const subjectDepartment =
      normalizeDepartment(subject.department);

    if (
      role === "hod" &&
      normalizeDepartment(req.user?.department) !==
        subjectDepartment
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can only view course outcomes of your own department.",
      });
    }

    const [record, psos, editError] =
      await Promise.all([
        CourseOutcome.findOne({
          subjectId,
          academicYear,
        }).lean(),

        getPsos(subjectDepartment),

        getEditError(
          req,
          subject,
          academicYear
        ),
      ]);

    let template = null;

    if (!record) {
      template = await CourseOutcome.findOne({
        subjectId,
      })
        .sort({
          academicYear: -1,
        })
        .select("academicYear cos targets")
        .lean();
    }

    return res.status(200).json({
      success: true,
      data: record,
      template,
      subject,
      pos: PROGRAM_OUTCOMES,
      psos,
      defaultTargets: DEFAULT_TARGETS,
      canEdit: !editError,
      editMessage: editError,
    });
  } catch (error) {
    console.error(
      "Get Course Outcomes Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch course outcomes.",
    });
  }
};

// ==================================================
// SAVE COURSE OUTCOMES OF A SUBJECT
// ==================================================

export const saveCourseOutcomes = async (
  req,
  res
) => {
  try {
    const {
      subjectId,
      academicYear,
      cos,
      targets,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !isAcademicYear(academicYear)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject and academic year are required.",
      });
    }

    const subject = await Subject.findById(
      subjectId
    )
      .select("code name semester department")
      .lean();

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    const editError = await getEditError(
      req,
      subject,
      academicYear
    );

    if (editError) {
      return res.status(403).json({
        success: false,
        message: editError,
      });
    }

    const subjectDepartment =
      normalizeDepartment(subject.department);

    const psos = await getPsos(
      subjectDepartment
    );

    const allowedOutcomes = [
      ...PROGRAM_OUTCOMES.map((po) => po.code),
      ...psos.map((pso) => pso.code),
    ];

    const coValidation = validateCOs(
      cos,
      allowedOutcomes
    );

    if (!coValidation.valid) {
      return res.status(400).json({
        success: false,
        message: coValidation.message,
      });
    }

    const targetValidation =
      validateTargets(targets);

    if (!targetValidation.valid) {
      return res.status(400).json({
        success: false,
        message: targetValidation.message,
      });
    }

    const record =
      await CourseOutcome.findOneAndUpdate(
        {
          subjectId,
          academicYear,
        },
        {
          $set: {
            department: subjectDepartment,
            semester: subject.semester,
            cos: coValidation.cos,
            targets: targetValidation.targets,
            updatedBy: req.user.id,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        `Course outcomes of ${subject.code} saved.`,
      data: record,
    });
  } catch (error) {
    console.error(
      "Save Course Outcomes Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to save course outcomes.",
    });
  }
};

// ==================================================
// COURSE OUTCOME STATUS OF A SEMESTER
//
// Which subjects have their COs defined.
// HOD (own department) / Admin / Principal
// ==================================================

export const getCourseOutcomeStatus = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (
      !["hod", "admin", "principal"].includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view this.",
      });
    }

    const {
      academicYear,
      department,
      semester,
    } = req.query;

    if (!isAcademicYear(academicYear)) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year is required.",
      });
    }

    const filter = {
      academicYear,
    };

    if (role === "hod") {
      filter.department =
        normalizeDepartment(
          req.user?.department
        );
    } else if (department) {
      filter.department =
        normalizeDepartment(department);
    }

    if (semester) {
      filter.semester = Number(semester);
    }

    const records = await CourseOutcome.find(
      filter
    )
      .select("subjectId cos.code updatedAt")
      .lean();

    return res.status(200).json({
      success: true,
      data: records.map((record) => ({
        subjectId: record.subjectId,
        coCount: record.cos?.length || 0,
        updatedAt: record.updatedAt,
      })),
    });
  } catch (error) {
    console.error(
      "Get Course Outcome Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch course outcome status.",
    });
  }
};

// ==================================================
// GET PROGRAM OUTCOMES OF A DEPARTMENT
//
// POs (common) + PSOs (department)
// ==================================================

export const getProgram = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (!VIEW_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view program outcomes.",
      });
    }

    const department = normalizeDepartment(
      req.params.department
    );

    const program = await Program.findOne({
      department,
    }).lean();

    return res.status(200).json({
      success: true,
      data: {
        department,
        pos: PROGRAM_OUTCOMES,
        psos: program?.psos || [],
        updatedAt: program?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error(
      "Get Program Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch program outcomes.",
    });
  }
};

// ==================================================
// SAVE PSOs OF A DEPARTMENT
//
// HOD (own department) / Admin
// ==================================================

export const saveProgram = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    const department = normalizeDepartment(
      req.params.department
    );

    if (!["hod", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only HOD or Admin can edit program specific outcomes.",
      });
    }

    if (
      !department ||
      (role === "hod" &&
        normalizeDepartment(
          req.user?.department
        ) !== department)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "HOD can edit program specific outcomes only for their own department.",
      });
    }

    const { psos } = req.body;

    if (
      !Array.isArray(psos) ||
      psos.length > MAX_PSOS
    ) {
      return res.status(400).json({
        success: false,
        message:
          `A program can have at most ${MAX_PSOS} PSOs.`,
      });
    }

    const cleaned = [];

    for (let i = 0; i < psos.length; i++) {
      const statement = String(
        psos[i]?.statement || ""
      ).trim();

      if (!statement) {
        return res.status(400).json({
          success: false,
          message:
            `PSO${i + 1}: Statement is required.`,
        });
      }

      cleaned.push({
        code: `PSO${i + 1}`,
        statement: statement.slice(0, 1000),
      });
    }

    const program =
      await Program.findOneAndUpdate(
        {
          department,
        },
        {
          $set: {
            psos: cleaned,
            updatedBy: req.user.id,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Program specific outcomes saved.",
      data: program,
    });
  } catch (error) {
    console.error(
      "Save Program Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to save program specific outcomes.",
    });
  }
};
