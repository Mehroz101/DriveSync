import { Request, Response, NextFunction } from "express";
import { searchDriveFiles } from "../services/drive.service.js";

export const searchFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Search query is required" });
    }

    const results = await searchDriveFiles(userId, query);

    res.json({ results });
  } catch (error) {
    next(error);
  }
};