import express from "express";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  syncUser,
  getCurrentUser,
  getClerkUsers,
  deleteClerkUser,
} from "../controllers/userController.js";

import {
  bulkUploadFaculty,
} from "../controllers/bulkFacultyController.js";


import {
  uploadExcel,
} from "../middlewares/uploadExcel.js";

import { uploadSingleImage } from "../middlewares/uploadImage.js";
import {
  authenticateUser,
  clearUserCache,
} from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// =====================================================
// A changed role or department must be used at once.
// Any change to users clears the remembered users.
// =====================================================

router.use((req, res, next) => {
  if (req.method !== "GET") {
    res.on("finish", () => clearUserCache());
  }

  next();
});

// =====================================================
// CREATE USER
// =====================================================

router.post(
  "/adduser",
  authenticateUser,
  uploadSingleImage,
  createUser
);

// =====================================================
// GET USERS
// =====================================================

router.get(
  "/getusers",
  authenticateUser,
  authorizeRoles("admin", "principal", "hod"),
  getUsers
);

// =====================================================
// GET USER
// =====================================================

router.get(
  "/getuser/:id",
  authenticateUser,
  authorizeRoles("admin", "principal", "hod"),
  getUserById
);

// =====================================================
// UPDATE USER
// =====================================================

router.put(
  "/updateuser/:id",
  authenticateUser,
  uploadSingleImage,
  updateUser
);

// =====================================================
// COMPLETE DELETE
// =====================================================
// Existing frontend route preserved.
//
// Deletes:
// 1. Cloudinary image
// 2. Clerk account
// 3. MongoDB User document
//
// :id can be either:
// MongoDB _id
// OR
// Clerk user ID
// =====================================================

router.delete(
  "/deleteuser/:id",
  authenticateUser,
  deleteUser
);

// =====================================================
// SYNC USER
// =====================================================

router.post(
  "/syncuser",
  authenticateUser,
  syncUser
);

// =====================================================
// CURRENT USER
// =====================================================

router.get(
  "/me",
  authenticateUser,
  getCurrentUser
);

// =====================================================
// CLERK USERS
// =====================================================

router.get(
  "/clerk-users",
  authenticateUser,
  getClerkUsers
);

// =====================================================
// COMPLETE DELETE FROM CLERK USERS PAGE
// =====================================================
// Existing frontend route preserved.
//
// Even though the URL says "clerk-users",
// this will perform COMPLETE deletion.
// =====================================================

router.delete(
  "/clerk-users/:clerkId",
  authenticateUser,
  deleteClerkUser
);

router.post(
  "/bulk-upload",
  authenticateUser,
  uploadExcel,
  bulkUploadFaculty
);
export default router;