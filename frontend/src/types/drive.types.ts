export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: number;
  shared?: boolean;
  starred?: boolean;
  driveAccountName?: string;
  driveAccountEmail?: string;
}

export interface DriveAccount {
  _id: string;
  name: string;
  email: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  scopes: string[];
  lastSync?: string;
  lastFetched?: string;
  createdAt: string;
  updatedAt: string;
  driveAccountEmail?: string;
}

export interface DriveAccount {
  _id: string;
  name: string;
  email: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  scopes: string[];
  lastSync?: string;
  lastFetched?: string;
  createdAt: string;
  updatedAt: string;
  driveAccountEmail?: string;
}

export interface DriveAccount {
  _id: string;
  name: string;
  email: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  scopes: string[];
  lastSync?: string;
  lastFetched?: string;
  createdAt: string;
  updatedAt: string;
  driveAccountEmail?: string;
}

export interface DriveAccount {
  _id: string;
  name: string;
  email: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  scopes: string[];
  lastSync?: string;
  lastFetched?: string;
  createdAt: string;
  updatedAt: string;
}
