import File from '../models/file.js';
import { Types, PipelineStage } from 'mongoose';

export class FileRepository {
  /**
   * Get files with optimized querying and aggregation
   */
  async getFilesByUserId(userId: string, options: {
    driveId?: string;
    search?: string;
    mimeTypes?: string[];
    shared?: boolean;
    starred?: boolean;
    trashed?: boolean;
    sizeMin?: number;
    sizeMax?: number;
    modifiedAfter?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      driveId,
      search,
      mimeTypes,
      shared,
      starred,
      trashed,
      sizeMin,
      sizeMax,
      modifiedAfter,
      page = 1,
      limit = 50,
      sortBy = 'modifiedTime',
      sortOrder = 'desc'
    } = options;

    // Build match conditions
    const matchConditions: { [key: string]: any } = {
      userId: new Types.ObjectId(userId)
    }; // Using indexed type to allow dynamic MongoDB query properties

    if (driveId && driveId !== 'all') {
      matchConditions.driveAccountId = new Types.ObjectId(driveId);
    }

    if (search) {
      matchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mimeType: { $regex: search, $options: 'i' } }
      ];
    }

    if (mimeTypes && mimeTypes.length > 0) {
      matchConditions.mimeType = { $in: mimeTypes };
    }

    if (shared !== undefined) matchConditions.shared = shared;
    if (starred !== undefined) matchConditions.starred = starred;
    if (trashed !== undefined) matchConditions.trashed = trashed;

    if (sizeMin !== undefined || sizeMax !== undefined) {
      matchConditions.size = {};
      if (sizeMin !== undefined) matchConditions.size.$gte = sizeMin;
      if (sizeMax !== undefined) matchConditions.size.$lte = sizeMax;
    }

    if (modifiedAfter) {
      matchConditions.modifiedTime = { $gte: new Date(modifiedAfter) };
    }

    // Use aggregation pipeline for efficient querying
    const pipeline: PipelineStage[] = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'driveaccounts',
          localField: 'driveAccountId',
          foreignField: '_id',
          as: 'driveAccount'
        }
      },
      { $unwind: '$driveAccount' },
      {
        $project: {
          name: 1,
          mimeType: 1,
          size: 1,
          modifiedTime: 1,
          createdTime: 1,
          shared: 1,
          starred: 1,
          trashed: 1,
          isDuplicate: 1,
          iconLink: 1,
          webViewLink: 1,
          owners: 1,
          driveAccountId: 1,
          'driveAccount.owner.displayName': 1,
          'driveAccount.owner.emailAddress': 1,
          'driveAccount.connectionStatus': 1
        }
      },
      { 
        $sort: { 
          [sortBy]: sortOrder === 'desc' ? -1 : 1,
          _id: 1 // Secondary sort for consistent pagination
        } 
      }
    ];

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip } as PipelineStage);
    pipeline.push({ $limit: limit } as PipelineStage);

    const files = await File.aggregate(pipeline);

    // Get total count for pagination
    const totalCountPipeline: PipelineStage[] = [
      { $match: matchConditions },
      { $count: 'total' }
    ];
    
    const countResult = await File.aggregate(totalCountPipeline);
    const totalFiles = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalFiles / limit);

    return {
      files,
      pagination: {
        page,
        totalPages,
        totalFiles,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Bulk delete files efficiently
   */
  async bulkDeleteFiles(fileIds: string[], userId: string) {
    const objectIds = fileIds.map(id => new Types.ObjectId(id));
    
    const result = await File.deleteMany({
      _id: { $in: objectIds },
      userId: new Types.ObjectId(userId)
    });

    return {
      deletedCount: result.deletedCount,
      success: result.deletedCount === fileIds.length
    };
  }

  /**
   * Get file statistics for a user
   */
  async getFileStats(userId: string) {
    const pipeline: PipelineStage[] = [
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          duplicateFiles: {
            $sum: { $cond: [{ $eq: ['$isDuplicate', true] }, 1, 0] }
          },
          sharedFiles: {
            $sum: { $cond: [{ $eq: ['$shared', true] }, 1, 0] }
          },
          starredFiles: {
            $sum: { $cond: [{ $eq: ['$starred', true] }, 1, 0] }
          },
          trashedFiles: {
            $sum: { $cond: [{ $eq: ['$trashed', true] }, 1, 0] }
          },
          mimeTypeStats: {
            $push: '$mimeType'
          }
        }
      }
    ];

    const result = await File.aggregate(pipeline);
    
    // Calculate actual duplicates from files (by name+size)
    const duplicateStatsPipeline: PipelineStage[] = [
      {
        $match: {
          userId: new Types.ObjectId(userId),
          trashed: false,
          mimeType: { $ne: "application/vnd.google-apps.folder" },
        },
      },
      {
        $group: {
          _id: { name: "$name", size: "$size" },
          count: { $sum: 1 },
          size: { $first: "$size" },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      {
        $group: {
          _id: null,
          duplicateCount: { $sum: 1 },
          totalDuplicateSize: {
            $sum: {
              $multiply: [{ $subtract: ["$count", 1] }, "$size"],
            },
          },
        },
      },
    ];
    
    const duplicateResult = await File.aggregate(duplicateStatsPipeline);
    
    const baseStats = result[0] || null;
    
    if (!baseStats) {
      return null;
    }
    
    // Override duplicateFiles with actual count from name+size grouping
    baseStats.duplicateFiles = duplicateResult[0]?.duplicateCount || 0;
    baseStats.duplicateSize = duplicateResult[0]?.totalDuplicateSize || 0;
    
    return baseStats;
  }

  /**
   * Get duplicate files for a user
   */
  async getDuplicateFiles(userId: string, options: {
    limit?: number;
    page?: number;
  } = {}) {
    const { limit = 50, page = 1 } = options;
    const skip = (page - 1) * limit;

    return await File.find({
      userId: new Types.ObjectId(userId),
      isDuplicate: true
    })
    .select('name size mimeType modifiedTime driveAccountId')
    .sort({ size: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  }
}