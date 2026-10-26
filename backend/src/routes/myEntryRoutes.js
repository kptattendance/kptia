import express from "express";

import {
  getMyEntryStatus,
  getMyIASheet,
} from "../controllers/myEntryController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

// What the faculty has entered for their subjects
router.get("/status", getMyEntryStatus);

// Every IA of a subject side by side
router.get("/ia-sheet", getMyIASheet);

export default router;
