import mongoose from "mongoose";
import Student from "../models/Student.js";
import StudentSemester from "../models/StudentSemester.js";
import Attendance from "../models/Attendance.js";
import IAMarks from "../models/IAMarks.js";
import Subject from "../models/Subject.js";
import { CIE_MAX, computeCIE, roundUpMark } from "../utils/ciTotal.js";

// ==========================================================
// STUDENT - GET OWN ACADEMIC DATA
// ==========================================================
//
// Returns ONLY the logged-in student's:
//
// 1. Student profile
// 2. Current semester
// 3. Monthly attendance
// 4. IA marks
//
// IMPORTANT:
// Student ID is NEVER accepted from frontend.
// Clerk ID -> Student -> Own academic records
//
// ==========================================================

export const getMyAcademicData = async (req, res) => {
  try {
    // ------------------------------------------------------
    // ROLE CHECK
    // ------------------------------------------------------

    const role = String(req.user?.role || "")
      .trim()
      .toLowerCase();

    if (role !== "student") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is only for students.",
      });
    }

    // ------------------------------------------------------
    // FIND LOGGED-IN STUDENT
    // ------------------------------------------------------

    const student = await Student.findOne({
      clerkId: req.user.id,
      role: "student",
    })
      .select(
        "_id clerkId registerNumber name email phone department admissionYear batch batchNumber imageUrl"
      )
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    // ------------------------------------------------------
    // CURRENT SEMESTER
    // ------------------------------------------------------

    const currentSemester = await StudentSemester.findOne({
      studentId: student._id,
      status: "CURRENT",
    })
      .select("academicYear semester status")
      .lean();

    const semester = currentSemester?.semester || null;
    const academicYear = currentSemester?.academicYear || null;

    // ======================================================
    // ATTENDANCE
    // ======================================================

    const attendanceRecords = await Attendance.find({
      "students.studentId": student._id,
    })
      .populate(
        "subjectId",
        "name code semester"
      )
      .sort({
        year: -1,
        month: -1,
      })
      .lean();

    // ------------------------------------------------------
    // Extract ONLY this student's attendance
    // ------------------------------------------------------

    const attendance = attendanceRecords
      .map((record) => {
        const studentAttendance =
          record.students?.find(
            (item) =>
              String(item.studentId) ===
              String(student._id)
          );

        if (!studentAttendance) {
          return null;
        }

        const conducted =
          Number(record.classesConducted) || 0;

        const attended =
          Number(studentAttendance.classesAttended) || 0;

        const percentage =
          conducted > 0
            ? Number(
                ((attended / conducted) * 100).toFixed(2)
              )
            : 0;

        return {
          _id: record._id,

          subjectId: record.subjectId,

          month: record.month,

          year: record.year,

          batchNumbers:
            record.batchNumbers || [],

          classesConducted: conducted,

          classesAttended: attended,

          percentage,

          status:
            percentage >= 75
              ? "GOOD"
              : "LOW",
        };
      })
      .filter(Boolean);

    // ======================================================
    // IA MARKS
    // ======================================================

    const iaRecords = await IAMarks.find({
      "students.studentId": student._id,
    })
      .populate(
        "subjectId",
        "name code semester iaMax iaMin"
      )
      .sort({
        academicYear: -1,
        semester: 1,
        iaNumber: 1,
      })
      .lean();

    // ------------------------------------------------------
    // Extract ONLY this student's IA marks
    // ------------------------------------------------------

    const iaMarks = iaRecords
      .map((record) => {
        const studentMarks =
          record.students?.find(
            (item) =>
              String(item.studentId) ===
              String(student._id)
          );

        if (!studentMarks) {
          return null;
        }

        // ----------------------------------------------
        // Calculate student's total marks
        // ----------------------------------------------

        let totalMarks = 0;

        const tests = (studentMarks.tests || []).map(
          (test, index) => {
            const marks =
              test.status === "ABSENT" ||
              test.marks === null ||
              test.marks === undefined
                ? null
                : Number(test.marks);

            if (marks !== null && Number.isFinite(marks)) {
              totalMarks += marks;
            }

            return {
              testName:
                record.tests?.[index]?.testName ||
                `Test ${index + 1}`,

              maxMarks:
                Number(
                  record.tests?.[index]?.maxMarks
                ) || 0,

              marks,

              status:
                test.status ||
                (marks === null
                  ? "ABSENT"
                  : "PRESENT"),
            };
          }
        );

        // The saved total: for CIE 5 it is the average of
        // the activities, not their sum
        if (
          studentMarks.totalMarks !== null &&
          studentMarks.totalMarks !== undefined
        ) {
          totalMarks = roundUpMark(studentMarks.totalMarks);
        }

        return {
          _id: record._id,

          academicYear:
            record.academicYear,

          semester:
            record.semester,

          iaNumber:
            record.iaNumber,

          batchNumber:
            record.batchNumber,

          subjectId:
            record.subjectId,

          totalMaxMarks:
            Number(record.totalMaxMarks) || 0,

          totalMarks,

          tests,

          isLocked:
            record.isLocked === true,
        };
      })
      .filter(Boolean);

    // ======================================================
    // FINAL CIE OF EACH SUBJECT
    //
    // Same rule as everywhere (utils/ciTotal.js): IA 1-4
    // and CIE 5 of the student's batch, each scaled to the
    // subject maximum, averaged, improvement test when
    // higher, rounded up. Every record of that batch is
    // read (an IA the student is missing from counts 0),
    // keeping only this student's marks.
    // ======================================================

    const groups = new Map();

    iaRecords.forEach((record) => {
      const subject = record.subjectId;

      if (!subject?._id) {
        return;
      }

      const key = `${record.academicYear}|${subject._id}|${record.batchNumber}`;

      if (!groups.has(key)) {
        groups.set(key, {
          academicYear: record.academicYear,
          semester: record.semester,
          subject,
          batchNumber: record.batchNumber,
        });
      }
    });

    const finalCIE = [];

    if (groups.size > 0) {
      const batchRecords = await IAMarks.find({
        $or: [...groups.values()].map((group) => ({
          academicYear: group.academicYear,
          subjectId: group.subject._id,
          batchNumber: group.batchNumber,
        })),
      })
        .select({
          academicYear: 1,
          subjectId: 1,
          batchNumber: 1,
          iaNumber: 1,
          totalMaxMarks: 1,
          students: { $elemMatch: { studentId: student._id } },
        })
        .lean();

      groups.forEach((group, key) => {
        const records = batchRecords
          .filter(
            (record) =>
              `${record.academicYear}|${record.subjectId}|${record.batchNumber}` ===
              key
          )
          .map((record) => ({
            ...record,
            students: record.students || [],
          }));

        const cieMax = Number(group.subject.iaMax) || CIE_MAX;

        const cieMin =
          Number(group.subject.iaMin) || Math.ceil(cieMax * 0.4);

        const cie = computeCIE(records, cieMax).get(
          String(student._id)
        );

        if (!cie) {
          return;
        }

        finalCIE.push({
          academicYear: group.academicYear,
          semester: group.semester,
          subjectId: group.subject._id,
          final: cie.final,
          maxMarks: cieMax,
          minMarks: cieMin,
          improvement: cie.improvement?.used
            ? {
                replacesIA: cie.improvement.replacesIA,
                finalBeforeImprovement: cie.finalBeforeImprovement,
              }
            : null,
        });
      });
    }

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,

      data: {
        student: {
          _id: student._id,
          registerNumber:
            student.registerNumber,

          name:
            student.name,

          email:
            student.email,

          phone:
            student.phone,

          department:
            student.department,

          admissionYear:
            student.admissionYear,

          batch:
            student.batch,

          batchNumber:
            student.batchNumber,

          imageUrl:
            student.imageUrl,
        },

        academic: {
          semester,
          academicYear,
        },

        attendance,

        iaMarks,

        finalCIE,
      },
    });
  } catch (error) {
    console.error(
      "Get My Academic Data Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load student academic data.",
    });
  }
};