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
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="shrink-0 flex items-center"
            >
              <div className="h-8 w-8 rounded-lg bg-linear-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-2">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">DriveSync</span>
            </Link>
            <nav className="ml-10 hidden md:flex space-x-8">
              <Link
                to="/"
                className={`text-sm font-medium ${
                  location.pathname === "/"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                }`}
              >
                Home
              </Link>

              <Link
                to="/dashboard"
                className={`text-sm font-medium ${
                  location.pathname === "/dashboard"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                }`}
              >
                Dashboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            {isAuthenticated() ? null : (
              <button
                onClick={handleLogin}
                className="ml-4 px-4 py-2 rounded-md text-sm font-medium bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
