import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedDrives, setSelectedDrives] = useState<string[]>([]);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300 ease-in-out',
          !isMobile && (sidebarCollapsed ? 'ml-16' : 'ml-64')
        )}
      >
        <TopBar 
          selectedDrives={selectedDrives}
          onDriveSelectionChange={setSelectedDrives}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <Outlet context={{ selectedDrives, setSelectedDrives }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
