import React from "react";
import { Search, Calendar, Filter, X, Users, Star, Trash2 } from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { List, Grid } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FILE_FILTER_CATEGORIES, SIZE_FILTER_OPTIONS, DATE_PRESETS } from "@/constants/fileFilters";
import { cn } from "@/lib/utils";

import type { Drive, DashboardStats, DriveFile } from "@/types";

type DriveOption = {
  _id: string;
  connectionStatus?: string;
  profileImg?: string;
  email?: string;
  name?: string;
  owner?: { photoLink?: string; emailAddress?: string };
};

interface FilterBarProps {
  selectedDrive: string;
  setSelectedDrive: (id: string) => void;
  drives?: (Drive | DriveFile)[]; // accept both Drive and DriveFile shapes
  searchInput: string;
  setSearchInput: (v: string) => void;
  viewMode: "list" | "grid";
  setViewMode: (v: "list" | "grid") => void;
  selectedTypes: string[];
  setSelectedTypes: (v: string[]) => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  selectedSize: string;
  setSelectedSize: (v: string) => void;
  selectedDatePreset: string;
  setSelectedDatePreset: (v: string) => void;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  toggleType: (value: string) => void;
}

export default function FilterBar({
  selectedDrive,
  setSelectedDrive,
  drives,
  searchInput,
  setSearchInput,
  viewMode,
  setViewMode,
  selectedTypes,
  setSelectedTypes,
  selectedTags,
  toggleTag,
  selectedSize,
  setSelectedSize,
  selectedDatePreset,
  setSelectedDatePreset,
  hasActiveFilters,
  clearAllFilters,
  toggleType,
}: FilterBarProps) {
  const normalizeStatus = (s?: string): 'active' | 'revoked' | 'error' => {
    if (!s) return 'error';
    const v = s.toLowerCase();
    if (v === 'active') return 'active';
    if (v === 'revoked') return 'revoked';
    return 'error';
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search files..." className="pl-9" />
        </div>

        <Select value={selectedDrive} onValueChange={setSelectedDrive}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Drives" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drives</SelectItem>
            {drives?.map((dRaw: Drive | DashboardStats) => {
              const d = dRaw as DriveOption;
              const photo = d.owner?.photoLink ?? d.profileImg;
              const emailLabel = d.owner?.emailAddress?.split('@')[0] ?? d.email?.split('@')[0] ?? d.name ?? '—';
              const id = d._id;
              const status = d.connectionStatus;
              return (
                <SelectItem key={id} value={id}>
                  <div className="flex items-center gap-2">
                    <img src={photo} alt="" className="h-6 w-6 rounded-full" />
                    {emailLabel}
                    <StatusBadge status={normalizeStatus(status)} />
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[140px] justify-between">
              {selectedTypes.length === 0 ? "All Types" : selectedTypes.length === 1 ? FILE_FILTER_CATEGORIES.find((c) => c.value === selectedTypes[0])?.label || selectedTypes[0] : `${selectedTypes.length} selected`}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            <div className="px-2 py-1">
              <div className="flex items-center gap-2 px-2 py-1 cursor-pointer" onClick={() => setSelectedTypes([])}>
                <Checkbox checked={selectedTypes.length === 0} />
                <span className="text-sm">All Types</span>
              </div>

              <DropdownMenuSeparator />

              {FILE_FILTER_CATEGORIES.map((type) => (
                <div key={type.value} className="flex items-center gap-2 px-2 py-1 cursor-pointer" onClick={() => toggleType(type.value)}>
                  <Checkbox checked={selectedTypes.includes(type.value)} />
                  <span className="capitalize text-sm">{type.label}</span>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={selectedSize} onValueChange={setSelectedSize}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Any Size" />
          </SelectTrigger>
          <SelectContent>
            {SIZE_FILTER_OPTIONS.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDatePreset} onValueChange={setSelectedDatePreset}>
          <SelectTrigger className="w-[140px]"><Calendar className="h-4 w-4 mr-2" /> <SelectValue placeholder="Any Time" /></SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden sm:flex border rounded-lg p-1">
          <Button size="icon" variant="ghost" className={cn(viewMode === "list" && "bg-muted")} onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className={cn(viewMode === "grid" && "bg-muted")} onClick={() => setViewMode("grid")}><Grid className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1"><Filter className="h-4 w-4 inline mr-1" /> Tags:</span>

        <Badge variant={selectedTags.includes("shared") ? "default" : "outline"} className="cursor-pointer hover:bg-primary/90 transition-colors" onClick={() => toggleTag("shared")}>
          <Users className="h-3 w-3 mr-1" /> Shared
        </Badge>

        <Badge variant={selectedTags.includes("starred") ? "default" : "outline"} className={cn("cursor-pointer hover:bg-primary/90 transition-colors", selectedTags.includes("starred") && "bg-yellow-500 hover:bg-yellow-600")} onClick={() => toggleTag("starred")}> 
          <Star className={cn("h-3 w-3 mr-1", selectedTags.includes("starred") && "fill-current")} /> Starred
        </Badge>

        <Badge variant={selectedTags.includes("trashed") ? "destructive" : "outline"} className="cursor-pointer hover:bg-destructive/90 transition-colors" onClick={() => toggleTag("trashed")}>
          <Trash2 className="h-3 w-3 mr-1" /> Trashed
        </Badge>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-foreground" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-1" /> Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
