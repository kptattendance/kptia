// ==========================================================
// GOOGLE DRIVE
//
// Study material PDFs are stored in the Google Drive of the
// college's dedicated Gmail account.
//
// The server acts as that account using a refresh token
// (permission given once by the account owner).
//
// Required environment variables:
//
// GOOGLE_CLIENT_ID
// GOOGLE_CLIENT_SECRET
// GOOGLE_REFRESH_TOKEN
//
// The permission asked from Google is "drive.file":
// the server can see only the files it created itself,
// nothing else in that Drive.
//
// Files are never shared. Students read them only
// through this server, after it has checked who they are.
// ==========================================================

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_URL = "https://www.googleapis.com/drive/v3";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files";

const FOLDER_NAME = "KPT Study Material";
const FOLDER_MIME = "application/vnd.google-apps.folder";

let cachedToken = null; // { value, expiresAt }
let cachedFolderId = null;

export class DriveError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "DriveError";
    this.status = status;
  }
}

// ----------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------

export const isDriveConfigured = () => {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
};

// ----------------------------------------------------------
// ACCESS TOKEN
//
// Short lived. Fetched with the refresh token and reused
// until a minute before it expires.
// ----------------------------------------------------------

const getAccessToken = async () => {
  if (!isDriveConfigured()) {
    throw new DriveError(
      "Google Drive is not configured.",
      503
    );
  }

  if (
    cachedToken &&
    cachedToken.expiresAt > Date.now() + 60 * 1000
  ) {
    return cachedToken.value;
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    cachedToken = null;

    // invalid_grant = the permission was removed or
    // has expired. It must be given again.
    throw new DriveError(
      data.error === "invalid_grant"
        ? "Google Drive permission has expired or was removed. The admin must connect the Drive again."
        : "Could not sign in to Google Drive.",
      503
    );
  }

  cachedToken = {
    value: data.access_token,
    expiresAt:
      Date.now() + Number(data.expires_in || 3600) * 1000,
  };

  return cachedToken.value;
};

const driveFetch = async (url, options = {}) => {
  const token = await getAccessToken();

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
};

// ----------------------------------------------------------
// FOLDER
//
// All study material lives in one folder, created the
// first time it is needed.
// ----------------------------------------------------------

const getFolderId = async () => {
  if (cachedFolderId) {
    return cachedFolderId;
  }

  const query = encodeURIComponent(
    `name = '${FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false`
  );

  const searchResponse = await driveFetch(
    `${DRIVE_URL}/files?q=${query}&fields=files(id)&pageSize=1`
  );

  if (!searchResponse.ok) {
    throw new DriveError(
      "Could not read the Google Drive folder.",
      502
    );
  }

  const found = (await searchResponse.json()).files?.[0];

  if (found?.id) {
    cachedFolderId = found.id;
    return cachedFolderId;
  }

  const createResponse = await driveFetch(
    `${DRIVE_URL}/files?fields=id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: FOLDER_MIME,
      }),
    }
  );

  if (!createResponse.ok) {
    throw new DriveError(
      "Could not create the Google Drive folder.",
      502
    );
  }

  cachedFolderId = (await createResponse.json()).id;

  return cachedFolderId;
};

// ----------------------------------------------------------
// CHECK THE CONNECTION
// ----------------------------------------------------------

export const checkDriveConnection = async () => {
  if (!isDriveConfigured()) {
    return {
      connected: false,
      message: "Google Drive is not configured.",
    };
  }

  try {
    const response = await driveFetch(
      `${DRIVE_URL}/about?fields=user(emailAddress),storageQuota(limit,usage)`
    );

    if (!response.ok) {
      return {
        connected: false,
        message: "Google Drive did not respond.",
      };
    }

    const about = await response.json();

    return {
      connected: true,
      account: about.user?.emailAddress || "",
      storageUsed: Number(
        about.storageQuota?.usage || 0
      ),
      storageLimit: Number(
        about.storageQuota?.limit || 0
      ),
    };
  } catch (error) {
    return {
      connected: false,
      message: error.message,
    };
  }
};

// ----------------------------------------------------------
// START AN UPLOAD
//
// Returns a one-time upload address. The browser sends the
// file straight to Google at that address, so the file
// does not pass through this server.
//
// origin: the website address the browser is on. Google
// allows the browser upload only from that address.
//
// properties: saved with the file and checked again when
// the upload is completed.
// ----------------------------------------------------------

export const createUploadSession = async ({
  name,
  size,
  origin,
  properties,
}) => {
  const folderId = await getFolderId();

  const response = await driveFetch(
    `${UPLOAD_URL}?uploadType=resumable&fields=id`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/pdf",
        "X-Upload-Content-Length": String(size),
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify({
        name,
        mimeType: "application/pdf",
        parents: [folderId],
        appProperties: properties,
      }),
    }
  );

  const uploadUrl = response.headers.get("location");

  if (!response.ok || !uploadUrl) {
    throw new DriveError(
      "Could not start the upload to Google Drive.",
      502
    );
  }

  return uploadUrl;
};

// ----------------------------------------------------------
// FILE DETAILS
// ----------------------------------------------------------

export const getFile = async (fileId) => {
  const response = await driveFetch(
    `${DRIVE_URL}/files/${encodeURIComponent(
      fileId
    )}?fields=id,name,size,mimeType,parents,appProperties,trashed`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new DriveError(
      "Could not read the file from Google Drive.",
      502
    );
  }

  const file = await response.json();

  return {
    ...file,
    size: Number(file.size || 0),
    inFolder: (file.parents || []).includes(
      await getFolderId()
    ),
  };
};

// ----------------------------------------------------------
// READ PART OF A FILE
//
// start and end are byte positions, both included.
// ----------------------------------------------------------

export const readFileRange = async (
  fileId,
  start,
  end
) => {
  const response = await driveFetch(
    `${DRIVE_URL}/files/${encodeURIComponent(
      fileId
    )}?alt=media`,
    {
      headers: {
        Range: `bytes=${start}-${end}`,
      },
    }
  );

  if (!response.ok) {
    throw new DriveError(
      response.status === 404
        ? "The file is no longer in Google Drive."
        : "Could not read the file from Google Drive.",
      response.status === 404 ? 404 : 502
    );
  }

  return Buffer.from(await response.arrayBuffer());
};

// ----------------------------------------------------------
// DELETE A FILE
//
// A file that is already gone is not an error.
// ----------------------------------------------------------

export const deleteFile = async (fileId) => {
  if (!fileId) {
    return;
  }

  const response = await driveFetch(
    `${DRIVE_URL}/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new DriveError(
      "Could not delete the file from Google Drive.",
      502
    );
  }
};
