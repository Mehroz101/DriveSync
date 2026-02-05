import { useEffect, useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  HardDrive,
  Menu,
  RefreshCw,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { toggleDriveSelection, setSearchQuery, setIsRefreshing } from "@/store/slices/uiSlice";
import { refreshDriveStats } from "@/store/slices/drivesSlice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { drives } from "@/data/mockData";
import {
  formatDateTimeAgo,
  getStatusDotClass,
} from "@/lib/formatters";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/queryClient";
import { useDriveAccountsRefetch, useDriveAccountStats } from "@/queries/drive/useDriveAccounts";
import { DashboardStats, DriveAccount } from "@/types";

interface TopBarProps {
  selectedDrives: string[];
  onDriveSelectionChange: (drives: string[]) => void;
  onMenuClick: () => void;
}

export function TopBar({
  selectedDrives: externalSelectedDrives,
  onDriveSelectionChange,
  onMenuClick,
}: TopBarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  // Get state from Redux
  const { selectedDrives, searchQuery } = useSelector((state: RootState) => state.ui);
  const drivesState = useSelector((state: RootState) => state.drives);
  const dashboardStats = drivesState.drives;
  const drivesLoading = drivesState.loading;
  
  const { data: drives, isFetching } = useDriveAccountStats();
  const {
    data: syncAlltDrives,
    isFetching: syncAllIsFetching,
    refetch,
  } = useDriveAccountsRefetch();
  const handleDriveToggle = (driveId: string) => {
    dispatch(toggleDriveSelection(driveId));
    // Also notify external handler if provided
    if (onDriveSelectionChange) {
      const newSelection = selectedDrives.includes(driveId)
        ? selectedDrives.filter(id => id !== driveId)
        : [...selectedDrives, driveId];
      onDriveSelectionChange(newSelection);
    }
  };

  const handleRefresh = async () => {
    dispatch(setIsRefreshing(true));
    try {
      dispatch(refreshDriveStats()).unwrap().catch(() => {
        // Error handling is done in the rejected case of the thunk
      });
    } finally {
      dispatch(setIsRefreshing(false));
    }
  };
  useEffect(() => {
    const data = drives || syncAlltDrives;
    if (Array.isArray(data)) {
      // Dashboard stats are now managed by Redux slice
    }
  }, [syncAlltDrives, drives]);

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 md:px-6 gap-4">
      {/* Mobile Menu Button */}

      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={isMobile ? "Search..." : "Search files, drives..."}
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          className="pl-9 h-9 md:h-10"
          aria-label="Search files and drives"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Drive Selector - Hidden on mobile */}
        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                aria-label="Select drives"
                aria-expanded="false"
              >
                <HardDrive className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Drives</span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Select Drives</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedDrives.length === 0}
                onCheckedChange={() => handleDriveToggle("all")}
                aria-label="Select all drives"
              >
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  All Drives
                </div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {dashboardStats?.map((drive) => (
                <DropdownMenuCheckboxItem
                  key={drive?._id}
                  checked={selectedDrives.includes(drive?._id)}
                  onCheckedChange={() => handleDriveToggle(drive?._id)}
                  aria-label={`Select drive ${drive?.owner.displayName}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={getStatusDotClass(drive?.connectionStatus)}
                    />
                    <span className="flex-1 truncate">
                      {drive?.owner.displayName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {drive?.owner.emailAddress.split("@")[0]}
                    </span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isFetching || syncAllIsFetching || drivesLoading}
          className="h-9 border px-1 w-full"
          aria-label="Refresh drive data"
          aria-busy={isFetching || syncAllIsFetching || drivesLoading}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              (isFetching || syncAllIsFetching || drivesLoading) && "animate-spin"
            )}
          />
          {(!isFetching || !syncAllIsFetching) && dashboardStats[0]?.meta?.fetchedAt
            ? formatDateTimeAgo(dashboardStats[0]?.meta?.fetchedAt)
            : "-"}
        </Button>

        {/* Notifications */}
        {/* <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            3
          </span>
        </Button> */}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="gap-2 px-2 h-9"
              aria-label={`User menu for ${user.name}`}
              aria-expanded="false"
            >
              <Avatar className="h-7 w-7 md:h-8 md:w-8" aria-hidden="true">
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback className="hover:text-black">
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium">{user.name}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 hidden lg:block" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
