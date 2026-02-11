import { DriveAccountRepository } from '../repositories/driveAccount.repository.js';
import { FileRepository } from '../repositories/file.repository.js';
import { logger } from '../utils/logger.js';

export class AnalyticsService {
  private driveAccountRepo: DriveAccountRepository;
  public fileRepo: FileRepository;

  constructor() {
    this.driveAccountRepo = new DriveAccountRepository();
    this.fileRepo = new FileRepository();
  }

  /**
   * Get comprehensive dashboard statistics for a user
   */
  async getDashboardStats(userId: string) {
    try {
      logger.info('Fetching dashboard stats', { userId });

      // Get drive accounts with stats using optimized aggregation
      const driveAccounts = await this.driveAccountRepo.getDriveAccountsWithStats(userId);
      
      // Get file statistics
      const fileStats = await this.fileRepo.getFileStats(userId);
      
      // Calculate totals
      const totalStorageUsed = driveAccounts.reduce((sum, account) => 
        sum + (account.storage?.used || 0), 0
      );
      
      const totalStorageLimit = driveAccounts.reduce((sum, account) => 
        sum + (account.storage?.total || 0), 0
      );
      
      const totalFiles = fileStats?.totalFiles || 0;
      const duplicateFiles = fileStats?.duplicateFiles || 0;
      const duplicateSize = fileStats?.duplicateSize || 0;
      const sharedFiles = fileStats?.sharedFiles || 0;
      const starredFiles = fileStats?.starredFiles || 0;
      
      const storagePercentage = totalStorageLimit > 0 
        ? (totalStorageUsed / totalStorageLimit) * 100 
        : 0;

      const result = {
        summary: {
          totalDrives: driveAccounts.length,
          totalFiles,
          totalStorageUsed,
          totalStorageLimit,
          storagePercentage: Math.round(storagePercentage * 100) / 100,
          duplicateFiles,
          duplicateSize,
          sharedFiles,
          starredFiles,
          duplicatePercentage: totalFiles > 0 
            ? Math.round((duplicateFiles / totalFiles) * 10000) / 100 
            : 0
        },
        drives: driveAccounts,
        fileStats,
        lastUpdated: new Date().toISOString()
      };

      logger.info('Dashboard stats fetched successfully', { 
        userId, 
        driveCount: driveAccounts.length,
        totalFiles 
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to fetch dashboard stats', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get storage analytics across all drives
   */
  async getStorageAnalytics(userId: string) {
    try {
      logger.info('Fetching storage analytics', { userId });

      const driveAccounts = await this.driveAccountRepo.getDriveAccountsWithStats(userId);
      
      // Defensive: ensure we have an array
      const safeDriveAccounts = Array.isArray(driveAccounts) ? driveAccounts : [];
      
      const analytics = safeDriveAccounts.map(account => {
        const owner = account?.owner || {};
        const used = account?.storage?.used ?? 0;
        const total = account?.storage?.total ?? 0;
        const percentage = total > 0 ? Math.round((used / total) * 10000) / 100 : 0;

        return {
          driveId: account?._id,
          owner: {
            displayName: owner.displayName || owner.name || 'Unknown',
            emailAddress: owner.emailAddress || owner.email || null
          },
          storage: {
            used,
            total,
            percentage
          },
          stats: account?.stats || {}
        };
      });

      // Sort by storage usage descending
      analytics.sort((a, b) => b.storage.used - a.storage.used);

      logger.info('Storage analytics fetched successfully', { 
        userId, 
        driveCount: analytics.length 
      });

      return analytics;
    } catch (error: any) {
      logger.error('Failed to fetch storage analytics', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get file type distribution
   */
  async getFileTypeDistribution(userId: string) {
    try {
      logger.info('Fetching file type distribution', { userId });

      const fileStats = await this.fileRepo.getFileStats(userId);
      
      if (!fileStats) {
        return [];
      }

      // Count mimeType occurrences
      const mimeTypeCounts: Record<string, number> = {};
      fileStats.mimeTypeStats.forEach((mimeType: string) => {
        mimeTypeCounts[mimeType] = (mimeTypeCounts[mimeType] || 0) + 1;
      });

      // Convert to array and sort by count
      const distribution = Object.entries(mimeTypeCounts)
        .map(([mimeType, count]) => ({
          mimeType,
          count,
          percentage: Math.round((count / fileStats.totalFiles) * 10000) / 100
        }))
        .sort((a, b) => b.count - a.count);

      logger.info('File type distribution fetched successfully', { 
        userId, 
        typeCount: distribution.length 
      });

      return distribution;
    } catch (error: any) {
      logger.error('Failed to fetch file type distribution', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get drive usage statistics
   */
  async getDriveUsageStats(userId: string) {
    try {
      logger.info('Fetching drive usage stats', { userId });

      const driveAccounts = await this.driveAccountRepo.getDriveAccountsWithStats(userId);
      
      const stats = {
        totalDrives: driveAccounts.length,
        activeDrives: driveAccounts.filter(d => d.connectionStatus === 'active').length,
        revokedDrives: driveAccounts.filter(d => d.connectionStatus === 'revoked').length,
        disconnectedDrives: driveAccounts.filter(d => d.connectionStatus === 'disconnected').length,
        storageByStatus: {
          active: driveAccounts
            .filter(d => d.connectionStatus === 'active')
            .reduce((sum, d) => sum + (d.storage?.used || 0), 0),
          revoked: driveAccounts
            .filter(d => d.connectionStatus === 'revoked')
            .reduce((sum, d) => sum + (d.storage?.used || 0), 0),
          disconnected: driveAccounts
            .filter(d => d.connectionStatus === 'disconnected')
            .reduce((sum, d) => sum + (d.storage?.used || 0), 0)
        },
        averageStorageUsage: driveAccounts.length > 0
          ? Math.round(
              (driveAccounts.reduce((sum, d) => sum + (d.storage?.used || 0), 0) / 
              driveAccounts.length) * 100
            ) / 100
          : 0
      };

      logger.info('Drive usage stats fetched successfully', { 
        userId, 
        totalDrives: stats.totalDrives 
      });

      return stats;
    } catch (error: any) {
      logger.error('Failed to fetch drive usage stats', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}