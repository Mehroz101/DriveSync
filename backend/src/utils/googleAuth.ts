import { google } from "googleapis";
import DriveAccount from "../models/driveAccount.js";

export const createGoogleAuthClient = (driveAccount: any) => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").toString().trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").toString().trim();
  const backendBase = (process.env.BACKEND_URL || "http://localhost:4000").toString().replace(/\/$/, "");
  const redirectUri = `${backendBase}/api/auth/add-drive-account/callback`;

  const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Auto token rotation
  auth.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await DriveAccount.findByIdAndUpdate(driveAccount._id, {
        accessToken: tokens.access_token,
      });
    }
    if (tokens.refresh_token) {
      await DriveAccount.findByIdAndUpdate(driveAccount._id, {
        refreshToken: tokens.refresh_token,
      });
    }
  });

  auth.setCredentials({
    access_token: driveAccount.accessToken || undefined,
    refresh_token: driveAccount.refreshToken || undefined,
  });

  return auth;
};
