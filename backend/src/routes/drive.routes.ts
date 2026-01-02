import express from "express";
import { getDriveFiles, getMyProfile, getAllDriveAccounts, addDriveAccount, removeDriveAccount, syncDriveFiles } from "../controllers/drive.controller.js";

const router = express.Router();

// Routes for individual drive files
router.get("/files/:userId", getDriveFiles);

// Routes for managing drive accounts
router.get("/accounts/:userId", getAllDriveAccounts);
router.post("/accounts/:userId", addDriveAccount);
router.delete("/accounts/:accountId", removeDriveAccount);
router.post("/sync/:userId", syncDriveFiles);

// Profile route
router.get("/profile", getMyProfile);

export default router;
