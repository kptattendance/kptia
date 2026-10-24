import Student from "../models/Student.js";
import Subject from "../models/Subject.js";
import Attendance from "../models/Attendance.js";
import IAMarks from "../models/IAMarks.js";
import { getAcademicYearForMonth } from "./courseAllocationController.js";
import { getMentorName } from "./mentorController.js";

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const LATERAL_ADMISSION_TYPES = [
  "lateralPUC",
  "lateralITI",
  "lateralCross",
];

// Attendance below this percentage is highlighted.
const MINIMUM_ATTENDANCE = 75;

// --------------------------------------------------
// HOW FACULTY ENTER MONTHLY ATTENDANCE
//
// true  -> each month holds the running total from the
//          start of the semester (August 28 classes,
//          September 58 classes). The latest month is
//          the total to date.
//
// false -> each month holds only that month's classes.
//          The months are added up.
//
// The attendance saved so far is entered as running
// totals, so this is true. Change it only if the
// college changes how attendance is entered.
// --------------------------------------------------

const ATTENDANCE_IS_RUNNING_TOTAL = true;

const round1 = (value) =>
  Math.round(value * 10) / 10;

const percentage = (attended, eligible) =>
  eligible > 0
    ? round1((attended / eligible) * 100)
    : null;

// ==================================================
// STUDENT: MY PROGRESS REPORT
//
// Everything entered so far for the student's current
// semester in the current academic year:
//
// Attendance  -> every subject, month by month, with
//                the total and percentage
// IA marks    -> every subject, IA by IA
//
// The report is cumulative: each month and each IA
// entered later is added to what was there before.
//
// The student downloads it as a PDF, gets it signed
// by the parent and submits it to the HOD.
// ==================================================

export const getMyProgressReport = async (
  req,
  res
) => {
  try {
    if (
      String(req.user?.role || "").toLowerCase() !==
      "student"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "This report is only for students.",
      });
    }

    const student = await Student.findOne({
      clerkId: req.user.id,
    })
      .select(
        "name registerNumber rollNumber fatherName motherName phone parentPhone department semester batch batchNumber admissionType imageUrl"
      )
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    // --------------------------------------------------
    // CURRENT ACADEMIC YEAR (starts in July)
    // --------------------------------------------------

    const today = new Date();

    const academicYear = getAcademicYearForMonth(
      today.getMonth() + 1,
      today.getFullYear()
    );

    const startYear = Number(
      academicYear.slice(0, 4)
    );

    // --------------------------------------------------
    // SUBJECTS OF THE STUDENT
    // --------------------------------------------------

    const subjectFilter = {
      department: String(
        student.department || ""
      ).toUpperCase(),
      semester: student.semester,
    };

    // Bridge courses are for lateral students.
    if (
      !LATERAL_ADMISSION_TYPES.includes(
        student.admissionType
      )
    ) {
      subjectFilter.subjectCategory = {
        $ne: "BRIDGE",
      };
    }

    const [
      subjects,
      attendanceRecords,
      iaRecords,
      mentorName,
    ] =
      await Promise.all([
        Subject.find(subjectFilter)
          .select(
            "code name subjectCategory sequence"
          )
          .sort({ sequence: 1 })
          .lean(),

        // Only this student's entry of each record
        Attendance.find(
          {
            semester: student.semester,
            "students.studentId": student._id,
            $or: [
              {
                year: startYear,
                month: { $gte: 7 },
              },
              {
                year: startYear + 1,
                month: { $lte: 6 },
              },
            ],
          },
          {
            subjectId: 1,
            month: 1,
            year: 1,
            classesConducted: 1,
            createdAt: 1,
            students: {
              $elemMatch: {
                studentId: student._id,
              },
            },
          }
        )
          .sort({ createdAt: 1 })
          .lean(),

        IAMarks.find(
          {
            academicYear,
            semester: student.semester,
            "students.studentId": student._id,
          },
          {
            subjectId: 1,
            iaNumber: 1,
            totalMaxMarks: 1,
            students: {
              $elemMatch: {
                studentId: student._id,
              },
            },
          }
        ).lean(),

        getMentorName(student._id, academicYear),
      ]);

    // --------------------------------------------------
    // ATTENDANCE: subject -> month -> classes
    //
    // Records are read oldest first, so if the same
    // subject and month was saved twice, the latest
    // one is used and nothing is counted twice.
    // --------------------------------------------------

    const attendanceBySubject = new Map();

    const monthKeys = new Set();

    for (const record of attendanceRecords) {
      const entry = record.students?.[0];

      if (!entry) {
        continue;
      }

      const subjectKey = String(record.subjectId);

      const monthKey = `${record.year}-${String(
        record.month
      ).padStart(2, "0")}`;

      const attended = Number(
        entry.classesAttended || 0
      );

      // The student's own maximum, when the faculty
      // has set one. Otherwise the classes conducted.
      const eligible = Number(
        entry.classesEligible ??
          record.classesConducted ??
          0
      );

      if (!attendanceBySubject.has(subjectKey)) {
        attendanceBySubject.set(
          subjectKey,
          new Map()
        );
      }

      attendanceBySubject
        .get(subjectKey)
        .set(monthKey, { attended, eligible });

      monthKeys.add(monthKey);
    }

    const months = [...monthKeys]
      .sort()
      .map((key) => ({
        key,
        year: Number(key.slice(0, 4)),
        month: Number(key.slice(5)),
      }));

    // --------------------------------------------------
    // IA: subject -> IA number -> marks
    // --------------------------------------------------

    const iaBySubject = new Map();

    const iaNumberSet = new Set();

    for (const record of iaRecords) {
      const entry = record.students?.[0];

      if (!entry) {
        continue;
      }

      const subjectKey = String(record.subjectId);

      const tests = entry.tests || [];

      // Absent only when absent for every test of the IA.
      const absent =
        tests.length > 0 &&
        tests.every(
          (test) => test.status === "ABSENT"
        );

      if (!iaBySubject.has(subjectKey)) {
        iaBySubject.set(subjectKey, new Map());
      }

      iaBySubject.get(subjectKey).set(
        record.iaNumber,
        {
          marks: Number(entry.totalMarks || 0),
          maxMarks: Number(
            record.totalMaxMarks || 0
          ),
          absent,
        }
      );

      iaNumberSet.add(record.iaNumber);
    }

    const iaNumbers = [...iaNumberSet].sort(
      (a, b) => a - b
    );

    // --------------------------------------------------
    // ONE ROW PER SUBJECT
    // --------------------------------------------------

    let overallAttended = 0;
    let overallEligible = 0;

    // Electives are alternatives: only the ones the
    // student is enrolled in, that is, has attendance
    // or IA marks for, are shown.
    const studentSubjects = subjects.filter(
      (subject) =>
        subject.subjectCategory !== "ELECTIVE" ||
        attendanceBySubject.has(String(subject._id)) ||
        iaBySubject.has(String(subject._id))
    );

    const rows = studentSubjects.map((subject) => {
      const subjectKey = String(subject._id);

      const monthly =
        attendanceBySubject.get(subjectKey) ||
        new Map();

      let attended = 0;
      let eligible = 0;

      const attendance = {};

      for (const [monthKey, value] of monthly) {
        attendance[monthKey] = value;

        if (!ATTENDANCE_IS_RUNNING_TOTAL) {
          attended += value.attended;
          eligible += value.eligible;
        }
      }

      // Running totals: the latest month entered for
      // the subject is its total to date.
      if (ATTENDANCE_IS_RUNNING_TOTAL) {
        const latestMonth = [...monthly.keys()]
          .sort()
          .pop();

        if (latestMonth) {
          attended = monthly.get(latestMonth).attended;
          eligible = monthly.get(latestMonth).eligible;
        }
      }

      overallAttended += attended;
      overallEligible += eligible;

      const iaOfSubject =
        iaBySubject.get(subjectKey) || new Map();

      let iaMarks = 0;
      let iaMaxMarks = 0;

      const ia = {};

      for (const [iaNumber, value] of iaOfSubject) {
        ia[iaNumber] = value;
        iaMarks += value.marks;
        iaMaxMarks += value.maxMarks;
      }

      return {
        subject: {
          _id: subject._id,
          code: subject.code,
          name: subject.name,
          subjectCategory:
            subject.subjectCategory || "REGULAR",
        },

        attendance,

        attendanceTotal: {
          attended,
          eligible,
          percentage: percentage(
            attended,
            eligible
          ),
        },

        ia,

        iaTotal: {
          marks: iaMarks,
          maxMarks: iaMaxMarks,
        },
      };
    });

    return res.status(200).json({
      success: true,

      generatedAt: today,

      academicYear,

      minimumAttendance: MINIMUM_ATTENDANCE,

      attendanceIsRunningTotal:
        ATTENDANCE_IS_RUNNING_TOTAL,

      student: {
        name: student.name,
        registerNumber: student.registerNumber,
        rollNumber: student.rollNumber,
        fatherName: student.fatherName,
        motherName: student.motherName,
        phone: student.phone,
        parentPhone: student.parentPhone,
        department: student.department,
        semester: student.semester,
        batch: student.batch,
        batchNumber: student.batchNumber,
        imageUrl: student.imageUrl || "",
        mentorName,
      },

      months,

      iaNumbers,

      rows,

      overallAttendance: {
        attended: overallAttended,
        eligible: overallEligible,
        percentage: percentage(
          overallAttended,
          overallEligible
        ),
      },
    });
  } catch (error) {
    console.error(
      "Progress Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to prepare the progress report.",
    });
  }
};
