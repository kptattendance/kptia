import express from "express";
import { getMyAcademicData } from "../controllers/studentAcademicController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get(
  "/me/academic",
  authenticateUser,
  getMyAcademicData
);

export default router;