// src/middlewares/departmentScope.js

import mongoose from "mongoose";

// =====================================================
// HOD OWN DEPARTMENT
//
// A HOD may work only with records of their own
// department. Other roles are not affected here;
// they are limited by authorizeRoles.
//
// getDepartments(req) returns the department(s) the
// request touches. Use the helpers below.
// =====================================================

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const hodOwnDepartment = (getDepartments) => {
  return async (req, res, next) => {
    try {
      if (normalize(req.user?.role) !== "hod") {
        return next();
      }

      const hodDepartment = normalize(
        req.user?.department
      );

      if (!hodDepartment) {
        return res.status(403).json({
          success: false,
          message: "HOD department is not assigned.",
        });
      }

      const departments = (
        await getDepartments(req)
      )
        .map(normalize)
        .filter(Boolean);

      if (
        departments.some(
          (department) =>
            department !== hodDepartment
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only manage records of your own department.",
        });
      }

      next();
    } catch (error) {
      console.error(
        "Department scope error:",
        error?.message
      );

      return res.status(500).json({
        success: false,
        message: "Failed to verify department access.",
      });
    }
  };
};

// Department sent in the request body.
export const bodyDepartment = (req) => [
  req.body?.department,
];

// Department of the stored record named by :id.
// An unknown id is left to the controller (404).
export const recordDepartment = (Model) => {
  return async (req) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return [];
    }

    const record = await Model.findById(id)
      .select("department")
      .lean();

    return [record?.department];
  };
};

// Stored record and, when the body moves it to another
// department, the new department as well.
export const recordAndBodyDepartment = (Model) => {
  const stored = recordDepartment(Model);

  return async (req) => [
    ...(await stored(req)),
    req.body?.department,
  ];
};
