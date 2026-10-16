import express from "express";

import {
  getMentorAssignments,
  assignMentor,
  removeMentor,
} from "../controllers/mentorController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

// Students of the department with their mentor
router.get("/", getMentorAssignments);

// Assign a mentor to selected students
router.post("/assign", assignMentor);

// Remove the mentor of selected students
router.post("/remove", removeMentor);

export default router;
