import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
  getStorageAnalytics,
  getFileTypeDistribution,
  getDriveUsageStats,
  getDashboardStats,
  getFiles
} from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/storage-analytics", authenticateToken, getStorageAnalytics);
router.get("/file-type-distribution", authenticateToken, getFileTypeDistribution);
router.get("/drive-usage-stats", authenticateToken, getDriveUsageStats);
router.get("/dashboard-stats", authenticateToken, getDashboardStats);
router.get("/files", authenticateToken, getFiles);

export default router;
