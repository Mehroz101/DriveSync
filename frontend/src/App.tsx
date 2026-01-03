import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthCallback from "./pages/AuthCallback";
import { logout } from "./api/auth.api";
import { clearUserSession } from "./utils/auth";

type ThemeMode = "light" | "dark";

const getInitialTheme = (): ThemeMode => {
  const stored = localStorage.getItem("theme");
  return stored === "dark" || stored === "light" ? stored : "light";
};

const App = () => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = "http://localhost:4000/auth/google";
  };

  const handleLogout = async () => {
    try {
      // Call the backend logout endpoint
      await logout();
      
      // Clear frontend session
      clearUserSession();
      
      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error('Logout error:', error);
      // Even if backend logout fails, clear frontend session
      clearUserSession();
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
