import mongoose from "mongoose";
import CourseAllocation from "../models/CourseAllocation.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getRole = (req) => {
  return String(req.user?.role || "")
    .trim()
    .toLowerCase();
};

const normalizeDepartment = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const isAcademicYear = (value) => {
  return /^\d{4}-\d{2}$/.test(
    String(value || "")
  );
};

// ==================================================
// ACADEMIC YEAR OF A MONTH
//
// The academic year starts in July.
//
// August 2026  -> 2026-27
// March 2027   -> 2026-27
// ==================================================

export const getAcademicYearForMonth = (
  month,
  year
) => {
  const startYear =
    Number(month) >= 7
      ? Number(year)
      : Number(year) - 1;

  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

// ==================================================
// CHECK FACULTY AGAINST COURSE ALLOCATION
//
// Returns an error message when a faculty tries to
// enter data for a subject/batch allocated to
// someone else. Returns null when it is allowed.
//
// A subject with no allocation for the academic year
// stays open to every faculty, so data entry is not
// blocked before the HOD has allocated the subject.
//
// HOD and Admin are not restricted here.
// ==================================================

export const getAllocationError = async ({
  user,
  subjectId,
  academicYear,
  batchNumbers,
}) => {
  if (
    String(user?.role || "").toLowerCase() !==
    "staff"
  ) {
    return null;
  }

  const allocations =
    await CourseAllocation.find({
      subjectId,
      academicYear,
    })
      .select("facultyClerkId batchNumbers")
      .lean();

  if (allocations.length === 0) {
    return null;
  }

  const myBatches = new Set(
    allocations
      .filter(
        (allocation) =>
          allocation.facultyClerkId === user.id
      )
      .flatMap((allocation) =>
        allocation.batchNumbers.map(Number)
      )
  );

  // Without a batch (for example course outcomes),
  // being allocated any batch of the subject is enough.
  const allowed =
    batchNumbers.length > 0
      ? batchNumbers.every((batch) =>
          myBatches.has(Number(batch))
        )
      : myBatches.size > 0;

  if (allowed) {
    return null;
  }

  if (myBatches.size === 0) {
    return `This subject is allocated to another faculty for ${academicYear}. Please contact your HOD.`;
  }

  return `You are allocated only Batch ${[...myBatches].sort().join(" & ")} of this subject for ${academicYear}. Please contact your HOD.`;
};

// ==================================================
// GET ALLOCATIONS
//
// HOD (own department) / Admin / Principal
// ==================================================

export const getAllocations = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (
      !["hod", "admin", "principal"].includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view course allocations.",
      });
    }

    const {
      academicYear,
      department,
      semester,
    } = req.query;

    if (!isAcademicYear(academicYear)) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year is required.",
      });
    }

    const filter = {
      academicYear,
    };

    if (role === "hod") {
      const hodDepartment =
        normalizeDepartment(
          req.user?.department
        );

      if (!hodDepartment) {
        return res.status(403).json({
          success: false,
          message:
            "HOD department is not assigned.",
        });
      }

      filter.department = hodDepartment;
    } else if (department) {
      filter.department =
        normalizeDepartment(department);
    }

    if (semester) {
      filter.semester = Number(semester);
    }

    const allocations =
      await CourseAllocation.find(filter)
        .populate(
          "subjectId",
          "code name semester department subjectCategory sequence"
        )
        .populate(
          "facultyId",
          "name email department imageUrl"
        )
        .sort({
          semester: 1,
          createdAt: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      count: allocations.length,
      data: allocations,
    });
  } catch (error) {
    console.error(
      "Get Allocations Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch course allocations.",
    });
  }
};

// ==================================================
// GET MY ALLOCATIONS
//
// Subjects allocated to the logged-in faculty
// ==================================================

export const getMyAllocations = async (
  req,
  res
) => {
  try {
    const { academicYear } = req.query;

    const filter = {
      facultyClerkId: req.user.id,
    };

    if (isAcademicYear(academicYear)) {
      filter.academicYear = academicYear;
    }

    const allocations =
      await CourseAllocation.find(filter)
        .populate(
          "subjectId",
          "code name semester department subjectCategory"
        )
        .sort({
          academicYear: -1,
          semester: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      count: allocations.length,
      data: allocations,
    });
  } catch (error) {
    console.error(
      "Get My Allocations Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch your subjects.",
    });
  }
};

// ==================================================
// FACULTY OPTIONS
//
// Every faculty and HOD of the college.
// A subject can be taught by a faculty of another
// department (for example Science & English).
// ==================================================

export const getFacultyOptions = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (
      !["hod", "admin", "principal"].includes(role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view the faculty list.",
      });
    }

    const faculty = await User.find({
      role: {
        $in: ["staff", "hod"],
      },
    })
      .select("name email department role")
      .sort({
        department: 1,
        name: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: faculty.length,
      data: faculty,
    });
  } catch (error) {
    console.error(
      "Get Faculty Options Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch the faculty list.",
    });
  }
};

// ==================================================
// SAVE ALLOCATION
//
// HOD (own department subjects) / Admin
//
// Allocating the same faculty to the same subject
// again replaces the batches.
// ==================================================

export const saveAllocation = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (!["hod", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only HOD or Admin can allocate subjects.",
      });
    }

    const {
      academicYear,
      subjectId,
      facultyId,
      batchNumbers,
    } = req.body;

    if (!isAcademicYear(academicYear)) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year is required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !mongoose.Types.ObjectId.isValid(facultyId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject and faculty are required.",
      });
    }

    const selectedBatches = [
      ...new Set(
        (Array.isArray(batchNumbers)
          ? batchNumbers
          : []
        ).map(Number)
      ),
    ].sort();

    if (
      selectedBatches.length === 0 ||
      selectedBatches.some(
        (batch) => ![1, 2].includes(batch)
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid batch selection.",
      });
    }

    // --------------------------------------------------
    // SUBJECT
    // --------------------------------------------------

    const subject = await Subject.findById(
      subjectId
    )
      .select("code name semester department")
      .lean();

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found.",
      });
    }

    const subjectDepartment =
      normalizeDepartment(subject.department);

    if (
      role === "hod" &&
      normalizeDepartment(req.user?.department) !==
        subjectDepartment
    ) {
      return res.status(403).json({
        success: false,
        message:
          "HOD can allocate only the subjects of their own department.",
      });
    }

    // --------------------------------------------------
    // FACULTY
    // --------------------------------------------------

    const faculty = await User.findById(
      facultyId
    )
      .select("name role clerkId")
      .lean();

    if (
      !faculty ||
      !["staff", "hod"].includes(faculty.role)
    ) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found.",
      });
    }

    // --------------------------------------------------
    // SAVE
    // --------------------------------------------------

    const allocation =
      await CourseAllocation.findOneAndUpdate(
        {
          academicYear,
          subjectId,
          facultyId,
        },
        {
          $set: {
            department: subjectDepartment,
            semester: subject.semester,
            facultyClerkId: faculty.clerkId,
            batchNumbers: selectedBatches,
            allocatedBy: req.user.id,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        `${subject.code} allocated to ${faculty.name}.`,
      data: allocation,
    });
  } catch (error) {
    console.error(
      "Save Allocation Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to save the course allocation.",
    });
  }
};

// ==================================================
// DELETE ALLOCATION
//
// HOD (own department) / Admin
// ==================================================

export const deleteAllocation = async (
  req,
  res
) => {
  try {
    const role = getRole(req);

    if (!["hod", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only HOD or Admin can remove an allocation.",
      });
    }

    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid allocation ID.",
      });
    }

    const filter = {
      _id: id,
    };

    if (role === "hod") {
      filter.department =
        normalizeDepartment(
          req.user?.department
        );
    }

    const allocation =
      await CourseAllocation.findOneAndDelete(
        filter
      );

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: "Allocation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Allocation removed.",
    });
  } catch (error) {
    console.error(
      "Delete Allocation Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to remove the allocation.",
    });
  }
};
