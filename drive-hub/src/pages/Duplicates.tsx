import { useState, useEffect } from 'react';
import { Copy, Trash2, Eye, CheckCircle2, AlertCircle, Search, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileIcon } from '@/components/shared/FileIcon';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { getDuplicates, getDashboardStats, scanForDuplicates } from '@/services/api';
import { formatBytes, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { DuplicateGroup, DashboardStats } from '@/types';

export default function Duplicates() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [dupRes, statsRes] = await Promise.all([
        getDuplicates(),
        getDashboardStats(),
      ]);
      if (dupRes.success) setDuplicates(dupRes.data);
      if (statsRes.success) setStats(statsRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const toggleFile = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleScan = async () => {
    setIsScanning(true);
    await scanForDuplicates();
    // Re-fetch duplicates after scan
    const dupRes = await getDuplicates();
    if (dupRes.success) setDuplicates(dupRes.data);
    setIsScanning(false);
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Duplicate Files</h1>
          <p className="text-sm md:text-base text-muted-foreground">Loading...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Duplicate Files</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Find and remove duplicates.
          </p>
        </div>
        
        <Button onClick={handleScan} disabled={isScanning} className="gap-2 w-full sm:w-auto">
          <RefreshCw className={cn('h-4 w-4', isScanning && 'animate-spin')} />
          {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-warning/10 shrink-0">
                <Copy className="h-5 w-5 md:h-6 md:w-6 text-warning" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold">{stats?.duplicateFiles || 0}</p>
                <p className="text-[10px] md:text-sm text-muted-foreground">Duplicates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-destructive/10 shrink-0">
                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold">{formatBytes(stats?.duplicateSpace || 0)}</p>
                <p className="text-[10px] md:text-sm text-muted-foreground">Wasted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-success/10 shrink-0">
                <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-success" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold">{duplicates.length}</p>
                <p className="text-[10px] md:text-sm text-muted-foreground">Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selection Actions */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-accent/5 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedFiles.length} selected
          </span>
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete Selected</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedFiles([])}>
            Clear
          </Button>
        </div>
      )}

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {duplicates.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="bg-muted/30 py-3 md:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon type={group.files[0]?.type || 'other'} showBackground />
                  <div className="min-w-0">
                    <CardTitle className="text-sm md:text-base truncate">{group.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {group.files.length} copies · {formatBytes(group.totalWastedSpace)} wasted
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 shrink-0">
                  {group.files.length} duplicates
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="divide-y">
                {group.files.map((file, index) => (
                  <div
                    key={file.id}
                    className={cn(
                      'flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 transition-colors hover:bg-muted/30',
                      selectedFiles.includes(file.id) && 'bg-accent/5'
                    )}
                  >
                    <Checkbox
                      checked={selectedFiles.includes(file.id)}
                      onCheckedChange={() => toggleFile(file.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate text-sm">{file.name}</p>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Original</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {file.driveName} · {formatDate(file.lastModified)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-2 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {duplicates.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-12 md:py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No Duplicates Found</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm px-4">
              Your drives are clean! Run a scan to check for duplicate files.
            </p>
            <Button className="mt-6 gap-2" onClick={handleScan}>
              <Search className="h-4 w-4" />
              Scan Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
