import express from "express";
import { getMyAcademicData } from "../controllers/studentAcademicController.js";

const router = express.Router();

router.get(
  "/me/academic",
  getMyAcademicData
);

export default router;