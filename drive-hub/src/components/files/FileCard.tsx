import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users, Star, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DriveFile, DriveAccount } from "@/types";

interface FileCardProps {
  file: DriveFile;
  drives?: DriveAccount[];
  toggleFile: (id: string, driveId?: string) => void;
  selectedFiles: { fileId: string; driveId?: string }[];
}

function isDriveAccount(d?: DriveAccount): d is DriveAccount {
  return !!d && "connectionStatus" in d;
}

export default function FileCard({ file, drives, toggleFile, selectedFiles }: FileCardProps) {
  const driveInfo = drives?.find((d) => d._id === file.driveAccountId) as DriveAccount | undefined;

  // Safely derive owner photo/email from either DriveAccount (owner)
  const ownerPhoto = isDriveAccount(driveInfo) ? driveInfo.owner?.photoLink : undefined;
  const ownerEmail = isDriveAccount(driveInfo) ? driveInfo.owner?.emailAddress : file.driveAccount?.email || "—";

  return (
    <Card className={cn("group overflow-hidden transition-shadow hover:shadow-md cursor-pointer", selectedFiles.some((f) => f.fileId === file._id) && "ring-2 ring-primary")}>
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {file.googleFileId && file.driveAccountId ? (
          <img src={`http://localhost:4000/api/file/thumbnail?fileId=${file.googleFileId}&accountId=${file.driveAccountId}`} alt={file.name} className="object-cover w-full h-full" onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = file.iconLink || "/placeholder.svg"; img.className = "h-12 w-12 opacity-60"; }} />
        ) : file.thumbnailUrl ? (
          <img src={file.thumbnailUrl} alt={file.name} className="object-cover w-full h-full" onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = file.iconLink || "/placeholder.svg"; img.className = "h-12 w-12 opacity-60"; }} />
        ) : (
          <img src={file.iconLink} alt="" className="h-12 w-12 opacity-60" />
        )}

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" asChild>
            <a href={file.webViewLink} target="_blank" rel="noreferrer"><Eye className="h-4 w-4 mr-1" /> Preview</a>
          </Button>
        </div>

        <div className="absolute top-2 left-2">
          <Checkbox checked={selectedFiles.some((f) => f.fileId === file._id)} onCheckedChange={() => toggleFile(file._id!, file.driveAccountId)} className="bg-background" />
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2"><img src={file.iconLink} alt="" className="h-4 w-4 shrink-0" /><p className="text-sm font-medium truncate" title={file.name}>{file.name}</p></div>
        <div className="flex flex-wrap gap-1">{file.shared && (<Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" /> Shared</Badge>)}{file.starred && (<Badge variant="secondary" className="text-xs gap-1 text-yellow-600"><Star className="h-3 w-3 fill-yellow-500" /> Starred</Badge>)}{file.trashed && (<Badge variant="destructive" className="text-xs gap-1"><Trash2 className="h-3 w-3" /> Trashed</Badge>)}{file.isDuplicate && (<Badge variant="outline" className="text-xs">Duplicate</Badge>)}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{ownerPhoto ? (<img src={ownerPhoto} alt="" className="h-5 w-5 rounded-full" />) : (<div className="h-5 w-5 rounded-full bg-muted" />)}<span className="truncate">{ownerEmail}</span></div>
        <p className="text-xs text-muted-foreground">{formatDate(file.modifiedTime)}</p>
      </CardContent>
    </Card>
  );
}
