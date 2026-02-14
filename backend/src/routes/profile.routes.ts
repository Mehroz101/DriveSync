import express from "express";
import { getProfile, updateProfile, uploadProfilePicture, changePassword, deleteAccount } from "../controllers/profile.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const router = express.Router();

// Protected profile routes - uses token-based authentication
router.get("/", authenticateToken, getProfile);
router.put("/", authenticateToken, updateProfile);
router.post("/picture", authenticateToken, upload.single('picture'), uploadProfilePicture);
router.put("/password", authenticateToken, changePassword);
router.delete("/", authenticateToken, deleteAccount);

export default router;
