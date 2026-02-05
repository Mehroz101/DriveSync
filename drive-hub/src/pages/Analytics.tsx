import { useState, useEffect } from "react";
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
  useAnalyticsFiles
} from "@/queries/analytics/useAnalytic";
import { formatBytes, formatNumber } from "@/lib/formatters";
import type {
  StorageAnalytics,
  FileTypeDistribution,
  DriveUsageStats,
  DriveFile,
  DashboardStats,
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

interface storageChartData {
  date: string;
  used: number;
  total: number;
}

interface pieChartData {
  name:string;
  value:number;
  size:number
}
interface driveBarData {
  name: string;
  used:number;
  total:number;
  files:number
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
  const { data: driveStats = [], isLoading: driveStatsLoading } = useDriveUsageStats();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: files = [], isLoading: filesLoading } = useAnalyticsFiles();

  const loading = storageLoading || fileTypesLoading || driveStatsLoading || statsLoading || filesLoading;
console.log("fileTypes:", fileTypes);
console.log("driveStats:", driveStats);
console.log("stats:", stats);
console.log("files:", files);
  // Transform data for charts
  const storageChartData = storageData.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    used: item.usedStorage / (1024 * 1024 * 1024),
    total: item.totalStorage / (1024 * 1024 * 1024),
  }));
  const pieChartData = fileTypes.map((item) => ({
    name: item.mimeType.charAt(0).toUpperCase() + item.mimeType.slice(1),
    value: item.count,
    size: item.size,
  }));

  const safeDriveStats = Array.isArray(driveStats) ? driveStats : [];

  const driveBarData = safeDriveStats.map((item: any) => {
    // Resolve name from multiple possible shapes
    const rawName = item.driveName ?? item.owner?.displayName ?? item.owner?.name ?? item.driveId ?? 'Drive';
    const name = typeof rawName === 'string' && rawName.length > 10 ? `${rawName.slice(0,10)}...` : String(rawName);

    // Resolve storage fields (bytes) from multiple possible shapes
    const usedBytes = item.storage?.used ?? item.storageUsed ?? item.used ?? 0;
    const totalBytes = item.storage?.total ?? item.storageTotal ?? item.total ?? 0;
    const files = item.stats?.totalFiles ?? item.fileCount ?? 0;

    return {
      name,
      used: usedBytes / (1024 * 1024 * 1024),
      total: totalBytes / (1024 * 1024 * 1024),
      files,
    } as driveBarData;
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
        {/* Storage Growth Chart */}
        <GrowthCard storageChartData={storageChartData} />

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
  if (!stats) return null;

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl gradient-primary shrink-0">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold">{stats.totalFiles.toLocaleString()}</p>
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
              <p className="text-lg md:text-2xl font-bold">{formatBytes(stats.totalStorageUsed)}</p>
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
              <p className="text-lg md:text-2xl font-bold">{stats.connectedDrives}</p>
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
              <p className="text-lg md:text-2xl font-bold">{formatBytes(stats.duplicateSpace)}</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                Duplicate Space ({stats.duplicateFiles} files)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const GrowthCard = ({ storageChartData }:{storageChartData: storageChartData[]}) => {
  return (
    <Card>
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="text-base md:text-lg">Storage Growth</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Storage usage over the past week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={storageChartData}>
            <defs>
              <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(217, 91%, 60%)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(217, 91%, 60%)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
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
              formatter={(value: number) => [`${value.toFixed(1)} GB`, "Used"]}
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
  );
};
const FileTypes = ({pieChartData}:{pieChartData: pieChartData[]}) =>{
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: pieChartData }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
          <p>{`Size: ${formatBytes(data.size)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
      <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">File Types</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Distribution by file count
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
                  dataKey="value"
                >
                  {pieChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
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
