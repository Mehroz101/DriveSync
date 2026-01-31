import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { deleteFiles, getAllDriveFiles, getAllDriveFilesSync, getDriveThumbnail, permanentlyDeleteTrashedFiles } from "../controllers/file.controller.js";

const router = express.Router();

// Routes for individual drive files - all protected with authentication
router.post("/get-all-files-sync", authenticateToken, getAllDriveFilesSync); //used
router.post("/get-all-files", authenticateToken, getAllDriveFiles); //used

// Delete multiple files (DB + Google Drive)
router.post("/delete-files", authenticateToken, deleteFiles);

// Permanently delete trashed files
router.post("/permanently-delete-trashed", authenticateToken, permanentlyDeleteTrashedFiles);

// Thumbnail proxy
router.get("/thumbnail", getDriveThumbnail);

export default router;
