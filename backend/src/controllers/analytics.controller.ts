import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/index.js";
import { AnalyticsService } from "../services/analytics.service.js";

const analyticsService = new AnalyticsService();

// Make fileRepo accessible for the getFiles function
export { analyticsService };

export const getStorageAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = await analyticsService.getStorageAnalytics(req.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to fetch storage analytics" 
    });
  }
};
export const getFileTypeDistribution = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = await analyticsService.getFileTypeDistribution(req.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to fetch file type distribution" 
    });
  }
};

export const getDriveUsageStats = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = await analyticsService.getDriveUsageStats(req.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to fetch drive usage stats" 
    });
  }
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = await analyticsService.getDashboardStats(req.userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to fetch dashboard stats" 
    });
  }
};

export const getFiles = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const {
      limit = 50,
      page = 1,
      driveId,
      search,
      mimeTypes,
      shared,
      starred,
      trashed,
      sizeMin,
      sizeMax,
      modifiedAfter
    } = req.query;

    const options = {
      driveId: driveId as string,
      search: search as string,
      mimeTypes: mimeTypes ? (mimeTypes as string).split(',') : undefined,
      shared: shared !== undefined ? shared === 'true' : undefined,
      starred: starred !== undefined ? starred === 'true' : undefined,
      trashed: trashed !== undefined ? trashed === 'true' : undefined,
      sizeMin: sizeMin ? parseInt(sizeMin as string) : undefined,
      sizeMax: sizeMax ? parseInt(sizeMax as string) : undefined,
      modifiedAfter: modifiedAfter as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await analyticsService.fileRepo.getFilesByUserId(req.userId, options);
    
    res.json({ 
      success: true, 
      files: result.files,
      pagination: result.pagination
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to fetch files" 
    });
  }
};

// Remove categorizeMimeType function as it's now handled by the repository
