import File from "../models/file.js";
import DriveAccount from "../models/driveAccount.js";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { cacheService } from "../services/cache.service.js";
import mongoose from "mongoose";

export const getStorageAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { startDate, endDate } = req.query;
    const cacheKey = `storage-analytics-${req.userId}-${startDate || 'none'}-${endDate || 'none'}`;

    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // For now, generate mock historical data based on date range
    // In a real app, you'd query historical snapshots from database
    let days = 7;
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (endDate) {
        date.setTime(new Date(endDate as string).getTime());
      }
      date.setDate(date.getDate() - i);

      // Get storage at that date (simplified - in real app use historical data)
      const drives = await DriveAccount.find({ userId: req.userId });

      const totalStorage = drives.reduce((sum, drive) => sum + (drive.total || 0), 0);
      const usedStorage = drives.reduce((sum, drive) => sum + (drive.used || 0), 0);

      data.push({
        date: date.toISOString().split('T')[0],
        totalStorage,
        usedStorage
      });
    }

    cacheService.set(cacheKey, data, 10); // Cache for 10 minutes
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch storage analytics" });
  }
};

export const getFileTypeDistribution = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const cacheKey = `file-type-distribution-${req.userId}`;

    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const pipeline = [
      { $match: { userId: new mongoose.Types.ObjectId(req.userId), trashed: { $ne: true } } },
      {
        $project: {
          category: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: "$mimeType", regex: /image/ } }, then: "image" },
                { case: { $regexMatch: { input: "$mimeType", regex: /video/ } }, then: "video" },
                { case: { $regexMatch: { input: "$mimeType", regex: /pdf/ } }, then: "pdf" },
                { case: { $regexMatch: { input: "$mimeType", regex: /document/ } }, then: "document" },
                { case: { $regexMatch: { input: "$mimeType", regex: /spreadsheet/ } }, then: "spreadsheet" },
                { case: { $regexMatch: { input: "$mimeType", regex: /presentation/ } }, then: "presentation" },
                { case: { $regexMatch: { input: "$mimeType", regex: /application/ } }, then: "application" },
                { case: { $or: [
                    { $regexMatch: { input: "$mimeType", regex: /text/ } },
                  ] }, then: "document" }
              ],
              default: "other"
            }
          },
          size: 1
        }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          size: { $sum: "$size" }
        }
      }
    ];

    const result = await File.aggregate(pipeline);

    const totalFiles = result.reduce((sum, item) => sum + item.count, 0);
    const totalSize = result.reduce((sum, item) => sum + item.size, 0);

    const data = result.map(item => ({
      type: item._id,
      count: item.count,
      size: item.size,
      percentage: totalFiles > 0 ? (item.count / totalFiles) * 100 : 0
    }));

    cacheService.set(cacheKey, data, 10);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch file type distribution" });
  }
};

export const getDriveUsageStats = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const cacheKey = `drive-usage-stats-${req.userId}`;

    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const drives = await DriveAccount.find({ userId: req.userId })
      .select("email used total connectionStatus")
      .lean();

    const data = await Promise.all(drives.map(async (drive) => {
      const fileCount = await File.countDocuments({
        userId: req.userId,
        driveAccountId: drive._id,
        trashed: { $ne: true }
      });

      return {
        driveId: drive._id.toString(),
        driveName: drive.email,
        storageUsed: drive.used || 0,
        storageTotal: drive.total || 0,
        fileCount,
        percentage: drive.total ? ((drive.used || 0) / drive.total) * 100 : 0
      };
    }));

    cacheService.set(cacheKey, data, 10);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch drive usage stats" });
  }
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const cacheKey = `dashboard-stats-${req.userId}`;

    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const drives = await DriveAccount.find({ userId: req.userId });
    const totalFiles = await File.countDocuments({ userId: req.userId, trashed: { $ne: true } });

    const totalStorageUsed = drives.reduce((sum, drive) => sum + (drive.used || 0), 0);
    const connectedDrives = drives.length;

    // Simple duplicate detection (files with same name and size)
    const duplicates = await File.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId), trashed: { $ne: true } } },
      {
        $group: {
          _id: { name: "$name", size: "$size" },
          count: { $sum: 1 },
          files: { $push: "$$ROOT" }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    const duplicateFiles = duplicates.length;
    const duplicateSpace = duplicates.reduce((sum, dup) => sum + (dup._id.size * (dup.count - 1)), 0);

    const data = {
      totalFiles,
      totalStorageUsed,
      connectedDrives,
      duplicateFiles,
      duplicateSpace
    };

    cacheService.set(cacheKey, data, 10);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

export const getFiles = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { limit = 50, offset = 0 } = req.query;
    const cacheKey = `files-${req.userId}-${limit}-${offset}`;

    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const files = await File.find({ userId: req.userId, trashed: { $ne: true } })
      .populate('driveAccountId', 'email')
      .sort({ size: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string))
      .lean();

    const data = files.map(file => ({
      _id: file._id,
      name: file.name,
      size: file.size,
      type: categorizeMimeType(file.mimeType || ""),
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      driveName: (file.driveAccountId as any)?.email || 'Unknown',
      webViewLink: file.webViewLink,
      thumbnailUrl: file.thumbnailUrl,
      shared: file.shared,
      starred: file.starred
    }));

    cacheService.set(cacheKey, data, 10);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

function categorizeMimeType(mimeType: string): string {
  if (!mimeType) return "other";

  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("video")) return "video";
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text") || mimeType.includes("spreadsheet") || mimeType.includes("presentation")) return "document";

  return "other";
}
