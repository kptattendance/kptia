import express from "express";
import {
  getHODSemesterIAMarks,
  getHODSemesterFinalCIE,
  getHODSubjectIADetails,
} from "../controllers/hodIAController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get(
  "/semester",
  getHODSemesterIAMarks
);

// Final CIE of every subject of a semester (Excel)
router.get(
  "/semester-final",
  getHODSemesterFinalCIE
);

router.get(
  "/subject/:subjectId",
  getHODSubjectIADetails
);

export default router;