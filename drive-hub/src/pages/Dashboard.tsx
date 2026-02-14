import { Files, HardDrive, Database, Copy, Loader2 } from "lucide-react";
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
  const { data: driveStatsResponse, isLoading } = useDriveAccountStats();
  const drives = driveStatsResponse?.drives;
  const globalDuplicates = driveStatsResponse?.globalDuplicates;
  
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
      {isLoading ? (
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
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
