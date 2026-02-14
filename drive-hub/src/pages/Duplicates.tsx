import { useEffect, useState } from "react";
import {
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Grid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { useDuplicates } from "@/queries/duplicates/useDuplicates";
import { useDriveAccountStats } from "@/queries/drive/useDriveAccounts";
import { formatBytes, formatDate } from "@/lib/formatters";
import type { DuplicateGroup } from "@/types";
import DuplicateCard from "@/components/duplicates/DuplicateCard";
import DeleteFileButton from "@/components/common/DeleteFileButton";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";

export default function Duplicates() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);

  const { data: duplicates = [], isLoading, error } = useDuplicates();
  const { data: drivesResponse } = useDriveAccountStats();
  const drives = drivesResponse?.drives ?? [];

  const toggleDuplicate = (duplicate: DuplicateGroup) => {
    setSelectedDuplicates((prev) =>
      prev.includes(duplicate.id)
        ? prev.filter((id) => id !== duplicate.id)
        : [...prev, duplicate.id]
    );
  };

  /* -------------------- Loading State -------------------- */

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Duplicates</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* -------------------- Error State -------------------- */

  if (error) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="p-10 text-center space-y-4">
          <AlertCircle className="h-14 w-14 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">Failed to Load Duplicates</h3>
          <p className="text-muted-foreground">
            Please refresh or check your connection.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* -------------------- Main UI -------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Duplicates</h1>
          <p className="text-sm text-muted-foreground">
            {duplicates.length} duplicate groups detected
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg self-start sm:self-auto">
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant={viewMode === "grid" ? "default" : "ghost"}
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {duplicates.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">No Duplicates Found</h3>
            <p className="text-muted-foreground">
              Your storage is fully optimized.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grid Mode */}
      {viewMode === "grid" && duplicates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
          {duplicates.map((duplicate) => (
            <DuplicateCard
              key={duplicate.id}
              duplicate={duplicate}
              drives={drives}
              selected={selectedDuplicates.includes(duplicate.id)}
              onSelect={toggleDuplicate}
            />
          ))}
        </div>
      )}

      {/* List Mode */}
      {viewMode === "list" && duplicates.length > 0 && (
        <div className="space-y-4">
          {duplicates.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedDuplicates.includes(group.id)}
                      onChange={() => toggleDuplicate(group)}
                    />

                    <img
                      src={group.files[0].iconLink}
                      alt=""
                      className="h-9 w-9"
                    />

                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {formatBytes(group.size)} • {group.files.length} files •
                        Wasted {formatBytes(group.totalWastedSpace)}
                      </CardDescription>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className="text-xs font-medium w-fit"
                  >
                    {group.files.length - 1} duplicates
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex  max-md:flex-wrap gap-3">
                  {group.files.map((file, index) => (
                    <div
                      key={file._id}
                      className="flex flex-col w-full sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition"
                    >
                      {/* LEFT SIDE — FILE INFO */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Meta Info */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`font-medium ${
                                index === 0
                                  ? "text-green-600"
                                  : "text-orange-500"
                              }`}
                            >
                              {index === 0 ? "Primary" : "Duplicate"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4 rounded-full shrink-0 overflow-hidden">
                              <AvatarImage
                                src={file.driveAccount?.profileImg || ""}
                                alt={file.driveAccount?.email || "Unknown"}
                                title={file.driveAccount?.email || "Unknown"}
                              />
                              <AvatarFallback>
                                {file.driveAccount?.name
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>{" "}
                            <span className="text-sm text-muted-foreground truncate max-w-[220px] sm:max-w-[320px]">
                              {/* File Icon */}
                              {file.driveAccount?.email ||
                                drives.find(
                                  (d) => d._id === file.driveAccountId
                                )?.owner?.emailAddress ||
                                "Unknown"}
                            </span>
                          </div>

                          <span className="text-xs text-muted-foreground">
                            Modified {formatDate(file.modifiedTime)}
                          </span>
                        </div>
                      </div>

                      {/* RIGHT SIDE — ACTIONS */}
                      <div className="flex items-center gap-3 justify-end">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          asChild
                        >
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>

                        {index > 0 && (
                          <DeleteFileButton
                            fileId={file._id!}
                            driveId={file.driveAccountId}
                            description="This will permanently remove the duplicate file."
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
