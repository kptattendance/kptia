import XLSX from "xlsx";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import { clerkClient } from "@clerk/express";

const ALLOWED_DEPARTMENTS = [
  "at",
  "ch",
  "ce",
  "cs",
  "ec",
  "ee",
  "me",
  "ps",
  "sc",
  "ot",
];

const ALLOWED_UPLOAD_ROLES = [
  "admin",
  "principal",
  "hod",
];

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// =====================================================
// CLEAN EXCEL HEADER
// =====================================================

const cleanHeader = (value) => {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
};

// =====================================================
// GOOGLE DRIVE FILE ID
// =====================================================

const getDriveFileId = (url) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    const host =
      parsed.hostname.toLowerCase();

    const allowedHosts = [
      "drive.google.com",
      "docs.google.com",
      "drive.usercontent.google.com",
    ];

    if (!allowedHosts.includes(host)) {
      return null;
    }

    // Example:
    // /file/d/FILE_ID/view

    const pathMatch =
      parsed.pathname.match(
        /\/file\/d\/([a-zA-Z0-9_-]+)/
      );

    if (pathMatch?.[1]) {
      return pathMatch[1];
    }

    // Example:
    // ?id=FILE_ID

    const queryId =
      parsed.searchParams.get("id");

    if (queryId) {
      return queryId;
    }

    return null;
  } catch {
    return null;
  }
};

// =====================================================
// DOWNLOAD GOOGLE DRIVE IMAGE
// =====================================================

const downloadGoogleDriveImage = async (
  url
) => {
  const fileId = getDriveFileId(url);

  if (!fileId) {
    throw new Error(
      "Photo must be a valid Google Drive sharing link."
    );
  }

  const downloadUrl =
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
      fileId
    )}&export=download&confirm=t`;

  const response = await fetch(
    downloadUrl,
    {
      method: "GET",
      redirect: "follow",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google Drive image download failed (${response.status}).`
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    !contentType
      .toLowerCase()
      .startsWith("image/")
  ) {
    throw new Error(
      "Google Drive did not return an image. Make sure the file is an image and sharing is set to Anyone with the link → Viewer."
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  const buffer =
    Buffer.from(arrayBuffer);

  if (!buffer.length) {
    throw new Error(
      "The Google Drive image is empty."
    );
  }

  return buffer;
};

// =====================================================
// CLOUDINARY UPLOAD
// =====================================================

const uploadBufferToCloudinary = (
  buffer
) => {
  return new Promise(
    (resolve, reject) => {
      const stream =
        cloudinary.uploader.upload_stream(
          {
            folder: "users",
            resource_type: "image",
          },
          (
            error,
            result
          ) => {
            if (error) {
              return reject(error);
            }

            resolve(result);
          }
        );

      stream.end(buffer);
    }
  );
};

// =====================================================
// CLOUDINARY CLEANUP
// =====================================================

const deleteCloudinaryImage = async (
  publicId
) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(
      publicId
    );
  } catch (error) {
    console.error(
      "Cloudinary cleanup error:",
      error
    );
  }
};

// =====================================================
// BULK FACULTY UPLOAD
// =====================================================

export const bulkUploadFaculty = async (
  req,
  res
) => {
  try {
    // =================================================
    // REQUESTER PERMISSION
    // =================================================

    const requesterRole =
      String(
        req.user?.role || ""
      ).toLowerCase();

    if (
      !ALLOWED_UPLOAD_ROLES.includes(
        requesterRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to bulk upload faculty.",
      });
    }

    // =================================================
    // FILE CHECK
    // =================================================

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload an Excel file.",
      });
    }

    // =================================================
    // READ EXCEL
    // =================================================

    const workbook = XLSX.read(
      req.file.buffer,
      {
        type: "buffer",
        cellDates: true,
        raw: false,
      }
    );

    if (
      !workbook.SheetNames ||
      workbook.SheetNames.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The Excel file does not contain any worksheet.",
      });
    }

    // =================================================
    // FIND FACULTY UPLOAD SHEET
    // =================================================

    const sheetName =
      workbook.SheetNames.find(
        (name) =>
          name
            .trim()
            .toLowerCase() ===
          "faculty upload"
      ) ||
      workbook.SheetNames[0];

    const sheet =
      workbook.Sheets[sheetName];

    if (!sheet) {
      return res.status(400).json({
        success: false,
        message:
          "Could not read the Excel worksheet.",
      });
    }

    // =================================================
    // CONVERT SHEET TO JSON
    // =================================================

    const rawRows =
      XLSX.utils.sheet_to_json(
        sheet,
        {
          defval: "",
          raw: false,
        }
      );

    if (!rawRows.length) {
      return res.status(400).json({
        success: false,
        message:
          "The Excel file contains no faculty rows.",
      });
    }

    // =================================================
    // NORMALIZE ROWS
    // =================================================

    const rows = rawRows.map(
      (rawRow, index) => {
        const row = {};

        Object.entries(
          rawRow
        ).forEach(
          ([key, value]) => {
            row[
              cleanHeader(key)
            ] = String(
              value ?? ""
            ).trim();
          }
        );

        return {
          rowNumber:
            index + 2,

          name:
            row.name || "",

          email:
            (
              row.email || ""
            ).toLowerCase(),

          phone:
            row.phone || "",

          department:
            (
              row.department ||
              ""
            ).toLowerCase(),

          photo:
            row.photo || "",
        };
      }
    );

    // =================================================
    // VALIDATE ROWS
    // =================================================

    const errors = [];
    const validRows = [];

    const emailSet =
      new Set();

    for (const row of rows) {
      const rowErrors = [];

      // NAME

      if (!row.name) {
        rowErrors.push(
          "Name is required."
        );
      }

      // EMAIL

      if (!row.email) {
        rowErrors.push(
          "Email is required."
        );
      } else if (
        !isValidEmail(
          row.email
        )
      ) {
        rowErrors.push(
          "Invalid email address."
        );
      }

      // DEPARTMENT

      if (!row.department) {
        rowErrors.push(
          "Department is required."
        );
      } else if (
        !ALLOWED_DEPARTMENTS.includes(
          row.department
        )
      ) {
        rowErrors.push(
          `Invalid department. Allowed values: ${ALLOWED_DEPARTMENTS.join(
            ", "
          )}`
        );
      }

      // DUPLICATE EMAIL INSIDE EXCEL

      if (
        row.email &&
        emailSet.has(
          row.email
        )
      ) {
        rowErrors.push(
          "Duplicate email within this Excel file."
        );
      }

      if (row.email) {
        emailSet.add(
          row.email
        );
      }

      if (rowErrors.length) {
        errors.push({
          row: row.rowNumber,
          name: row.name,
          email: row.email,
          errors: rowErrors,
        });
      } else {
        validRows.push(row);
      }
    }

    // =================================================
    // CHECK MONGODB DUPLICATES
    // =================================================

    const validEmails =
      validRows.map(
        (row) => row.email
      );

    const existingUsers =
      validEmails.length
        ? await User.find({
            email: {
              $in: validEmails,
            },
          }).select(
            "email clerkId"
          )
        : [];

    const existingEmails =
      new Set(
        existingUsers.map(
          (user) =>
            String(
              user.email
            ).toLowerCase()
        )
      );

    // =================================================
    // CREATE USERS
    // =================================================

    const created = [];

    for (const row of validRows) {
      // -----------------------------------------------
      // MONGODB DUPLICATE
      // -----------------------------------------------

      if (
        existingEmails.has(
          row.email
        )
      ) {
        errors.push({
          row: row.rowNumber,
          name: row.name,
          email: row.email,
          errors: [
            "Email already exists in MongoDB.",
          ],
        });

        continue;
      }

      let cloudinaryResult =
        null;

      let clerkUser =
        null;

      let mongoUser =
        null;

      try {
        // ---------------------------------------------
        // PHOTO
        // ---------------------------------------------

        if (row.photo) {
          const imageBuffer =
            await downloadGoogleDriveImage(
              row.photo
            );

          cloudinaryResult =
            await uploadBufferToCloudinary(
              imageBuffer
            );
        }

        // ---------------------------------------------
        // CLERK
        // ---------------------------------------------

        clerkUser =
          await clerkClient.users.createUser(
            {
              emailAddress: [
                row.email,
              ],

              firstName:
                row.name,

              publicMetadata: {
                role: "staff",
                department:
                  row.department,
              },
            }
          );

        // ---------------------------------------------
        // MONGODB
        // ---------------------------------------------

        mongoUser =
          new User({
            name: row.name,

            email: row.email,

            phone: row.phone,

            department:
              row.department,

            role: "staff",

            clerkId:
              clerkUser.id,

            imageUrl:
              cloudinaryResult?.secure_url ||
              "",

            imagePublicId:
              cloudinaryResult?.public_id ||
              "",
          });

        await mongoUser.save();

        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        created.push({
          row: row.rowNumber,

          name: row.name,

          email: row.email,

          department:
            row.department,

          clerkId:
            clerkUser.id,

          mongoId:
            mongoUser._id,
        });

        existingEmails.add(
          row.email
        );
      } catch (error) {
        console.error(
          `Faculty bulk row ${row.rowNumber} failed:`,
          error
        );

        // ---------------------------------------------
        // CLEANUP MONGODB
        // ---------------------------------------------

        if (
          mongoUser?._id
        ) {
          try {
            await User.deleteOne({
              _id:
                mongoUser._id,
            });
          } catch (
            cleanupError
          ) {
            console.error(
              "MongoDB cleanup error:",
              cleanupError
            );
          }
        }

        // ---------------------------------------------
        // CLEANUP CLERK
        // ---------------------------------------------

        if (
          clerkUser?.id
        ) {
          try {
            await clerkClient.users.deleteUser(
              clerkUser.id
            );
          } catch (
            cleanupError
          ) {
            console.error(
              "Clerk cleanup error:",
              cleanupError
            );
          }
        }

        // ---------------------------------------------
        // CLEANUP CLOUDINARY
        // ---------------------------------------------

        if (
          cloudinaryResult?.public_id
        ) {
          await deleteCloudinaryImage(
            cloudinaryResult.public_id
          );
        }

        // ---------------------------------------------
        // ERROR MESSAGE
        // ---------------------------------------------

        let message =
          "Failed to create faculty.";

        if (
          error?.errors?.[0]
            ?.message
        ) {
          message =
            error.errors[0]
              .message;
        } else if (
          error?.message
        ) {
          message =
            error.message;
        }

        errors.push({
          row: row.rowNumber,

          name: row.name,

          email: row.email,

          errors: [message],
        });
      }
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      message:
        "Faculty bulk upload completed.",

      data: {
        totalRows:
          rows.length,

        successful:
          created.length,

        failed:
          errors.length,

        created,

        errors,
      },
    });
  } catch (error) {
    console.error(
      "Bulk Faculty Upload Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to process faculty bulk upload.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};