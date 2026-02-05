import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";

// Lazy loaded pages
const Drives = lazy(() => import("@/pages/Drives"));
const FilesExplorer = lazy(() => import("@/pages/FilesExplorer"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Duplicates = lazy(() => import("@/pages/Duplicates"));
const ActivityLog = lazy(() => import("@/pages/ActivityLog"));
const Settings = lazy(() => import("@/pages/Settings"));
const ApiDocs = lazy(() => import("@/pages/ApiDocs"));
const Trashed = lazy(() => import("@/pages/Trashed"));

const App = () => (
  <ErrorBoundary>
    <Provider store={store}>
      <AuthProvider>
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
                <Route path="/drives" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-64">Loading drives...</div>}>
                    <Drives />
                  </Suspense>
                } />
                <Route path="/files" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-64">Loading files...</div>}>
                    <FilesExplorer />
                  </Suspense>
                } />
                <Route path="/trashed" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-64">Loading trash...</div>}>
                    <Trashed />
                  </Suspense>
                } />
                <Route path="/analytics" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-64">Loading analytics...</div>}>
                    <Analytics />
                  </Suspense>
                } />
                <Route path="/duplicates" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-64">Loading duplicates...</div>}>
                    <Duplicates />
                  </Suspense>
                } />
                <Route path="/activity" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-64">Loading activity...</div>}>
                    <ActivityLog />
                  </Suspense>
                } />
                <Route path="/settings" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-64">Loading settings...</div>}>
                    <Settings />
                  </Suspense>
                } />
                <Route path="/api-docs" element={
                  <Suspense fallback={<div className="flex items-center justify-center h-64">Loading API docs...</div>}>
                    <ApiDocs />
                  </Suspense>
                } />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </Provider>
  </ErrorBoundary>
);

export default App;
