import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { deleteFiles, getAllDriveFiles, getAllDriveFilesSync, getDriveThumbnail, permanentlyDeleteTrashedFiles, uploadFile, getFolderContents, getFilesByParent, proxyFileContent } from "../controllers/file.controller.js";
import multer from "multer";

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Routes for individual drive files - all protected with authentication
router.post("/get-all-files-sync", authenticateToken, getAllDriveFilesSync); //used
router.post("/get-all-files", authenticateToken, getAllDriveFiles); //used

// Folder navigation
router.get("/folder", authenticateToken, getFolderContents);
router.get("/folder/:parentId", authenticateToken, getFilesByParent);

// File content proxy for preview (images, video, audio)
router.get("/preview/:fileId", authenticateToken, proxyFileContent);

// Delete multiple files (DB + Google Drive)
router.post("/delete-files", authenticateToken, deleteFiles);

// Permanently delete trashed files
router.post("/permanently-delete-trashed", authenticateToken, permanentlyDeleteTrashedFiles);

// Thumbnail proxy
router.get("/thumbnail", getDriveThumbnail);

// Upload file
router.post("/upload", authenticateToken, upload.single('file'), uploadFile);

export default router;
