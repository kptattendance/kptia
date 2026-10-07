// src/middleware/authMiddleware.js

import { getAuth, clerkClient } from "@clerk/express";

export const authenticateUser = async (req, res, next) => {


  try {
 

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



    const user = await clerkClient.users.getUser(auth.userId);

  

    if (!user) {
      console.log("\n❌ CLERK USER NOT FOUND");

      return res.status(401).json({
        error: "Unauthorized. Clerk user not found.",
      });
    }


    req.user = {
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress,
      role: user.publicMetadata?.role || null,
      department: user.publicMetadata?.department || null,
    };

    

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