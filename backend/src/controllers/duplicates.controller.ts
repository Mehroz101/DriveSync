import { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/index.js";
import { getDuplicatesService } from "../services/duplicates.service.js";

export const getDuplicates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const duplicates = await getDuplicatesService(req.userId);

    res.json({
      success: true,
      data: duplicates,
      meta: {
        total: duplicates.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
