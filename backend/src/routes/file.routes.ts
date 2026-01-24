import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { getAllDriveFiles, getAllDriveFilesSync, getDriveThumbnail } from "../controllers/file.controller.js";

const router = express.Router();

// Routes for individual drive files - all protected with authentication
router.post("/get-all-files-sync", authenticateToken, getAllDriveFilesSync); //used
router.post("/get-all-files", authenticateToken, getAllDriveFiles); //used
// Thumbnail proxy route - allow unauthenticated access only if desired, otherwise protect
router.get("/thumbnail", getDriveThumbnail);

export default router;
