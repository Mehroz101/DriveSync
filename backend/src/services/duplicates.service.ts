import mongoose from "mongoose";
import File from "../models/file.js";
import { cacheService } from "./cache.service.js";

export interface DuplicateGroup {
  id: string;
  name: string;
  size: number;
  hash?: string;
  files: any[];
  totalWastedSpace: number;
}

export const getDuplicatesService = async (userId: string): Promise<DuplicateGroup[]> => {
  const cacheKey = `duplicates_${userId}`;
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Use aggregation for better performance
  const duplicates = await File.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        trashed: false,
      },
    },
    {
      $group: {
        _id: { name: "$name", size: "$size" },
        files: { $push: "$$ROOT" },
        count: { $sum: 1 },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
    {
      $project: {
        id: { $concat: ["$_id.name", "_", { $toString: "$_id.size" }] },
        name: "$_id.name",
        size: "$_id.size",
        files: 1,
        totalWastedSpace: {
          $multiply: [{ $subtract: ["$count", 1] }, "$_id.size"],
        },
      },
    },
    {
      $sort: { totalWastedSpace: -1 },
    },
    {
      $limit: 100, // Limit to top 100 duplicates for performance
    },
  ]);

  cacheService.set(cacheKey, duplicates, 10); // 10 minutes
  return duplicates;
};
