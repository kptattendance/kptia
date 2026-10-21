import express from "express";

import {
  getSubjectAttainment,
  getSemesterAttainment,
} from "../controllers/attainmentController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

// CO attainment of one subject (one IA or all IAs)
router.get("/subject", getSubjectAttainment);

// CO attainment of every subject of a semester
router.get("/semester", getSemesterAttainment);

export default router;
