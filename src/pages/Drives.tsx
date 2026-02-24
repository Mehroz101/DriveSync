import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  MoreVertical,
  Trash2,
  Settings,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StorageBar } from "@/components/shared/StorageBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { getDrives, refreshDrive } from "@/services/api";
import {
  formatBytes,
  formatRelativeTime,
  formatNumber,
  formatDateTimeAgo,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Drive } from "@/types";
import AddDriveDialog from "@/components/dashboard/AddDriveDialog";
import { useDriveAccountStats } from "@/queries/drive/useDriveAccounts";
import { useReconnectDrive } from "@/mutations/drive/useReconnectDrive";
import { useRemoveDrive } from "@/mutations/drive/useRemoveDrive";
import { useSyncDrive } from "@/mutations/drive/useSyncDrive";
import { useSyncAllDrives } from "@/mutations/drive/useSyncAllDrives";
import { useToast } from "@/hooks/use-toast";

export default function Drives() {
  const [refreshingDrive, setRefreshingDrive] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: drivesResponse, isLoading, refetch } = useDriveAccountStats();
  const drives = drivesResponse?.drives || [];
  const [retryCount, setRetryCount] = useState(0);
  const [showingRetryMessage, setShowingRetryMessage] = useState(false);

  const { mutateAsync } = useReconnectDrive();
  const { mutateAsync: removeDrive } = useRemoveDrive();
  const { mutateAsync: syncDrive, isPending: isSyncingDrive } = useSyncDrive();
  const { mutateAsync: syncAllDrives, isPending: isSyncingAll } = useSyncAllDrives();
  const { toast } = useToast();

  // Auto-retry logic for new users who might not have drive data yet
  useEffect(() => {
    const hasNoDrives = !isLoading && drives.length === 0;
    const shouldRetry = hasNoDrives && retryCount < 3;
    
    if (shouldRetry) {
      const timeouts = [2000, 4000, 6000]; // Retry after 2s, 4s, 6s
      const delay = timeouts[retryCount];
      
      setShowingRetryMessage(true);
      console.log(`Drives: No drives found, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
      
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setShowingRetryMessage(false);
        refetch();
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, drives.length, retryCount, refetch]);

  // Handle error parameters from URL
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    
    if (error) {
      const errorMessages: { [key: string]: string } = {
        'drive_conflict': 'This Google Drive is already linked to another user account.',
        'unauthorized': 'You do not have permission to perform this action.',
        'drive_add_failed': 'Failed to add the drive account.',
        'oauth_failed': 'Google OAuth authentication failed.',
      };
      
      const displayMessage = message ? decodeURIComponent(message) : errorMessages[error] || 'An error occurred.';
      
      toast({
        title: "Drive Connection Error", 
        description: displayMessage,
        variant: "destructive"
      });
      
      // Clear error parameters from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('error');
      newSearchParams.delete('message');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const handleAddDrive = async (driveId: string) => {
    try {
      const response = await mutateAsync(driveId);

      if (!response || typeof response !== "object" || !("authUrl" in response)) {
        throw new Error("Missing OAuth URL");
      }
      const { authUrl } = response as { authUrl: string };

      window.location.href = authUrl;
    } catch (error) {
      console.error("Add Drive failed:", error);
      alert("Unable to connect Google Drive. Please try again.");
    }
  };

  const handleRefreshDrive = async (driveId: string) => {
    setRefreshingDrive(driveId);
    try {
      await syncDrive(driveId);
      toast({ title: "Drive synced successfully" });
    } catch (error) {
      toast({ title: "Failed to sync drive", variant: "destructive" });
    } finally {
      setRefreshingDrive(null);
    }
  };

  const handleRemoveDrive = async (accountId: string) => {
    try {
      await removeDrive(accountId);
      toast({ title: "Drive removed successfully" });
    } catch (error) {
      toast({ title: "Failed to remove drive", variant: "destructive" });
    }
  };

  const handleSyncAll = async () => {
    try {
      await syncAllDrives();
      toast({ title: "All drives synced successfully" });
    } catch (error) {
      toast({ title: "Failed to sync all drives", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Connected Drives
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your Google Drive accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleSyncAll}
            disabled={isSyncingAll || drives.length === 0}
          >
            <RefreshCw className={cn("h-4 w-4", isSyncingAll && "animate-spin")} />
            Sync All
          </Button>
          <AddDriveDialog
            isAddDialogOpen={isAddDialogOpen}
            setIsAddDialogOpen={setIsAddDialogOpen}
          />
        </div>
      </div>

      {/* Drives Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.isArray(drives) && drives.map((drive) => (
            <div
              key={drive._id}
              className={cn(
                "rounded-xl border bg-card p-4 md:p-6 shadow-card transition-shadow hover:shadow-card-hover",
                drive.connectionStatus === "revoked" &&
                  "border-warning opacity-75"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 md:h-12 md:w-12 shrink-0">
                    <AvatarImage src={drive.owner.photoLink || ""} alt={drive.owner.displayName} />
                    <AvatarFallback>
                      {drive.owner.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{drive.owner.displayName}</h3>
                      <StatusBadge status={drive.connectionStatus} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {drive.owner.emailAddress}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => handleRefreshDrive(drive._id)}
                      disabled={refreshingDrive === drive._id}
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          refreshingDrive === drive._id && "animate-spin"
                        )}
                      />
                      Refresh Data
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-destructive"
                      onClick={() => handleRemoveDrive(drive._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Drive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 md:mt-6 space-y-4">
                <StorageBar
                  used={drive.storage.used || 0}
                  total={drive.storage.total}
                />

                <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Files</p>
                    <p className="font-medium">
                      {formatNumber(drive.stats.totalFiles)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Folders</p>
                    <p className="font-medium">
                      {formatNumber(drive.stats.totalFolders)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duplicates</p>
                    <p className="font-medium">
                      {formatNumber(drive.stats.duplicateFiles)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Synced</p>
                    <p className="font-medium">
                      {formatDateTimeAgo(drive.meta.fetchedAt)}
                    </p>
                  </div>
                </div>

                {drive.connectionStatus === "revoked" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddDrive(drive._id)}
                    className="w-full gap-2 border-warning text-warning hover:bg-warning hover:text-warning-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reconnect Drive
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
