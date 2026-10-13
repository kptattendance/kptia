import express from "express";
import { getMyAcademicData } from "../controllers/studentAcademicController.js";
import { getMyProgressReport } from "../controllers/progressReportController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get(
  "/me/academic",
  authenticateUser,
  getMyAcademicData
);

// Attendance + IA of the current semester, for the
// printable progress report
router.get(
  "/me/progress-report",
  authenticateUser,
  getMyProgressReport
);

export default router;