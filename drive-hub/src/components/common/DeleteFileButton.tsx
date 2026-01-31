import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteFileDialog } from "@/components/common/deleteDialog";
import { useDeleteFiles } from "@/mutations/files/useDeleteFiles";
import { useToast } from "@/hooks/use-toast";
import { DeleteFilesResponse } from "@/api/files/files.api";
import { useState } from "react";

interface DeleteFileButtonProps {
  fileId: string;
  driveId: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  trigger?: React.ReactNode;
}

export default function DeleteFileButton({
  fileId,
  driveId,
  title = "Delete file?",
  description = "This will permanently remove the file.",
  confirmLabel = "Delete",
  variant = "destructive",
  size = "icon",
  trigger,
}: DeleteFileButtonProps) {
  const deleteFilesMutation = useDeleteFiles();
  const { toast } = useToast();
  const [deleteResponse, setDeleteResponse] =
    useState<DeleteFilesResponse | null>(null);

  const deleteFiles = async () => {
    try {
      const result = await deleteFilesMutation.mutateAsync([
        { fileId, driveId },
      ]);
      setDeleteResponse(result);

      if (result.success) {
        toast({
          title: "File deleted",
          description: "File removed successfully",
        });
      } else {
        toast({
          title: "Delete failed",
          description: result.error || "Failed to delete file",
        });
      }

      if (result.failedFiles?.length) {
        toast({
          title: "Partial Failure",
          description: `${result.failedFiles.length} file could not be removed`,
        });
      }
    } catch (err) {
      setDeleteResponse({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
      toast({
        title: "Delete failed",
        description: "Unexpected system error occurred",
      });
    }
  };

  const defaultTrigger = (
    <Button
      size="icon"
      variant="destructive"
      disabled={deleteFilesMutation.status === "pending"}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  return (
    <DeleteFileDialog
      trigger={trigger || defaultTrigger}
      onConfirm={deleteFiles}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
    />
  );
}
