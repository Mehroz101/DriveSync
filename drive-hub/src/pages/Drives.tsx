import { useState, useEffect } from "react";
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

export default function Drives() {
  // const [drives, setDrives] = useState<Drive[]>([]);
  const [refreshingDrive, setRefreshingDrive] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data: drivesResponse, isLoading } = useDriveAccountStats();
  const drives = drivesResponse?.drives || [];

  const { mutateAsync } = useReconnectDrive();
  const handleAddDrive = async (driveId: string) => {
    try {
      const response = await mutateAsync(driveId);

      // If your mutation returns nothing, remove the following lines.
      // If it should return an object with authUrl, ensure your mutation is set up to do so.
      // Example fallback: fetch authUrl from another source or show an error.
      if (!response || typeof response !== "object" || !("authUrl" in response)) {
        throw new Error("Missing OAuth URL");
      }
      const { authUrl } = response as { authUrl: string };

      // 🔐 Full redirect to backend OAuth flow
      window.location.href = authUrl;
    } catch (error) {
      console.error("Add Drive failed:", error);
      alert("Unable to connect Google Drive. Please try again.");
    }
  };
  // const handleRefreshDrive = async (driveId: string) => {
  //   setRefreshingDrive(driveId);
  //   const response = await refreshDrive(driveId);
  //   if (response.success && drivesResponse) {
  //     // Update the accounts array with the refreshed drive
  //     const updatedAccounts = drivesResponse.accounts.map((d) => 
  //       d._id === driveId ? response.data : d
  //     );
  //     // Create new response object with updated accounts
  //     // We can't directly update the query cache here, so we'll need to refetch
  //   }
  //   setRefreshingDrive(null);
  // };

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
        <AddDriveDialog
          isAddDialogOpen={isAddDialogOpen}
          setIsAddDialogOpen={setIsAddDialogOpen}
        />
        {/* <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Drive
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect Google Drive</DialogTitle>
              <DialogDescription>
                Sign in with your Google account to connect a new Drive.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                <svg viewBox="0 0 87.3 78" className="h-10 w-10">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="font-medium">Google Drive OAuth</p>
                <p className="text-sm text-muted-foreground">
                  Click below to authorize access to your Drive
                </p>
              </div>
              <Button className="gap-2 gradient-primary">
                <ExternalLink className="h-4 w-4" />
                Sign in with Google
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog> */}
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
                      onClick={() => handleAddDrive(drive._id)}
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
                    <DropdownMenuItem className="gap-2 text-destructive">
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
