import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setSelectedDrives, setSidebarCollapsed, setMobileSidebarOpen } from '@/store/slices/uiSlice';

export function DashboardLayout() {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  
  // Get state from Redux
  const { sidebarCollapsed, mobileSidebarOpen, selectedDrives } = useSelector(
    (state: RootState) => state.ui
  );
  
  // Local state setters that dispatch to Redux
  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    dispatch(setSidebarCollapsed(collapsed));
  };
  
  const handleSetMobileSidebarOpen = (open: boolean) => {
    dispatch(setMobileSidebarOpen(open));
  };
  
  const handleSetSelectedDrives = (drives: string[]) => {
    dispatch(setSelectedDrives(drives));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => handleSetSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => handleSetMobileSidebarOpen(false)}
      />
      
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300 ease-in-out',
          !isMobile && (sidebarCollapsed ? 'ml-16' : 'ml-64')
        )}
      >
        <TopBar 
          selectedDrives={selectedDrives}
          onDriveSelectionChange={handleSetSelectedDrives}
          onMenuClick={() => handleSetMobileSidebarOpen(true)}
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
