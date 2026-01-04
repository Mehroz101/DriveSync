import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";
import { Model, Document } from "mongoose";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers["authorization"];
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    const cookieToken = req.cookies?.token;
    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // Check if user exists
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Attach user info to request
    req.userId = payload.userId;
    req.userEmail = payload.email;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
};

/**
 * Generic ownership validation middleware factory
 * @param model - Mongoose model to query
 * @param paramName - Name of the parameter containing the resource ID (default: 'id')
 * @param resourceName - Human-readable name of the resource for error messages
 */
export function validateOwnership<T extends Document & { userId: any }>(
  model: Model<T>,
  paramName: string = "id",
  resourceName: string = "Resource"
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const resourceId = req.params[paramName];

      if (!resourceId) {
        return res
          .status(400)
          .json({ error: `${resourceName} ID is required` });
      }

      // Find the resource
      const resource = await model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ error: `${resourceName} not found` });
      }

      // Check ownership
      const resourceUserId = resource.userId.toString();
      const authenticatedUserId = req.userId;

      if (resourceUserId !== authenticatedUserId) {
        return res.status(403).json({
          error: `You do not have permission to access this ${resourceName.toLowerCase()}`,
        });
      }

      // Optionally attach the resource to the request for use in the controller
      (req as any)[resourceName.toLowerCase()] = resource;

      next();
    } catch (error) {
      console.error(`Ownership validation error for ${resourceName}:`, error);
      res.status(500).json({ error: "Ownership validation error" });
    }
  };
}
