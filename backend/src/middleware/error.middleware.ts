import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError.js";
import { DriveAuthError } from "../utils/driveAuthError.js";
import { logger } from "../utils/logger.js";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  // Handle Drive authentication errors
  if (err instanceof DriveAuthError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Log unhandled errors
  logger.error("Unhandled Error", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: (req as any).userId,
    ip: req.ip,
  });

  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
