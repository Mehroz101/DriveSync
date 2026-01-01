import React from "react";
import { Link, useLocation } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

interface NavbarProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
  handleLogin: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  theme,
  toggleTheme,
  handleLogin,
}) => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          DriveSync
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className={`text-sm font-medium ${
              location.pathname === "/"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Home
          </Link>

          <Link
            to="/dashboard"
            className={`text-sm font-medium ${
              location.pathname === "/dashboard"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Dashboard
          </Link>

          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-md text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
{isAuthenticated() ? null : (

   <button
            onClick={handleLogin}
            className="px-4 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
          >
            Sign in
          </button>
)}
         
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
