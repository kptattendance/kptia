import express from "express";

import {
  getAllocations,
  getMyAllocations,
  getFacultyOptions,
  saveAllocation,
  deleteAllocation,
} from "../controllers/courseAllocationController.js";

import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authenticateUser);

// Subjects allocated to the logged-in faculty
router.get("/my", getMyAllocations);

// Faculty list for the allocation form
router.get("/faculty-options", getFacultyOptions);

// Allocations of a department / semester
router.get("/", getAllocations);

// Allocate a subject to a faculty
router.post("/", saveAllocation);

// Remove an allocation
router.delete("/:id", deleteAllocation);

export default router;
