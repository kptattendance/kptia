import express from "express";

import {
  saveAttendance,
  getAttendance,
  unlockAttendance,
  getAdminAttendanceStatistics,
} from "../controllers/attendanceController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/save", authenticateUser, saveAttendance);

router.post("/unlock", authenticateUser, unlockAttendance);

router.get("/", authenticateUser, getAttendance);
router.get(
  "/admin-statistics",
  // authenticateUser,
  getAdminAttendanceStatistics
);

export default router;