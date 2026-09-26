import multer from "multer";

// ==========================================================
// MEMORY STORAGE
// Excel file will be available as req.file.buffer
// ==========================================================

const storage = multer.memoryStorage();

// ==========================================================
// MULTER CONFIGURATION
// ==========================================================

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ];

    const allowedExtensions = [
      ".xlsx",
      ".xls",
    ];

    const fileName = file.originalname.toLowerCase();

    const hasValidExtension =
      allowedExtensions.some((ext) =>
        fileName.endsWith(ext)
      );

    const hasValidMimeType =
      allowedMimeTypes.includes(file.mimetype);

    if (
      hasValidExtension ||
      hasValidMimeType
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only Excel files (.xlsx or .xls) are allowed."
        )
      );
    }
  },
});

// ==========================================================
// EXCEL UPLOAD MIDDLEWARE
// Field name MUST be "file"
// ==========================================================

export const uploadExcel =
  upload.single("file");