import mongoose from "mongoose";
import File from "../models/file.js";

export interface DuplicateGroup {
  id: string;
  name: string;
  size: number;
  hash?: string;
  files: any[];
  totalWastedSpace: number;
}

export const getDuplicatesService = async (userId: string): Promise<DuplicateGroup[]> => {


  // Use aggregation for better performance
  const duplicates = await File.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        trashed: false,
      },
    },
    {
      $lookup: {
        from: "driveaccounts", // collection name
        localField: "driveAccountId",
        foreignField: "_id",
        as: "driveAccount",
      },
    },
    {
      $unwind: {
        path: "$driveAccount",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: { name: "$name", size: "$size" },
        files: {
          $push: {
            _id: "$_id",
            name: "$name",
            size: "$size",
            mimeType: "$mimeType",
            webViewLink: "$webViewLink",
            iconLink: "$iconLink",
            thumbnailUrl: "$thumbnailUrl",
            modifiedTime: "$modifiedTime",
            driveAccountId: "$driveAccountId",
            driveAccount: "$driveAccount",
            googleFileId: "$googleFileId",
          },
        },
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

  return duplicates;
};
