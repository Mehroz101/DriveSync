import express from "express";
import { google } from "googleapis";
import User from "../models/user.js";

const router = express.Router();

router.get("/files/:userId", async (req, res) => {
  try {
    console.log("Fetching files for userId:", req.params.userId);
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send("User not found");

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "/auth/google/callback"
    );

    auth.setCredentials({
      access_token: user.accessToken,
      // refresh_token: user.refreshToken,
    });

    const drive = google.drive({ version: "v3", auth });
    let files: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const response:any = await drive.files.list({
        pageSize: 100,
           fields: `nextPageToken, files(id, name, mimeType, description, starred, trashed, parents, createdTime, modifiedTime, iconLink, webViewLink, webContentLink, owners(displayName, emailAddress), permissions)`,

        pageToken: nextPageToken,
      });

      if (response.data.files) {
        files = files.concat(response.data.files);
      }

      nextPageToken = response.data.nextPageToken ?? undefined;
    } while (nextPageToken);

    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/profile/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    console.log("userId:", req.params.userId);  
    if (!user) return res.status(404).send("User not found");

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "/auth/google/callback"
    );

    auth.setCredentials({
      access_token: user.accessToken,
    });

    const oauth2 = google.oauth2({ version: "v2", auth });

    const profileResponse = await oauth2.userinfo.get();
    const profile = profileResponse.data;

    res.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });
  } catch (err: any) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
