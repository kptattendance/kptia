import express from "express";

import {
  saveAttendance,
  getAttendance,
} from "../controllers/attendanceController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

router.post("/save", saveAttendance);

router.get("/", getAttendance);

export default router;