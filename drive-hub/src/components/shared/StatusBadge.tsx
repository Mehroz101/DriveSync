import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Status = 'active' | 'syncing' | 'expired' | 'error' | 'inactive';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  syncing: { label: 'Syncing', variant: 'secondary' },
  expired: { label: 'Expired', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
  inactive: { label: 'Inactive', variant: 'outline' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === 'active' && 'bg-success text-success-foreground hover:bg-success/80',
        status === 'syncing' && 'bg-info text-info-foreground hover:bg-info/80',
        status === 'expired' && 'bg-warning/10 text-warning border-warning/20',
        className
      )}
    >
      {status === 'syncing' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {config.label}
    </Badge>
  );
}
