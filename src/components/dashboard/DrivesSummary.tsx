import { Link } from "react-router-dom";
import { StorageBar } from "@/components/shared/StorageBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatBytes, formatRelativeTime } from "@/lib/formatters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ArrowRight,
  Database,
  Folder,
  Copy,
  HardDrive,
} from "lucide-react";
import type { DashboardStats, DriveAccount } from "@/types";
import { cn } from "@/lib/utils";

interface DrivesSummaryProps {
  drives?: DriveAccount[];
}

export function DrivesSummary({ drives }: DrivesSummaryProps) {
  const displayDrives = drives?.slice(0, 4) || [];

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Connected Drives</h3>
        </div>
        {drives && drives.length > 3 && (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/drives" className="gap-2">
              View all ({drives.length})
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {displayDrives.length === 0 ? (
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
            <HardDrive className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            No drives connected yet
          </p>
          <Button asChild>
            <Link to="/drives/add" className="gap-2">
              <Plus className="h-4 w-4" />
              Connect Your First Drive
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="divide-y">
            {displayDrives && displayDrives.map((drive) => {
              const storagePercentage =
                (drive?.storage.used / drive?.storage.total) * 100;
              const getBarColor = () => {
                if (storagePercentage > 90) return "bg-destructive";
                if (storagePercentage > 75) return "bg-warning";
                else return "gradient-primary";
              };
              return (
                <div
                  key={drive?.owner.emailAddress}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
                >
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage
                      src={drive?.owner.photoLink}
                      alt={drive?.owner.displayName}
                    />
                    <AvatarFallback>
                      {drive?.owner.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {drive?.owner.displayName}
                      </p>
                      <div
                        className={`
                          flex max-sm:hidden  items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
                          ${
                            drive?.stats.duplicateFiles > 100
                              ? "bg-destructive/10 text-destructive"
                              : drive?.stats.duplicateFiles > 20
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                          }
                        `}
                        title="Duplicate files detected"
                      >
                        <Copy className="h-3 max-sm:hidden w-3" />

                        <span className="max-sm:hidden">
                          {drive?.stats.duplicateFiles}
                        </span>
                      </div>
                      <div
                        className={`
                          flex max-sm:hidden  items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
                          ${
                            drive?.connectionStatus === "active"
                              ? "bg-success/10 text-success"
                              : drive?.connectionStatus === "revoked"
                              ? "bg-warning/10 text-warning"
                              : "bg-destructive/10 text-destructive"
                          }
                        `}
                        title="drive status"
                      >

                        <span className="max-sm:hidden">
                          {drive?.connectionStatus}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "flex  text-white sm:hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          getBarColor()
                        )}
                        title="Duplicate files detected"
                      >
                        <Copy className="h-3 max-sm:hidden w-3" />
                        <span className="sm:hidden text-nowrap">
                          {formatBytes(drive?.storage.used)}
                        </span>
                        <span className="max-sm:hidden">
                          {drive?.stats.duplicateFiles}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {drive?.owner.emailAddress}
                    </p>
                  </div>

                  <div className="w-32 hidden sm:block">
                    <StorageBar
                      used={drive?.storage.used}
                      total={drive?.storage.total}
                      size="sm"
                    />
                  </div>

                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium">
                      {formatBytes(drive?.storage.used)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {drive?.stats.totalFiles} files
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drive Stats Summary */}

          <div className="border-t px-6 py-4">
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link to="/drives/add">
                <Plus className="h-4 w-4" />
                Add New Drive
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
