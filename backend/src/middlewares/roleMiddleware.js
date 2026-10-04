// src/middleware/roleMiddleware.js

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = String(
      req.user?.role || ""
    )
      .trim()
      .toLowerCase();

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: "User role is not assigned.",
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action.",
      });
    }

    next();
  };
};