import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          One place to view and manage your Google Drive files
        </h1>

        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400">
          Securely sync, browse, and access your Drive documents with a
          distraction-free interface built for speed and clarity.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Open Dashboard
          </Link>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            Google OAuth required
          </span>
        </div>
      </div>
    </section>
  );
};

export default Home;
