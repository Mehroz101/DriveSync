import express from "express";
import { getDriveFiles, getMyProfile, getAllDriveAccounts, addDriveAccount, removeDriveAccount, syncAllDrivesData,syncDrive, driveStats, getDriveAccountProfileImage } from "../controllers/drive.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Routes for individual drive files - all protected with authentication
router.post("/add-account", authenticateToken, addDriveAccount); //used
router.get("/stats", authenticateToken, driveStats);
router.get("/sync-all", authenticateToken, syncAllDrivesData);
router.get("/sync-drive/:driveId", authenticateToken, syncDrive);
router.get("/get-all-drives", authenticateToken, getAllDriveAccounts);

router.get("/files", authenticateToken, getDriveFiles);
// Routes for managing drive accounts - all protected
router.get("/accounts", authenticateToken, getAllDriveAccounts);
router.delete("/accounts/:accountId", authenticateToken, removeDriveAccount);

// Profile route - protected
router.get("/profile", authenticateToken, getMyProfile);

// Profile image proxy route - protected
router.get("/profile-image", getDriveAccountProfileImage);

export default router;
