// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;            
  iconLink?: string;               
  createdTime?: string;            
  modifiedTime?: string;           
  modifiedByMeTime?: string;       
  size?: number;                   
  parents?: string[];              
  owners?: { displayName: string; emailAddress: string }[]; 
  shared?: boolean;                
  starred?: boolean;               
  trashed?: boolean;               
  permissions?: any[];             
  imageMediaMetadata?: any;        
}

const Dashboard = () => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");

  const fetchDriveFiles = async () => {
    if (!userId) return;

    try {
      console.log("Fetching drive files...");
      const res = await fetch(
        `http://localhost:4000/api/drive/files/${userId}`,
        { method: "GET", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch files");

      const data: DriveFile[] = await res.json();
      setFiles(data);
    } catch (error: unknown) {
      console.error("Error fetching drive files:", error);
    }
  };

  useEffect(() => {
    fetchDriveFiles();
  }, []);

  return (
    <div className="p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">My Google Drive Files</h1>

      {files.length === 0 ? (
        <p className="text-gray-500">No files found in your Drive.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Icon</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Size</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Created</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Modified</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Shared</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Starred</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {file.iconLink && <img src={file.iconLink} alt="icon" className="w-6 h-6" />}
                  </td>
                  <td className="px-4 py-2">
                    {file.webViewLink ? (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate max-w-xs block"
                      >
                        {file.name}
                      </a>
                    ) : (
                      <span className="truncate max-w-xs block">{file.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{file.mimeType}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {file.size ? `${(file.size / 1024).toFixed(2)} KB` : "-"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {file.createdTime ? new Date(file.createdTime).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{file.shared ? "Yes" : "No"}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{file.starred ? "Yes" : "No"}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
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
  );
};

export default Dashboard;
