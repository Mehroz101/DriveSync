import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

const App = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    // Add or remove dark mode class on <html> tag
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Store user preference in localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);
const handleLogin = () => {
    window.location.href = "http://localhost:4000/auth/google";
  };
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  return (
    <>
    <div className="flex items-center justify-center h-screen bg-background-deep">
      <button
        onClick={toggleTheme}
        className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700"
      >
        {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>
      <button onClick={handleLogin}>Login with Google</button>;
      <h1 className="text-4xl font-bold text-text-primary font-heading">
        Hello,{" "}
      </h1>
      <h1 className="text-4xl dark:text-primary text-text-secondary font-body">
        {" "}
        Tailwind CSS with Vite!
      </h1>
    </div>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>

    </>

  );
};

export default App;
