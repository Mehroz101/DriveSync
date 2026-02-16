import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  headers?: Record<string, string>;
  requestBody?: Record<string, unknown>;
  responseExample: Record<string, unknown>;
  errorExample?: Record<string, unknown>;
}

const AUTH_HEADER = { Cookie: 'connect.sid=<session_cookie>' };

const apiEndpoints: Record<string, ApiEndpoint[]> = {
  'Email Auth': [
    {
      method: 'POST',
      path: '/api/email-auth/signup',
      description: 'Register a new user with email and password',
      requestBody: { name: 'John Doe', email: 'john@example.com', password: 'securepassword' },
      responseExample: {
        success: true,
        data: {
          id: '6651a...',
          name: 'John Doe',
          email: 'john@example.com',
          picture: null,
          createdAt: '2024-05-25T10:00:00.000Z',
          status: 'active',
        },
      },
      errorExample: { success: false, error: 'User already exists' },
    },
    {
      method: 'POST',
      path: '/api/email-auth/login',
      description: 'Authenticate with email and password (sets session cookie)',
      requestBody: { email: 'john@example.com', password: 'securepassword' },
      responseExample: {
        success: true,
        data: {
          id: '6651a...',
          name: 'John Doe',
          email: 'john@example.com',
          picture: null,
          status: 'active',
        },
      },
      errorExample: { success: false, error: 'Invalid credentials' },
    },
    {
      method: 'GET',
      path: '/api/email-auth/profile',
      description: 'Get the currently authenticated user profile',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: {
          id: '6651a...',
          name: 'John Doe',
          email: 'john@example.com',
          picture: 'https://res.cloudinary.com/.../avatar.jpg',
          status: 'active',
        },
      },
    },
    {
      method: 'POST',
      path: '/api/email-auth/logout',
      description: 'Log out the current user (clears session)',
      headers: AUTH_HEADER,
      responseExample: { success: true },
    },
  ],
  'Google Auth': [
    {
      method: 'GET',
      path: '/api/auth/google',
      description: 'Redirect to Google OAuth consent screen for initial login',
      responseExample: { note: 'Redirects to Google OAuth, then back to callback URL' },
    },
    {
      method: 'GET',
      path: '/api/auth/google/add-drive-account',
      description: 'Add an additional Google Drive account to an existing user',
      headers: AUTH_HEADER,
      responseExample: { note: 'Redirects to Google OAuth with drive.readonly scope' },
    },
    {
      method: 'GET',
      path: '/api/auth/google/reconnect',
      description: 'Reconnect a revoked Google Drive account',
      headers: AUTH_HEADER,
      responseExample: { note: 'Redirects to Google OAuth for re-authorization' },
    },
  ],
  Drive: [
    {
      method: 'POST',
      path: '/api/drive/add-account',
      description: 'Add a new Google Drive account via OAuth code',
      headers: AUTH_HEADER,
      requestBody: { code: 'google_oauth_code' },
      responseExample: {
        success: true,
        data: {
          _id: 'drive123',
          connectionStatus: 'active',
          owner: { displayName: 'John Doe', emailAddress: 'john@gmail.com' },
        },
      },
    },
    {
      method: 'GET',
      path: '/api/drive/stats',
      description: 'Get all connected drives with storage/stats and global duplicate info',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: {
          drives: [
            {
              _id: 'drive123',
              connectionStatus: 'active',
              owner: { displayName: 'John', emailAddress: 'john@gmail.com', photoLink: 'https://...' },
              storage: { total: 16106127360, used: 9126805504, usedInDrive: 8000000000, usedInTrash: 126805504, remaining: 6979321856 },
              stats: { totalFiles: 1520, totalFolders: 45, trashedFiles: 12, duplicateFiles: 34, duplicateSize: 166002893 },
              meta: { fetchedAt: '2024-01-20T11:00:00Z', source: 'google-drive-api' },
            },
          ],
          globalDuplicates: { duplicateGroups: 12, duplicateFiles: 34, wastedFiles: 22, wastedSpace: 166002893 },
        },
      },
    },
    {
      method: 'GET',
      path: '/api/drive/sync-all',
      description: 'Trigger a sync for all connected drives',
      headers: AUTH_HEADER,
      responseExample: { success: true, data: { syncedDrives: 3 } },
    },
    {
      method: 'GET',
      path: '/api/drive/sync-drive/:driveId',
      description: 'Trigger a sync for a specific drive by ID',
      headers: AUTH_HEADER,
      responseExample: { success: true, data: { synced: true } },
    },
    {
      method: 'GET',
      path: '/api/drive/get-all-drives',
      description: 'Get all drives (simplified list)',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: [
          {
            _id: 'drive123',
            name: 'John Doe',
            email: 'john@gmail.com',
            connectionStatus: 'active',
            storage: { remaining: 6979321856, total: 16106127360, used: 9126805504 },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/api/drive/accounts',
      description: 'Get all connected drive accounts for the current user',
      headers: AUTH_HEADER,
      responseExample: { success: true, data: ['...DriveAccount[]'] },
    },
    {
      method: 'DELETE',
      path: '/api/drive/accounts/:accountId',
      description: 'Remove a connected drive account',
      headers: AUTH_HEADER,
      responseExample: { success: true },
      errorExample: { success: false, error: 'Drive account not found' },
    },
    {
      method: 'GET',
      path: '/api/drive/profile',
      description: 'Get the Google profile info of the primary drive account',
      headers: AUTH_HEADER,
      responseExample: { success: true, data: { displayName: 'John Doe', emailAddress: 'john@gmail.com', photoLink: 'https://...' } },
    },
    {
      method: 'GET',
      path: '/api/drive/profile-image',
      description: 'Get the profile image URL for the primary drive account',
      headers: AUTH_HEADER,
      responseExample: { success: true, data: { photoLink: 'https://...' } },
    },
  ],
  Files: [
    {
      method: 'POST',
      path: '/api/file/get-all-files-sync',
      description: 'Fetch and sync all files from connected drives (triggers sync first)',
      headers: AUTH_HEADER,
      requestBody: { driveIds: ['drive123'], page: 1, pageSize: 25, sortBy: 'modifiedTime', sortOrder: 'desc' },
      responseExample: {
        success: true,
        data: [
          {
            _id: 'file1',
            googleFileId: 'abc123',
            name: 'Q4 Report.pdf',
            size: 2516582,
            mimeType: 'application/pdf',
            modifiedTime: '2024-01-19T16:00:00Z',
            owners: [{ displayName: 'John', emailAddress: 'john@gmail.com' }],
            trashed: false,
          },
        ],
        meta: { page: 1, pageSize: 25, total: 156, hasMore: true },
      },
    },
    {
      method: 'POST',
      path: '/api/file/get-all-files',
      description: 'Get cached files with filtering and pagination (no sync)',
      headers: AUTH_HEADER,
      requestBody: {
        driveIds: ['drive123'],
        types: ['pdf', 'document'],
        search: 'report',
        page: 1,
        pageSize: 25,
        sortBy: 'size',
        sortOrder: 'desc',
        trashed: false,
      },
      responseExample: {
        success: true,
        data: ['...DriveFile[]'],
        meta: { page: 1, pageSize: 25, total: 42, hasMore: true },
      },
    },
    {
      method: 'POST',
      path: '/api/file/delete-files',
      description: 'Trash or delete files by their IDs',
      headers: AUTH_HEADER,
      requestBody: { fileIds: ['file1', 'file2'] },
      responseExample: { success: true, data: { deleted: 2, failedFiles: [] } },
      errorExample: { success: false, error: 'No file IDs provided' },
    },
    {
      method: 'POST',
      path: '/api/file/permanently-delete-trashed',
      description: 'Permanently delete already-trashed files',
      headers: AUTH_HEADER,
      requestBody: { fileIds: ['file1'] },
      responseExample: { success: true, data: { deleted: 1, failedFiles: [] } },
    },
    {
      method: 'GET',
      path: '/api/file/thumbnail',
      description: 'Get a thumbnail proxy for a Google Drive file',
      headers: AUTH_HEADER,
      responseExample: { note: 'Returns the image binary (proxied from Google)' },
    },
    {
      method: 'POST',
      path: '/api/file/upload',
      description: 'Upload a file to a specific Google Drive',
      headers: { ...AUTH_HEADER, 'Content-Type': 'multipart/form-data' },
      requestBody: { driveId: 'drive123', file: '<binary>' },
      responseExample: { success: true, data: { id: 'file-new', name: 'uploaded-file.pdf', size: 1048576 } },
    },
  ],
  Profile: [
    {
      method: 'GET',
      path: '/api/profile',
      description: 'Get the current user profile',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: {
          id: '6651a...',
          name: 'John Doe',
          email: 'john@example.com',
          picture: 'https://res.cloudinary.com/.../avatar.jpg',
          createdAt: '2024-05-25T10:00:00.000Z',
          status: 'active',
        },
      },
    },
    {
      method: 'PUT',
      path: '/api/profile',
      description: 'Update the current user name and/or email',
      headers: AUTH_HEADER,
      requestBody: { name: 'Jane Doe', email: 'jane@example.com' },
      responseExample: {
        success: true,
        data: { id: '6651a...', name: 'Jane Doe', email: 'jane@example.com' },
      },
      errorExample: { success: false, error: 'Email already in use' },
    },
    {
      method: 'POST',
      path: '/api/profile/picture',
      description: 'Upload a profile picture (Cloudinary, 256×256 face-crop)',
      headers: { ...AUTH_HEADER, 'Content-Type': 'multipart/form-data' },
      requestBody: { picture: '<binary file — JPG, PNG, GIF, or WebP, max 2MB>' },
      responseExample: {
        success: true,
        data: { id: '6651a...', picture: 'https://res.cloudinary.com/.../avatar.jpg' },
      },
      errorExample: { success: false, error: 'Invalid file type' },
    },
    {
      method: 'PUT',
      path: '/api/profile/password',
      description: 'Change the current user password (email-auth accounts only)',
      headers: AUTH_HEADER,
      requestBody: { currentPassword: 'oldpassword', newPassword: 'newpassword123' },
      responseExample: { success: true },
      errorExample: { success: false, error: 'Current password is incorrect' },
    },
    {
      method: 'DELETE',
      path: '/api/profile',
      description: 'Delete the user account and all associated data (cascading)',
      headers: AUTH_HEADER,
      requestBody: { password: 'yourpassword' },
      responseExample: { success: true },
      errorExample: { success: false, error: 'Password is incorrect' },
    },
  ],
  Analytics: [
    {
      method: 'GET',
      path: '/api/analytics/storage-analytics',
      description: 'Get per-drive storage analytics (used, total, percentage)',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: [
          {
            driveId: 'drive123',
            owner: { displayName: 'John', emailAddress: 'john@gmail.com' },
            storage: { used: 9126805504, total: 16106127360, percentage: 56.7 },
            stats: { totalFiles: 1520, duplicateFiles: 34, duplicateSize: 166002893, totalSize: 9126805504 },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/api/analytics/file-type-distribution',
      description: 'Get file type distribution across all drives',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: [
          { mimeType: 'application/pdf', count: 320, percentage: 21.05, size: 2254857830 },
          { mimeType: 'image/jpeg', count: 450, percentage: 29.6, size: 5368709120 },
        ],
      },
    },
    {
      method: 'GET',
      path: '/api/analytics/drive-usage-stats',
      description: 'Get aggregated drive usage statistics',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: {
          totalDrives: 3,
          activeDrives: 2,
          revokedDrives: 1,
          disconnectedDrives: 0,
          storageByStatus: { active: 18253611008, revoked: 5368709120, disconnected: 0 },
          averageStorageUsage: 62.3,
        },
      },
    },
    {
      method: 'GET',
      path: '/api/analytics/dashboard-stats',
      description: 'Get dashboard summary statistics',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: {
          summary: {
            totalDrives: 3,
            totalFiles: 4590,
            totalStorageUsed: 23622320128,
            totalStorageLimit: 48318382080,
            storagePercentage: 48.9,
            duplicateGroups: 12,
            duplicateFiles: 34,
            duplicateSize: 166002893,
            duplicatePercentage: 0.7,
          },
          drives: ['...DriveAccount[]'],
          lastUpdated: '2024-01-20T11:00:00Z',
        },
      },
    },
    {
      method: 'GET',
      path: '/api/analytics/files',
      description: 'Get file analytics (file counts, sizes, trends)',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: { totalFiles: 4590, totalSize: 23622320128 },
      },
    },
  ],
  Duplicates: [
    {
      method: 'GET',
      path: '/api/duplicates',
      description: 'Get all duplicate file groups across connected drives',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: [
          {
            id: 'dup-1',
            name: 'Q4 Report.pdf',
            size: 2516582,
            hash: 'a1b2c3d4',
            files: ['...DriveFile[]'],
            totalWastedSpace: 2516582,
          },
        ],
        meta: { totalDuplicates: 4, totalWastedSpace: 166002893 },
      },
    },
  ],
  Search: [
    {
      method: 'GET',
      path: '/api/search',
      description: 'Search files across all drives by query string',
      headers: AUTH_HEADER,
      responseExample: {
        success: true,
        data: [
          {
            _id: 'file1',
            name: 'Q4 Report.pdf',
            size: 2516582,
            mimeType: 'application/pdf',
            modifiedTime: '2024-01-19T16:00:00Z',
          },
        ],
        meta: { total: 5 },
      },
    },
  ],
};

const methodColors: Record<string, string> = {
  GET: 'bg-success/10 text-success border-success/20',
  POST: 'bg-info/10 text-info border-info/20',
  PUT: 'bg-warning/10 text-warning border-warning/20',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/20',
};

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg bg-primary text-primary-foreground">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="overflow-x-auto p-4 text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Badge variant="outline" className={cn('font-mono', methodColors[endpoint.method])}>
          {endpoint.method}
        </Badge>
        <code className="flex-1 font-mono text-sm">{endpoint.path}</code>
        <span className="text-sm text-muted-foreground hidden sm:block">{endpoint.description}</span>
      </button>

      {isExpanded && (
        <div className="border-t bg-muted/10 p-4 space-y-4">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>

          {endpoint.headers && (
            <div>
              <h4 className="text-sm font-medium mb-2">Headers</h4>
              <CodeBlock code={JSON.stringify(endpoint.headers, null, 2)} />
            </div>
          )}

          {endpoint.requestBody && (
            <div>
              <h4 className="text-sm font-medium mb-2">Request Body</h4>
              <CodeBlock code={JSON.stringify(endpoint.requestBody, null, 2)} />
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium mb-2">Response (200 OK)</h4>
            <CodeBlock code={JSON.stringify(endpoint.responseExample, null, 2)} />
          </div>

          {endpoint.errorExample && (
            <div>
              <h4 className="text-sm font-medium mb-2">Error Response</h4>
              <CodeBlock code={JSON.stringify(endpoint.errorExample, null, 2)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiDocs() {
  const categories = Object.keys(apiEndpoints);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground">
            Reference documentation for the DriveSync backend API.
          </p>
        </div>
      </div>

      {/* Base URL */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code="http://localhost:5000/api" />
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Authentication</CardTitle>
          <CardDescription>
            API requests are authenticated via session cookies (set by the login / Google OAuth flow).
            Include credentials in every request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={`// Axios example\naxios.defaults.withCredentials = true;`} />
        </CardContent>
      </Card>

      {/* Standard Response Format */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Response Format</CardTitle>
          <CardDescription>All endpoints return a standardized JSON envelope.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Success</h4>
            <CodeBlock code={JSON.stringify({ success: true, data: '...', meta: { page: 1, total: 100 } }, null, 2)} />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Error</h4>
            <CodeBlock code={JSON.stringify({ success: false, error: 'Human-readable error message' }, null, 2)} />
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Tabs defaultValue={categories[0]} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {apiEndpoints[category].map((endpoint, index) => (
              <EndpointCard key={`${endpoint.method}-${endpoint.path}-${index}`} endpoint={endpoint} />
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* HTTP Status Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">HTTP Status Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { code: '200', description: 'Success — request processed successfully' },
              { code: '201', description: 'Created — resource created successfully' },
              { code: '400', description: 'Bad Request — invalid input or missing fields' },
              { code: '401', description: 'Unauthorized — not authenticated or session expired' },
              { code: '404', description: 'Not Found — resource does not exist' },
              { code: '409', description: 'Conflict — duplicate resource (e.g., email already in use)' },
              { code: '500', description: 'Internal Server Error — unexpected server failure' },
            ].map((item) => (
              <div key={item.code} className="flex items-center gap-4 text-sm">
                <code className="font-mono text-primary font-semibold">{item.code}</code>
                <span className="text-muted-foreground">{item.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
