import { Link } from 'react-router-dom';
import { drives } from '@/data/mockData';
import { StorageBar } from '@/components/shared/StorageBar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatBytes, formatRelativeTime } from '@/lib/formatters';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight } from 'lucide-react';

export function DrivesSummary() {
  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h3 className="font-semibold">Connected Drives</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/drives" className="gap-2">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      
      <div className="divide-y">
        {drives.slice(0, 3).map((drive) => (
          <div
            key={drive.id}
            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={drive.avatar} alt={drive.name} />
              <AvatarFallback>{drive.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{drive.name}</p>
                <StatusBadge status={drive.status} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{drive.email}</p>
            </div>
            
            <div className="w-32 hidden sm:block">
              <StorageBar used={drive.storageUsed} total={drive.storageTotal} size="sm" />
            </div>
            
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium">{formatBytes(drive.storageUsed)}</p>
              <p className="text-xs text-muted-foreground">
                Synced {formatRelativeTime(drive.lastSyncedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t px-6 py-4">
        <Button variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add New Drive
        </Button>
      </div>
    </div>
  );
}
