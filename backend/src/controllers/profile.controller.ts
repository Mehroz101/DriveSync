import { Response, NextFunction } from "express";
import User from "../models/user.js";
import { ApiError, ErrorCode } from "../utils/apiError.js";
import type { AuthenticatedRequest, User as UserType } from "../types/index.js";
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import cloudinary from '../config/cloudinary.js';
import { logger } from '../utils/logger.js';
import { validatePasswordStrength } from '../utils/validation.js';

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use userId from authenticated token
    const userId = req.userId!;
    const user = await User.findById(userId);
    
    if (!user) {
      sendError(res, "User not found", { statusCode: 404 });
      return;
    }

    const userResponse: UserType = {
      id: user._id.toString(),
      email: user.email,
      name: user.name || '',
      picture: user.picture || undefined,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      status: 'active',
      authType: user.authType
    };

    sendSuccess<UserType>(res, userResponse);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { name, email } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, "User not found", { statusCode: 404 });
      return;
    }

    // If email is changing, check it's not already taken
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        sendError(res, "Email already in use", { statusCode: 409 });
        return;
      }
      user.email = email;
    }

    if (name !== undefined) {
      user.name = name.trim();
    }

    await user.save();

    const userResponse: UserType = {
      id: user._id.toString(),
      email: user.email,
      name: user.name || '',
      picture: user.picture || undefined,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      status: 'active',
      authType: user.authType,
    };

    sendSuccess<UserType>(res, userResponse, { message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const uploadProfilePicture = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const file = req.file;

    if (!file) {
      sendError(res, "No file provided", { statusCode: 400 });
      return;
    }

    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      sendError(res, "Only JPG, PNG, GIF and WebP images are allowed", { statusCode: 400 });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      sendError(res, "File size must be under 2MB", { statusCode: 400 });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, "User not found", { statusCode: 404 });
      return;
    }

    // Upload to Cloudinary
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'drivesync/avatars',
          public_id: `user_${userId}`,
          overwrite: true,
          transformation: [
            { width: 256, height: 256, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string; public_id: string });
        }
      );
      uploadStream.end(file.buffer);
    });

    // Update user picture
    user.picture = result.secure_url;
    await user.save();

    const userResponse: UserType = {
      id: user._id.toString(),
      email: user.email,
      name: user.name || '',
      picture: user.picture,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      status: 'active',
      authType: user.authType,
    };

    sendSuccess<UserType>(res, userResponse, { message: 'Profile picture updated successfully' });
  } catch (error) {
    logger.error('Upload profile picture error', { error: (error as Error).message });
    next(error);
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      sendError(res, "Current and new passwords are required", { statusCode: 400 });
      return;
    }

    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.valid) {
      sendError(res, passwordCheck.error!, { statusCode: 400 });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, "User not found", { statusCode: 404 });
      return;
    }

    if (user.authType !== 'email' || !user.password) {
      sendError(res, "Password change is only available for email accounts", { statusCode: 400 });
      return;
    }

    const bcrypt = await import('bcryptjs');
    const isMatch = await bcrypt.default.compare(currentPassword, user.password);
    if (!isMatch) {
      sendError(res, "Current password is incorrect", { statusCode: 401 });
      return;
    }

    const hashed = await bcrypt.default.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    sendSuccess(res, undefined, { message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      sendError(res, "User not found", { statusCode: 404 });
      return;
    }

    // For email accounts, verify password
    if (user.authType === 'email' && user.password) {
      if (!password) {
        sendError(res, "Password is required to delete account", { statusCode: 400 });
        return;
      }
      const bcrypt = await import('bcryptjs');
      const isMatch = await bcrypt.default.compare(password, user.password);
      if (!isMatch) {
        sendError(res, "Password is incorrect", { statusCode: 401 });
        return;
      }
    }

    // Delete related data
    const DriveAccount = (await import('../models/driveAccount.js')).default;
    const File = (await import('../models/file.js')).default;

    await File.deleteMany({ userId });
    await DriveAccount.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    sendSuccess(res, undefined, { message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};
