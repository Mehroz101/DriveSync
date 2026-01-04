import { useState } from "react";
import { useDriveFiles } from "../hooks/useDriveFiles";
import { useGoogleUser } from "../hooks/useGoogleuser";
import { useDriveAccounts, useAddDriveAccount, useSyncDriveFiles, useRemoveDriveAccount } from "../hooks/useDriveAccounts";
import { useSearch } from "../hooks/useSearch";
import { useDebounce } from "../hooks/useDebounce";
import type { DriveFile, DriveAccount } from "../types/drive.types";

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Debounce the search query so API calls are only made after user stops typing
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms delay

  // No userId parameter needed - authenticated via token
  const { data: files, isLoading: filesLoading, isError } = useDriveFiles();
  const { data: user, isLoading: isUserLoading } = useGoogleUser();
  const { data: driveAccounts, isLoading: accountsLoading } = useDriveAccounts();
  
  // Use the debounced query for search
  const { data: searchResults, isLoading: searchLoading } = useSearch(debouncedSearchQuery);
  
  const { mutate: addDriveAccount, isPending: addingAccount } = useAddDriveAccount();
  const { mutate: syncFiles, isPending: syncingFiles } = useSyncDriveFiles();
  const { mutate: removeDriveAccount } = useRemoveDriveAccount();
  
  // Check authentication status
  if (isUserLoading || accountsLoading) {
    return <div className="p-8 text-gray-500">Loading data…</div>;
  }

  if (isError) {
    return <div className="p-8 text-red-500">Failed to load data</div>;
  }

  const handleAddDriveAccount = () => {
    addDriveAccount(undefined, {
      onSuccess: (data) => {
        // Redirect to the auth URL to add the drive account
        window.location.href = data.authUrl;
      },
    });
  };

  const handleSyncFiles = () => {
    syncFiles();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {user && (
        <div className="flex items-center mb-6">
          <img
            src={user.picture}
            alt={user.name}
            className="w-12 h-12 rounded-full mr-4"
          />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Welcome back, {user.name}!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </p>
          </div>
        </div>
      )}
      
      {/* Search Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all connected drives..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Drive Accounts Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Google Drive Accounts
          </h1>
          <div className="flex gap-3">
            <button 
              onClick={handleSyncFiles}
              disabled={syncingFiles}
              className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {syncingFiles ? 'Syncing...' : 'Sync All Drives'}
            </button>
            <button 
              onClick={handleAddDriveAccount}
              disabled={addingAccount}
              className="px-4 py-2 rounded-md bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {addingAccount ? 'Adding...' : 'Add Drive Account'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {driveAccounts?.map((account: DriveAccount) => (
            <div 
              key={account._id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{account.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{account.email}</p>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    account.connectionStatus === 'connected' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : account.connectionStatus === 'error'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {account.connectionStatus}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to remove this drive account?')) {
                      removeDriveAccount(account._id);
                    }
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Last synced: {account.lastSync ? new Date(account.lastSync).toLocaleString() : 'Never'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Files Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {searchQuery ? 'Search Results' : 'All Drive Files'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {searchQuery 
            ? `Showing results for "${searchQuery}" from all connected Drive accounts`
            : 'View and manage files from all connected Drive accounts'
          }
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 overflow-hidden">
        {searchQuery ? (
          // Search results view
          searchLoading ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">File</th>
                    <th className="px-4 py-3 text-left font-medium">Drive Account</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Size</th>
                    <th className="px-4 py-3 text-left font-medium">Created</th>
                    <th className="px-4 py-3 text-left font-medium">Modified</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {searchResults?.map((file: DriveFile) => (
                    <tr
                      key={file.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <td className="px-4 py-3 flex items-center gap-3 max-w-sm">
                        {file.iconLink && (
                          <img src={file.iconLink} alt="" className="w-5 h-5" />
                        )}
                        <span className="truncate text-gray-900 dark:text-gray-100">
                          {file.name}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate">
                        {file.driveAccountName || file.driveAccountEmail || "Unknown"}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate">
                        {file.mimeType}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {file.createdTime
                          ? new Date(file.createdTime).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            file.shared
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {file.shared ? "Shared" : "Private"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Open
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
              No search results found for "{searchQuery}"
            </div>
          )
        ) : (
          // Regular files view
          filesLoading ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
              Loading files...
            </div>
          ) : files?.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
              No files available from connected drives
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">File</th>
                    <th className="px-4 py-3 text-left font-medium">Drive Account</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Size</th>
                    <th className="px-4 py-3 text-left font-medium">Created</th>
                    <th className="px-4 py-3 text-left font-medium">Modified</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {files?.map((file: DriveFile) => (
                    <tr
                      key={file.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <td className="px-4 py-3 flex items-center gap-3 max-w-sm">
                        {file.iconLink && (
                          <img src={file.iconLink} alt="" className="w-5 h-5" />
                        )}
                        <span className="truncate text-gray-900 dark:text-gray-100">
                          {file.name}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate">
                        {file.driveAccountName || file.driveAccountEmail || "Unknown"}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate">
                        {file.mimeType}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {file.createdTime
                          ? new Date(file.createdTime).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            file.shared
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {file.shared ? "Shared" : "Private"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Open
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Dashboard;