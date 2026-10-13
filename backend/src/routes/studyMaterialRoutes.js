import express from "express";

import {
  getDriveStatus,
  getMaterials,
  getStudentMaterials,
  startUpload,
  completeUpload,
  approveMaterial,
  rejectMaterial,
  deleteMaterial,
  readMaterial,
} from "../controllers/studyMaterialController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

// Admin: is Google Drive connected
router.get("/drive-status", getDriveStatus);

// Student: study material of my subjects
router.get("/student", getStudentMaterials);

// Subjects with their study material and status
router.get("/", getMaterials);

// Upload: get a one-time Google Drive address
router.post("/upload-session", startUpload);

// Upload: the browser has sent the file to Google Drive
router.post("/complete", completeUpload);

// HOD / Admin
router.post("/:id/approve", approveMaterial);
router.post("/:id/reject", rejectMaterial);
router.delete("/:id", deleteMaterial);

// Read part of the PDF, for the viewer
router.get("/:id/chunk", readMaterial);

export default router;
