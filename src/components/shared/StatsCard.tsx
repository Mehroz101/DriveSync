import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatsCardProps) {
  const iconBgVariants = {
    default: 'bg-muted',
    primary: 'gradient-primary',
    success: 'gradient-success',
    warning: 'gradient-warning',
    destructive: 'bg-destructive',
  };

  const iconColorVariants = {
    default: 'text-muted-foreground',
    primary: 'text-white',
    success: 'text-white',
    warning: 'text-white',
    destructive: 'text-white',
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}% from last week
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            iconBgVariants[variant]
          )}
        >
          <Icon className={cn('h-5 w-5', iconColorVariants[variant])} />
        </div>
      </div>
    </div>
  );
}
