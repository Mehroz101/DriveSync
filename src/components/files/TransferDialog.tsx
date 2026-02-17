import React, { useState, useMemo } from "react";
import {
  ArrowRight,
  Loader2,
  File,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { StorageBar } from "@/components/shared/StorageBar";

import { useDriveAccountStats } from "@/queries/drive/useDriveAccounts";
import { useTransferFile, useTransferFiles } from "@/mutations/files/useTransferFiles";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/formatters";

import type { DriveFile, DriveAccount } from "@/types";
import type { TransferResult, BulkTransferResponse } from "@/api/files/files.api";

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
  /** Files to transfer — each must have _id (googleFileId) and driveAccountId */
  files: DriveFile[];
}

type TransferStatus = "idle" | "transferring" | "completed" | "error";

interface FileTransferState {
  file: DriveFile;
  status: "pending" | "transferring" | "completed" | "error";
  error?: string;
}

export function TransferDialog({ open, onClose, files }: TransferDialogProps) {
  const [destinationDriveId, setDestinationDriveId] = useState("");
  const [transferStatus, setTransferStatus] = useState<TransferStatus>("idle");
  const [fileStates, setFileStates] = useState<FileTransferState[]>([]);
  const [result, setResult] = useState<BulkTransferResponse | TransferResult | null>(null);

  const { data: drivesResponse } = useDriveAccountStats();
  const drives = useMemo(() => drivesResponse?.drives ?? [], [drivesResponse]);
  const { toast } = useToast();

  const transferFileMutation = useTransferFile();
  const transferFilesMutation = useTransferFiles();

  // Get unique source drive IDs from the selected files
  const sourceDriveIds = useMemo(
    () => new Set(files.map((f) => f.driveAccountId).filter(Boolean)),
    [files]
  );

  // Filter out source drives from destination options — can't transfer to same drive
  const destinationDrives = useMemo(
    () => drives.filter((d) => !sourceDriveIds.has(d._id) && d.connectionStatus === "active"),
    [drives, sourceDriveIds]
  );

  // Total size of selected files
  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + (f.size || 0), 0),
    [files]
  );

  // Selected destination drive info
  const selectedDest = useMemo(
    () => drives.find((d) => d._id === destinationDriveId),
    [drives, destinationDriveId]
  );

  // Check if destination has enough space
  const hasEnoughSpace = useMemo(() => {
    if (!selectedDest) return true;
    const remaining = selectedDest.storage.total - selectedDest.storage.used;
    return remaining >= totalSize;
  }, [selectedDest, totalSize]);

  // Progress percentage
  const progress = useMemo(() => {
    if (fileStates.length === 0) return 0;
    const done = fileStates.filter(
      (f) => f.status === "completed" || f.status === "error"
    ).length;
    return Math.round((done / fileStates.length) * 100);
  }, [fileStates]);

  const isSingleFile = files.length === 1;

  // Reset state when dialog opens/closes
  const handleClose = () => {
    if (transferStatus === "transferring") return; // prevent closing during transfer
    setDestinationDriveId("");
    setTransferStatus("idle");
    setFileStates([]);
    setResult(null);
    onClose();
  };

  const handleTransfer = async () => {
    if (!destinationDriveId || files.length === 0) {
      toast({
        title: "Missing destination",
        description: "Please select a destination drive",
        variant: "destructive",
      });
      return;
    }

    if (!hasEnoughSpace) {
      toast({
        title: "Insufficient storage",
        description: "The destination drive doesn't have enough space",
        variant: "destructive",
      });
      return;
    }

    setTransferStatus("transferring");

    // Initialize file states
    const initialStates: FileTransferState[] = files.map((f) => ({
      file: f,
      status: "pending",
    }));
    setFileStates(initialStates);

    if (isSingleFile) {
      // Single file transfer
      const file = files[0];
      setFileStates([{ file, status: "transferring" }]);

      try {
        const res = await transferFileMutation.mutateAsync({
          sourceFileId: file.googleFileId!,
          sourceDriveId: file.driveAccountId!,
          destinationDriveId,
        });

        setResult(res);

        if (res.success) {
          setFileStates([{ file, status: "completed" }]);
          setTransferStatus("completed");
          toast({
            title: "Transfer complete",
            description: `"${file.name}" transferred successfully`,
          });
        } else {
          setFileStates([{ file, status: "error", error: res.error }]);
          setTransferStatus("error");
          toast({
            title: "Transfer failed",
            description: res.error || "An error occurred",
            variant: "destructive",
          });
        }
      } catch {
        setFileStates([{ file, status: "error", error: "Unexpected error" }]);
        setTransferStatus("error");
      }
    } else {
      // Bulk transfer — we use sequential single transfers for real-time status
      const results: TransferResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileStates((prev) =>
          prev.map((fs, idx) =>
            idx === i ? { ...fs, status: "transferring" } : fs
          )
        );

        try {
          const res = await transferFileMutation.mutateAsync({
            sourceFileId: file.googleFileId!,
            sourceDriveId: file.driveAccountId!,
            destinationDriveId,
          });

          results.push(res);

          setFileStates((prev) =>
            prev.map((fs, idx) =>
              idx === i
                ? {
                    ...fs,
                    status: res.success ? "completed" : "error",
                    error: res.error,
                  }
                : fs
            )
          );
        } catch (err) {
          const errorResult: TransferResult = {
            success: false,
            error: err instanceof Error ? err.message : "Transfer failed",
          };
          results.push(errorResult);

          setFileStates((prev) =>
            prev.map((fs, idx) =>
              idx === i ? { ...fs, status: "error", error: errorResult.error } : fs
            )
          );
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.length - succeeded;

      setResult({
        success: failed === 0,
        transferred: results.filter((r) => r.success),
        failed: results.filter((r) => !r.success),
        summary: { total: results.length, succeeded, failed },
      });

      setTransferStatus(failed === 0 ? "completed" : "error");

      toast({
        title: failed === 0 ? "Transfer complete" : "Transfer partially completed",
        description: `${succeeded}/${results.length} files transferred successfully`,
        variant: failed === 0 ? "default" : "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Send className="h-5 w-5 text-purple-600" />
            Transfer {isSingleFile ? "File" : `${files.length} Files`}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Stream {isSingleFile ? "a file" : "files"} between Google Drive accounts without downloading
          </DialogDescription>
        </DialogHeader>

        {/* BODY */}
        <div className="px-6 space-y-5">
          {/* SOURCE FILES INFO */}
          <div>
            <Label className="text-xs uppercase text-muted-foreground tracking-wide">
              Source {isSingleFile ? "File" : "Files"}
            </Label>
            <ScrollArea className={files.length > 3 ? "max-h-[140px]" : ""}>
              <div className="space-y-2 mt-2">
                {files.map((file, idx) => {
                  const fileState = fileStates[idx];
                  return (
                    <div
                      key={file._id || idx}
                      className="flex items-center gap-3 border rounded-lg p-2.5 bg-muted/30"
                    >
                      <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        {fileState?.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : fileState?.status === "error" ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : fileState?.status === "transferring" ? (
                          <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                        ) : (
                          <File className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(file.size)}
                          {fileState?.error && (
                            <span className="text-red-500 ml-2">
                              — {fileState.error}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            {files.length > 1 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Total: {formatBytes(totalSize)}
              </p>
            )}
          </div>

          {/* ARROW */}
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* DESTINATION DRIVE SELECT */}
          <div>
            <Label className="text-xs uppercase text-muted-foreground tracking-wide">
              Destination Drive
            </Label>
            <Select
              value={destinationDriveId}
              onValueChange={setDestinationDriveId}
              disabled={transferStatus === "transferring"}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose destination drive" />
              </SelectTrigger>
              <SelectContent>
                {destinationDrives.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No other active drives available
                  </div>
                ) : (
                  destinationDrives.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      <div className="flex items-center flex-wrap gap-2">
                        <Avatar className="h-6 w-6 rounded-full overflow-hidden shrink-0">
                          <AvatarImage
                            src={d.owner.photoLink || ""}
                            alt={d.owner.displayName || ""}
                          />
                          <AvatarFallback>
                            {(d.owner.displayName || "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {d.owner.emailAddress}
                        </span>
                        <StorageBar
                          used={d.storage.used || 0}
                          total={d.storage.total}
                        />
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* INSUFFICIENT SPACE WARNING */}
          {destinationDriveId && !hasEnoughSpace && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Insufficient Storage</AlertTitle>
              <AlertDescription>
                The destination drive needs {formatBytes(totalSize)} but only has{" "}
                {formatBytes(
                  (selectedDest?.storage.total || 0) -
                    (selectedDest?.storage.used || 0)
                )}{" "}
                remaining.
              </AlertDescription>
            </Alert>
          )}

          {/* PROGRESS BAR */}
          {transferStatus === "transferring" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Transferring…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* RESULT SUMMARY */}
          {transferStatus === "completed" && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Transfer Complete</AlertTitle>
              <AlertDescription>
                {isSingleFile
                  ? `"${files[0].name}" has been transferred successfully.`
                  : `All ${files.length} files transferred successfully.`}
              </AlertDescription>
            </Alert>
          )}

          {transferStatus === "error" && result && "summary" in result && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Transfer Partially Failed</AlertTitle>
              <AlertDescription>
                {result.summary.succeeded} of {result.summary.total} files
                transferred. {result.summary.failed} failed.
              </AlertDescription>
            </Alert>
          )}

          {transferStatus === "error" && result && !("summary" in result) && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Transfer Failed</AlertTitle>
              <AlertDescription>
                {(result as TransferResult).error || "An unexpected error occurred."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t flex gap-3">
          {transferStatus === "completed" || transferStatus === "error" ? (
            <Button
              onClick={handleClose}
              className="w-full h-11"
              variant="outline"
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={transferStatus === "transferring"}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={
                  transferStatus === "transferring" ||
                  !destinationDriveId ||
                  !hasEnoughSpace ||
                  files.length === 0
                }
                className="flex-1 h-11 bg-purple-600 hover:bg-purple-700"
              >
                {transferStatus === "transferring" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferring…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Transfer
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
