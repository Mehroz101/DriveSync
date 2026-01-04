import { useState, useEffect } from 'react';
import {
  Search,
  Upload,
  Grid,
  List,
  MoreVertical,
  Download,
  Trash2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FileIcon } from '@/components/shared/FileIcon';
import { SkeletonTable } from '@/components/shared/SkeletonCard';
import { getFiles, getDrives } from '@/services/api';
import { formatBytes, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { FileType, DriveFile, Drive } from '@/types';

const fileTypes: FileType[] = ['document', 'spreadsheet', 'presentation', 'image', 'video', 'pdf', 'archive', 'other'];

export default function FilesExplorer() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDrive, setSelectedDrive] = useState<string>('all');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [filesRes, drivesRes] = await Promise.all([
        getFiles({
          search: searchQuery || undefined,
          types: selectedType !== 'all' ? [selectedType as FileType] : undefined,
          driveIds: selectedDrive !== 'all' ? [selectedDrive] : undefined,
        }),
        getDrives(),
      ]);
      if (filesRes.success) setFiles(filesRes.data);
      if (drivesRes.success) setDrives(drivesRes.data);
      setLoading(false);
    }
    fetchData();
  }, [searchQuery, selectedType, selectedDrive]);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const toggleAllFiles = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map((f) => f.id));
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Files Explorer</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Browse and manage files across all connected drives.
          </p>
        </div>
        
        <Button className="gap-2 w-full sm:w-auto">
          <Upload className="h-4 w-4" />
          Upload Files
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedDrive} onValueChange={setSelectedDrive}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All Drives" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drives</SelectItem>
              {drives.map((drive) => (
                <SelectItem key={drive.id} value={drive.id}>
                  {drive.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {fileTypes.map((type) => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden sm:flex items-center rounded-lg border bg-muted/30 p-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', viewMode === 'list' && 'bg-background shadow-sm')}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', viewMode === 'grid' && 'bg-background shadow-sm')}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-accent/5 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedFiles.length} selected
          </span>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      )}

      {/* Files Table */}
      {loading ? (
        <SkeletonTable rows={5} />
      ) : (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedFiles.length === files.length && files.length > 0}
                      onCheckedChange={toggleAllFiles}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Drive</TableHead>
                  <TableHead className="hidden sm:table-cell">Size</TableHead>
                  <TableHead className="hidden lg:table-cell">Modified</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow
                    key={file.id}
                    className={cn(
                      'transition-colors',
                      selectedFiles.includes(file.id) && 'bg-accent/5'
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileIcon type={file.type} showBackground />
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">{file.name}</p>
                          <p className="text-xs text-muted-foreground capitalize sm:hidden">{file.type} · {formatBytes(file.size)}</p>
                        </div>
                        {file.isDuplicate && (
                          <Badge variant="outline" className="hidden sm:inline-flex bg-warning/10 text-warning border-warning/20 text-xs">
                            Duplicate
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{file.driveName}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm">{formatBytes(file.size)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">{formatDate(file.lastModified)}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="h-4 w-4" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No files found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
