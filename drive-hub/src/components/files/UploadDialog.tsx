import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  File,
  HardDrive,
  Loader2,
  Trash2,
  RotateCcw,
  Play
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useDriveAccountStats } from "@/queries/drive/useDriveAccounts";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/formatters";
import { uploadFileAPI } from "@/api/files/files.api";
import { useQueryClient } from "@tanstack/react-query";

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
}

export function UploadDialog({ open, onClose }: UploadDialogProps) {

  const [selectedFiles, setSelectedFiles] = useState<FileWithProgress[]>([]);
  const [selectedDrive, setSelectedDrive] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: drives = [] } = useDriveAccountStats();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // -----------------------
  // FILE SELECT
  // -----------------------

  const handleFiles = (files: File[]) => {
    const mapped = files.map(file => ({
      file,
      progress: 0,
      status: "pending" as const
    }));
    setSelectedFiles(prev => [...prev, ...mapped]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // -----------------------
  // UPLOAD ENGINE
  // -----------------------

  const uploadSingle = async (item: FileWithProgress, index: number) => {

    try {

      setSelectedFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "uploading" } : f
        )
      );

      await uploadFileAPI(item.file, selectedDrive, (progress) => {
        setSelectedFiles(prev =>
          prev.map((f, i) =>
            i === index ? { ...f, progress } : f
          )
        );
      });

      setSelectedFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "completed", progress: 100 } : f
        )
      );

    } catch {
      setSelectedFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "error" } : f
        )
      );
    }
  };

  const handleUpload = async () => {

    if (!selectedDrive || selectedFiles.length === 0) {
      toast({
        title: "Missing data",
        description: "Select drive and files",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < selectedFiles.length; i++) {
      await uploadSingle(selectedFiles[i], i);
    }

    setIsUploading(false);

    queryClient.invalidateQueries({ queryKey: ["files"] });

    toast({
      title: "Upload Finished",
      description: "Process completed successfully"
    });

  };

  // -----------------------
  // UI
  // -----------------------

  return (
    <Dialog open={open} onOpenChange={onClose}>
       
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden">

        {/* HEADER */}
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold">
            Upload Files
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload files of any type and size
          </p>
        </DialogHeader>

        {/* BODY */}
        <div className="px-6 space-y-5">

          {/* DRIVE SELECT */}
          <div>
            <Label>Select Drive</Label>
            <Select value={selectedDrive} onValueChange={setSelectedDrive}>
              <SelectTrigger>
                <SelectValue placeholder="Choose Drive" />
              </SelectTrigger>
              <SelectContent>
                {drives.map(d => (
                  <SelectItem key={d._id} value={d._id}>
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      {d.owner.emailAddress}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DROP ZONE */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-purple-400 bg-purple-50/60 rounded-xl py-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-purple-100 transition"
          >

            <Upload className="h-6 w-6 text-purple-600" />

            <p className="text-sm font-medium text-purple-700">
              Click to Upload or Drag & Drop
            </p>

            <p className="text-xs text-muted-foreground">
              Any file type supported
            </p>

            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleInputChange}
              className="hidden"
            />

          </div>

          {/* FILE LIST */}
          <div className="space-y-3">

            {selectedFiles.map((item, index) => (

              <div
                key={index}
                className="border rounded-xl p-3 flex items-center gap-3 bg-background shadow-sm"
              >

                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <File className="h-4 w-4 text-purple-600" />
                </div>

                <div className="flex-1 min-w-0">

                  <p className="text-sm font-medium truncate">
                    {item.file.name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formatBytes(item.file.size)}
                  </p>

                  {item.status === "uploading" && (
                    <Progress
                      value={item.progress}
                      className="mt-1 h-2"
                    />
                  )}

                  {item.status === "completed" && (
                    <p className="text-xs text-green-600 mt-1">
                      Completed ✓
                    </p>
                  )}

                  {item.status === "error" && (
                    <p className="text-xs text-red-600 mt-1">
                      Upload Failed
                    </p>
                  )}

                </div>

                {/* ACTIONS */}
                <div className="flex gap-2">

                  {item.status === "error" && (
                    <Button size="icon" variant="ghost">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}

                  {!isUploading && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* FOOTER */}
        <div className="p-5 border-t">

          <Button
            onClick={handleUpload}
            disabled={isUploading || !selectedFiles.length}
            className="w-full h-11 bg-purple-600 hover:bg-purple-700"
          >

            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}

          </Button>

        </div>

      </DialogContent>
    </Dialog>
  );
}
