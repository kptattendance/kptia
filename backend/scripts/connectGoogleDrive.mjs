// ==========================================================
// CONNECT GOOGLE DRIVE
//
// Run once, on your own computer:
//
//   npm run connect-drive
//
// Before running, put these two lines in backend/.env
// (from the OAuth client you created in Google Cloud):
//
//   GOOGLE_CLIENT_ID=...
//   GOOGLE_CLIENT_SECRET=...
//
// If the OAuth client is of type "Web application", add
// this under "Authorized redirect URIs" in Google Cloud:
//
//   http://localhost:53682/callback
//
// A client of type "Desktop app" needs nothing added.
//
// The script opens Google in your browser. Sign in with the
// college's study material Gmail account and press Allow.
// It then saves GOOGLE_REFRESH_TOKEN into backend/.env and
// shows the three values to add in Vercel.
// ==========================================================

import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const ENV_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".env"
);

dotenv.config({ path: ENV_PATH, quiet: true });

// The server can see only the files it creates itself.
const SCOPE = "https://www.googleapis.com/auth/drive.file";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "\nGOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing.\n" +
      "Add them to backend/.env first, then run this again.\n"
  );

  process.exit(1);
}

// ----------------------------------------------------------
// SAVE THE TOKEN IN backend/.env
// ----------------------------------------------------------

const saveRefreshToken = (refreshToken) => {
  const line = `GOOGLE_REFRESH_TOKEN=${refreshToken}`;

  let content = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, "utf8")
    : "";

  if (/^GOOGLE_REFRESH_TOKEN=.*$/m.test(content)) {
    content = content.replace(
      /^GOOGLE_REFRESH_TOKEN=.*$/m,
      line
    );
  } else {
    content =
      content.replace(/\s*$/, "") + `\n${line}\n`;
  }

  fs.writeFileSync(ENV_PATH, content);
};

const openBrowser = (url) => {
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(command, () => {});
};

const page = (title, text) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
  `<body style="font-family:sans-serif;max-width:520px;margin:80px auto;line-height:1.6">` +
  `<h2>${title}</h2><p>${text}</p></body>`;

// ----------------------------------------------------------
// A small local page receives Google's answer.
// It is open only while this script runs.
// ----------------------------------------------------------

const state = crypto.randomBytes(16).toString("hex");

// A fixed address, so that it can be added to a
// "Web application" OAuth client in Google Cloud.
const PORT = 53682;

const redirectUri = `http://localhost:${PORT}/callback`;

const finish = (server, code) => {
  server.close();

  // Let the browser page finish loading.
  setTimeout(() => process.exit(code), 300);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);

  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const fail = (message) => {
    res
      .writeHead(400, { "Content-Type": "text/html" })
      .end(page("Not connected", message));

    console.error(`\nNot connected: ${message}\n`);

    finish(server, 1);
  };

  if (url.searchParams.get("state") !== state) {
    return fail(
      "This answer did not come from the request this script made. Please run it again."
    );
  }

  if (url.searchParams.get("error")) {
    return fail(
      "Permission was not given. Run the script again and press Allow."
    );
  }

  try {
    // --------------------------------------------------
    // EXCHANGE THE ANSWER FOR A REFRESH TOKEN
    // --------------------------------------------------

    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: url.searchParams.get("code"),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.refresh_token) {
      return fail(
        tokens.error_description ||
          "Google did not return a refresh token. Please run the script again."
      );
    }

    // --------------------------------------------------
    // WHICH ACCOUNT WAS CONNECTED
    // --------------------------------------------------

    const aboutResponse = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const account = aboutResponse.ok
      ? (await aboutResponse.json()).user?.emailAddress
      : "";

    saveRefreshToken(tokens.refresh_token);

    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end(
        page(
          "Google Drive connected",
          `${account || "The account"} is connected. You can close this tab and go back to the terminal.`
        )
      );

    console.log(
      `\nGoogle Drive connected${account ? `: ${account}` : ""}\n` +
        "\nSaved GOOGLE_REFRESH_TOKEN in backend/.env\n" +
        "\nAdd these three to the backend project in Vercel" +
        "\n(Settings > Environment Variables), then redeploy:\n" +
        `\n  GOOGLE_CLIENT_ID=${clientId}` +
        `\n  GOOGLE_CLIENT_SECRET=${clientSecret}` +
        `\n  GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n` +
        "\nKeep these values private, like a password.\n"
    );

    finish(server, 0);
  } catch (error) {
    fail(error.message);
  }
});

server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `\nPort ${PORT} is in use. Close the other window running this script and try again.\n`
      : `\n${error.message}\n`
  );

  process.exit(1);
});

server.listen(PORT, () => {
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      // Both are needed for Google to return a refresh token.
      access_type: "offline",
      prompt: "consent",
      state,
    });

  console.log(
    "\nOpening Google in your browser." +
      "\nSign in with the college's study material Gmail account and press Allow." +
      "\n\nIf the browser does not open, copy this address into it:\n\n" +
      authUrl +
      '\n\nIf Google says "redirect_uri_mismatch", add this exact address under' +
      '\n"Authorized redirect URIs" of your OAuth client in Google Cloud, wait' +
      "\na few minutes, and run this again:\n\n  " +
      redirectUri +
      "\n"
  );

  openBrowser(authUrl);
});
