import { Request, Response, NextFunction } from "express";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";
import { fetchGoogleProfile } from "../services/profile.service.js";
import { ApiError } from "../utils/apiError.js";
import { AuthenticatedRequest } from "../types/index.js";

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Use userId from authenticated token
    const userId = req.userId!;
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    // Get the first connected drive account for this user to fetch profile
    // const driveAccount = await DriveAccount.findOne({ userId });
    // if (!driveAccount) throw new ApiError(404, "No drive accounts connected");

    // const profile = await fetchGoogleProfile(driveAccount);

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    });
  } catch (error) {
    next(error);
  }
};
