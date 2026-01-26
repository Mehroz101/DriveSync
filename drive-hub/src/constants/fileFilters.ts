export const MIME_FILTER_MAP: Record<string, string[]> = {
  document: [
    "application/vnd.google-apps.document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/html",
    "text/csv",
    "application/json",
  ],

  spreadsheet: [
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],

  presentation: ["application/vnd.google-apps.presentation"],

  pdf: ["application/pdf"],

  image: [
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
    "image/gif",
    "image/heif",
    "image/x-photoshop",
  ],

  video: ["video/mp4", "video/mpeg", "video/quicktime", "video/webm"],

  archive: [
    "application/zip",
    "application/x-zip-compressed",
    "application/rar",
    "application/octet-stream",
  ],

  folder: ["application/vnd.google-apps.folder"],

  code: [
    "text/javascript",
    "text/css",
    "application/x-httpd-php",
    "application/vnd.jgraph.mxfile",
  ],

  other: [
    "application/vnd.google-apps.shortcut",
    "application/vnd.android.package-archive",
    "application/vnd.google-makersuite.applet+zip",
    "application/vnd.google-makersuite.prompt",
    "application/x-msdownload",
    "text/x-vcard",
  ],
};

export const FILE_FILTER_CATEGORIES: { label: string; value: string }[] = [
  { label: "Documents", value: "document" },
  { label: "Spreadsheets", value: "spreadsheet" },
  { label: "Presentations", value: "presentation" },
  { label: "PDF Files", value: "pdf" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
  { label: "Archives", value: "archive" },
  { label: "Folders", value: "folder" },
  { label: "Code Files", value: "code" },
  { label: "Other", value: "other" },
];

export const SIZE_FILTER_OPTIONS: { label: string; value: string; min?: number; max?: number }[] = [
  { label: "Any Size", value: "all" },
  { label: "< 1 MB", value: "small", max: 1024 * 1024 },
  { label: "1 - 10 MB", value: "medium", min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { label: "10 - 100 MB", value: "large", min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { label: "100 MB - 1 GB", value: "xlarge", min: 100 * 1024 * 1024, max: 1024 * 1024 * 1024 },
  { label: "> 1 GB", value: "huge", min: 1024 * 1024 * 1024 },
];

export const DATE_PRESETS: { label: string; value: string; days?: number }[] = [
  { label: "Any Time", value: "all" },
  { label: "Today", value: "today", days: 1 },
  { label: "Last 7 days", value: "week", days: 7 },
  { label: "Last 30 days", value: "month", days: 30 },
  { label: "Last 90 days", value: "quarter", days: 90 },
  { label: "Last year", value: "year", days: 365 },
];
