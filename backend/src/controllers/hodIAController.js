import IAMarks from "../models/IAMarks.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";
import { CIE_MAX, computeCIE } from "../utils/ciTotal.js";

export const getHODSemesterIAMarks = async (req, res) => {
  try {
    const role = req.user?.role;
    const hodDepartment =
      req.user?.department?.toLowerCase();

    if (!["hod", "principal", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const {
      academicYear,
      semester,
    } = req.query;

    if (!academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message: "Academic year and semester are required.",
      });
    }

    const filter = {
      academicYear,
      semester: Number(semester),
    };

    if (role === "hod") {
      filter.department = hodDepartment;
    }

    const records = await IAMarks.find(filter)
      .populate(
        "subjectId",
        "code name semester department"
      )
      .populate({
        path: "students.studentId",
        select:
          "_id registerNumber name batch batchNumber department imageUrl email",
      })
      .sort({
        "subjectId.code": 1,
        iaNumber: 1,
        batchNumber: 1,
      })
      .lean();

    const subjectMap = new Map();

    for (const record of records) {
      if (!record.subjectId) continue;

      const subjectId =
        record.subjectId._id.toString();

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subjectId,
          code: record.subjectId.code,
          name: record.subjectId.name,
          semester: record.subjectId.semester,
          department:
            record.subjectId.department,

          iaRecords: [],
          iaNumbers: new Set(),
          students: new Map(),
        });
      }

      const subject =
        subjectMap.get(subjectId);

      subject.iaNumbers.add(
        record.iaNumber
      );

      subject.iaRecords.push({
        iaNumber: record.iaNumber,
        batchNumber: record.batchNumber,
        totalMaxMarks:
          record.totalMaxMarks,
      });

      for (const studentRecord of
        record.students || []) {

        if (!studentRecord.studentId) {
          continue;
        }

        const populatedStudent =
          studentRecord.studentId;

        const studentId =
          populatedStudent._id.toString();

        if (!subject.students.has(studentId)) {
          subject.students.set(studentId, {
            studentId,

            registerNumber:
              populatedStudent.registerNumber,

            name:
              populatedStudent.name,

            batch:
              populatedStudent.batch,

            batchNumber:
              populatedStudent.batchNumber,

            // IMPORTANT
            imageUrl:
              populatedStudent.imageUrl || "",

            iaMarks: {},
            totalMarks: 0,
          });
        }

        const student =
          subject.students.get(studentId);

        // In case the first record did not contain
        // the image but another record does.
        if (
          !student.imageUrl &&
          populatedStudent.imageUrl
        ) {
          student.imageUrl =
            populatedStudent.imageUrl;
        }

        const iaTotal =
          Number(
            studentRecord.totalMarks || 0
          );

        const key =
          `IA${record.iaNumber}`;

        if (!student.iaMarks[key]) {
          student.iaMarks[key] = {
            marks: 0,
            maxMarks:
              record.totalMaxMarks || 0,
            status: "PRESENT",
          };
        }

        student.iaMarks[key].marks +=
          iaTotal;

        if (
          studentRecord.tests?.some(
            (test) =>
              test.status === "ABSENT"
          )
        ) {
          student.iaMarks[key].status =
            "ABSENT";
        }

        student.totalMarks += iaTotal;
      }
    }

    const data = Array.from(
      subjectMap.values()
    ).map((subject) => {

      const iaNumbers =
        Array.from(
          subject.iaNumbers
        ).sort((a, b) => a - b);

      const students =
        Array.from(
          subject.students.values()
        ).sort((a, b) =>
          String(
            a.registerNumber
          ).localeCompare(
            String(
              b.registerNumber
            )
          )
        );

      const totalMaxMarks =
        subject.iaRecords.reduce(
          (sum, record) =>
            sum +
            Number(
              record.totalMaxMarks || 0
            ),
          0
        );

      return {
        subjectId:
          subject.subjectId,

        code:
          subject.code,

        name:
          subject.name,

        semester:
          subject.semester,

        department:
          subject.department,

        iaNumbers,

        iaRecords:
          subject.iaRecords,

        totalMaxMarks,

        students,
      };
    });

    return res.json({
      success: true,

      academicYear,

      semester:
        Number(semester),

      department:
        role === "hod"
          ? hodDepartment
          : null,

      data,
    });

  } catch (error) {

    console.error(
      "HOD IA Details Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// =====================================================
// HOD - SUBJECT IA DETAIL WITH CO DISTRIBUTION
// =====================================================

export const getHODSubjectIADetails = async (req, res) => {
  try {
    const role = req.user?.role;
    const hodDepartment =
      req.user?.department?.toLowerCase();

    if (!["hod", "principal", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const { subjectId } = req.params;

    const {
      academicYear,
      semester,
      iaNumber,
    } = req.query;

    if (!subjectId || !academicYear || !semester) {
      return res.status(400).json({
        success: false,
        message:
          "Subject, academic year and semester are required.",
      });
    }

    const filter = {
      subjectId,
      academicYear,
      semester: Number(semester),
    };

    if (role === "hod") {
      filter.department = hodDepartment;
    }

    // If IA number is selected, show only that IA.
    if (iaNumber) {
      filter.iaNumber = Number(iaNumber);
    }

    const records = await IAMarks.find(filter)
      .populate(
        "subjectId",
        "code name semester department"
      )
      .populate(
        "students.studentId",
        "registerNumber name batch batchNumber department email imageUrl"
     
        
      )
      .sort({
        iaNumber: 1,
        batchNumber: 1,
      })
      .lean();

    if (!records.length) {
      return res.json({
        success: true,
        data: {
          subject: null,
          iaNumbers: [],
          records: [],
        },
      });
    }

    const subject = records[0].subjectId;

    // -------------------------------------------------
    // Combine Batch 1 and Batch 2 into student-wise data
    // -------------------------------------------------

    const studentMap = new Map();

    for (const record of records) {
      for (const item of record.students || []) {
        if (!item.studentId) continue;

        const studentId =
          item.studentId._id.toString();
if (!studentMap.has(studentId)) {
  studentMap.set(studentId, {
    studentId,

    registerNumber:
      item.studentId.registerNumber,

    name:
      item.studentId.name,

    batch:
      item.studentId.batch,

    batchNumber:
      item.studentId.batchNumber,

    // STUDENT PHOTO
    imageUrl:
      item.studentId.imageUrl || "",

    iaMarks: {},
  });
}

        const student =
          studentMap.get(studentId);
// Keep image URL if available
if (
  !student.imageUrl &&
  item.studentId.imageUrl
) {
  student.imageUrl =
    item.studentId.imageUrl;
}
        const iaKey =
          `IA${record.iaNumber}`;

        // -------------------------------------------------
        // Keep separate details for each IA
        // -------------------------------------------------

        if (!student.iaMarks[iaKey]) {
          student.iaMarks[iaKey] = {
            iaNumber: record.iaNumber,
            totalMaxMarks:
              record.totalMaxMarks || 0,
            totalMarks: 0,
            status: "PRESENT",
            tests: [],
          };
        }

        const iaData =
          student.iaMarks[iaKey];

        // -------------------------------------------------
        // Add test-wise CO distribution
        // -------------------------------------------------

        for (
          let testIndex = 0;
          testIndex <
          (item.tests || []).length;
          testIndex++
        ) {
          const studentTest =
            item.tests[testIndex];

          const testDefinition =
            record.tests?.[testIndex];

          const coMarks =
            studentTest.coMarks || {};

          const testMarks =
            Number(
              studentTest.marks || 0
            );

          iaData.tests.push({
            testName:
              testDefinition?.testName ||
              `Test ${testIndex + 1}`,

            maxMarks:
              testDefinition?.maxMarks ||
              0,

            status:
              studentTest.status ||
              "PRESENT",

            marks:
              studentTest.status === "ABSENT"
                ? null
                : testMarks,

            coMarks: {
              CO1: Number(coMarks.CO1 || 0),
              CO2: Number(coMarks.CO2 || 0),
              CO3: Number(coMarks.CO3 || 0),
              CO4: Number(coMarks.CO4 || 0),
              CO5: Number(coMarks.CO5 || 0),
              CO6: Number(coMarks.CO6 || 0),
            },
          });
        }

        iaData.totalMarks +=
          Number(item.totalMarks || 0);

        if (
          item.tests?.some(
            (test) =>
              test.status === "ABSENT"
          )
        ) {
          iaData.status = "ABSENT";
        }
      }
    }

    const iaNumbers = [
      ...new Set(
        records.map(
          (record) => record.iaNumber
        )
      ),
    ].sort((a, b) => a - b);

    const formattedStudents =
      Array.from(
        studentMap.values()
      ).sort((a, b) =>
        String(
          a.registerNumber
        ).localeCompare(
          String(b.registerNumber)
        )
      );

    res.json({
      success: true,

      data: {
        subject: {
          _id: subject._id,
          code: subject.code,
          name: subject.name,
          semester: subject.semester,
          department: subject.department,
        },

        academicYear,

        semester: Number(semester),

        iaNumbers,

        records: records.map(
          (record) => ({
            _id: record._id,

            isLocked:
              record.isLocked !== false,

            iaNumber:
              record.iaNumber,

            batchNumber:
              record.batchNumber,

            totalMaxMarks:
              record.totalMaxMarks,

            tests:
              record.tests || [],
          })
        ),

        students:
          formattedStudents,
      },
    });
  } catch (error) {
    console.error(
      "HOD Subject IA Details Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ==========================================================
// FINAL CIE OF EVERY SUBJECT OF A SEMESTER
//
// GET /api/hod/ia/semester-final
//   ?academicYear&semester (&department for admin /
//   principal; a HOD always gets their own department)
//
// For the HOD's single Excel: one row per student, the
// final CIE of every subject (the same rule as
// everywhere: average of the CIEs entered, improvement
// test when higher, rounded up).
//
// Returns {
//   subjects: [{ _id, code, name, subjectCategory,
//                cieMax, cieMin, parts }],
//   students: [{ studentId, registerNumber, name,
//                batchNumber, finals: { [subjectId]:
//                { final, improved } } }]
// }
// ==========================================================

export const getHODSemesterFinalCIE = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();

    if (!["hod", "principal", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const { academicYear, semester } = req.query;

    const department =
      role === "hod"
        ? String(req.user?.department || "").trim().toLowerCase()
        : String(req.query.department || "").trim().toLowerCase();

    if (!academicYear || !semester || !department) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year, semester and department are required.",
      });
    }

    const subjectDocs = await Subject.find({
      department,
      semester: Number(semester),
    })
      .select("code name sequence subjectCategory iaMax iaMin")
      .lean();

    subjectDocs.sort((a, b) =>
      String(a.sequence || a.code || "").localeCompare(
        String(b.sequence || b.code || ""),
        undefined,
        { numeric: true }
      )
    );

    const records = await IAMarks.find({
      academicYear,
      subjectId: { $in: subjectDocs.map((subject) => subject._id) },
    })
      .select(
        "subjectId iaNumber batchNumber totalMaxMarks students.studentId students.totalMarks students.tests.status"
      )
      .populate(
        "students.studentId",
        "registerNumber name batchNumber"
      )
      .lean();

    const students = new Map();
    const subjects = [];

    for (const subject of subjectDocs) {
      const subjectId = String(subject._id);

      const subjectRecords = records.filter(
        (record) => String(record.subjectId) === subjectId
      );

      if (subjectRecords.length === 0) {
        continue;
      }

      const cieMax = Number(subject.iaMax) || CIE_MAX;

      const cie = computeCIE(subjectRecords, cieMax);

      let parts = 0;

      for (const [studentId, result] of cie) {
        parts = Math.max(parts, result.partNumbers.length);

        if (!students.has(studentId)) {
          const doc = subjectRecords
            .flatMap((record) => record.students || [])
            .find(
              (entry) =>
                String(entry.studentId?._id || "") === studentId
            )?.studentId;

          if (!doc) {
            continue;
          }

          students.set(studentId, {
            studentId,
            registerNumber: doc.registerNumber || "",
            name: doc.name || "",
            batchNumber: doc.batchNumber || null,
            finals: {},
          });
        }

        students.get(studentId).finals[subjectId] = {
          final: result.final,
          improved: Boolean(result.improvement?.used),
        };
      }

      subjects.push({
        _id: subjectId,
        code: subject.code,
        name: subject.name,
        subjectCategory: subject.subjectCategory || "",
        cieMax,
        cieMin: Number(subject.iaMin) || cieMax * 0.4,
        parts,
      });
    }

    const list = [...students.values()].sort((a, b) =>
      String(a.registerNumber).localeCompare(
        String(b.registerNumber),
        undefined,
        { numeric: true }
      )
    );

    return res.status(200).json({
      success: true,
      data: { subjects, students: list },
    });
  } catch (error) {
    console.error("HOD semester final CIE error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate the final IA marks.",
    });
  }
};
