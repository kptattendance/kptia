import IAMarks from "../models/IAMarks.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";

// =====================================================
// HOD - SEMESTER WISE IA DETAILS
// =====================================================

export const getHODSemesterIAMarks = async (req, res) => {
  try {
    const role = req.user?.role;
    const hodDepartment = req.user?.department?.toLowerCase();

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
      .populate(
        "students.studentId",
        "registerNumber name batch batchNumber department"
      )
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

        if (!studentRecord.studentId)
          continue;

        const studentId =
          studentRecord.studentId._id.toString();

        if (!subject.students.has(studentId)) {
          subject.students.set(studentId, {
            studentId,

            registerNumber:
              studentRecord.studentId
                .registerNumber,

            name:
              studentRecord.studentId.name,

            batch:
              studentRecord.studentId.batch,

            batchNumber:
              studentRecord.studentId
                .batchNumber,

            iaMarks: {},
            totalMarks: 0,
          });
        }

        const student =
          subject.students.get(studentId);

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
          String(a.registerNumber).localeCompare(
            String(b.registerNumber)
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

        code: subject.code,
        name: subject.name,
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

    res.json({
      success: true,
      academicYear,
      semester: Number(semester),
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

    res.status(500).json({
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
        "registerNumber name batch batchNumber department"
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

            name: item.studentId.name,

            batch:
              item.studentId.batch,

            batchNumber:
              item.studentId.batchNumber,

            iaMarks: {},
          });
        }

        const student =
          studentMap.get(studentId);

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