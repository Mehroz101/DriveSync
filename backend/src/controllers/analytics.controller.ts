import { Response } from "express";
import type { 
  AuthenticatedRequest,
  StorageAnalytics, 
  FileTypeDistribution, 
  DriveUsageStats, 
  DashboardStats,
  DriveFile
} from "../types/index.js";
import { AnalyticsService } from "../services/analytics.service.js";
import { sendSuccess, sendError, normalizePagination } from '../utils/apiResponse.js';

const analyticsService = new AnalyticsService();

// Make fileRepo accessible for the getFiles function
export { analyticsService };

export const getStorageAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    sendError(res, "Unauthorized", { statusCode: 401 });
    return;
  }

  try {
    const data = await analyticsService.getStorageAnalytics(req.userId);
    sendSuccess<StorageAnalytics[]>(res, data);
  } catch (error) {
    sendError(res, error as Error, { statusCode: 500 });
  }
};

export const getFileTypeDistribution = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    sendError(res, "Unauthorized", { statusCode: 401 });
    return;
  }

  try {
    const data = await analyticsService.getFileTypeDistribution(req.userId);
    sendSuccess<FileTypeDistribution[]>(res, data);
  } catch (error) {
    sendError(res, error as Error, { statusCode: 500 });
  }
};

export const getDriveUsageStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    sendError(res, "Unauthorized", { statusCode: 401 });
    return;
  }

  try {
    const data = await analyticsService.getDriveUsageStats(req.userId);
    sendSuccess<DriveUsageStats>(res, data);
  } catch (error) {
    sendError(res, error as Error, { statusCode: 500 });
  }
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    sendError(res, "Unauthorized", { statusCode: 401 });
    return;
  }

  try {
    const data = await analyticsService.getDashboardStats(req.userId);
    sendSuccess<DashboardStats>(res, data);
  } catch (error) {
    sendError(res, error as Error, { statusCode: 500 });
  }
};

export const getFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    sendError(res, "Unauthorized", { statusCode: 401 });
    return;
  }

  try {
    const { page, limit } = normalizePagination(req.query);
    
    const {
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
      sizeMin: sizeMin ? parseInt(sizeMin as string, 10) : undefined,
      sizeMax: sizeMax ? parseInt(sizeMax as string, 10) : undefined,
      modifiedAfter: modifiedAfter as string,
      page,
      limit
    };

    const result = await analyticsService.fileRepo.getFilesByUserId(req.userId, options);
    
    sendSuccess<DriveFile[]>(res, result.files, {
      meta: {
        page: result.pagination.page,
        limit: result.pagination.totalPages,
        total: result.pagination.totalFiles,
        totalPages: result.pagination.totalPages,
        hasNext: result.pagination.hasNext,
        hasPrev: result.pagination.hasPrev
      }
    });
  } catch (error) {
    sendError(res, error as Error, { statusCode: 500 });
  }
};
