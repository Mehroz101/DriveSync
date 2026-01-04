import { cn } from '@/lib/utils';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  Video,
  Music,
  FileArchive,
  Folder,
  File,
  FileType2,
} from 'lucide-react';
import type { FileType } from '@/types';
import { getFileTypeColor, getFileTypeBgColor } from '@/lib/formatters';

interface FileIconProps {
  type: FileType;
  size?: 'sm' | 'md' | 'lg';
  showBackground?: boolean;
  className?: string;
}

const iconMap: Record<FileType, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  image: Image,
  video: Video,
  audio: Music,
  pdf: FileType2,
  archive: FileArchive,
  folder: Folder,
  other: File,
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const bgSizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function FileIcon({
  type,
  size = 'md',
  showBackground = false,
  className,
}: FileIconProps) {
  const Icon = iconMap[type] || iconMap.other;

  if (showBackground) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg',
          bgSizeClasses[size],
          getFileTypeBgColor(type),
          className
        )}
      >
        <Icon className={cn(sizeClasses[size], getFileTypeColor(type))} />
      </div>
    );
  }

  return (
    <Icon className={cn(sizeClasses[size], getFileTypeColor(type), className)} />
  );
}
