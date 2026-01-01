import { useDriveFiles } from "../hooks/useDriveFiles";
import { useGoogleUser } from "../hooks/useGoogleuser";
import type { DriveFile } from "../types/drive.types";
import { getUserId } from "../utils/auth";

const Dashboard = () => {
  const userId = getUserId();
  const { data: files, isLoading, isError } = useDriveFiles(userId);
  const { data: user, isLoading: isUserLoading } = useGoogleUser(userId!);
  
  if (!userId) {
    return (
      <div className="p-8 text-gray-500">Please sign in to view your files</div>
    );
  }

  if (isLoading || isUserLoading) {
    return <div className="p-8 text-gray-500">Loading files…</div>;
  }

  if (isError) {
    return <div className="p-8 text-red-500">Failed to load data</div>;
  }

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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Google Drive Files
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and manage your synced Drive documents
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 overflow-hidden">
        {files?.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">
            No files available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">File</th>
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
        )}
      </div>
    </div>
  );
};

export default Dashboard;
