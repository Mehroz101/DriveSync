import { Files, HardDrive, Database, Copy, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DrivesSummary } from "@/components/dashboard/DrivesSummary";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { formatBytes, formatNumber } from "@/lib/formatters";
import type { DashboardStats, DriveAccount, DuplicateStats } from "@/types";
import { StatsCard } from "@/components/shared/StatsCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDriveAccountStats } from "@/queries/drive/useDriveAccounts";

interface AggregatedStats {
  totalFiles: number;
  totalStorageUsed: number;
  connectedDrives: number;
  duplicateFiles: number;
  duplicateSpace: number;
  totalStorage: number;
}

function aggregateDriveStats(drives: DriveAccount[], globalDuplicates: DuplicateStats): AggregatedStats {
  const perDrive = drives?.reduce(
    (acc, drive) => ({
      totalFiles: acc.totalFiles + (drive?.stats?.totalFiles || 0),
      totalStorageUsed: acc.totalStorageUsed + (drive?.storage?.usedInDrive || drive?.storage?.used || 0),
      connectedDrives: acc.connectedDrives + 1,
      totalStorage: acc.totalStorage + (drive?.storage?.total || 0),
    }),
    {
      totalFiles: 0,
      totalStorageUsed: 0,
      connectedDrives: 0,
      totalStorage: 0,
    }
  ) || { totalFiles: 0, totalStorageUsed: 0, connectedDrives: 0, totalStorage: 0 };

  // Use global duplicate stats (not summed per-drive) to avoid double-counting cross-drive duplicates
  return {
    ...perDrive,
    duplicateFiles: globalDuplicates.duplicateFiles,
    duplicateSpace: globalDuplicates.wastedSpace,
  };
}

export default function Dashboard() {
  const { data: driveStatsResponse, isLoading, refetch } = useDriveAccountStats();
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);
  const [showingRetryMessage, setShowingRetryMessage] = useState(false);
  
  const drives = driveStatsResponse?.drives;
  const globalDuplicates = driveStatsResponse?.globalDuplicates;
  
  // Auto-retry logic for new users who might not have data yet
  useEffect(() => {
    const hasNoDrives = !isLoading && (!drives || drives.length === 0);
    const shouldRetry = hasNoDrives && retryCount < 3;
    
    if (shouldRetry) {
      const timeouts = [2000, 4000, 6000]; // Retry after 2s, 4s, 6s
      const delay = timeouts[retryCount];
      
      setShowingRetryMessage(true);
      console.log(`Dashboard: No drives found, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
      
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setShowingRetryMessage(false);
        refetch();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, drives, retryCount, refetch]);
  
  const aggregatedStats = drives && globalDuplicates
    ? aggregateDriveStats(drives, globalDuplicates)
    : null;
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Overview of your connected drives and storage usage.
        </p>
      </div>

      {/* Profile Card - Updated to show first drive as primary */}
      <ProfileCard drive={drives?.[0]} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Grid */}
      {isLoading || showingRetryMessage ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          {showingRetryMessage && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Setting up your drive data... This may take a moment for new accounts.
              </p>
            </div>
          )}
        </div>
      ) : aggregatedStats ? (
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Files"
            value={formatNumber(aggregatedStats.totalFiles)}
            subtitle={`Across ${aggregatedStats.connectedDrives} drives`}
            icon={Files}
            variant="primary"
          />
          <StatsCard
            title="Storage Used"
            value={formatBytes(aggregatedStats.totalStorageUsed)}
            subtitle={`Of ${formatBytes(aggregatedStats.totalStorage)} total`}
            icon={Database}
            variant="success"
          />
          <StatsCard
            title="Connected Drives"
            value={aggregatedStats.connectedDrives}
            subtitle={`All active`}
            icon={HardDrive}
          />
          <StatsCard
            title="Duplicates"
            value={aggregatedStats.duplicateFiles}
            subtitle={`${formatBytes(
              aggregatedStats.duplicateSpace
            )} recoverable`}
            icon={Copy}
            variant="warning"
          />
        </div>
      ) : drives && drives.length === 0 && !showingRetryMessage ? (
        <div className="text-center p-6 bg-muted/50 rounded-lg">
          <HardDrive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No drives connected yet</h3>
          <p className="text-muted-foreground mb-4">
            Connect your Google Drive to start managing your files and analyzing storage usage.
          </p>
          <Button 
            onClick={() => window.location.href = '/drives'} 
            variant="outline"
          >
            Connect Drive
          </Button>
        </div>
      ) : null}

      {/* Drive Details Summary - Updated to pass drives data */}
     

      {/* Main Content Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <DrivesSummary drives={drives} />
        <ActivityFeed />
      </div>
    </div>
  );
}
