import { useState } from "react";
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
} from "recharts";
import {
  Download,
  TrendingUp,
  HardDrive,
  Files,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonChart, SkeletonCard } from "@/components/shared/SkeletonCard";
import {
  useStorageAnalytics,
  useFileTypeDistribution,
  useDriveUsageStats,
  useDashboardStats,
  useAnalyticsFiles,
  useDriveAccounts
} from "@/queries/analytics/useAnalytic";
import { formatBytes, formatNumber } from "@/lib/formatters";
import type {
  StorageAnalytics,
  FileTypeDistribution,
  DriveUsageStatsResponse,
  DriveFile,
  DashboardStats,
  DriveAccount,
  DriveStatsResponse,
} from "@/types";

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(199, 89%, 48%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(215, 16%, 47%)",
];

interface pieChartData {
  name: string;
  value: number;
  size: number;
}

// Mime type to category mapping
const getMimeTypeCategory = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'Images';
  if (mimeType.startsWith('video/')) return 'Videos';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('document') || mimeType.includes('text') || 
      mimeType.includes('word') || mimeType.includes('sheet') || 
      mimeType.includes('presentation') || mimeType.includes('spreadsheet')) {
    return 'Documents';
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || 
      mimeType.includes('tar') || mimeType.includes('compressed')) {
    return 'Archives';
  }
  if (mimeType === 'application/vnd.google-apps.folder') return 'Folders';
  return 'Other';
};

interface driveBarData {
  name: string;
  used: number;
  total: number;
  files: number;
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7d");

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  switch (dateRange) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(endDate.getDate() - 90);
      break;
    default:
      startDate.setDate(endDate.getDate() - 7);
  }

  const { data: storageData = [], isLoading: storageLoading } = useStorageAnalytics(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );
  const { data: fileTypes = [], isLoading: fileTypesLoading } = useFileTypeDistribution();
  const { data: driveUsageStats, isLoading: driveStatsLoading } = useDriveUsageStats();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: files = [], isLoading: filesLoading } = useAnalyticsFiles();
  const { data: driveStatsResponse, isLoading: driveAccountsLoading } = useDriveAccounts();
  const driveAccounts = driveStatsResponse?.drives ?? [];
  const loading = storageLoading || fileTypesLoading || driveStatsLoading || statsLoading || filesLoading || driveAccountsLoading;

  // Group file types by category and sum counts/sizes
  const categoryMap: Record<string, { count: number; size: number }> = {};
  fileTypes.forEach((item) => {
    const category = getMimeTypeCategory(item.mimeType);
    if (!categoryMap[category]) {
      categoryMap[category] = { count: 0, size: 0 };
    }
    categoryMap[category].count += item.count;
    categoryMap[category].size += item.size || 0;
  });

  // Convert to chart data and sort by size (for storage-based visualization)
  const pieChartData: pieChartData[] = Object.entries(categoryMap)
    .map(([category, data]) => ({
      name: category,
      value: data.count,
      size: data.size,
    }))
    .sort((a, b) => b.size - a.size); // Sort by size instead of count

  // Use driveAccounts from /drive/stats for the bar chart
  const driveBarData: driveBarData[] = driveAccounts.map((drive: DriveAccount) => {
    const rawName = drive.owner?.displayName || drive.owner?.emailAddress || 'Drive';
    const name = rawName.length > 15 ? `${rawName.slice(0, 15)}...` : rawName;

    return {
      name,
      used: drive.storage.used / (1024 * 1024 * 1024),
      total: drive.storage.total / (1024 * 1024 * 1024),
      files: drive.stats.totalFiles,
    };
  });

  // Largest files
  const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Analytics & Insights
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Loading...
          </p>
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
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Analytics & Insights
          </h1>
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

      <StatsCards stats={stats} />

      {/* Charts Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Storage Growth Over Time */}
        <StorageGrowthCard dateRange={dateRange} />

        {/* File Type Distribution */}
      <FileTypes pieChartData={pieChartData} />
        {/* Drive Usage */}

        <DriveUsage driveBarData={driveBarData} />
        {/* Largest Files */}
        <LargeFiles largestFiles={largestFiles} />
      </div>
    </div>
  );
}

const StatsCards = ({ stats }: { stats: DashboardStats | undefined }) => {
  if (!stats || !stats.summary) return null;
  const totalFiles = stats.summary.totalFiles ?? 0;
  const totalStorageUsed = stats.summary.totalStorageUsed ?? 0;
  const connectedDrives = stats.summary.totalDrives ?? 0;
  const duplicateFiles = stats.summary.duplicateFiles ?? 0;
  
  // Use the actual duplicate size from the backend (calculated via aggregation)
  const duplicateSpace = stats.summary.duplicateSize ?? 0;

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl gradient-primary shrink-0">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold">{totalFiles.toLocaleString()}</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                Total Files
              </p>
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
              <p className="text-lg md:text-2xl font-bold">{formatBytes(totalStorageUsed)}</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                Storage Used
              </p>
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
              <p className="text-lg md:text-2xl font-bold">{connectedDrives}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Connected Drives</p>
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
              <p className="text-lg md:text-2xl font-bold">{formatBytes(duplicateSpace)}</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                Duplicate Space ({duplicateFiles} files)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StorageGrowthCard = ({ dateRange }: { dateRange: string }) => {
  // Generate mock storage growth data based on date range
  const generateStorageGrowthData = () => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const data = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      
      // Simulate gradual storage growth with some randomness
      const baseGrowth = (days - i) * 0.1; // Gradual increase over time
      const randomVariation = Math.random() * 0.5 - 0.25; // ±0.25GB variation
      const storageUsed = Math.max(0, baseGrowth + randomVariation);
      
      data.push({
        date: date.toISOString().split('T')[0],
        displayDate: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        storage: Number(storageUsed.toFixed(2))
      });
    }
    
    return data;
  };

  const storageGrowthData = generateStorageGrowthData();

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="text-base md:text-lg">Storage Growth Trend</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Storage usage over the last {dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={storageGrowthData}>
            <defs>
              <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(142, 76%, 36%)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(142, 76%, 36%)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="displayDate"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(v) => `${v}GB`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value} GB`, "Storage Used"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="storage"
              stroke="hsl(142, 76%, 36%)"
              fillOpacity={1}
              fill="url(#colorGrowth)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
const FileTypes = ({pieChartData}:{pieChartData: pieChartData[]}) =>{
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: pieChartData }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalSize = pieChartData.reduce((sum, item) => sum + item.size, 0);
      const sizePercentage = totalSize > 0 ? ((data.size / totalSize) * 100).toFixed(1) : '0';
      
      return (
        <div
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
            padding: "8px",
          }}
        >
          <p className="font-medium">{data.name}</p>
          <p>{`Files: ${formatNumber(data.value)}`}</p>
          <p>{`Total Size: ${formatBytes(data.size)} (${sizePercentage}%)`}</p>
        </div>
      );
    }
    return null;
  };

  // Calculate total files and size for summary
  const totalFiles = pieChartData.reduce((sum, item) => sum + item.value, 0);
  const totalSize = pieChartData.reduce((sum, item) => sum + item.size, 0);

  return (
      <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">File Categories</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Distribution by storage size • {formatNumber(totalFiles)} files • {formatBytes(totalSize)} total
            </CardDescription>
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
                  dataKey="size"
                >
                  {pieChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: "11px" }} 
                  formatter={(value) => (
                    <span style={{ fontSize: "11px" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

  )
}

const DriveUsage = ({ driveBarData }:{driveBarData: driveBarData[]}) => {
  return (
    <Card>
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="text-base md:text-lg">Drive Usage</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Storage by connected drive
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={driveBarData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(v) => `${v}GB`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(1)} GB`]}
            />
            <Bar
              dataKey="used"
              fill="hsl(217, 91%, 60%)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const LargeFiles = ({largestFiles}:{largestFiles:DriveFile[]}) => {
  return (
    <Card>
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="text-base md:text-lg">Largest Files</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Top 5 files by size
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 md:space-y-4">
          {largestFiles.map((file, index) => (
            <div key={file._id} className="flex items-center gap-3 md:gap-4">
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-muted text-xs md:text-sm font-medium shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.driveName}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium text-sm">{formatBytes(file.size)}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground capitalize">
                  {file.type}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
