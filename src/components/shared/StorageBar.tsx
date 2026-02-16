import { cn } from '@/lib/utils';
import { formatBytes, formatPercentage } from '@/lib/formatters';

interface StorageBarProps {
  used: number;
  total: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StorageBar({
  used,
  total,
  showLabels = true,
  size = 'md',
  className,
}: StorageBarProps) {
  const percentage = Math.min((used / total) * 100, 100);
  
  const getBarColor = () => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 75) return 'bg-warning';
    return 'gradient-primary';
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {formatBytes(used)} of {formatBytes(total)}
          </span>
          <span className="font-medium">{formatPercentage(percentage)}</span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-secondary', sizeClasses[size])}>
        <div
          className={cn('rounded-full transition-all duration-500', sizeClasses[size], getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
