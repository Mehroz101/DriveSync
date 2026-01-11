import mongoose from "mongoose";

const driveAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    googleId: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    connectionStatus: {
      type: String,
      enum: ["active", "inactive", "error"],
      default: "active",
    },
    scopes: [{ type: String }], // OAuth scopes granted
    lastSync: {
      type: Date,
    },
    lastFetched: {
      type: Date,
    },
    used: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    trashedFiles: {
      type: Number,
      default: 0,
    },
    totalFiles: {
      type: Number,
      default: 0,
    },

    totalFolders: {
      type: Number,
      default: 0,
    },
    profileImg: {
      type: String,
    },
    duplicateFiles: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
driveAccountSchema.index({ userId: 1 });
driveAccountSchema.index({ googleId: 1, userId: 1 }, { unique: true });

export default mongoose.model("DriveAccount", driveAccountSchema);
