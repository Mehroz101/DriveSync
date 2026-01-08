import { Request, Response } from "express";
import { getUserById } from "../services/auth.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import driveAccount from "../models/driveAccount.js";

import { fetchDriveStats } from "../services/drive.service.js";
export const dashboardStates = async (req:AuthenticatedRequest,res:Response)=>{
    try {
        const user = await getUserById(req.userId!)
        const driveAccounts = await driveAccount.find({ userId: req.userId! });
        const stats = await Promise.allSettled(driveAccounts.map((account) => fetchDriveStats(account)));
        console.log(stats)
        const filteredStats = stats.filter((stat) => stat.status === "fulfilled").map((stat) => stat.value);
        return res.status(200).json(filteredStats);
    } catch (error) {
        console.log(error);
    }
}

