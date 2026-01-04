import { useState, useEffect } from 'react';
import {
  Upload,
  Trash2,
  Link,
  Unlink,
  RefreshCw,
  Share2,
  Filter,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { getActivities, getDrives } from '@/services/api';
import { formatDateTime, formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Activity, Drive } from '@/types';

const activityIcons: Record<Activity['type'], React.ComponentType<{ className?: string }>> = {
  upload: Upload,
  delete: Trash2,
  connect: Link,
  disconnect: Unlink,
  sync: RefreshCw,
  share: Share2,
};

const activityColors: Record<Activity['type'], string> = {
  upload: 'bg-success/10 text-success border-success/20',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  connect: 'bg-info/10 text-info border-info/20',
  disconnect: 'bg-warning/10 text-warning border-warning/20',
  sync: 'bg-accent/10 text-accent border-accent/20',
  share: 'bg-purple-100 text-purple-600 border-purple-200',
};

const activityLabels: Record<Activity['type'], string> = {
  upload: 'Upload',
  delete: 'Delete',
  connect: 'Connect',
  disconnect: 'Disconnect',
  sync: 'Sync',
  share: 'Share',
};

export default function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDrive, setFilterDrive] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [actRes, drivesRes] = await Promise.all([
        getActivities({
          types: filterType !== 'all' ? [filterType as Activity['type']] : undefined,
          driveId: filterDrive !== 'all' ? filterDrive : undefined,
        }),
        getDrives(),
      ]);
      if (actRes.success) setActivities(actRes.data);
      if (drivesRes.success) setDrives(drivesRes.data);
      setLoading(false);
    }
    fetchData();
  }, [filterType, filterDrive]);

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track all actions across your drives.
          </p>
        </div>
        
        <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Export Log
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <div className="flex gap-2 flex-1">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="connect">Connect</SelectItem>
              <SelectItem value="sync">Sync</SelectItem>
              <SelectItem value="share">Share</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDrive} onValueChange={setFilterDrive}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All Drives" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drives</SelectItem>
              {drives.map((drive) => (
                <SelectItem key={drive.id} value={drive.id}>
                  {drive.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(filterType !== 'all' || filterDrive !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterType('all');
              setFilterDrive('all');
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date}>
              <h3 className="mb-3 md:mb-4 text-xs md:text-sm font-medium text-muted-foreground">{date}</h3>
              
              <div className="space-y-3 md:space-y-4">
                {dateActivities.map((activity) => {
                  const Icon = activityIcons[activity.type];
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 md:gap-4 rounded-xl border bg-card p-3 md:p-4 shadow-card transition-shadow hover:shadow-card-hover"
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full flex-shrink-0 border',
                          activityColors[activity.type]
                        )}
                      >
                        <Icon className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn('text-[10px] md:text-xs', activityColors[activity.type])}>
                            {activityLabels[activity.type]}
                          </Badge>
                          {activity.driveName && (
                            <span className="text-xs text-muted-foreground">
                              {activity.driveName}
                            </span>
                          )}
                        </div>
                        
                        <p className="mt-1 font-medium text-sm">{activity.description}</p>
                        
                        {activity.fileName && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            File: {activity.fileName}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs md:text-sm font-medium">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                        <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                          {formatDateTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-12 md:py-16">
              <Filter className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Activities Found</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm px-4">
                No activities match your current filters.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
