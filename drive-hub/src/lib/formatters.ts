import { format } from 'date-fns';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { parseISO } from 'date-fns/parseISO';
import type { FileType } from '@/types';

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'MMM d, yyyy');
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string): string {
  return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/**
 * Get file type color
 */
export function getFileTypeColor(type: FileType): string {
  const colors: Record<FileType, string> = {
    document: 'text-blue-500',
    spreadsheet: 'text-green-500',
    presentation: 'text-orange-500',
    image: 'text-purple-500',
    video: 'text-red-500',
    audio: 'text-pink-500',
    pdf: 'text-red-600',
    archive: 'text-yellow-600',
    folder: 'text-blue-400',
    other: 'text-gray-500',
  };
  return colors[type] || colors.other;
}

/**
 * Get file type background color
 */
export function getFileTypeBgColor(type: FileType): string {
  const colors: Record<FileType, string> = {
    document: 'bg-blue-50',
    spreadsheet: 'bg-green-50',
    presentation: 'bg-orange-50',
    image: 'bg-purple-50',
    video: 'bg-red-50',
    audio: 'bg-pink-50',
    pdf: 'bg-red-50',
    archive: 'bg-yellow-50',
    folder: 'bg-blue-50',
    other: 'bg-gray-50',
  };
  return colors[type] || colors.other;
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-success',
    syncing: 'text-info',
    expired: 'text-warning',
    error: 'text-destructive',
    inactive: 'text-muted-foreground',
  };
  return colors[status] || colors.inactive;
}

/**
 * Get status dot class
 */
export function getStatusDotClass(status: string): string {
  const classes: Record<string, string> = {
    active: 'status-dot-active',
    syncing: 'status-dot-active animate-pulse-subtle',
    expired: 'status-dot-warning',
    error: 'status-dot-error',
    inactive: 'status-dot-inactive',
  };
  return `status-dot ${classes[status] || classes.inactive}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
