import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  HardDrive,
  FolderOpen,
  BarChart3,
  Copy,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Drives', href: '/drives', icon: HardDrive },
  { title: 'Files Explorer', href: '/files', icon: FolderOpen },
  { title: 'Trashed', href: '/trashed', icon: Trash2 },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Duplicates', href: '/duplicates', icon: Copy },
  { title: 'Activity Log', href: '/activity', icon: Activity },
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'API Docs', href: '/api-docs', icon: FileText },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile && mobileOpen) {
      onMobileClose();
    }
  }, [location.pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <HardDrive className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">
              DriveHub
            </span>
          </div>
        )}
        {collapsed && !isMobile && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <HardDrive className="h-4 w-4 text-white" />
          </div>
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          const linkContent = (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => isMobile && onMobileClose()}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-sidebar-primary')} />
              {(!collapsed || isMobile) && <span>{item.title}</span>}
            </NavLink>
          );

          if (collapsed && !isMobile) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* Collapse Toggle - Desktop only */}
      {!isMobile && (
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              'w-full text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed && 'justify-center'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Collapse
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );

  // Mobile: Slide-in drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
        )}
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed left-0 top-0 z-50 h-screen w-72 bg-sidebar transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
