import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users, Star, Trash2, FolderOpen } from "lucide-react";
import { formatDate, formatBytes } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DriveFile, DriveAccount } from "@/types";

const FOLDER_MIME = "application/vnd.google-apps.folder";

interface FileCardProps {
  file: DriveFile;
  drives?: DriveAccount[];
  toggleFile: (id: string, driveId?: string) => void;
  selectedFiles: { fileId: string; driveId?: string }[];
  openPreview?: (file: DriveFile) => void;
  navigateToFolder?: (file: DriveFile) => void;
}

function isDriveAccount(d?: DriveAccount): d is DriveAccount {
  return !!d && "connectionStatus" in d;
}

export default function FileCard({ file, drives, toggleFile, selectedFiles, openPreview, navigateToFolder }: FileCardProps) {
  const driveInfo = Array.isArray(drives) ? drives.find((d) => d._id === file.driveAccountId) as DriveAccount | undefined : undefined;

  const ownerPhoto = isDriveAccount(driveInfo) ? driveInfo.owner?.photoLink : undefined;
  const ownerEmail = isDriveAccount(driveInfo) ? driveInfo.owner?.emailAddress : file.driveAccount?.email || "—";

  const isFolder = file.mimeType === FOLDER_MIME;

  const handleClick = () => {
    if (isFolder && navigateToFolder) {
      navigateToFolder(file);
    } else if (openPreview) {
      openPreview(file);
    }
  };

  return (
    <Card className={cn("group overflow-hidden transition-shadow hover:shadow-md cursor-pointer", selectedFiles.some((f) => f.fileId === file._id) && "ring-2 ring-primary")} onClick={handleClick}>
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {isFolder ? (
          <div className="flex flex-col items-center gap-2">
            <FolderOpen className="h-12 w-12 text-blue-400" />
            <span className="text-xs text-muted-foreground">Folder</span>
          </div>
        ) : file.googleFileId && file.driveAccountId ? (
          <img src={`http://localhost:4000/api/file/thumbnail?fileId=${file.googleFileId}&accountId=${file.driveAccountId}`} alt={file.name} className="object-cover w-full h-full" onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = file.iconLink || "/placeholder.svg"; img.className = "h-12 w-12 opacity-60"; }} />
        ) : file.thumbnailUrl ? (
          <img src={file.thumbnailUrl} alt={file.name} className="object-cover w-full h-full" onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = file.iconLink || "/placeholder.svg"; img.className = "h-12 w-12 opacity-60"; }} />
        ) : (
          <img src={file.iconLink} alt="" className="h-12 w-12 opacity-60" />
        )}

        {!isFolder && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openPreview?.(file); }}>
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
          </div>
        )}
        <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center items-center">
            <input
              type="checkbox"
              checked={selectedFiles.some((f) => f.fileId === file._id!)}
              onChange={() => toggleFile(file._id!, file.driveAccountId)}
            />
          </div>
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          {isFolder ? (
            <FolderOpen className="h-4 w-4 text-blue-400 shrink-0" />
          ) : (
            <img src={file.iconLink} alt="" className="h-4 w-4 shrink-0" />
          )}
          <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
        </div>
        {!isFolder && (
          <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
        )}
        <div className="flex flex-wrap gap-1">
          {file.shared && (<Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" /> Shared</Badge>)}
          {file.starred && (<Badge variant="secondary" className="text-xs gap-1 text-yellow-600"><Star className="h-3 w-3 fill-yellow-500" /> Starred</Badge>)}
          {file.trashed && (<Badge variant="destructive" className="text-xs gap-1"><Trash2 className="h-3 w-3" /> Trashed</Badge>)}
          {file.isDuplicate && (<Badge variant="outline" className="text-xs">Duplicate</Badge>)}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {ownerPhoto ? (
            <img src={ownerPhoto} alt="" className="h-5 w-5 rounded-full" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted" />
          )}
          <span className="truncate">{ownerEmail}</span>
        </div>
        <p className="text-xs text-muted-foreground">{formatDate(file.modifiedTime)}</p>
      </CardContent>
    </Card>
  );
}
