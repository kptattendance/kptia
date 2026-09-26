// src/middleware/authMiddleware.js

import { getAuth, clerkClient } from "@clerk/express";

export const authenticateUser = async (req, res, next) => {
  console.log("\n==================================================");
  console.log("🔐 AUTH MIDDLEWARE STARTED");
  console.log("==================================================");

  try {
    // --------------------------------------------------
    // 1. CHECK REQUEST
    // --------------------------------------------------

    console.log("➡️ Request Method:", req.method);
    console.log("➡️ Request URL:", req.originalUrl);

    console.log(
      "➡️ Authorization Header:",
      req.headers.authorization
        ? "Bearer token PRESENT"
        : "❌ Authorization header MISSING"
    );

    // --------------------------------------------------
    // 2. GET CLERK AUTH
    // --------------------------------------------------

    const auth = getAuth(req);

    console.log("\n🔎 CLERK AUTH OBJECT:");
    console.log("isAuthenticated:", auth?.isAuthenticated);
    console.log("userId:", auth?.userId);
    console.log("sessionId:", auth?.sessionId);

    // --------------------------------------------------
    // 3. CHECK AUTHENTICATION
    // --------------------------------------------------

    if (!auth?.isAuthenticated || !auth?.userId) {
      console.log("\n❌ AUTHENTICATION FAILED");
      console.log("isAuthenticated:", auth?.isAuthenticated);
      console.log("userId:", auth?.userId);

      return res.status(401).json({
        error: "Unauthorized. No authenticated Clerk user found.",
        debug: {
          isAuthenticated: auth?.isAuthenticated,
          userId: auth?.userId || null,
        },
      });
    }

    console.log("\n✅ CLERK AUTHENTICATION SUCCESS");
    console.log("Clerk User ID:", auth.userId);

    // --------------------------------------------------
    // 4. FETCH CLERK USER
    // --------------------------------------------------

    console.log("\n👤 Fetching Clerk user...");

    const user = await clerkClient.users.getUser(auth.userId);

    console.log(
      "Clerk user fetched:",
      user ? "✅ YES" : "❌ NO"
    );

    if (!user) {
      console.log("\n❌ CLERK USER NOT FOUND");

      return res.status(401).json({
        error: "Unauthorized. Clerk user not found.",
      });
    }

    // --------------------------------------------------
    // 5. DISPLAY USER INFORMATION
    // --------------------------------------------------

    console.log("\n👤 CLERK USER DETAILS");
    console.log("------------------------------");
    console.log("User ID:", user.id);
    console.log(
      "Email:",
      user.emailAddresses?.[0]?.emailAddress
    );
    console.log(
      "Public Metadata:",
      user.publicMetadata
    );
    console.log("------------------------------");

    // --------------------------------------------------
    // 6. SET req.user
    // --------------------------------------------------

    req.user = {
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress,
      role: user.publicMetadata?.role || null,
      department: user.publicMetadata?.department || null,
    };

    console.log("\n✅ req.user CREATED:");
    console.log(req.user);

    // --------------------------------------------------
    // 7. CONTINUE
    // --------------------------------------------------

    console.log("\n➡️ AUTH PASSED → NEXT()");
    console.log("==================================================\n");

    next();

  } catch (error) {
    console.error("\n==================================================");
    console.error("❌ AUTH MIDDLEWARE ERROR");
    console.error("==================================================");

    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error status:", error?.status);
    console.error("Full error:", error);

    console.error("==================================================\n");

    return res.status(401).json({
      error: "Unauthorized request",
      debug:
        process.env.NODE_ENV === "development"
          ? error?.message
          : undefined,
    });
  }
};