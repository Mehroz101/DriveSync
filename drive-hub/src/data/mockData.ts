import type { 
  User, 
  Drive, 
  DriveFile, 
  DuplicateGroup, 
  Activity, 
  StorageAnalytics,
  FileTypeDistribution,
  DriveUsageStats,
  DashboardStats,
  UserPreferences
} from '@/types';

// Current User
export const currentUser: User = {
  id: 'user-1',
  name: 'Alex Morgan',
  email: 'alex.morgan@company.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  createdAt: '2024-01-15T08:00:00Z',
  status: 'active',
};

// Connected Drives
export const drives: Drive[] = [
  {
    id: 'drive-1',
    name: 'Personal Drive',
    email: 'alex.personal@gmail.com',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=PD',
    storageUsed: 8.5 * 1024 * 1024 * 1024, // 8.5 GB
    storageTotal: 15 * 1024 * 1024 * 1024, // 15 GB
    status: 'active',
    lastSyncedAt: '2024-01-20T14:30:00Z',
    fileCount: 1247,
  },
  {
    id: 'drive-2',
    name: 'Work Drive',
    email: 'alex.morgan@company.com',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=WD',
    storageUsed: 45.2 * 1024 * 1024 * 1024, // 45.2 GB
    storageTotal: 100 * 1024 * 1024 * 1024, // 100 GB
    status: 'active',
    lastSyncedAt: '2024-01-20T14:25:00Z',
    fileCount: 3892,
  },
  {
    id: 'drive-3',
    name: 'Team Shared',
    email: 'team@company.com',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=TS',
    storageUsed: 23.8 * 1024 * 1024 * 1024, // 23.8 GB
    storageTotal: 50 * 1024 * 1024 * 1024, // 50 GB
    status: 'syncing',
    lastSyncedAt: '2024-01-20T14:00:00Z',
    fileCount: 2156,
  },
  {
    id: 'drive-4',
    name: 'Archive',
    email: 'archive@company.com',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AR',
    storageUsed: 12.1 * 1024 * 1024 * 1024, // 12.1 GB
    storageTotal: 30 * 1024 * 1024 * 1024, // 30 GB
    status: 'expired',
    lastSyncedAt: '2024-01-15T10:00:00Z',
    fileCount: 892,
  },
];

// Files
export const files: DriveFile[] = [
  {
    id: 'file-1',
    name: 'Q4 Financial Report.pdf',
    driveId: 'drive-2',
    driveName: 'Work Drive',
    size: 2.4 * 1024 * 1024,
    type: 'pdf',
    mimeType: 'application/pdf',
    lastModified: '2024-01-19T16:00:00Z',
    owner: 'alex.morgan@company.com',
    isDuplicate: true,
  },
  {
    id: 'file-2',
    name: 'Project Roadmap.xlsx',
    driveId: 'drive-2',
    driveName: 'Work Drive',
    size: 1.2 * 1024 * 1024,
    type: 'spreadsheet',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: '2024-01-18T14:30:00Z',
    owner: 'alex.morgan@company.com',
    isDuplicate: false,
  },
  {
    id: 'file-3',
    name: 'Team Photo.jpg',
    driveId: 'drive-1',
    driveName: 'Personal Drive',
    size: 4.8 * 1024 * 1024,
    type: 'image',
    mimeType: 'image/jpeg',
    lastModified: '2024-01-17T10:00:00Z',
    owner: 'alex.personal@gmail.com',
    isDuplicate: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100',
  },
  {
    id: 'file-4',
    name: 'Product Demo.mp4',
    driveId: 'drive-3',
    driveName: 'Team Shared',
    size: 156 * 1024 * 1024,
    type: 'video',
    mimeType: 'video/mp4',
    lastModified: '2024-01-16T09:00:00Z',
    owner: 'team@company.com',
    isDuplicate: true,
  },
  {
    id: 'file-5',
    name: 'Meeting Notes.docx',
    driveId: 'drive-2',
    driveName: 'Work Drive',
    size: 0.3 * 1024 * 1024,
    type: 'document',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified: '2024-01-20T11:00:00Z',
    owner: 'alex.morgan@company.com',
    isDuplicate: false,
  },
  {
    id: 'file-6',
    name: 'Presentation Deck.pptx',
    driveId: 'drive-2',
    driveName: 'Work Drive',
    size: 8.2 * 1024 * 1024,
    type: 'presentation',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    lastModified: '2024-01-19T15:00:00Z',
    owner: 'alex.morgan@company.com',
    isDuplicate: false,
  },
  {
    id: 'file-7',
    name: 'Backup Archive.zip',
    driveId: 'drive-4',
    driveName: 'Archive',
    size: 512 * 1024 * 1024,
    type: 'archive',
    mimeType: 'application/zip',
    lastModified: '2024-01-10T08:00:00Z',
    owner: 'archive@company.com',
    isDuplicate: false,
  },
  {
    id: 'file-8',
    name: 'Q4 Financial Report.pdf',
    driveId: 'drive-3',
    driveName: 'Team Shared',
    size: 2.4 * 1024 * 1024,
    type: 'pdf',
    mimeType: 'application/pdf',
    lastModified: '2024-01-19T16:00:00Z',
    owner: 'team@company.com',
    isDuplicate: true,
  },
  {
    id: 'file-9',
    name: 'Logo Design.png',
    driveId: 'drive-1',
    driveName: 'Personal Drive',
    size: 1.1 * 1024 * 1024,
    type: 'image',
    mimeType: 'image/png',
    lastModified: '2024-01-14T12:00:00Z',
    owner: 'alex.personal@gmail.com',
    isDuplicate: false,
  },
  {
    id: 'file-10',
    name: 'Product Demo.mp4',
    driveId: 'drive-2',
    driveName: 'Work Drive',
    size: 156 * 1024 * 1024,
    type: 'video',
    mimeType: 'video/mp4',
    lastModified: '2024-01-16T09:00:00Z',
    owner: 'alex.morgan@company.com',
    isDuplicate: true,
  },
];

// Duplicate Groups
export const duplicateGroups: DuplicateGroup[] = [
  {
    id: 'dup-1',
    name: 'Q4 Financial Report.pdf',
    size: 2.4 * 1024 * 1024,
    hash: 'a1b2c3d4e5f6',
    files: files.filter(f => f.name === 'Q4 Financial Report.pdf'),
    totalWastedSpace: 2.4 * 1024 * 1024,
  },
  {
    id: 'dup-2',
    name: 'Product Demo.mp4',
    size: 156 * 1024 * 1024,
    hash: 'g7h8i9j0k1l2',
    files: files.filter(f => f.name === 'Product Demo.mp4'),
    totalWastedSpace: 156 * 1024 * 1024,
  },
];

// Recent Activities
export const activities: Activity[] = [
  {
    id: 'act-1',
    type: 'upload',
    description: 'Uploaded new file',
    driveId: 'drive-2',
    driveName: 'Work Drive',
    fileId: 'file-5',
    fileName: 'Meeting Notes.docx',
    timestamp: '2024-01-20T11:00:00Z',
  },
  {
    id: 'act-2',
    type: 'sync',
    description: 'Drive sync completed',
    driveId: 'drive-1',
    driveName: 'Personal Drive',
    timestamp: '2024-01-20T10:30:00Z',
  },
  {
    id: 'act-3',
    type: 'delete',
    description: 'Deleted file',
    driveId: 'drive-4',
    driveName: 'Archive',
    fileName: 'Old Backup.zip',
    timestamp: '2024-01-20T09:15:00Z',
  },
  {
    id: 'act-4',
    type: 'connect',
    description: 'Connected new drive',
    driveId: 'drive-3',
    driveName: 'Team Shared',
    timestamp: '2024-01-19T14:00:00Z',
  },
  {
    id: 'act-5',
    type: 'share',
    description: 'Shared file with team',
    driveId: 'drive-2',
    driveName: 'Work Drive',
    fileName: 'Project Roadmap.xlsx',
    timestamp: '2024-01-19T11:30:00Z',
  },
];

// Storage Analytics (last 7 days)
export const storageAnalytics: StorageAnalytics[] = [
  { date: '2024-01-14', totalStorage: 195 * 1024 * 1024 * 1024, usedStorage: 82.5 * 1024 * 1024 * 1024 },
  { date: '2024-01-15', totalStorage: 195 * 1024 * 1024 * 1024, usedStorage: 84.2 * 1024 * 1024 * 1024 },
  { date: '2024-01-16', totalStorage: 195 * 1024 * 1024 * 1024, usedStorage: 85.8 * 1024 * 1024 * 1024 },
  { date: '2024-01-17', totalStorage: 195 * 1024 * 1024 * 1024, usedStorage: 86.4 * 1024 * 1024 * 1024 },
  { date: '2024-01-18', totalStorage: 195 * 1024 * 1024 * 1024, usedStorage: 87.9 * 1024 * 1024 * 1024 },
  { date: '2024-01-19', totalStorage: 195 * 1024 * 1024 * 1024, usedStorage: 88.7 * 1024 * 1024 * 1024 },
  { date: '2024-01-20', totalStorage: 195 * 1024 * 1024 * 1024, usedStorage: 89.6 * 1024 * 1024 * 1024 },
];

// File Type Distribution
export const fileTypeDistribution: FileTypeDistribution[] = [
  { type: 'document', count: 1520, size: 2.1 * 1024 * 1024 * 1024, percentage: 18.6 },
  { type: 'spreadsheet', count: 890, size: 1.8 * 1024 * 1024 * 1024, percentage: 10.9 },
  { type: 'presentation', count: 234, size: 4.2 * 1024 * 1024 * 1024, percentage: 2.9 },
  { type: 'image', count: 3450, size: 12.5 * 1024 * 1024 * 1024, percentage: 42.2 },
  { type: 'video', count: 156, size: 45.8 * 1024 * 1024 * 1024, percentage: 1.9 },
  { type: 'pdf', count: 780, size: 8.4 * 1024 * 1024 * 1024, percentage: 9.5 },
  { type: 'archive', count: 89, size: 12.1 * 1024 * 1024 * 1024, percentage: 1.1 },
  { type: 'other', count: 1068, size: 2.7 * 1024 * 1024 * 1024, percentage: 13.1 },
];

// Drive Usage Stats
export const driveUsageStats: DriveUsageStats[] = drives.map(drive => ({
  driveId: drive.id,
  driveName: drive.name,
  storageUsed: drive.storageUsed,
  storageTotal: drive.storageTotal,
  fileCount: drive.fileCount,
  percentage: (drive.storageUsed / drive.storageTotal) * 100,
}));

// Dashboard Stats
export const dashboardStats: DashboardStats = {
  totalFiles: 8187,
  totalStorageUsed: 89.6 * 1024 * 1024 * 1024, // 89.6 GB
  connectedDrives: drives.length,
  duplicateFiles: 4,
  duplicateSpace: 158.4 * 1024 * 1024, // 158.4 MB
};

// User Preferences
export const userPreferences: UserPreferences = {
  viewMode: 'list',
  paginationSize: 25,
  defaultDrive: 'all',
  notifications: true,
  autoSync: true,
};
