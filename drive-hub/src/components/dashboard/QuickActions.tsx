import { Plus, Upload, RefreshCw, Search, Copy, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  href: string;
  variant: 'primary' | 'secondary';
}

const actions: QuickAction[] = [
  {
    icon: Plus,
    label: 'Add Drive',
    description: 'Connect a new Google Drive',
    href: '/drives',
    variant: 'primary',
  },
  {
    icon: Upload,
    label: 'Upload Files',
    description: 'Upload to your drives',
    href: '/files',
    variant: 'secondary',
  },
  {
    icon: Copy,
    label: 'Find Duplicates',
    description: 'Scan for duplicate files',
    href: '/duplicates',
    variant: 'secondary',
  },
  {
    icon: BarChart3,
    label: 'View Analytics',
    description: 'Storage insights',
    href: '/analytics',
    variant: 'secondary',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            className={cn(
              'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
              action.variant === 'primary'
                ? 'gradient-primary text-white hover:opacity-90'
                : 'bg-card hover:shadow-card-hover hover:border-accent/30'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                action.variant === 'primary'
                  ? 'bg-white/20'
                  : 'bg-muted'
              )}
            >
              <Icon className={cn('h-5 w-5', action.variant === 'secondary' && 'text-accent')} />
            </div>
            <div>
              <p className="font-medium">{action.label}</p>
              <p
                className={cn(
                  'text-xs',
                  action.variant === 'primary'
                    ? 'text-white/80'
                    : 'text-muted-foreground'
                )}
              >
                {action.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
