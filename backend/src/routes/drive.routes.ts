import express from "express";
import { getDriveFiles, getMyProfile, getAllDriveAccounts, addDriveAccount, removeDriveAccount, syncDriveFiles } from "../controllers/drive.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Routes for individual drive files - all protected with authentication
router.get("/files", authenticateToken, getDriveFiles);

// Routes for managing drive accounts - all protected
router.get("/accounts", authenticateToken, getAllDriveAccounts);
router.post("/accounts", authenticateToken, addDriveAccount);
router.delete("/accounts/:accountId", authenticateToken, removeDriveAccount);
router.post("/sync", authenticateToken, syncDriveFiles);

// Profile route - protected
router.get("/profile", authenticateToken, getMyProfile);

export default router;
