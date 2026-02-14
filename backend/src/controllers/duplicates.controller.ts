import { Response, NextFunction } from "express";
import type { AuthenticatedRequest, DuplicateGroup } from "../types/index.js";
import { getDuplicatesService } from "../services/duplicates.service.js";
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getDuplicates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      sendError(res, "Unauthorized", { statusCode: 401 });
      return;
    }

    const duplicates = await getDuplicatesService(req.userId);

    sendSuccess<DuplicateGroup[]>(res, duplicates, {
      meta: {
        total: duplicates.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
