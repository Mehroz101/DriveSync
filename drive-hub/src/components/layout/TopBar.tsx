import { useState } from 'react';
import { Search, Bell, ChevronDown, HardDrive, Menu, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { drives, currentUser } from '@/data/mockData';
import { getStatusDotClass } from '@/lib/formatters';
import { useIsMobile } from '@/hooks/use-mobile';

interface TopBarProps {
  selectedDrives: string[];
  onDriveSelectionChange: (drives: string[]) => void;
  onMenuClick: () => void;
}

export function TopBar({ selectedDrives, onDriveSelectionChange, onMenuClick }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = useIsMobile();

  const handleDriveToggle = (driveId: string) => {
    if (driveId === 'all') {
      onDriveSelectionChange([]);
      return;
    }
    
    if (selectedDrives.includes(driveId)) {
      onDriveSelectionChange(selectedDrives.filter(id => id !== driveId));
    } else {
      onDriveSelectionChange([...selectedDrives, driveId]);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const selectedDriveLabel = selectedDrives.length === 0
    ? 'All Drives'
    : selectedDrives.length === 1
      ? drives.find(d => d.id === selectedDrives[0])?.name
      : `${selectedDrives.length} Drives`;

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 md:px-6 gap-4">
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={isMobile ? "Search..." : "Search files, drives..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 md:h-10"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Drive Selector - Hidden on mobile */}
        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <HardDrive className="h-4 w-4" />
                <span className="hidden sm:inline">{selectedDriveLabel}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Select Drives</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedDrives.length === 0}
                onCheckedChange={() => handleDriveToggle('all')}
              >
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  All Drives
                </div>
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {drives.map((drive) => (
                <DropdownMenuCheckboxItem
                  key={drive.id}
                  checked={selectedDrives.includes(drive.id)}
                  onCheckedChange={() => handleDriveToggle(drive.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={getStatusDotClass(drive.status)} />
                    <span className="flex-1 truncate">{drive.name}</span>
                    <span className="text-xs text-muted-foreground">{drive.email.split('@')[0]}</span>
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
          disabled={isRefreshing}
          className="h-9 w-9"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            3
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 h-9">
              <Avatar className="h-7 w-7 md:h-8 md:w-8">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              {!isMobile && (
                <>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 hidden lg:block" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground font-normal">{currentUser.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
