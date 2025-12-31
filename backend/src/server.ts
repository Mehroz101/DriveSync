// src/server.ts
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import passport from "./config/passport.js";
import cookieSession from "cookie-session";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import driveRoutes from "./routes/drive.js";

const app = express();
console.log("CLIENT ID:", process.env.GOOGLE_CLIENT_ID);
console.log("CLIENT SECRET:", process.env.GOOGLE_CLIENT_SECRET);
app.use(cors({origin:true, credentials: true}));
app.use(express.json());
app.use(
  cookieSession({
    name: "session",
    keys: ["secret"],
    maxAge: 24 * 60 * 60 * 1000,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/test", (req,res)=>{
  res.send("Server is running");
});
app.use("/auth", authRoutes);
app.use("/api/drive", driveRoutes);

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
mongoose.connect(process.env.MONGO_URI as string).then(() => {
  console.log("MongoDB connected");
});
