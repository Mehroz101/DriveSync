import express from "express";
import { searchFiles } from "../controllers/search.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Search files across all connected drives - protected route
router.get("/search", authenticateToken, searchFiles);

export default router;