import express from "express";

import {
  saveIAMarks,
  getIAMarks,
} from "../controllers/iaController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.post("/save", saveIAMarks);

router.get("/", getIAMarks);

export default router;