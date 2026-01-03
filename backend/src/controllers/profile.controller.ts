import { Request, Response, NextFunction } from "express";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";
import { fetchGoogleProfile } from "../services/profile.service.js";
import { ApiError } from "../utils/apiError.js";

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw new ApiError(404, "User not found");
    
    // Get the first connected drive account for this user to fetch profile
    const driveAccount = await DriveAccount.findOne({ userId: req.params.userId });
    if (!driveAccount) throw new ApiError(404, "No drive accounts connected");

    const profile = await fetchGoogleProfile(driveAccount);

    res.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });
  } catch (error) {
    next(error);
  }
};
