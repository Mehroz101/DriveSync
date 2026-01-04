import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Download, TrendingUp, HardDrive, Files, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonChart, SkeletonCard } from '@/components/shared/SkeletonCard';
import { 
  getStorageAnalytics, 
  getFileTypeDistribution, 
  getDriveUsageStats,
  getFiles,
  getDashboardStats,
} from '@/services/api';
import { formatBytes, formatNumber } from '@/lib/formatters';
import type { StorageAnalytics, FileTypeDistribution, DriveUsageStats, DriveFile, DashboardStats } from '@/types';

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 84%, 60%)',
  'hsl(45, 93%, 47%)',
  'hsl(215, 16%, 47%)',
];

export default function Analytics() {
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [storageData, setStorageData] = useState<StorageAnalytics[]>([]);
  const [fileTypes, setFileTypes] = useState<FileTypeDistribution[]>([]);
  const [driveStats, setDriveStats] = useState<DriveUsageStats[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [storageRes, typesRes, drivesRes, filesRes, statsRes] = await Promise.all([
        getStorageAnalytics(),
        getFileTypeDistribution(),
        getDriveUsageStats(),
        getFiles(),
        getDashboardStats(),
      ]);
      
      if (storageRes.success) setStorageData(storageRes.data);
      if (typesRes.success) setFileTypes(typesRes.data);
      if (drivesRes.success) setDriveStats(drivesRes.data);
      if (filesRes.success) setFiles(filesRes.data);
      if (statsRes.success) setStats(statsRes.data);
      
      setLoading(false);
    }
    fetchData();
  }, []);

  // Transform data for charts
  const storageChartData = storageData.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    used: item.usedStorage / (1024 * 1024 * 1024),
    total: item.totalStorage / (1024 * 1024 * 1024),
  }));

  const pieChartData = fileTypes.map((item) => ({
    name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    value: item.count,
    size: item.size,
  }));

  const driveBarData = driveStats.map((item) => ({
    name: item.driveName.length > 10 ? item.driveName.slice(0, 10) + '...' : item.driveName,
    used: item.storageUsed / (1024 * 1024 * 1024),
    total: item.storageTotal / (1024 * 1024 * 1024),
    files: item.fileCount,
  }));

  // Largest files
  const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Analytics & Insights</h1>
          <p className="text-sm md:text-base text-muted-foreground">Loading...</p>
        </div>
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Analytics & Insights</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Understand your storage patterns.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl gradient-primary shrink-0">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold">+8.2%</p>
                <p className="text-xs md:text-sm text-muted-foreground">Storage growth</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl gradient-success shrink-0">
                <HardDrive className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold">45.9%</p>
                <p className="text-xs md:text-sm text-muted-foreground">Capacity used</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-muted shrink-0">
                <Files className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold">3,450</p>
                <p className="text-xs md:text-sm text-muted-foreground">Images</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl gradient-warning shrink-0">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold">158 MB</p>
                <p className="text-xs md:text-sm text-muted-foreground">Duplicate waste</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Storage Growth Chart */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Storage Growth</CardTitle>
            <CardDescription className="text-xs md:text-sm">Storage usage over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={storageChartData}>
                <defs>
                  <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v}GB`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} GB`, 'Used']}
                />
                <Area
                  type="monotone"
                  dataKey="used"
                  stroke="hsl(217, 91%, 60%)"
                  fillOpacity={1}
                  fill="url(#colorUsed)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* File Type Distribution */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">File Types</CardTitle>
            <CardDescription className="text-xs md:text-sm">Distribution by file count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${formatNumber(value)} files`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Drive Usage */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Drive Usage</CardTitle>
            <CardDescription className="text-xs md:text-sm">Storage by connected drive</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={driveBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${v}GB`} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} GB`]}
                />
                <Bar dataKey="used" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Largest Files */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Largest Files</CardTitle>
            <CardDescription className="text-xs md:text-sm">Top 5 files by size</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              {largestFiles.map((file, index) => (
                <div key={file.id} className="flex items-center gap-3 md:gap-4">
                  <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-muted text-xs md:text-sm font-medium shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.driveName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium text-sm">{formatBytes(file.size)}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground capitalize">{file.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
