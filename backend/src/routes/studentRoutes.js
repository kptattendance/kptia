import express from "express";

import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  updateStudentStatus,
  deleteMultipleStudents,
  bulkUploadStudents,
} from "../controllers/studentController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { uploadSingleImage } from "../middlewares/uploadImage.js";
import { uploadExcel } from "../middlewares/uploadExcel.js";

const router = express.Router();

// =====================================================
// BULK DELETE
// =====================================================
// Must come BEFORE /:id
// =====================================================

router.delete(
  "/bulk-delete",
  authenticateUser,
  authorizeRoles(
    "admin",
    "principal",
    "coe",
    "exam_officer"
  ),
  deleteMultipleStudents
);

// =====================================================
// GET ALL STUDENTS
// =====================================================

router.get(
  "/",
  authenticateUser,
  authorizeRoles(
    "admin",
    "principal",
    "coe",
    "exam_officer",
    "hod",
    "staff"
  ),
  getStudents
);

// =====================================================
// CREATE STUDENT
// =====================================================

router.post(
  "/",
  authenticateUser,
  authorizeRoles(
    "admin",
    "principal",
    "coe",
    "exam_officer",
    "hod"
  ),
  uploadSingleImage,
  createStudent
);

// =====================================================
// UPDATE STUDENT
// =====================================================

router.put(
  "/:id",
  authenticateUser,
  authorizeRoles(
    "admin",
    "principal",
    "coe",
    "exam_officer",
    "hod"
  ),
  uploadSingleImage,
  updateStudent
);

// =====================================================
// DELETE STUDENT
// =====================================================

router.delete(
  "/:id",
  authenticateUser,
  authorizeRoles(
    "admin",
    "principal",
    "coe",
    "exam_officer"
  ),
  deleteStudent
);

// =====================================================
// UPDATE STUDENT STATUS
// =====================================================

router.patch(
  "/:id/status",
  authenticateUser,
  authorizeRoles(
    "admin",
    "principal",
    "coe",
    "exam_officer",
    "hod"
  ),
  updateStudentStatus
);

// =====================================================
// GET SINGLE STUDENT
// =====================================================

router.get(
  "/:id",
  authenticateUser,
  authorizeRoles(
    "admin",
    "principal",
    "coe",
    "exam_officer",
    "hod"
  ),
  getStudentById
);

// =====================================================
// BULK EXCEL UPLOAD
// =====================================================

router.post(
  "/bulk-upload",
  authenticateUser,
  authorizeRoles(
    "admin",
    "principal",
    "coe",
    "exam_officer"
  ),
  uploadExcel,
  bulkUploadStudents
);

export default router;