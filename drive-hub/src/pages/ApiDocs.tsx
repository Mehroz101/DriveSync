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
  requestBody?: object;
  responseExample: object;
  errorExample?: object;
}

const apiEndpoints: Record<string, ApiEndpoint[]> = {
  Authentication: [
    {
      method: 'GET',
      path: '/api/auth/me',
      description: 'Get current authenticated user',
      headers: { 'Authorization': 'Bearer <token>' },
      responseExample: {
        id: 'user-1',
        name: 'Alex Morgan',
        email: 'alex.morgan@company.com',
        avatar: 'https://...',
        status: 'active',
        createdAt: '2024-01-15T08:00:00Z'
      },
      errorExample: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication token is required'
      }
    }
  ],
  Drives: [
    {
      method: 'GET',
      path: '/api/drives',
      description: 'List all connected drives',
      headers: { 'Authorization': 'Bearer <token>' },
      responseExample: {
        data: [
          {
            id: 'drive-1',
            name: 'Personal Drive',
            email: 'alex@gmail.com',
            status: 'active',
            storageUsed: 9126805504,
            storageTotal: 16106127360
          }
        ],
        meta: { total: 4 }
      }
    },
    {
      method: 'POST',
      path: '/api/drives',
      description: 'Connect a new drive',
      headers: { 'Authorization': 'Bearer <token>' },
      requestBody: {
        authCode: 'google_oauth_code',
        name: 'Work Drive'
      },
      responseExample: {
        data: {
          id: 'drive-5',
          name: 'Work Drive',
          status: 'syncing'
        },
        success: true
      }
    },
    {
      method: 'DELETE',
      path: '/api/drives/:id',
      description: 'Remove a connected drive',
      headers: { 'Authorization': 'Bearer <token>' },
      responseExample: {
        success: true,
        message: 'Drive disconnected successfully'
      }
    }
  ],
  Files: [
    {
      method: 'GET',
      path: '/api/files',
      description: 'List files with filtering and pagination',
      headers: { 'Authorization': 'Bearer <token>' },
      requestBody: {
        driveIds: ['drive-1', 'drive-2'],
        types: ['document', 'pdf'],
        search: 'report',
        page: 1,
        pageSize: 25
      },
      responseExample: {
        data: [
          {
            id: 'file-1',
            name: 'Q4 Report.pdf',
            driveId: 'drive-1',
            size: 2516582,
            type: 'pdf',
            lastModified: '2024-01-19T16:00:00Z'
          }
        ],
        meta: { page: 1, pageSize: 25, total: 156, hasMore: true }
      }
    },
    {
      method: 'POST',
      path: '/api/files/upload',
      description: 'Upload a file to a specific drive',
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'multipart/form-data'
      },
      requestBody: {
        driveId: 'drive-1',
        file: '<binary>',
        path: '/documents'
      },
      responseExample: {
        data: {
          id: 'file-new',
          name: 'uploaded-file.pdf',
          size: 1048576
        },
        success: true
      }
    },
    {
      method: 'DELETE',
      path: '/api/files/:id',
      description: 'Delete a file',
      headers: { 'Authorization': 'Bearer <token>' },
      responseExample: {
        success: true,
        message: 'File deleted successfully'
      },
      errorExample: {
        code: 'FILE_NOT_FOUND',
        message: 'File not found or access denied'
      }
    }
  ],
  Analytics: [
    {
      method: 'GET',
      path: '/api/analytics/storage',
      description: 'Get storage analytics over time',
      headers: { 'Authorization': 'Bearer <token>' },
      requestBody: {
        startDate: '2024-01-01',
        endDate: '2024-01-20',
        driveIds: ['drive-1']
      },
      responseExample: {
        data: [
          { date: '2024-01-14', usedStorage: 88584527872 },
          { date: '2024-01-15', usedStorage: 90412040192 }
        ]
      }
    },
    {
      method: 'GET',
      path: '/api/analytics/file-types',
      description: 'Get file type distribution',
      headers: { 'Authorization': 'Bearer <token>' },
      responseExample: {
        data: [
          { type: 'document', count: 1520, size: 2254857830 },
          { type: 'image', count: 3450, size: 13421772800 }
        ]
      }
    }
  ],
  Duplicates: [
    {
      method: 'GET',
      path: '/api/duplicates',
      description: 'Get duplicate file groups',
      headers: { 'Authorization': 'Bearer <token>' },
      responseExample: {
        data: [
          {
            id: 'dup-1',
            name: 'Q4 Report.pdf',
            hash: 'a1b2c3d4',
            files: ['file-1', 'file-8'],
            totalWastedSpace: 2516582
          }
        ],
        meta: { totalDuplicates: 4, totalWastedSpace: 166002893 }
      }
    },
    {
      method: 'POST',
      path: '/api/duplicates/scan',
      description: 'Trigger a duplicate scan',
      headers: { 'Authorization': 'Bearer <token>' },
      responseExample: {
        success: true,
        message: 'Scan started',
        jobId: 'scan-123'
      }
    }
  ],
  Activity: [
    {
      method: 'GET',
      path: '/api/activity',
      description: 'Get activity log',
      headers: { 'Authorization': 'Bearer <token>' },
      requestBody: {
        types: ['upload', 'delete'],
        driveId: 'drive-1',
        page: 1,
        pageSize: 50
      },
      responseExample: {
        data: [
          {
            id: 'act-1',
            type: 'upload',
            description: 'Uploaded new file',
            fileName: 'Meeting Notes.docx',
            timestamp: '2024-01-20T11:00:00Z'
          }
        ],
        meta: { page: 1, total: 234 }
      }
    }
  ]
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
            Reference documentation for backend integration.
          </p>
        </div>
        
        <Button variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          OpenAPI Spec
        </Button>
      </div>

      {/* Base URL */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code="https://api.drivehub.app/v1" />
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Authentication</CardTitle>
          <CardDescription>All API requests require a Bearer token in the Authorization header.</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={`Authorization: Bearer <your_access_token>`} />
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

      {/* Error Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Common Error Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { code: 'AUTH_REQUIRED', description: 'No authentication token provided' },
              { code: 'AUTH_INVALID', description: 'Token is invalid or expired' },
              { code: 'NOT_FOUND', description: 'Resource not found' },
              { code: 'FORBIDDEN', description: 'Access denied to this resource' },
              { code: 'RATE_LIMITED', description: 'Too many requests, please slow down' },
              { code: 'DRIVE_EXPIRED', description: 'Drive connection has expired, re-auth required' },
            ].map((error) => (
              <div key={error.code} className="flex items-center gap-4 text-sm">
                <code className="font-mono text-destructive">{error.code}</code>
                <span className="text-muted-foreground">{error.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
