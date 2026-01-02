import express from "express";
import { searchFiles } from "../controllers/search.controller.js";
const router = express.Router();
// Search files across all connected drives
router.get("/search/:userId", searchFiles);
export default router;
