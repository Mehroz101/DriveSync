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
import searchRoutes from "./routes/search.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI as string).then(() => {
  console.log("MongoDB connected");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

app.use("/test", (req,res) => {
  res.send("Server is running");
});
// Google OAuth routes
app.use("/api/auth", googleAuthRoutes);
// Email/password authentication routes
app.use("/api/email-auth", emailAuthRoutes);
app.use("/api/drive", driveRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", searchRoutes);
app.use(errorHandler);

app.listen(process.env.PORT || 4000, () =>
  console.log(`Server running on port ${process.env.PORT || 4000}`)
);