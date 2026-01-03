import { google } from "googleapis";
import { createGoogleAuthClient } from "../utils/googleAuth.js";

export const fetchGoogleProfile = async (driveAccount: any) => {
  const auth = createGoogleAuthClient(driveAccount);

  const oauth2 = google.oauth2({ version: "v2", auth });
  const profileResponse = await oauth2.userinfo.get();
  return profileResponse.data;
};