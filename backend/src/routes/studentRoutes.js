import express from "express";

import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  searchStudents,
  // getStudentAttendanceHistory,
  bulkAddStudents,
} from "../controllers/studentController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";
import { uploadSingleImage } from "../middlewares/uploadImage.js";
import { uploadCSV } from "../middlewares/uploadCSV.js";

const router = express.Router();

// All routes require Clerk authentication
router.use(authenticateUser);

// ==========================================
// ADD SINGLE STUDENT
// ==========================================

router.post(
  "/addstudent",
  uploadSingleImage,
  createStudent
);

// ==========================================
// GET ALL STUDENTS
// ==========================================

router.get(
  "/getstudents",
  getStudents
);

// ==========================================
// GET STUDENT BY ID
// ==========================================

router.get(
  "/getstudent/:id",
  getStudentById
);

// ==========================================
// UPDATE STUDENT
// ==========================================

router.put(
  "/updatestudent/:id",
  uploadSingleImage,
  updateStudent
);

// ==========================================
// DELETE STUDENT
// ==========================================

router.delete(
  "/deletestudent/:id",
  deleteStudent
);

// ==========================================
// SEARCH STUDENTS
// ==========================================

router.get(
  "/search",
  searchStudents
);

// ==========================================
// STUDENT ATTENDANCE HISTORY
// ==========================================

// router.get(
//   "/student-history",
//   getStudentAttendanceHistory
// );

// ==========================================
// BULK ADD STUDENTS - OLD ROUTE
// ==========================================

router.post(
  "/bulk-add",
  bulkAddStudents
);

// ==========================================
// BULK UPLOAD STUDENTS FROM CSV
// ==========================================

router.post(
  "/bulk-upload",
  uploadCSV,
  bulkAddStudents
);

export default router;