import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/formatters';
import {
  Upload,
  Trash2,
  Link,
  Unlink,
  RefreshCw,
  Share2,
  ArrowRightLeft,
  Search,
  LogIn,
  UserPlus,
  BarChart3,
  Copy,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Loader2,
} from 'lucide-react';
import { useRecentActivity } from '@/queries/activity/useActivityLogs';
import type { ActivityLog } from '@/types';
import { useNavigate } from 'react-router-dom';

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  FILE_UPLOAD: Upload,
  FILE_DOWNLOAD: Download,
  FILE_DELETE: Trash2,
  FILE_RESTORE: RefreshCw,
  FILE_SYNC: RefreshCw,
  FILE_TRANSFER: ArrowRightLeft,
  FILE_BULK_TRANSFER: ArrowRightLeft,
  FILE_PREVIEW: Eye,
  FILE_SHARE: Share2,
  FILES_FETCH: Search,
  FILES_SEARCH: Search,
  DRIVE_CONNECT: Link,
  DRIVE_DISCONNECT: Unlink,
  DRIVE_SYNC: RefreshCw,
  DRIVE_REFRESH: RefreshCw,
  DUPLICATE_SCAN: Copy,
  DUPLICATE_RESOLVE: Copy,
  ANALYTICS_QUERY: BarChart3,
  LOGIN: LogIn,
  LOGOUT: LogIn,
  SIGNUP: UserPlus,
  PROFILE_UPDATE: UserPlus,
  PROFILE_VIEW: Eye,
};

const actionColors: Record<string, string> = {
  FILE_UPLOAD: 'bg-emerald-100 text-emerald-600',
  FILE_DOWNLOAD: 'bg-blue-100 text-blue-600',
  FILE_DELETE: 'bg-red-100 text-red-600',
  FILE_RESTORE: 'bg-amber-100 text-amber-600',
  FILE_SYNC: 'bg-sky-100 text-sky-600',
  FILE_TRANSFER: 'bg-purple-100 text-purple-600',
  FILE_BULK_TRANSFER: 'bg-purple-100 text-purple-600',
  FILES_FETCH: 'bg-slate-100 text-slate-600',
  FILES_SEARCH: 'bg-slate-100 text-slate-600',
  DRIVE_CONNECT: 'bg-green-100 text-green-600',
  DRIVE_DISCONNECT: 'bg-orange-100 text-orange-600',
  DRIVE_SYNC: 'bg-sky-100 text-sky-600',
  DUPLICATE_SCAN: 'bg-amber-100 text-amber-600',
  LOGIN: 'bg-indigo-100 text-indigo-600',
  SIGNUP: 'bg-indigo-100 text-indigo-600',
  ANALYTICS_QUERY: 'bg-pink-100 text-pink-600',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  failure: XCircle,
  partial: AlertTriangle,
  pending: Loader2,
};

const statusColors: Record<string, string> = {
  success: 'text-emerald-500',
  failure: 'text-red-500',
  partial: 'text-amber-500',
  pending: 'text-blue-500',
};

function formatActionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ActivityFeed() {
  const { data, isLoading } = useRecentActivity(8);
  const navigate = useNavigate();
  const logs = data?.data || [];

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h3 className="font-semibold">Recent Activity</h3>
        <button
          className="text-sm text-accent hover:underline"
          onClick={() => navigate('/activity')}
        >
          View all
        </button>
      </div>
      
      <div className="divide-y">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Activity className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground text-center">
              No recent activity yet
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const Icon = actionIcons[log.actionType] || Activity;
            const colorClass = actionColors[log.actionType] || 'bg-gray-100 text-gray-600';
            const StatusIcon = statusIcons[log.status] || CheckCircle2;
            const statusColor = statusColors[log.status] || 'text-gray-500';

            return (
              <div
                key={log._id}
                className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-muted/30"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
                    colorClass
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{formatActionLabel(log.actionType)}</span>
                    {log.targetName && (
                      <>
                        {' '}
                        <span className="text-muted-foreground">·</span>{' '}
                        <span className="truncate text-muted-foreground">{log.targetName}</span>
                      </>
                    )}
                  </p>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {log.details}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusIcon className={cn('h-3 w-3', statusColor)} />
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(log.createdAt)}
                    </span>
                    {log.durationMs != null && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {log.durationMs < 1000
                          ? `${Math.round(log.durationMs)}ms`
                          : `${(log.durationMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
