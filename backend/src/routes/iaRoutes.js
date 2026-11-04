// routes/iaRoutes.js

import express from "express";

import {
  saveIAMarks,
  unlockIAMarks,
  getIAMarks,
  getIAMarksById,
  updateIAMarks,
  deleteIAMarks,
  getStudentIAMarks,
  getAdminIAStatus,
} from "../controllers/iaController.js";
import {
  getImprovement,
  saveImprovement,
} from "../controllers/improvementController.js";

import {
  authenticateUser,
} from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

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

// --------------------------------------------------
// IMPROVEMENT TEST
// Staff (allocated) / HOD (own department) / Admin
// --------------------------------------------------

router.get(
  "/improvement",
  getImprovement
);

router.post(
  "/improvement",
  saveImprovement
);

router.get(
  "/admin-status",
  // authenticateUser,
  // authorizeRoles("admin"),
  getAdminIAStatus
);

// Get by MongoDB ID
router.get(
  "/:id",
  getIAMarksById
);

// --------------------------------------------------
// UNLOCK FOR CORRECTION
// HOD (own department) / Admin
// --------------------------------------------------

router.post(
  "/:id/unlock",
  unlockIAMarks
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