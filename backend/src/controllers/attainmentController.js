import mongoose from "mongoose";
import IAMarks from "../models/IAMarks.js";
import Subject from "../models/Subject.js";
import CourseOutcome from "../models/CourseOutcome.js";
// Registers the Student model, used when filling in student details
import "../models/Student.js";

// ==========================================================
// CO ATTAINMENT FROM IA MARKS
//
// For every test of an IA, each CO that carries marks is
// one column (like one question in the NBA sheet).
//
// For each column:
//
//   students counted   students present for that test
//   above threshold    students who scored at least the
//                      threshold percentage of the CO marks
//   percentage         above threshold / students counted
//   level              3, 2, 1 or 0 by the targets
//
// CO attainment = average of the levels of all the
// columns of that CO.
//
// Threshold and level targets are the ones the faculty
// saved with the subject's course outcomes. Defaults are
// used when none are saved.
// ==========================================================

const CO_NAMES = [
  "CO1",
  "CO2",
  "CO3",
  "CO4",
  "CO5",
  "CO6",
];

const DEFAULT_TARGETS = {
  marksPercent: 60,
  level1: 50,
  level2: 60,
  level3: 70,
};

const VIEW_ROLES = [
  "staff",
  "hod",
  "admin",
  "principal",
];

const round2 = (value) =>
  Math.round(value * 100) / 100;

const getRole = (req) =>
  String(req.user?.role || "")
    .trim()
    .toLowerCase();

const normalizeDepartment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isAcademicYear = (value) =>
  /^\d{4}-\d{2}$/.test(String(value || ""));

const getLevel = (percentage, targets) => {
  if (percentage === null) {
    return null;
  }

  if (percentage >= targets.level3) return 3;
  if (percentage >= targets.level2) return 2;
  if (percentage >= targets.level1) return 1;

  return 0;
};

const average = (values) => {
  const numbers = values.filter(
    (value) => value !== null && value !== undefined
  );

  return numbers.length > 0
    ? round2(
        numbers.reduce((a, b) => a + b, 0) /
          numbers.length
      )
    : null;
};

// --------------------------------------------------
// TARGETS OF A SUBJECT FOR THE YEAR
// --------------------------------------------------

const getTargetsBySubject = async (
  subjectIds,
  academicYear
) => {
  const records = await CourseOutcome.find({
    academicYear,
    subjectId: { $in: subjectIds },
  })
    .select("subjectId targets cos.code cos.statement")
    .lean();

  return new Map(
    records.map((record) => [
      String(record.subjectId),
      {
        targets: {
          ...DEFAULT_TARGETS,
          ...(record.targets || {}),
        },
        cos: (record.cos || []).map((co) => ({
          code: co.code,
          statement: co.statement,
        })),
        saved: true,
      },
    ])
  );
};

// ==================================================
// ATTAINMENT OF ONE SUBJECT
//
// records: the IA records of the subject (one per
// IA per batch). Batches are combined.
// ==================================================

export const computeSubjectAttainment = (
  records,
  targets
) => {
  // ---------------------------------------------------
  // COLUMNS: IA -> test -> CO with marks
  //
  // Batch 1 and Batch 2 of the same IA are expected to
  // have the same tests; a column is identified by IA
  // number, test name and CO.
  // ---------------------------------------------------

  const columns = [];
  const columnIndex = new Map();

  const sortedRecords = [...records].sort(
    (a, b) =>
      a.iaNumber - b.iaNumber ||
      a.batchNumber - b.batchNumber
  );

  sortedRecords.forEach((record) => {
    (record.tests || []).forEach((test) => {
      CO_NAMES.forEach((co) => {
        const max = Number(test.coMarks?.[co] || 0);

        if (max <= 0) {
          return;
        }

        const key = `${record.iaNumber}|${test.testName}|${co}`;

        if (!columnIndex.has(key)) {
          columnIndex.set(key, columns.length);

          columns.push({
            key,
            iaNumber: record.iaNumber,
            testName: test.testName,
            co,
            max,
          });
        }
      });
    });
  });

  // ---------------------------------------------------
  // STUDENTS: one row each, marks per column
  // null = not part of that IA / batch
  // "AB" = absent for that test
  // ---------------------------------------------------

  const studentRows = new Map();

  sortedRecords.forEach((record) => {
    (record.students || []).forEach((entry) => {
      const student = entry.studentId;

      if (!student) {
        return;
      }

      const id = String(student._id || student);

      if (!studentRows.has(id)) {
        studentRows.set(id, {
          registerNumber: student.registerNumber || "",
          rollNumber: student.rollNumber || "",
          name: student.name || "",
          batchNumber: record.batchNumber,
          marks: columns.map(() => null),
        });
      }

      const row = studentRows.get(id);

      (record.tests || []).forEach(
        (test, testIndex) => {
          const studentTest =
            entry.tests?.[testIndex] || {};

          CO_NAMES.forEach((co) => {
            const index = columnIndex.get(
              `${record.iaNumber}|${test.testName}|${co}`
            );

            if (index === undefined) {
              return;
            }

            row.marks[index] =
              studentTest.status === "ABSENT"
                ? "AB"
                : Number(
                    studentTest.coMarks?.[co] || 0
                  );
          });
        }
      );
    });
  });

  const students = [...studentRows.values()].sort(
    (a, b) =>
      String(a.rollNumber).localeCompare(
        String(b.rollNumber),
        undefined,
        { numeric: true }
      ) ||
      a.registerNumber.localeCompare(b.registerNumber)
  );

  // ---------------------------------------------------
  // EACH COLUMN
  // ---------------------------------------------------

  const columnResults = columns.map(
    (column, index) => {
      const threshold = round2(
        (column.max * targets.marksPercent) / 100
      );

      let counted = 0;
      let aboveThreshold = 0;

      students.forEach((student) => {
        const value = student.marks[index];

        if (value === null || value === "AB") {
          return;
        }

        counted += 1;

        if (value >= threshold) {
          aboveThreshold += 1;
        }
      });

      const percentage =
        counted > 0
          ? round2((aboveThreshold / counted) * 100)
          : null;

      return {
        ...column,
        threshold,
        counted,
        aboveThreshold,
        percentage,
        level: getLevel(percentage, targets),
      };
    }
  );

  // ---------------------------------------------------
  // EACH CO
  // ---------------------------------------------------

  const coResults = CO_NAMES.map((co) => {
    const coColumns = columnResults.filter(
      (column) => column.co === co
    );

    return {
      co,
      columns: coColumns.length,
      level: average(
        coColumns.map((column) => column.level)
      ),
    };
  }).filter((result) => result.columns > 0);

  return {
    columns: columnResults,
    students,
    cos: coResults,
  };
};

// --------------------------------------------------
// WHO MAY SEE A DEPARTMENT'S ATTAINMENT
// --------------------------------------------------

const getAccessError = (req, department) => {
  const role = getRole(req);

  if (!VIEW_ROLES.includes(role)) {
    return "You are not authorized to view CO attainment.";
  }

  if (
    role === "hod" &&
    normalizeDepartment(req.user?.department) !==
      normalizeDepartment(department)
  ) {
    return "You can only view the CO attainment of your own department.";
  }

  return null;
};

// ==================================================
// SUBJECT ATTAINMENT
//
// GET /api/attainment/subject
//   ?subjectId&academicYear[&iaNumber]
//
// Without iaNumber: all IAs of the year together.
// ==================================================

export const getSubjectAttainment = async (
  req,
  res
) => {
  try {
    const {
      subjectId,
      academicYear,
      iaNumber,
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

    const subject = await Subject.findById(subjectId)
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

    const accessError = getAccessError(
      req,
      subject.department
    );

    if (accessError) {
      return res.status(403).json({
        success: false,
        message: accessError,
      });
    }

    const filter = {
      subjectId,
      academicYear,
    };

    if (iaNumber) {
      filter.iaNumber = Number(iaNumber);
    }

    const [records, targetsBySubject] =
      await Promise.all([
        IAMarks.find(filter)
          .populate(
            "students.studentId",
            "registerNumber rollNumber name"
          )
          .lean(),

        getTargetsBySubject(
          [subject._id],
          academicYear
        ),
      ]);

    const outcome = targetsBySubject.get(
      String(subject._id)
    );

    const targets =
      outcome?.targets || DEFAULT_TARGETS;

    const result = computeSubjectAttainment(
      records,
      targets
    );

    return res.status(200).json({
      success: true,
      academicYear,
      iaNumber: iaNumber ? Number(iaNumber) : null,
      iaNumbers: [
        ...new Set(
          records.map((record) => record.iaNumber)
        ),
      ].sort((a, b) => a - b),
      batches: [
        ...new Set(
          records.map((record) => record.batchNumber)
        ),
      ].sort(),
      subject: {
        ...subject,
        department: normalizeDepartment(
          subject.department
        ),
      },
      targets,
      targetsSaved: Boolean(outcome?.saved),
      coStatements: outcome?.cos || [],
      ...result,
    });
  } catch (error) {
    console.error(
      "Subject Attainment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to calculate CO attainment.",
    });
  }
};

// ==================================================
// SEMESTER ATTAINMENT
//
// GET /api/attainment/semester
//   ?academicYear&semester[&department]
//
// Every subject of the semester with the attainment of
// each CO from all its IAs.
// ==================================================

export const getSemesterAttainment = async (
  req,
  res
) => {
  try {
    const { academicYear, semester } = req.query;

    const department =
      getRole(req) === "hod"
        ? normalizeDepartment(req.user?.department)
        : normalizeDepartment(req.query.department);

    if (
      !isAcademicYear(academicYear) ||
      !semester ||
      !department
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, department and semester are required.",
      });
    }

    const accessError = getAccessError(
      req,
      department
    );

    if (accessError) {
      return res.status(403).json({
        success: false,
        message: accessError,
      });
    }

    const subjects = await Subject.find({
      department: department.toUpperCase(),
      semester: Number(semester),
    })
      .select("code name subjectCategory sequence")
      .sort({ sequence: 1 })
      .lean();

    const subjectIds = subjects.map(
      (subject) => subject._id
    );

    const [records, targetsBySubject] =
      await Promise.all([
        IAMarks.find({
          academicYear,
          subjectId: { $in: subjectIds },
        })
          .select(
            "subjectId iaNumber batchNumber tests students"
          )
          .lean(),

        getTargetsBySubject(
          subjectIds,
          academicYear
        ),
      ]);

    const recordsBySubject = new Map();

    records.forEach((record) => {
      const key = String(record.subjectId);

      if (!recordsBySubject.has(key)) {
        recordsBySubject.set(key, []);
      }

      recordsBySubject.get(key).push(record);
    });

    const rows = subjects.map((subject) => {
      const key = String(subject._id);

      const subjectRecords =
        recordsBySubject.get(key) || [];

      const targets =
        targetsBySubject.get(key)?.targets ||
        DEFAULT_TARGETS;

      const result = computeSubjectAttainment(
        subjectRecords,
        targets
      );

      const levels = {};

      result.cos.forEach((co) => {
        levels[co.co] = co.level;
      });

      return {
        subject: {
          _id: subject._id,
          code: subject.code,
          name: subject.name,
          subjectCategory:
            subject.subjectCategory || "REGULAR",
        },
        iaNumbers: [
          ...new Set(
            subjectRecords.map(
              (record) => record.iaNumber
            )
          ),
        ].sort((a, b) => a - b),
        students: result.students.length,
        targetsSaved: targetsBySubject.has(key),
        levels,
        average: average(
          result.cos.map((co) => co.level)
        ),
      };
    });

    return res.status(200).json({
      success: true,
      academicYear,
      department,
      semester: Number(semester),
      defaultTargets: DEFAULT_TARGETS,
      rows,
    });
  } catch (error) {
    console.error(
      "Semester Attainment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to calculate CO attainment.",
    });
  }
};
