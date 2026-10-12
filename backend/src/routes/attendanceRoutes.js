import express from "express";

import {
  saveAttendance,
  getAttendance,
  unlockAttendance,
  getAdminAttendanceStatistics,
  getAdminAttendanceMonths,
  getAdminAttendanceRecords,
  updateAttendance,
  deleteAttendance,
} from "../controllers/attendanceController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/save", authenticateUser, saveAttendance);

router.post("/unlock", authenticateUser, unlockAttendance);

router.get("/", authenticateUser, getAttendance);
router.get(
  "/admin-statistics",
  authenticateUser,
  getAdminAttendanceStatistics
);

// Admin: months of a year that have attendance
router.get(
  "/admin-months",
  authenticateUser,
  getAdminAttendanceMonths
);

// Admin: every saved record of a subject + month
router.get(
  "/admin-records",
  authenticateUser,
  getAdminAttendanceRecords
);

// Admin: correct a saved record
router.put("/:id", authenticateUser, updateAttendance);

// Admin: delete a saved record
router.delete("/:id", authenticateUser, deleteAttendance);

export default router;