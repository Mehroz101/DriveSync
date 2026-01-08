import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Status = 'critical' | 'warning' | 'healthy' | 'error' | 'inactive';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  healthy: { label: 'healthy', variant: 'default' },
  warning: { label: 'warning', variant: 'secondary' },
  critical: { label: 'critical', variant: 'outline' },
  error: { label: 'error', variant: 'destructive' },
  inactive: { label: 'inactive', variant: 'outline' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === 'healthy' && 'bg-success text-success-foreground hover:bg-success/80',
        status === 'critical' && 'bg-info text-info-foreground hover:bg-info/80',
        status === 'warning' && 'bg-warning/10 text-warning border-warning/20',
        className
      )}
    >
      {status === 'critical' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {config.label}
    </Badge>
  );
}
