import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Upload,
  Grid,
  List,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Star,
  Share2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { FileIcon } from "@/components/shared/FileIcon";
import { SkeletonTable } from "@/components/shared/SkeletonCard";

import {
  useAllDrivesFiles,
  useAllDrivesFilesSync,
} from "@/queries/files/useDriveFiles";
import {
  useDriveAccounts,
  useDriveAccountStats,
} from "@/queries/drive/useDriveAccounts";

import { formatBytes, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import type { DriveFile, FileType } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";

/* -----------------------------------
 CONFIG
------------------------------------ */

const FILE_TYPES: FileType[] = [
  "document",
  "spreadsheet",
  "presentation",
  "image",
  "video",
  "pdf",
  "archive",
  "other",
];
export const MIME_FILTER_MAP: Record<string, string[]> = {
  document: [
    "application/vnd.google-apps.document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/html",
    "text/csv",
    "application/json",
  ],

  spreadsheet: [
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],

  presentation: ["application/vnd.google-apps.presentation"],

  pdf: ["application/pdf"],

  image: [
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
    "image/gif",
    "image/heif",
    "image/x-photoshop",
  ],

  video: ["video/mp4", "video/mpeg", "video/quicktime", "video/webm"],

  archive: [
    "application/zip",
    "application/x-zip-compressed",
    "application/rar",
    "application/octet-stream",
  ],

  folder: ["application/vnd.google-apps.folder"],

  code: [
    "text/javascript",
    "text/css",
    "application/x-httpd-php",
    "application/vnd.jgraph.mxfile",
  ],

  other: [
    "application/vnd.google-apps.shortcut",
    "application/vnd.android.package-archive",
    "application/vnd.google-makersuite.applet+zip",
    "application/vnd.google-makersuite.prompt",
    "application/x-msdownload",
    "text/x-vcard",
  ],
};

export const FILE_FILTER_CATEGORIES: { label: string; value: string }[] = [
  { label: "Documents", value: "document" },

  { label: "Spreadsheets", value: "spreadsheet" },

  { label: "Presentations", value: "presentation" },

  { label: "PDF Files", value: "pdf" },

  { label: "Images", value: "image" },

  { label: "Videos", value: "video" },

  { label: "Archives", value: "archive" },

  { label: "Folders", value: "folder" },

  { label: "Code Files", value: "code" },

  { label: "Other", value: "other" },
];

const PAGE_SIZE = 50;

/* -----------------------------------
 COMPONENT
------------------------------------ */

export default function FilesExplorer() {
  /* ---------- UI State ---------- */

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const [selectedDrive, setSelectedDrive] = useState("all");
  // multi-select types: empty array = all types
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Build mimeTypes array for the API from selectedTypes. Return undefined for "all" (no filter).
  const buildMimeFilterPayload = (types?: string[]) => {
    if (!types || types.length === 0 || types.includes("all")) return undefined;
    const mimes = types.flatMap((t) => MIME_FILTER_MAP[t] ?? []);
    return Array.from(new Set(mimes));
  };

  /* ---------- Side Effects ---------- */

  useEffect(() => {
    setPage(1);
  }, [selectedDrive, selectedTypes]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setSearchValue(searchInput.trim());
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchInput]);

  /* ---------- Query Params ---------- */

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: searchValue || undefined,
      driveId: selectedDrive !== "all" ? selectedDrive : undefined,
      driveStatus: "active",
      mimeTypes: buildMimeFilterPayload(selectedTypes),
    }),
    [page, searchValue, selectedDrive, selectedTypes]
  );

  /* ---------- API Hooks ---------- */

  const { data, isLoading } = useAllDrivesFiles(queryParams);
  const { data: drives } = useDriveAccountStats();
  const { refetch: refetchDriveFiles, isLoading: isSyncing } =
    useAllDrivesFilesSync();
  /* ---------- Normalize API Response ---------- */

  const files = useMemo<DriveFile[]>(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data.files ?? [];
  }, [data]);

  const pagination = useMemo(() => {
    if (!data || Array.isArray(data)) {
      return {
        page,
        totalPages: 1,
        totalFiles: files.length,
      };
    }

    return data.pagination;
  }, [data, files.length, page]);

  /* ---------- Client Filters ---------- */

  // const filteredFiles = useMemo(() => {
  //   if (selectedType === "all") return files;
  //   return files.filter((f) => f.type === selectedType);
  // }, [files, selectedType]);

  /* ---------- Selection Handlers ---------- */

  const toggleFile = (id: string) => {
    setSelectedFiles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map((f) => f._id));
    }
  };

  // Toggle a file-type filter (multi-select). An empty selection means "All Types".
  const toggleType = (value: string) => {
    setSelectedTypes((prev) => {
      if (value === "all") return [];
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      return [...prev, value];
    });
  };

  /* -----------------------------------
 UI RENDER
------------------------------------ */

  return (
    <div className={`space-y-6 animate-fade-in `}>
      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Files Explorer</h1>
          <p className="text-muted-foreground">
            Centralized file intelligence across all connected drives.
          </p>
        </div>

        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Files
        </Button>
        <Button className="gap-2" disabled={isSyncing} onClick={() => refetchDriveFiles()}>
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          Sync Files
        </Button>
      </div>

      {/* FILTER BAR */}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search files..."
            className="pl-9"
          />
        </div>

        <Select value={selectedDrive} onValueChange={setSelectedDrive}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Drives" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drives</SelectItem>
            {drives?.map((d) => (
              <SelectItem key={d._id} value={d._id}>
                <div className="flex items-center gap-2">
                  <img
                    src={d.owner.photoLink}
                    alt=""
                    className="h-6 w-6 rounded-full"
                  />
                  {d.owner.emailAddress.split("@")[0]}{" "}
                  <StatusBadge status={d.connectionStatus} />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Multi-select type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[140px] justify-between">
              {selectedTypes.length === 0
                ? "All Types"
                : selectedTypes.length === 1
                ? FILE_FILTER_CATEGORIES.find(
                    (c) => c.value === selectedTypes[0]
                  )?.label || selectedTypes[0]
                : `${selectedTypes.length} selected`}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <div className="px-2 py-1">
              <div
                className="flex items-center gap-2 px-2 py-1 cursor-pointer"
                onClick={() => setSelectedTypes([])}
              >
                <Checkbox checked={selectedTypes.length === 0} />
                <span className="text-sm">All Types</span>
              </div>

              <DropdownMenuSeparator />

              {FILE_FILTER_CATEGORIES.map((type) => (
                <div
                  key={type.value}
                  className="flex items-center gap-2 px-2 py-1 cursor-pointer"
                  onClick={() => toggleType(type.value)}
                >
                  <Checkbox checked={selectedTypes.includes(type.value)} />
                  <span className="capitalize text-sm">{type.label}</span>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden sm:flex border rounded-lg p-1">
          <Button
            size="icon"
            variant="ghost"
            className={cn(viewMode === "list" && "bg-muted")}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={cn(viewMode === "grid" && "bg-muted")}
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* BULK BAR */}

      {selectedFiles.length > 0 && (
        <div className="flex gap-3 items-center bg-muted/40 border rounded-lg px-4 py-3">
          <span className="text-sm font-medium">
            {selectedFiles.length} Selected
          </span>

          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>

          <Button size="sm" variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      )}

      {/* CONTENT - LIST OR GRID */}

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : viewMode === "list" ? (
        /* ---------- TABLE VIEW ---------- */
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      files.length > 0 && selectedFiles.length === files.length
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>

                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead className="hidden md:table-cell">Drive</TableHead>
                <TableHead className="hidden sm:table-cell">Size</TableHead>
                <TableHead className="hidden lg:table-cell">Modified</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {files.map((file) => (
                <TableRow key={file._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFiles.includes(file._id!)}
                      onCheckedChange={() => toggleFile(file._id!)}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-3 items-center">
                      <img src={file.iconLink} alt="" className="h-5 w-5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{file.name}</p>
                        {/* Tags row */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {file.shared && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Users className="h-3 w-3" /> Shared
                            </Badge>
                          )}
                          {file.starred && (
                            <Badge variant="secondary" className="text-xs gap-1 text-yellow-600">
                              <Star className="h-3 w-3 fill-yellow-500" /> Starred
                            </Badge>
                          )}
                          {file.trashed && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <Trash2 className="h-3 w-3" /> Trashed
                            </Badge>
                          )}
                          {file.isDuplicate && (
                            <Badge variant="outline" className="text-xs">
                              Duplicate
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    {file.owners?.[0]?.displayName || "—"}
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    {file.drive?.email || file.driveAccountId}
                  </TableCell>

                  <TableCell className="hidden sm:table-cell">
                    {formatBytes(file.size)}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    {formatDate(file.modifiedTime)}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Preview button */}
                      <Button size="icon" variant="ghost" asChild>
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="flex gap-2 items-center"
                            >
                              <Eye className="h-4 w-4" />
                              Open
                            </a>
                          </DropdownMenuItem>

                          <DropdownMenuItem className="gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem className="text-destructive gap-2">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* PAGINATION */}
          <div className="flex justify-between items-center px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} —{" "}
              {pagination.totalFiles} Files
            </span>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ---------- GRID VIEW ---------- */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map((file) => {
              const isImage = file.mimeType?.startsWith("image/");
              const driveInfo = drives?.find((d) => d._id === file.driveAccountId);
              console.log(`http://localhost:4000/api/file/thumbnail?fileId=${file.googleFileId}&accountId=${file.driveAccountId}`)
              return (
                <Card
                  key={file._id}
                  className={cn(
                    "group overflow-hidden transition-shadow hover:shadow-md cursor-pointer",
                    selectedFiles.includes(file._id!) && "ring-2 ring-primary"
                  )}
                >
                  {/* Preview / Thumbnail */}
                  <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {/* Use thumbnailUrl if available, otherwise show icon */}
                    {file.googleFileId && file.driveAccountId ? (
                      <img
                        src={`http://localhost:4000/api/file/thumbnail?fileId=${file.googleFileId}&accountId=${file.driveAccountId}`}
                        alt={file.name}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          img.onerror = null; // prevent loop
                          img.src = file.iconLink || "/placeholder.svg";
                          img.className = "h-12 w-12 opacity-60";
                        }}
                      />
                    ) : file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          img.onerror = null;
                          img.src = file.iconLink || "/placeholder.svg";
                          img.className = "h-12 w-12 opacity-60";
                        }}
                      />
                    ) : (
                      <img
                        src={file.iconLink}
                        alt=""
                        className="h-12 w-12 opacity-60"
                      />
                    )}

                    {/* Overlay with actions on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" asChild>
                        <a href={file.webViewLink} target="_blank" rel="noreferrer">
                          <Eye className="h-4 w-4 mr-1" /> Preview
                        </a>
                      </Button>
                    </div>

                    {/* Checkbox */}
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedFiles.includes(file._id!)}
                        onCheckedChange={() => toggleFile(file._id!)}
                        className="bg-background"
                      />
                    </div>

                    {/* Dropdown menu */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="secondary" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="flex gap-2 items-center"
                            >
                              <Eye className="h-4 w-4" />
                              Open
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive gap-2">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <CardContent className="p-3 space-y-2">
                    {/* File name with icon */}
                    <div className="flex items-center gap-2">
                      <img src={file.iconLink} alt="" className="h-4 w-4 shrink-0" />
                      <p className="text-sm font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {file.shared && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Users className="h-3 w-3" /> Shared
                        </Badge>
                      )}
                      {file.starred && (
                        <Badge variant="secondary" className="text-xs gap-1 text-yellow-600">
                          <Star className="h-3 w-3 fill-yellow-500" /> Starred
                        </Badge>
                      )}
                      {file.trashed && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <Trash2 className="h-3 w-3" /> Trashed
                        </Badge>
                      )}
                      {file.isDuplicate && (
                        <Badge variant="outline" className="text-xs">
                          Duplicate
                        </Badge>
                      )}
                    </div>

                    {/* Account info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {driveInfo?.owner?.photoLink ? (
                        <img
                          src={driveInfo.owner.photoLink}
                          alt=""
                          className="h-5 w-5 rounded-full"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted" />
                      )}
                      <span className="truncate">
                        {driveInfo?.owner?.emailAddress || file.drive?.email || "—"}
                      </span>
                    </div>

                    {/* Date */}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(file.modifiedTime)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* PAGINATION (grid) */}
          <div className="flex justify-between items-center pt-4">
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} —{" "}
              {pagination.totalFiles} Files
            </span>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
