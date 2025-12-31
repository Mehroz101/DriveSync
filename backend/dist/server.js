import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
const app = express();
// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Health check
app.get("/health", (_, res) => res.status(200).json({ status: "OK" }));
// TODO: Mount your routes here
// app.use("/api/accounts", accountsRoutes);
// app.use("/api/files", filesRoutes);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
