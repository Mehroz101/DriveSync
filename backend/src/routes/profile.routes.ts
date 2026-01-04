import express from "express";
import { getProfile } from "../controllers/profile.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protected profile route - uses token-based authentication
router.get("/", authenticateToken, getProfile);

export default router;
