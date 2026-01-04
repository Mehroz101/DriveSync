import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Drives from "@/pages/Drives";
import FilesExplorer from "@/pages/FilesExplorer";
import Analytics from "@/pages/Analytics";
import Duplicates from "@/pages/Duplicates";
import ActivityLog from "@/pages/ActivityLog";
import Settings from "@/pages/Settings";
import ApiDocs from "@/pages/ApiDocs";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";

const queryClient = new QueryClient();

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/drives" element={<Drives />} />
              <Route path="/files" element={<FilesExplorer />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/duplicates" element={<Duplicates />} />
              <Route path="/activity" element={<ActivityLog />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/api-docs" element={<ApiDocs />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
