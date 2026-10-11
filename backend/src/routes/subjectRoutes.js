import express from "express";

import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  bulkUploadSubjects,
} from "../controllers/subjectController.js";

import Subject from "../models/Subject.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import {
  hodOwnDepartment,
  bodyDepartment,
  recordAndBodyDepartment,
} from "../middlewares/departmentScope.js";
import { uploadCSV } from "../middlewares/uploadCSV.js";

const router = express.Router();

// Get all subjects
router.get(
  "/getsubjects",
  authenticateUser,
  getSubjects
);

// Get single subject
router.get(
  "/getsubject/:id",
  authenticateUser,
  getSubjectById
);

// Create subject
router.post(
  "/addsubject",
  authenticateUser,
  authorizeRoles("admin", "hod"),
  hodOwnDepartment(bodyDepartment),
  createSubject
);

// Update subject
router.put(
  "/updatesubject/:id",
  authenticateUser,
  authorizeRoles("admin", "hod"),
  hodOwnDepartment(recordAndBodyDepartment(Subject)),
  updateSubject
);

// Delete subject
router.delete(
  "/deletesubject/:id",
  authenticateUser,
  authorizeRoles("admin", "hod"),
  hodOwnDepartment(recordAndBodyDepartment(Subject)),
  deleteSubject
);

// Bulk upload subjects
router.post(
  "/bulk-upload",
  authenticateUser,
  authorizeRoles("admin"),
  uploadCSV,
  bulkUploadSubjects
);

export default router;