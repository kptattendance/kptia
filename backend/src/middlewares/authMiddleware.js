// src/middleware/authMiddleware.js

import { getAuth, clerkClient } from "@clerk/express";
import User from "../models/User.js";

// --------------------------------------------------
// USER CACHE
//
// The role and department of a signed-in user are
// needed on every request. They are read from MongoDB
// once and remembered for a short time, instead of
// calling the Clerk API on every request.
//
// A role or department changed by the admin takes
// effect within CACHE_TTL_MS.
// --------------------------------------------------

const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_USERS = 5000;

const userCache = new Map();

const loadUser = async (clerkId) => {
  const mongoUser = await User.findOne({ clerkId })
    .select("email role department")
    .lean();

  if (mongoUser) {
    return {
      id: clerkId,
      email: mongoUser.email,
      role: mongoUser.role || null,
      department: mongoUser.department || null,
    };
  }

  // Signed in with Clerk but not yet registered in
  // MongoDB (first sign-in, before /syncuser).

  const clerkUser = await clerkClient.users.getUser(clerkId);

  if (!clerkUser) {
    return null;
  }

  return {
    id: clerkUser.id,
    email: clerkUser.emailAddresses?.[0]?.emailAddress,
    role: clerkUser.publicMetadata?.role || null,
    department: clerkUser.publicMetadata?.department || null,
    // Not cached, so that registration is picked up at once.
    unregistered: true,
  };
};

export const authenticateUser = async (req, res, next) => {
  try {
    // --------------------------------------------------
    // VERIFY CLERK SESSION
    // --------------------------------------------------

    const auth = getAuth(req);

    if (!auth?.isAuthenticated || !auth?.userId) {
      return res.status(401).json({
        error: "Unauthorized. No authenticated Clerk user found.",
      });
    }

    // --------------------------------------------------
    // ROLE + DEPARTMENT
    // --------------------------------------------------

    const cached = userCache.get(auth.userId);

    if (cached && cached.expiresAt > Date.now()) {
      req.user = { ...cached.user };
      return next();
    }

    const user = await loadUser(auth.userId);

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized. Clerk user not found.",
      });
    }

    const { unregistered, ...requestUser } = user;

    if (!unregistered) {
      if (userCache.size >= CACHE_MAX_USERS) {
        userCache.clear();
      }

      userCache.set(auth.userId, {
        user: requestUser,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    req.user = { ...requestUser };

    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error?.message);

    return res.status(401).json({
      error: "Unauthorized request",
    });
  }
};

// --------------------------------------------------
// Forget a cached user, so that a changed role or
// department is used on that user's next request.
// --------------------------------------------------

export const clearUserCache = (clerkId) => {
  if (clerkId) {
    userCache.delete(clerkId);
  } else {
    userCache.clear();
  }
};
