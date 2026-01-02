import { google } from "googleapis";
import DriveAccount from "../models/driveAccount.js";
export const createGoogleAuthClient = (driveAccount) => {
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "/auth/google/callback");
    // Auto token rotation
    auth.on("tokens", async (tokens) => {
        if (tokens.access_token) {
            await DriveAccount.findByIdAndUpdate(driveAccount._id, {
                accessToken: tokens.access_token,
            });
        }
    });
    auth.setCredentials({
        access_token: driveAccount.accessToken,
        refresh_token: driveAccount.refreshToken,
    });
    return auth;
};
