import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";

import connectDB from "./config/db.js";
import hodIARoutes from "./routes/hodIARoutes.js";
import userRoutes from "./routes/userRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import iaRoutes from "./routes/iaRoutes.js";
import studentAcademicRoutes from "./routes/studentAcademicRoutes.js";
import courseAllocationRoutes from "./routes/courseAllocationRoutes.js";
import courseOutcomeRoutes from "./routes/courseOutcomeRoutes.js";
import studyMaterialRoutes from "./routes/studyMaterialRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import attainmentRoutes from "./routes/attainmentRoutes.js";

dotenv.config();

const app = express();

// Do not announce the server software
app.disable("x-powered-by");

// Basic security headers on every response
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });

  next();
});

const allowedOrigins = [
  "http://localhost:3000",
  "https://local.ia.kptmangaluru.in",
  "https://ia.kptmangaluru.in",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    credentials: true,
  })
);

// Wait for the database before handling a request.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      message:
        "The server could not reach the database. Please try again.",
    });
  }
});

app.use(clerkMiddleware());

app.use(express.json({ limit: "1mb" }));

// =====================================================
// DATABASE OPERATOR GUARD
//
// Rejects request data with keys such as "$ne" or
// "a.b", which could otherwise turn a value into a
// database query operator.
// =====================================================

const hasUnsafeKey = (value, depth = 0) => {
  if (depth > 20 || value === null || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(
    ([key, inner]) =>
      key.startsWith("$") ||
      key.includes(".") ||
      hasUnsafeKey(inner, depth + 1)
  );
};

app.use((req, res, next) => {
  if (
    hasUnsafeKey(req.body) ||
    hasUnsafeKey(req.query) ||
    hasUnsafeKey(req.params)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data.",
    });
  }

  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "KPT Attendance & IA API is running",
  });
});

const PORT = process.env.PORT || 5000;

app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/ia", iaRoutes);
app.use(
  "/api/hod/ia",
  hodIARoutes
);
app.use(
  "/api/students",
  studentAcademicRoutes
);
app.use(
  "/api/allocations",
  courseAllocationRoutes
);
app.use(
  "/api/course-outcomes",
  courseOutcomeRoutes
);
app.use(
  "/api/materials",
  studyMaterialRoutes
);
app.use(
  "/api/mentors",
  mentorRoutes
);
app.use(
  "/api/attainment",
  attainmentRoutes
);
// =====================================================
// ERRORS NOT HANDLED BY A ROUTE
//
// For example an upload that is too large. The details
// stay in the server log; the browser gets a short
// message.
// =====================================================

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error?.message);

  const tooLarge =
    error?.code === "LIMIT_FILE_SIZE" ||
    error?.type === "entity.too.large";

  res.status(tooLarge ? 413 : 400).json({
    success: false,
    message: tooLarge
      ? "The file or data sent is too large."
      : error?.message?.startsWith("Only ")
      ? error.message
      : "The request could not be processed.",
  });
});

connectDB()
  .then(() => {
    if (process.env.NODE_ENV !== "production") {
      app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
      });
    }
  })
  .catch(() => {
    // Locally there is nothing to serve without a database.
    // On Vercel the next request tries to connect again.
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  });

export default app;