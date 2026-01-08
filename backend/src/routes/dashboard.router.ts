import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { dashboardStates } from "../controllers/dashboard.controller.js";

const router = express.Router();

// Routes for individual drive files - all protected with authentication
router.get("/states", authenticateToken, dashboardStates);
// router.get("/profile", authenticateToken, getMyProfile);

export default router;
