import { useEffect, useMemo, useState, useCallback } from "react";
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
  Calendar,
  Filter,
  X,
  FolderOpen,
  ChevronRight,
  Home,
  ArrowLeft,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { FileIcon } from "@/components/shared/FileIcon";
import { SkeletonTable } from "@/components/shared/SkeletonCard";

import {
  useAllDrivesFiles,
  useAllDrivesFilesSync,
  useFolderContents,
} from "@/queries/files/useDriveFiles";
import {
  useDriveAccountStats,
} from "@/queries/drive/useDriveAccounts";

import { formatBytes, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import type { DriveFile, FileType } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useDeleteFiles } from "@/mutations/files/useDeleteFiles";
import { DeleteFileDialog } from "@/components/common/deleteDialog";
import DeleteFileButton from "@/components/common/DeleteFileButton";
import {
  MIME_FILTER_MAP,
  FILE_FILTER_CATEGORIES,
  SIZE_FILTER_OPTIONS,
  DATE_PRESETS,
} from "@/constants/fileFilters";

import FilterBar from "@/components/files/FilterBar";
import FileCard from "@/components/files/FileCard";
import FilePreviewDialog from "@/components/files/FilePreviewDialog";
import { useToast } from "@/hooks/use-toast";
import type { DeleteFilesResponse, FolderContentsResponse, FilesApiResponse } from "@/api/files/files.api";
import { useReconnectDrive } from "@/mutations/drive/useReconnectDrive";
import { UploadDialog } from "@/components/files/UploadDialog";

/* -----------------------------------
 CONFIG
------------------------------------ */

const PAGE_SIZE = 50;
const FOLDER_MIME = "application/vnd.google-apps.folder";

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
  const [open, setOpen] = useState(false);

  // New filters
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // shared, starred, trashed
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState("all");

  const [selectedFiles, setSelectedFiles] = useState<
    { driveId: string; fileId: string }[]
  >([]);
  const [page, setPage] = useState(1);

  // Folder navigation state
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined;
  // Only enter folder mode when actively browsing a folder (folderStack not empty)
  const isInFolderMode = folderStack.length > 0;

  // File preview state
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const openPreview = useCallback((file: DriveFile) => {
    // Don't preview folders
    if (file.mimeType === FOLDER_MIME) return;
    setPreviewFile(file);
    setPreviewOpen(true);
  }, []);

  const navigateToFolder = useCallback((file: DriveFile) => {
    if (file.mimeType !== FOLDER_MIME || !file.googleFileId) return;
    setFolderStack((prev) => [...prev, { id: file.googleFileId!, name: file.name }]);
    setPage(1);
  }, []);

  const navigateBack = useCallback(() => {
    setFolderStack((prev) => prev.slice(0, -1));
    setPage(1);
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    if (index < 0) {
      setFolderStack([]);
    } else {
      setFolderStack((prev) => prev.slice(0, index + 1));
    }
    setPage(1);
  }, []);

  // Build mimeTypes array for the API from selectedTypes. Return undefined for "all" (no filter).
  const buildMimeFilterPayload = (types?: string[]) => {
    if (!types || types.length === 0 || types.includes("all")) return undefined;
    const mimes = types.flatMap((t) => MIME_FILTER_MAP[t] ?? []);
    return Array.from(new Set(mimes));
  };

  /* ---------- Side Effects ---------- */

  useEffect(() => {
    setPage(1);
  }, [
    selectedDrive,
    selectedTypes,
    selectedTags,
    selectedSize,
    selectedDatePreset,
  ]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setSearchValue(searchInput.trim());
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchInput]);

  /* ---------- Query Params ---------- */

  const queryParams = useMemo(() => {
    // Build size filter values
    const sizeOption = SIZE_FILTER_OPTIONS.find(
      (s) => s.value === selectedSize
    );
    const sizeFilter =
      sizeOption && selectedSize !== "all"
        ? { sizeMin: sizeOption.min, sizeMax: sizeOption.max }
        : {};

    // Build date filter (modifiedAfter)
    const datePreset = DATE_PRESETS.find((d) => d.value === selectedDatePreset);
    let dateFilter = {};
    if (datePreset && selectedDatePreset !== "all" && datePreset.days) {
      const date = new Date();
      date.setDate(date.getDate() - datePreset.days);
      dateFilter = { modifiedAfter: date.toISOString() };
    }

    return {
      page,
      limit: PAGE_SIZE,
      search: searchValue || undefined,
      driveId: selectedDrive !== "all" ? selectedDrive : undefined,
      driveStatus: "active",
      mimeTypes: buildMimeFilterPayload(selectedTypes),
      // Tag filters
      shared: selectedTags.includes("shared") ? true : undefined,
      starred: selectedTags.includes("starred") ? true : undefined,
      trashed: selectedTags.includes("trashed") ? true : undefined,
      // Size filters
      ...sizeFilter,
      // Date filter
      ...dateFilter,
    };
  }, [
    page,
    searchValue,
    selectedDrive,
    selectedTypes,
    selectedTags,
    selectedSize,
    selectedDatePreset,
  ]);

  /* ---------- API Hooks ---------- */

  // Use folder-specific endpoint when browsing folders, otherwise use the normal files endpoint
  const { data: filesData, isLoading: isFilesLoading } = useAllDrivesFiles(queryParams);
  
  // Only fetch folder contents when we're actually in folder mode
  const { data: folderData, isLoading: isFolderLoading } = useFolderContents(
    isInFolderMode ? currentFolderId : undefined,
    isInFolderMode ? { page, limit: PAGE_SIZE, driveId: selectedDrive !== "all" ? selectedDrive : undefined } : {},
  );

  const data = isInFolderMode ? folderData : filesData;
  const isLoading = isInFolderMode ? isFolderLoading : isFilesLoading;

  const { data: drivesResponse } = useDriveAccountStats();
  const drives = drivesResponse?.drives ?? [];
  const deleteFilesMutation = useDeleteFiles();

  const { refetch: refetchDriveFiles, isLoading: isSyncing } =
    useAllDrivesFilesSync();
  const { toast } = useToast();
  const [deleteResponse, setDeleteResponse] =
    useState<DeleteFilesResponse | null>(null);
  const { mutateAsync: reconnectDrive } = useReconnectDrive();
  /* ---------- Normalize API Response ---------- */

  const files = useMemo<DriveFile[]>(() => {
    if (!data) return [];
    // Check if it's a FolderContentsResponse with files array
    if (typeof data === 'object' && 'files' in data && Array.isArray((data as FolderContentsResponse).files)) {
      return (data as FolderContentsResponse).files;
    }
    // Otherwise it should be a DriveFile array
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  }, [data]);

  const pagination = useMemo(() => {
    if (!data) {
      return { page, totalPages: 1, totalFiles: 0 };
    }
    // Check if it's a FolderContentsResponse with pagination
    if (typeof data === 'object' && 'pagination' in data) {
      return (data as FolderContentsResponse).pagination;
    }
    // Otherwise it's an array, create minimal pagination
    if (Array.isArray(data)) {
      return { page, totalPages: 1, totalFiles: data.length };
    }
    return { page, totalPages: 1, totalFiles: 0 };
  }, [data, page]);

  /* ---------- Client Filters ---------- */

  // const filteredFiles = useMemo(() => {
  //   if (selectedType === "all") return files;
  //   return files.filter((f) => f.type === selectedType);
  // }, [files, selectedType]);

  /* ---------- Selection Handlers ---------- */

  const toggleFile = (id: string, driveId?: string) => {
    setSelectedFiles((prev) =>
      prev.some((f) => f.fileId === id)
        ? prev.filter((f) => f.fileId !== id)
        : [...prev, { fileId: id, driveId }]
    );
  };

  const toggleAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(
        files.map((f) => ({ fileId: f._id, driveId: f.driveAccountId }))
      );
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

  // Toggle a tag filter (shared, starred, trashed)
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedTags([]);
    setSelectedSize("all");
    setSelectedDatePreset("all");
    setSearchInput("");
    setSelectedDrive("all");
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedTags.length > 0 ||
    selectedSize !== "all" ||
    selectedDatePreset !== "all" ||
    searchValue !== "" ||
    selectedDrive !== "all";

  /* ---------- Bulk Actions ---------- */

  const downloadFiles = () => {
    // Implement download logic here
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
        <div className="flex gap-2">
  <Button
        onClick={() => setOpen(true)}
        className="gap-2 h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white shadow-md"
      >
        <Upload className="h-4 w-4" />
        Upload Video
      </Button>

      {/* MODAL */}
      <UploadDialog
        open={open}
        onClose={() => setOpen(false)}
      />          <Button
            className="gap-2"
            disabled={isSyncing}
            onClick={() => refetchDriveFiles()}
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            Sync Files
          </Button>
        </div>
      </div>

      <FilterBar
        selectedDrive={selectedDrive}
        setSelectedDrive={setSelectedDrive}
        drives={drives}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        selectedTags={selectedTags}
        toggleTag={toggleTag}
        selectedSize={selectedSize}
        setSelectedSize={setSelectedSize}
        selectedDatePreset={selectedDatePreset}
        setSelectedDatePreset={setSelectedDatePreset}
        hasActiveFilters={hasActiveFilters}
        clearAllFilters={clearAllFilters}
        toggleType={toggleType}
      />

      {/* BULK BAR */}

      {selectedFiles.length > 0 && (
        <div className="flex gap-3 items-center bg-muted/40 border rounded-lg px-4 py-3">
          <span className="text-sm font-medium">
            {selectedFiles.length} Selected
          </span>

          <Button 
            size="sm" 
            variant="outline" 
            onClick={downloadFiles}
            aria-label="Download selected files"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Download
          </Button>

          <DeleteFileDialog
            trigger={
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteFilesMutation.status === "pending"}
                aria-label={`Delete ${selectedFiles.length} selected files`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            }
            onConfirm={async () => await deleteFiles()}
            title={`Delete ${selectedFiles.length} files?`}
            description={`This will attempt to remove files from Drive and then mark them trashed in the DB. Some files may fail to remove from Drive.`}
            confirmLabel={`Delete ${selectedFiles.length}`}
          />
        </div>
      )}

      {/* Inline delete result alert */}
      {deleteResponse && (
        <div className="mt-2">
          <Alert variant={deleteResponse.success ? "default" : "destructive"}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <AlertTitle>
                  {deleteResponse.success
                    ? `Deleted ${deleteResponse.deletedCount ?? 0} files`
                    : "Delete failed"}
                </AlertTitle>
                <AlertDescription>
                  {deleteResponse.success
                    ? deleteResponse.failedFiles &&
                      deleteResponse.failedFiles.length > 0
                      ? `${deleteResponse.failedFiles.length} file(s) failed to remove.`
                      : "All files removed successfully."
                    : deleteResponse.error ||
                      "An error occurred while deleting files."}
                </AlertDescription>
              </div>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteResponse(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
            {deleteResponse?.revokedAccounts &&
              deleteResponse.revokedAccounts.length > 0 && (
                <div className="mt-3 flex gap-2">
                  <p className="text-sm text-muted-foreground mr-2">
                    The following accounts need reauthorization:
                  </p>
                  <div className="flex gap-2">
                    {deleteResponse.revokedAccounts.map((a) => (
                      <Button
                        key={a.id}
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const resp = await reconnectDrive(a.id);
                            if (resp && resp.authUrl) {
                              window.location.href = resp.authUrl;
                            }
                          } catch (e) {
                            console.error("Reconnect failed", e);
                            toast({
                              title: "Reconnect failed",
                              description:
                                "Unable to start reauthorization flow",
                            });
                          }
                        }}
                      >
                        {a.email || a.id}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
          </Alert>
        </div>
      )}

      {/* BREADCRUMB NAVIGATION */}
      {folderStack.length > 0 && (
        <div className="flex items-center gap-1 text-sm overflow-x-auto pb-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 shrink-0"
            onClick={() => navigateToBreadcrumb(-1)}
          >
            <Home className="h-3.5 w-3.5" />
            Root
          </Button>
          {folderStack.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <Button
                variant={index === folderStack.length - 1 ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={() => navigateToBreadcrumb(index)}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="max-w-[120px] truncate">{folder.name}</span>
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 ml-2 shrink-0"
            onClick={navigateBack}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
        </div>
      )}

      {/* CONTENT - LIST OR GRID */}

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : viewMode === "list" ? (
        /* ---------- TABLE VIEW ---------- */
        <div className="border rounded-xl overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 ">
                  <div className="flex justify-center items-center">
                    <input
                      type="checkbox"
                      checked={
                        files.length > 0 && selectedFiles.length === files.length
                      }
                      onChange={toggleAll}
                    />
                  </div>
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
                <TableRow
                  key={file._id}
                  className={cn(
                    file.mimeType === FOLDER_MIME && "cursor-pointer hover:bg-muted/60"
                  )}
                  onDoubleClick={() => {
                    if (file.mimeType === FOLDER_MIME) {
                      navigateToFolder(file);
                    } else {
                      openPreview(file);
                    }
                  }}
                >
                  <TableCell className="w-10 ">
                    <div className="flex justify-center items-center">
                      <input
                        type="checkbox"
                        checked={selectedFiles.some(
                          (f) => f.fileId === file._id!
                        )}
                        onChange={() =>
                          toggleFile(file._id!, file.driveAccountId)
                        }
                      />
                    </div>
                  </TableCell>

                  <TableCell>
                    <div
                      className="flex gap-3 items-center"
                      onClick={() => {
                        if (file.mimeType === FOLDER_MIME) {
                          navigateToFolder(file);
                        }
                      }}
                    >
                      {file.mimeType === FOLDER_MIME ? (
                        <FolderOpen className="h-5 w-5 text-blue-400 shrink-0" />
                      ) : (
                        <img src={file.iconLink} alt="" className="h-5 w-5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{file.name}</p>
                        {/* Tags row */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {file.shared && (
                            <Badge
                              variant="secondary"
                              className="text-xs gap-1"
                            >
                              <Users className="h-3 w-3" /> Shared
                            </Badge>
                          )}
                          {file.starred && (
                            <Badge
                              variant="secondary"
                              className="text-xs gap-1 text-yellow-600"
                            >
                              <Star className="h-3 w-3 fill-yellow-500" />{" "}
                              Starred
                            </Badge>
                          )}
                          {file.trashed && (
                            <Badge
                              variant="destructive"
                              className="text-xs gap-1"
                            >
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
                    {file.owners?.[0]?.emailAddress || "—"}
                  </TableCell>

                  <TableCell className="hidden sm:table-cell whitespace-nowrap">
                    {formatBytes(file.size)}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    {formatDate(file.modifiedTime)}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Preview button - open in-app preview for media, or Google Drive for others */}
                      {file.mimeType !== FOLDER_MIME && (
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => openPreview(file)}
                          aria-label={`Preview ${file.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {file.mimeType === FOLDER_MIME && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigateToFolder(file)}
                          aria-label={`Open folder ${file.name}`}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            aria-label={`More options for ${file.name}`}
                          >
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="flex gap-2 items-center"
                              aria-label={`Open ${file.name} in new tab`}
                            >
                              <Eye className="h-4 w-4" />
                              Open
                            </a>
                          </DropdownMenuItem>

                          <DropdownMenuItem 
                            className="gap-2"
                            aria-label={`Download ${file.name}`}
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Download
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-destructive gap-2 p-0"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <DeleteFileButton
                              fileId={file._id!}
                              driveId={file.driveAccountId}
                              trigger={
                                <div 
                                  className="flex gap-2 items-center text-destructive cursor-pointer w-full px-2 py-1.5"
                                  aria-label={`Delete ${file.name}`}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  Delete
                                </div>
                              }
                            />
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
            {files.map((file) => (
              <FileCard
                key={file._id}
                file={file}
                drives={drives}
                toggleFile={toggleFile}
                selectedFiles={selectedFiles}
                openPreview={openPreview}
                navigateToFolder={navigateToFolder}
              />
            ))}
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

      {/* File Preview Dialog */}
      {previewFile && (
        <FilePreviewDialog
          file={previewFile}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
