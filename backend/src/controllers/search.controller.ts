import { Response, NextFunction } from "express";
import { searchDriveFiles } from "../services/drive.service.js";
import type { AuthenticatedRequest, DriveFile } from "../types/index.js";
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const searchFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use userId from authenticated token
    const userId = req.userId!;
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      sendError(res, "Search query is required", { statusCode: 400 });
      return;
    }

    const results = await searchDriveFiles(userId, query);

    // Convert Mongoose documents to plain objects with proper typing
    const plainResults = results.map((file) => {
      const obj = file.toObject() as Record<string, unknown>;
      return {
        _id: obj._id?.toString(),
        userId: obj.userId,
        driveAccountId: obj.driveAccountId,
        googleFileId: obj.googleFileId,
        name: obj.name,
        mimeType: obj.mimeType,
        webViewLink: obj.webViewLink || null,
        webContentLink: obj.webContentLink || null,
        iconLink: obj.iconLink || null,
        thumbnailUrl: obj.thumbnailUrl || null,
        createdTime: obj.createdTime || null,
        modifiedTime: obj.modifiedTime || null,
        size: obj.size || 0,
        owners: obj.owners || [],
        parents: obj.parents || [],
        starred: obj.starred || false,
        trashed: obj.trashed || false,
        shared: obj.shared || false,
        isDuplicate: obj.isDuplicate !== undefined ? obj.isDuplicate : false,
        description: obj.description || ''
      };
    });

    sendSuccess<DriveFile[]>(res, plainResults as DriveFile[], {
      meta: {
        total: results.length,
        query: query
      }
    });
  } catch (error) {
    next(error);
  }
};