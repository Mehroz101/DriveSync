// src/server.ts
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import passport from "./config/passport.js";
import cookieSession from "cookie-session";
import cors from "cors";
import session from "express-session";
import driveRoutes from "./routes/drive.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import authRoutes from "./routes/auth.js";
import searchRoutes from "./routes/search.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();
console.log("CLIENT ID:", process.env.GOOGLE_CLIENT_ID);
console.log("CLIENT SECRET:", process.env.GOOGLE_CLIENT_SECRET);
app.use(cors({origin:true, credentials: true}));
app.use(express.json());
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

app.use("/test", (req,res)=>{
  res.send("Server is running");
});
app.use("/auth", authRoutes);
app.use("/api/drive", driveRoutes);
app.use("/api", profileRoutes);
app.use("/api", searchRoutes);

app.use(errorHandler);
app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
mongoose.connect(process.env.MONGO_URI as string).then(() => {
  console.log("MongoDB connected");
});
