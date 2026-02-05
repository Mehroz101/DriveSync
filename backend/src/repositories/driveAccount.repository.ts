import DriveAccount from '../models/driveAccount.js';
import File from '../models/file.js';
import { Types, PipelineStage } from 'mongoose';

export class DriveAccountRepository {
  /**
   * Get drive accounts with optimized population and aggregation
   */
  async getDriveAccountsWithStats(userId: string, options: { 
    includeStats?: boolean; 
    status?: string; 
  } = {}) {
    const { includeStats = true, status } = options;
    
    const query: { [key: string]: any } = { userId: new Types.ObjectId(userId) }; // Using indexed type to allow dynamic MongoDB query properties
    if (status) {
      query.connectionStatus = status;
    }

    if (includeStats) {
      // Use aggregation pipeline to avoid N+1 queries
      const pipeline: PipelineStage[] = [
        { $match: query },
        {
          $lookup: {
            from: 'files',
            localField: '_id',
            foreignField: 'driveAccountId',
            as: 'files'
          }
        },
        {
          $addFields: {
            stats: {
              totalFiles: { $size: '$files' },
              duplicateFiles: {
                $size: {
                  $filter: {
                    input: '$files',
                    cond: { $eq: ['$$this.isDuplicate', true] }
                  }
                }
              },
              totalSize: {
                $sum: '$files.size'
              }
            },
            storage: {
              used: {
                $sum: '$files.size'
              },
              total: '$storageQuota.limit'
            }
          }
        },
        {
          $project: {
            files: 0, // Remove the files array from result
            'owner.accessToken': 0,
            'owner.refreshToken': 0
          }
        }
      ];

      return await DriveAccount.aggregate(pipeline);
    } else {
      return await DriveAccount.find(query)
        .select('-owner.accessToken -owner.refreshToken')
        .lean();
    }
  }

  /**
   * Get drive account by ID with file count
   */
  async getDriveAccountWithFileCount(accountId: string) {
    const pipeline: PipelineStage[] = [
      { $match: { _id: new Types.ObjectId(accountId) } },
      {
        $lookup: {
          from: 'files',
          localField: '_id',
          foreignField: 'driveAccountId',
          as: 'files'
        }
      },
      {
        $addFields: {
          fileCount: { $size: '$files' },
          totalSize: { $sum: '$files.size' }
        }
      },
      {
        $project: {
          files: 0
        }
      }
    ];

    const result = await DriveAccount.aggregate(pipeline);
    return result[0] || null;
  }

  /**
   * Get multiple drive accounts with file counts efficiently
   */
  async getDriveAccountsWithFileCounts(accountIds: string[]) {
    const objectIds = accountIds.map(id => new Types.ObjectId(id));
    
    const pipeline: PipelineStage[] = [
      { $match: { _id: { $in: objectIds } } },
      {
        $lookup: {
          from: 'files',
          localField: '_id',
          foreignField: 'driveAccountId',
          as: 'files'
        }
      },
      {
        $addFields: {
          fileCount: { $size: '$files' },
          totalSize: { $sum: '$files.size' }
        }
      },
      {
        $project: {
          files: 0
        }
      }
    ];

    return await DriveAccount.aggregate(pipeline);
  }
}