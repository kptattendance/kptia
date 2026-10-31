import express from "express";

import {
  getEntryGrid,
  getMyIASheet,
} from "../controllers/myEntryController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

// Department x semester grids: entered or not
router.get("/grid", getEntryGrid);

// Every IA of a subject side by side
router.get("/ia-sheet", getMyIASheet);

export default router;
