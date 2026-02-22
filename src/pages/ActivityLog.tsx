import { useState } from "react";
import {
  Activity,
  Filter,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  BarChart3,
  List,
  Timer,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatDateTime } from "@/lib/formatters";
import { useActivityLogs, useActivityAggregations } from "@/queries/activity/useActivityLogs";
import type { ActivityLogsQuery } from "@/api/activity/activity.keys";
import type { ActivityLog as ActivityLogType } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts";

// ─── Constants ──────────────────────────────────────────────────

const ACTION_TYPES = [
  "FILE_UPLOAD",
  "FILE_DOWNLOAD",
  "FILE_DELETE",
  "FILE_RESTORE",
  "FILE_SYNC",
  "FILE_TRANSFER",
  "FILE_BULK_TRANSFER",
  "FILES_FETCH",
  "FILES_SEARCH",
  "DRIVE_CONNECT",
  "DRIVE_DISCONNECT",
  "DRIVE_SYNC",
  "DRIVE_REFRESH",
  "DUPLICATE_SCAN",
  "DUPLICATE_RESOLVE",
  "ANALYTICS_QUERY",
  "LOGIN",
  "LOGOUT",
  "SIGNUP",
  "PROFILE_UPDATE",
  "PROFILE_VIEW",
];

const STATUS_OPTIONS = ["success", "failure", "pending", "partial"];

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Success" },
  failure: { icon: XCircle, color: "text-red-600 bg-red-50 border-red-200", label: "Failed" },
  pending: { icon: Loader2, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Pending" },
  partial: { icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Partial" },
};

const PIE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bApi\b/g, "API")
    .replace(/\bDb\b/g, "DB");
}

function formatDuration(ms?: number): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ─── Components ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function StatsCards({ data }: { data: ReturnType<typeof useActivityAggregations>["data"] }) {
  if (!data?.data) return null;
  const agg = data.data;

  const totalLogs = agg.actionCounts.reduce((s, a) => s + a.count, 0);
  const successRate = agg.statusCounts.find((s) => s._id === "success");
  const avgDuration = agg.avgDurations.length > 0
    ? agg.avgDurations.reduce((s, a) => s + a.avgDuration * a.count, 0) /
      agg.avgDurations.reduce((s, a) => s + a.count, 0)
    : 0;
  const failureCount = agg.statusCounts.find((s) => s._id === "failure")?.count || 0;

  const cards = [
    {
      title: "Total Activities",
      value: totalLogs.toLocaleString(),
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Success Rate",
      value: totalLogs > 0 ? `${(((successRate?.count || 0) / totalLogs) * 100).toFixed(1)}%` : "—",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Avg Duration",
      value: formatDuration(avgDuration),
      icon: Timer,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Failures",
      value: failureCount.toLocaleString(),
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", card.bgColor)}>
              <card.icon className={cn("h-5 w-5", card.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.title}</p>
              <p className="text-lg font-bold">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActionCountsChart({ data }: { data: Array<{ _id: string; count: number }> }) {
  const chartData = data.slice(0, 8).map((item) => ({
    name: formatActionLabel(item._id),
    count: item.count,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Activity by Type</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis type="number" fontSize={12} />
            <YAxis type="category" dataKey="name" fontSize={11} width={120} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
              formatter={(value: number) => [value.toLocaleString(), "Count"]}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function StatusPieChart({ data }: { data: Array<{ _id: string; count: number }> }) {
  const chartData = data.map((item) => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    value: item.count,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              fontSize={12}
            >
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
              formatter={(value: number) => [value.toLocaleString(), "Count"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DailyTrendChart({ data }: { data: Array<{ _id: string; count: number; avgDuration: number; errors?: number }> }) {
  const chartData = data.map((item) => ({
    date: item._id.slice(5), // MM-DD
    activities: item.count,
    avgDuration: Math.round(item.avgDuration || 0),
    errors: item.errors || 0,
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Daily Activity Trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" fontSize={11} tickLine={false} />
            <YAxis fontSize={12} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
              formatter={(value: number, name: string) => [
                name === "avgDuration" ? formatDuration(value) : value,
                name === "avgDuration" ? "Avg Duration" : name === "errors" ? "Errors" : "Activities",
              ]}
            />
            <Legend fontSize={12} />
            <Area
              type="monotone"
              dataKey="activities"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorActivities)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="errors"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorErrors)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DurationChart({ data }: { data: Array<{ _id: string; avgDuration: number; count: number }> }) {
  const chartData = data.slice(0, 10).map((item) => ({
    name: formatActionLabel(item._id),
    duration: Math.round(item.avgDuration),
    count: item.count,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Avg Duration by Action (ms)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" fontSize={10} tickLine={false} angle={-25} textAnchor="end" height={60} />
            <YAxis fontSize={12} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
              formatter={(value: number) => [formatDuration(value), "Avg Duration"]}
            />
            <Bar dataKey="duration" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function ActivityLog() {
  const [tab, setTab] = useState<string>("logs");
  const [query, setQuery] = useState<ActivityLogsQuery>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [searchInput, setSearchInput] = useState("");

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useActivityLogs(query);
  const { data: aggData, isLoading: aggLoading } = useActivityAggregations(query.dateFrom, query.dateTo);

  const logs = logsData?.data || [];
  const meta = logsData?.meta;

  const handleSearch = () => {
    setQuery((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  };

  const handleFilterChange = (key: keyof ActivityLogsQuery, value: string) => {
    setQuery((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery((prev) => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setSearchInput("");
    setQuery({
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const hasFilters = query.actionType || query.status || query.targetType || query.search || query.dateFrom;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor all actions, performance, and errors across your drives.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetchLogs()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {aggLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <StatsCards data={aggData} />
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="logs" className="gap-1.5">
            <List className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ─── Logs Tab ──────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          {/* Filters Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search details, target..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>

            <Select
              value={query.actionType || "all"}
              onValueChange={(v) => handleFilterChange("actionType", v)}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatActionLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={query.status || "all"}
              onValueChange={(v) => handleFilterChange("status", v)}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={query.sortOrder || "desc"}
              onValueChange={(v) => handleFilterChange("sortOrder", v)}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </div>

          {/* Table */}
          {logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} className="h-14" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16">
              <Activity className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Activity Found</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                No activity logs match your current filters. Activities will appear here as you use the app.
              </p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="w-[100px]">User</TableHead>
                      <TableHead className="w-[100px]">Target</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                      <TableHead className="w-[90px] text-right">Duration</TableHead>
                      <TableHead className="w-[130px] text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log._id} className="group">
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-mono whitespace-nowrap">
                            {formatActionLabel(log.actionType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-sm truncate">{log.details || "—"}</p>
                          {log.errorMessage && (
                            <p className="text-xs text-destructive mt-0.5 truncate">
                              {log.errorMessage}
                            </p>
                          )}
                        </TableCell>
                       
                        <TableCell>
                          {log.performerEmail ? (
                            <span className="text-xs text-muted-foreground truncate block max-w-[100px]">
                              {log.performerEmail}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.targetName ? (
                            <span className="text-xs text-muted-foreground truncate block max-w-[100px]">
                              {log.targetName}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatDuration(log.durationMs)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="text-xs font-medium">{formatRelativeTime(log.createdAt)}</p>
                            <p className="text-[10px] text-muted-foreground hidden sm:block">
                              {formatDateTime(log.createdAt)}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {meta.page} of {meta.totalPages} · {meta.total.toLocaleString()} total
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!meta.hasPrev}
                      onClick={() => handlePageChange(meta.page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!meta.hasNext}
                      onClick={() => handlePageChange(meta.page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* ─── Analytics Tab ─────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          {aggLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} className="h-[340px]" />
              ))}
            </div>
          ) : aggData?.data ? (
            <>
              {/* Trend — full width */}
              <DailyTrendChart data={aggData.data.dailyTrend} />

              <div className="grid gap-4 lg:grid-cols-2">
                <ActionCountsChart data={aggData.data.actionCounts} />
                <StatusPieChart data={aggData.data.statusCounts} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <DurationChart data={aggData.data.avgDurations} />

                {/* Top Actions Table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Avg Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aggData.data.topActions.map((action) => (
                          <TableRow key={action._id}>
                            <TableCell className="text-xs font-medium">
                              {formatActionLabel(action._id)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {action.count.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono">
                              {formatDuration(action.avgDuration)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Analytics Data</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Analytics will appear once you have activity logs.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
