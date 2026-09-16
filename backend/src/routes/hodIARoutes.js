import express from "express";
import {
  getHODSemesterIAMarks,
  getHODSubjectIADetails,
} from "../controllers/hodIAController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.get(
  "/semester",
  getHODSemesterIAMarks
);

router.get(
  "/subject/:subjectId",
  getHODSubjectIADetails
);

export default router;