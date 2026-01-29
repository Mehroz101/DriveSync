import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { getDuplicates } from "../controllers/duplicates.controller.js";

const router = express.Router();

// Routes for duplicates
router.get("/", authenticateToken, getDuplicates);

export default router;
