import { useState, useEffect } from 'react';
import { Files, HardDrive, Database, Copy, Loader2 } from 'lucide-react';
import { StatsCard } from '@/components/shared/StatsCard';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DrivesSummary } from '@/components/dashboard/DrivesSummary';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { getDashboardStats } from '@/services/api';
import { formatBytes, formatNumber } from '@/lib/formatters';
import type { DashboardStats } from '@/types';
import { useDriveAccounts } from '@/queries/drive/useDriveAccounts';
import { useDashboardStates } from '@/queries/dashboard/useDashboard';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const {data:stats, isLoading} = useDashboardStates();


  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Overview of your connected drives and storage usage.
        </p>
      </div>

      {/* Profile Card */}
      <ProfileCard />

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Files"
            value={formatNumber(stats.totalFiles)}
            subtitle="Across all drives"
            icon={Files}
            trend={{ value: 12, isPositive: true }}
            variant="primary"
          />
          <StatsCard
            title="Storage Used"
            value={formatBytes(stats.totalStorageUsed)}
            subtitle="Of 195 GB total"
            icon={Database}
            trend={{ value: 8, isPositive: true }}
            variant="success"
          />
          <StatsCard
            title="Connected Drives"
            value={stats.connectedDrives}
            subtitle="3 active, 1 expired"
            icon={HardDrive}
          />
          <StatsCard
            title="Duplicates"
            value={stats.duplicateFiles}
            subtitle={`${formatBytes(stats.duplicateSpace)} recoverable`}
            icon={Copy}
            variant="warning"
          />
        </div>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <DrivesSummary />
        <ActivityFeed />
      </div>
    </div>
  );
}

