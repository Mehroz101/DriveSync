// src/server.ts
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import passport from "./config/passport.js";
import cors from "cors";
import cookieSession from "cookie-session";
import driveRoutes from "./routes/drive.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import googleAuthRoutes from "./routes/auth.router.js";
import emailAuthRoutes from "./routes/auth.routes.js";
import fileRoutes from "./routes/file.routes.js";
import searchRoutes from "./routes/search.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import duplicatesRoutes from "./routes/duplicates.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import connectDB from "./auth/db.js";
import util from "node:util";

const formatError = (err: unknown) => {
  if (err instanceof Error) return err.stack || err.message;
  try {
    return util.inspect(err, { depth: null, showHidden: true });
  } catch (e) {
    return String(err);
  }
};

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", formatError(err));
  // Exit so process restarts in a clean state
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", formatError(reason));
  // Exit so process restarts in a clean state
  process.exit(1);
});

const app = express();
let server: any = null;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Session middleware for Google OAuth
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "secret"],
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production" ? true : false,
    httpOnly: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB and start the HTTP server
async function startServer() {
  try {
    await connectDB();

    app.use("/test", (req, res) => {
      res.send("Server is running");
    });
    app.use("/api/email-auth", emailAuthRoutes);
    app.use("/api/auth", googleAuthRoutes);
    app.use("/api/drive", driveRoutes);
    app.use("/api/file", fileRoutes);
    app.use("/api/profile", profileRoutes);
    app.use("/api", searchRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/duplicates", duplicatesRoutes);
    app.use(errorHandler);

    const port = process.env.PORT || 4000;
    server = app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error("Failed to start server:", formatError(err));
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});