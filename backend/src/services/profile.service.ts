import { google } from "googleapis";
import { createGoogleAuthClient } from "../utils/googleAuth.js";
import { refreshAccessToken } from "./drive.service.js";

export const fetchGoogleProfile = async (driveAccount: any) => {
  const auth = await refreshAccessToken(driveAccount);

  const oauth2 = google.oauth2({ version: "v2", auth });
  const profileResponse = await oauth2.userinfo.get();
  return profileResponse.data;
};