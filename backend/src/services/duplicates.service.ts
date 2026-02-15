import mongoose, { PipelineStage } from "mongoose";
import File from "../models/file.js";
import type { DuplicateGroup } from "../types/index.js";

export const getDuplicatesService = async (userId: string): Promise<DuplicateGroup[]> => {
  // Optimized pipeline:
  // 1. Match user files first (uses userId index)
  // 2. Group by (name, size) to find duplicates - NO $lookup yet
  // 3. Filter groups with count > 1
  // 4. Limit groups for perf
  // 5. Only THEN look up the full file details for duplicate groups
  const pipeline: PipelineStage[] = [
    // Stage 1: Filter to this user's non-trashed files using index
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        trashed: false,
        mimeType: { $ne: "application/vnd.google-apps.folder" },
      },
    },
    // Stage 2: Group by (name, size) - lightweight, no lookup needed yet
    {
      $group: {
        _id: { name: "$name", size: "$size" },
        count: { $sum: 1 },
        fileIds: { $push: "$_id" },
      },
    },
    // Stage 3: Keep only duplicate groups (2+ files)
    {
      $match: {
        count: { $gt: 1 },
      },
    },
    // Stage 4: Sort by wasted space desc
    {
      $sort: {
        "_id.size": -1 as const,
        count: -1 as const,
      },
    },
    // Stage 5: Limit results
    {
      $limit: 100,
    },
    // Stage 6: Now unwind the file IDs to look up full file data
    {
      $unwind: "$fileIds",
    },
    // Stage 7: Lookup the actual file documents
    {
      $lookup: {
        from: "files",
        localField: "fileIds",
        foreignField: "_id",
        as: "fileDoc",
      },
    },
    {
      $unwind: "$fileDoc",
    },
    // Stage 8: Lookup drive account info per file
    {
      $lookup: {
        from: "driveaccounts",
        localField: "fileDoc.driveAccountId",
        foreignField: "_id",
        as: "driveAccountDoc",
      },
    },
    {
      $unwind: {
        path: "$driveAccountDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Stage 9: Re-group back into duplicate groups with full file data
    {
      $group: {
        _id: { name: "$_id.name", size: "$_id.size" },
        count: { $sum: 1 },
        files: {
          $push: {
            _id: "$fileDoc._id",
            name: "$fileDoc.name",
            size: "$fileDoc.size",
            mimeType: "$fileDoc.mimeType",
            webViewLink: "$fileDoc.webViewLink",
            iconLink: "$fileDoc.iconLink",
            thumbnailUrl: "$fileDoc.thumbnailUrl",
            modifiedTime: "$fileDoc.modifiedTime",
            driveAccountId: "$fileDoc.driveAccountId",
            googleFileId: "$fileDoc.googleFileId",
            driveAccount: {
              _id: "$driveAccountDoc._id",
              email: "$driveAccountDoc.email",
              name: "$driveAccountDoc.name",
              connectionStatus: "$driveAccountDoc.connectionStatus",
              profileImg: "$driveAccountDoc.profileImg",
            },
          },
        },
      },
    },
    // Stage 10: Final projection
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
      $sort: { totalWastedSpace: -1 as const },
    },
  ];

  const duplicates = await File.aggregate(pipeline).allowDiskUse(true);

  return duplicates;
};
