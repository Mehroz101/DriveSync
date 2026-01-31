import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, Users, Star } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DuplicateGroup, DriveFile, Drive } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";

interface DuplicateCardProps {
  duplicate: DuplicateGroup;
  drives?: Drive[];
  onSelect?: (duplicate: DuplicateGroup) => void;
  selected?: boolean;
}

export default function DuplicateCard({
  duplicate,
  drives,
  onSelect,
  selected,
}: DuplicateCardProps) {
  const primaryFile = duplicate.files[0];
  const duplicateCount = duplicate.files.length - 1;

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-shadow hover:shadow-md cursor-pointer",
        selected && "ring-2 ring-primary"
      )}
    >
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {primaryFile.googleFileId && primaryFile.driveAccountId ? (
          <img
            src={`http://localhost:4000/api/file/thumbnail?fileId=${primaryFile.googleFileId}&accountId=${primaryFile.driveAccountId}`}
            alt={primaryFile.name}
            className="object-cover w-full h-full"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.onerror = null;
              img.src = primaryFile.iconLink || "/placeholder.svg";
              img.className = "h-12 w-12 opacity-60";
            }}
          />
        ) : primaryFile.thumbnailUrl ? (
          <img
            src={primaryFile.thumbnailUrl}
            alt={primaryFile.name}
            className="object-cover w-full h-full"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.onerror = null;
              img.src = primaryFile.iconLink || "/placeholder.svg";
              img.className = "h-12 w-12 opacity-60";
            }}
          />
        ) : (
          <img
            src={primaryFile.iconLink}
            alt=""
            className="h-12 w-12 opacity-60"
          />
        )}

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" asChild>
            <a href={primaryFile.webViewLink} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4 mr-1" /> Preview
            </a>
          </Button>
        </div>

        <div className="absolute top-2 left-2">
          <Badge variant="destructive">{duplicateCount} duplicates</Badge>
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        <div className="space-y-1">
          <h3 className="font-medium text-sm truncate" title={duplicate.name}>
            {duplicate.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatBytes(duplicate.size)} • {duplicate.files.length} files
          </p>
          <p className="text-xs text-muted-foreground">
            Wasted: {formatBytes(duplicate.totalWastedSpace)}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {duplicate.files.slice(0, 3).map((file) => {
            const drive = drives?.find((d) => d._id === file.driveAccountId);
            return (
              <>
                <Avatar className="h-6 w-6 md:h-8 md:w-8 rounded-full shrink-0 overflow-hidden">
                  <AvatarImage
                    src={file.driveAccount?.profileImg || ""}
                    alt={file.driveAccount?.email || "Unknown"}
                    title={file.driveAccount?.email || "Unknown"}
                  />
                  <AvatarFallback>
                    {file.driveAccount?.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>{" "}
                {/* <Badge key={file._id} variant="outline" className="text-xs">
                {file.driveAccount?.email || drive?.email || "Unknown"}
              </Badge> */}
              </>
            );
          })}
          {duplicate.files.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{duplicate.files.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Trash2 className="h-4 w-4 mr-1" /> Delete Duplicates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
