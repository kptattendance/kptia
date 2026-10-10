import express from "express";

import {
  getCourseOutcomes,
  saveCourseOutcomes,
  getCourseOutcomeStatus,
  getProgram,
  saveProgram,
} from "../controllers/courseOutcomeController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

// POs + PSOs of a department
router.get("/program/:department", getProgram);

// Save PSOs of a department
router.put("/program/:department", saveProgram);

// Which subjects of a semester have COs defined
router.get("/status", getCourseOutcomeStatus);

// COs of one subject
router.get("/", getCourseOutcomes);

// Save COs of one subject
router.put("/", saveCourseOutcomes);

export default router;
