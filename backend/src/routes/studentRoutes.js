import express from "express";

import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  searchStudents,
  bulkAddStudents,
  bulkUploadStudents,
} from "../controllers/studentController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";
import { uploadSingleImage } from "../middlewares/uploadImage.js";
import { uploadCSV } from "../middlewares/uploadCSV.js";
import { uploadExcel } from "../middlewares/uploadExcel.js";

const router = express.Router();

// ==========================================================
// ALL ROUTES REQUIRE CLERK AUTHENTICATION
// ==========================================================

router.use(authenticateUser);

// ==========================================================
// ADD SINGLE STUDENT
// ==========================================================

router.post(
  "/addstudent",
  uploadSingleImage,
  createStudent
);

// ==========================================================
// GET ALL STUDENTS
// ==========================================================

router.get(
  "/getstudents",
  getStudents
);

// ==========================================================
// GET STUDENT BY ID
// ==========================================================

router.get(
  "/getstudent/:id",
  getStudentById
);

// ==========================================================
// UPDATE STUDENT
// ==========================================================

router.put(
  "/updatestudent/:id",
  uploadSingleImage,
  updateStudent
);

// ==========================================================
// DELETE STUDENT
// ==========================================================

router.delete(
  "/deletestudent/:id",
  deleteStudent
);

// ==========================================================
// SEARCH STUDENTS
// ==========================================================

router.get(
  "/search",
  searchStudents
);

// ==========================================================
// OLD CSV BULK ADD
// ==========================================================

router.post(
  "/bulk-add",
  uploadCSV,
  bulkAddStudents
);

// ==========================================================
// BULK UPLOAD STUDENTS FROM EXCEL
// Excel + Google Drive Photo Links
// ==========================================================

router.post(
  "/bulk-upload",
  uploadExcel,
  bulkUploadStudents
);

export default router;