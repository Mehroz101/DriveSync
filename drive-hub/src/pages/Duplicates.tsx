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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { useDuplicates } from "@/queries/duplicates/useDuplicates";
import { useDriveAccounts } from "@/queries/drive/useDriveAccounts";
import { formatBytes, formatDate } from "@/lib/formatters";
import type { DuplicateGroup } from "@/types";
import DuplicateCard from "@/components/duplicates/DuplicateCard";
import { DeleteFileDialog } from "@/components/common/deleteDialog";
import { useDeleteFiles } from "@/mutations/files/useDeleteFiles";
import { useToast } from "@/hooks/use-toast";
import { DeleteFilesResponse } from "@/api/files/files.api";

export default function Duplicates() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<
    { driveId: string; fileId: string }[]
  >([]);
    const [deleteResponse, setDeleteResponse] =
      useState<DeleteFilesResponse | null>(null);
  const { data: duplicates = [], isLoading, error } = useDuplicates();
  const { data: drives = [] } = useDriveAccounts();
  const deleteFilesMutation = useDeleteFiles();
  const { toast } = useToast();

  const toggleDuplicate = (duplicate: DuplicateGroup) => {
    setSelectedDuplicates((prev) =>
      prev.includes(duplicate.id)
        ? prev.filter((id) => id !== duplicate.id)
        : [...prev, duplicate.id]
    );
  };
  const deleteFiles = async (
    items?: { fileId: string; driveId?: string }[]
  ) => {
    const payload = items ? items : selectedFiles;
    if (payload.length === 0) return;

    try {
      const result = await deleteFilesMutation.mutateAsync(
        payload.map((p) => ({ fileId: p.fileId, driveId: p.driveId }))
      );
      setDeleteResponse(result);

      if (result.success) {
        toast({
          title: "Files deleted",
          description: `${result.deletedCount ?? payload.length} files removed`,
        });
        setSelectedFiles([]);
      } else {
        toast({
          title: "Delete failed",
          description: result.error || "Failed to delete files",
        });
      }

      // If backend returned failedFiles, show warning toast
      if (result.failedFiles && result.failedFiles.length > 0) {
        toast({
          title: "Partial Failure",
          description: `${result.failedFiles.length} files could not be fully removed.`,
        });
      }
    } catch (err) {
      setDeleteResponse({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
      toast({
        title: "Delete failed",
        description: "An unexpected error occurred",
      });
    }
  };

  useEffect(() => {
    if (deleteFilesMutation.isSuccess) {
      setSelectedFiles([]);
    }
  }, [deleteFilesMutation.isSuccess]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Duplicates</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Duplicates</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Error Loading Duplicates
              </h3>
              <p className="text-muted-foreground">
                Failed to load duplicate files. Please try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Duplicates</h1>
          <p className="text-muted-foreground">
            Found {duplicates.length} duplicate groups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {duplicates.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Duplicates Found
              </h3>
              <p className="text-muted-foreground">
                Great! No duplicate files were found in your drives.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {duplicates.map((duplicate) => (
            <DuplicateCard
              key={duplicate.id}
              duplicate={duplicate}
              drives={drives}
              onSelect={toggleDuplicate}
              selected={selectedDuplicates.includes(duplicate.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedDuplicates.includes(group.id)}
                      onCheckedChange={() => toggleDuplicate(group)}
                    />
                    <img
                      src={group.files[0].iconLink}
                      alt=""
                      className="h-8 w-8"
                    />
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription>
                        {formatBytes(group.size)} • {group.files.length} files •
                        Wasted: {formatBytes(group.totalWastedSpace)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="destructive">
                    {group.files.length - 1} duplicates
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.files.map((file, index) => (
                    <div
                      key={file._id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {index === 0 ? "Keep" : "Duplicate"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {file.driveAccount?.email ||
                            drives.find((d) => d._id === file.driveAccountId)
                              ?.email ||
                            "Unknown"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Modified {formatDate(file.modifiedTime)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        {index > 0 && (
                        <DeleteFileDialog
                          trigger={
                            <div className="flex gap-2 items-center text-destructive cursor-pointer">
                              <Trash2 className="h-4 w-4" />
                              
                            </div>
                          }
                          onConfirm={async () =>
                            await deleteFiles([
                              {
                                fileId: file._id!,
                                driveId: file.driveAccountId,
                              },
                            ])
                          }
                          title={`Delete file?`}
                          description={`This will attempt to remove files from Drive and then mark them trashed in the DB. Some files may fail to remove from Drive.`}
                          confirmLabel={`Delete`}
                        />
                        )}
                          {/* <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button> */}
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
