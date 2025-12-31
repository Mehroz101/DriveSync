import { google } from "googleapis";

export const getDriveFiles = async (accessToken:string) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    pageSize: 20,
    fields: "files(id, name, mimeType)",
  });

  return res.data.files;
};
