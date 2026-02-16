import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  HardDrive,
  FolderOpen,
  BarChart3,
  Settings,
} from 'lucide-react';

const navItems = [
  { title: 'Home', href: '/', icon: LayoutDashboard },
  { title: 'Drives', href: '/drives', icon: HardDrive },
  { title: 'Files', href: '/files', icon: FolderOpen },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Settings', href: '/settings', icon: Settings },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[4rem]',
                isActive
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-accent')} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
