// routes/iaRoutes.js

import express from "express";

import {
  saveIAMarks,
  getIAMarks,
  getIAMarksById,
  updateIAMarks,
  deleteIAMarks,
  getStudentIAMarks,
} from "../controllers/iaController.js";

import {
  authenticateUser,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

router.use(authenticateUser);

// --------------------------------------------------
// STUDENT
// IMPORTANT:
// Keep /student BEFORE /:id
// --------------------------------------------------

router.get(
  "/student",
  getStudentIAMarks
);

// --------------------------------------------------
// CREATE
// Staff / HOD / Admin
// --------------------------------------------------

router.post(
  "/save",
  saveIAMarks
);

// --------------------------------------------------
// READ
// --------------------------------------------------

// Get by department + semester + subject + year
router.get(
  "/",
  getIAMarks
);

// Get by MongoDB ID
router.get(
  "/:id",
  getIAMarksById
);

// --------------------------------------------------
// UPDATE
// Admin only
// --------------------------------------------------

router.put(
  "/:id",
  updateIAMarks
);

// --------------------------------------------------
// DELETE
// Admin only
// --------------------------------------------------

router.delete(
  "/:id",
  deleteIAMarks
);

export default router;