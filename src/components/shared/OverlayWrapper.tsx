import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, Construction, Lock, Clock, AlertTriangle, Zap, Eye } from 'lucide-react';

export type OverlayState = 
  | 'coming-soon'
  | 'maintenance' 
  | 'locked'
  | 'disabled'
  | 'premium'
  | 'hidden'
  | 'custom';

interface OverlayConfig {
  icon: LucideIcon;
  text: string;
  description?: string;
  className: string;
}

const overlayConfigs: Record<Exclude<OverlayState, 'custom'>, OverlayConfig> = {
  'coming-soon': {
    icon: Clock,
    text: 'Coming Soon',
    description: 'This feature will be available soon',
    className: 'bg-blue-500/10 border-blue-200 text-blue-700'
  },
  'maintenance': {
    icon: Construction,
    text: 'Under Maintenance',
    description: 'This feature is temporarily unavailable',
    className: 'bg-orange-500/10 border-orange-200 text-orange-700'
  },
  'locked': {
    icon: Lock,
    text: 'Locked',
    description: 'Access restricted',
    className: 'bg-red-500/10 border-red-200 text-red-700'
  },
  'disabled': {
    icon: AlertTriangle,
    text: 'Disabled',
    description: 'This feature is currently disabled',
    className: 'bg-gray-500/10 border-gray-200 text-gray-700'
  },
  'premium': {
    icon: Zap,
    text: 'Premium Feature',
    description: 'Upgrade to access this feature',
    className: 'bg-purple-500/10 border-purple-200 text-purple-700'
  },
  'hidden': {
    icon: Eye,
    text: 'Hidden',
    description: 'Content is hidden',
    className: 'bg-gray-500/10 border-gray-200 text-gray-700'
  }
};

interface OverlayWrapperProps {
  children: React.ReactNode;
  state?: OverlayState;
  customIcon?: LucideIcon;
  customText?: string;
  customDescription?: string;
  customClassName?: string;
  showOverlay?: boolean;
  blurContent?: boolean;
  overlayOpacity?: 'light' | 'medium' | 'heavy';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export function OverlayWrapper({
  children,
  state = 'coming-soon',
  customIcon,
  customText,
  customDescription,
  customClassName,
  showOverlay = true,
  blurContent = true,
  overlayOpacity = 'medium',
  size = 'md',
  onClick,
  className,
}: OverlayWrapperProps) {
  if (!showOverlay) {
    return <div className={className}>{children}</div>;
  }

  // Get overlay configuration
  const config = state === 'custom' 
    ? {
        icon: customIcon || Clock,
        text: customText || 'Custom State',
        description: customDescription,
        className: customClassName || 'bg-gray-500/10 border-gray-200 text-gray-700'
      }
    : overlayConfigs[state];

  const Icon = config.icon;

  // Size configurations
  const sizeConfigs = {
    sm: {
      iconSize: 'h-6 w-6',
      textSize: 'text-sm',
      descSize: 'text-xs',
      spacing: 'space-y-1',
      padding: 'p-3'
    },
    md: {
      iconSize: 'h-8 w-8',
      textSize: 'text-base',
      descSize: 'text-sm',
      spacing: 'space-y-2',
      padding: 'p-4'
    },
    lg: {
      iconSize: 'h-12 w-12',
      textSize: 'text-lg',
      descSize: 'text-base',
      spacing: 'space-y-3',
      padding: 'p-6'
    }
  };

  const sizeConfig = sizeConfigs[size];

  // Opacity configurations
  const opacityConfigs = {
    light: 'bg-white/70 backdrop-blur-sm',
    medium: 'bg-white/80 backdrop-blur-md',
    heavy: 'bg-white/90 backdrop-blur-lg'
  };

  return (
    <div className={cn('relative', className)}>
      {/* Content with optional blur */}
      <div className={cn(blurContent && 'blur-sm filter transition-all duration-300')}>
        {children}
      </div>

      {/* Overlay */}
      <div className={cn(
        'absolute inset-0 flex items-center justify-center',
        'border border-dashed rounded-lg transition-all duration-300',
        opacityConfigs[overlayOpacity],
        config.className,
        onClick && 'cursor-pointer hover:scale-105',
        sizeConfig.padding
      )}
      onClick={onClick}
      >
        <div className={cn(
          'flex flex-col items-center text-center',
          sizeConfig.spacing
        )}>
          <Icon className={cn(sizeConfig.iconSize, 'opacity-70')} />
          <div>
            <p className={cn('font-medium', sizeConfig.textSize)}>
              {config.text}
            </p>
            {config.description && (
              <p className={cn('opacity-70', sizeConfig.descSize)}>
                {config.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
