import { cn } from '@/lib/utils';
import { activities } from '@/data/mockData';
import { formatRelativeTime } from '@/lib/formatters';
import {
  Upload,
  Trash2,
  Link,
  Unlink,
  RefreshCw,
  Share2,
} from 'lucide-react';
import type { Activity } from '@/types';

const activityIcons: Record<Activity['type'], React.ComponentType<{ className?: string }>> = {
  upload: Upload,
  delete: Trash2,
  connect: Link,
  disconnect: Unlink,
  sync: RefreshCw,
  share: Share2,
};

const activityColors: Record<Activity['type'], string> = {
  upload: 'bg-success/10 text-success',
  delete: 'bg-destructive/10 text-destructive',
  connect: 'bg-info/10 text-info',
  disconnect: 'bg-warning/10 text-warning',
  sync: 'bg-accent/10 text-accent',
  share: 'bg-purple-100 text-purple-600',
};

export function ActivityFeed() {
  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h3 className="font-semibold">Recent Activity</h3>
        <button className="text-sm text-accent hover:underline">View all</button>
      </div>
      
      <div className="divide-y">
        {activities.slice(0, 5).map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/30"
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
                  activityColors[activity.type]
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{activity.description}</span>
                  {activity.fileName && (
                    <>
                      {' '}
                      <span className="text-muted-foreground">·</span>{' '}
                      <span className="truncate">{activity.fileName}</span>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {activity.driveName && (
                    <span className="text-xs text-muted-foreground">
                      {activity.driveName}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
