import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    driveAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DriveAccount",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    googleFileId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    webViewLink: {
      type: String,
    },
    webContentLink: {
      type: String,
    },
    iconLink: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
    },
    createdTime: {
      type: Date,
    },
    modifiedTime: {
      type: Date,
    },
    size: {
      type: Number,
    },
    owners: [
      {
        displayName: String,
        emailAddress: String,
      },
    ],
    parents: [{ type: String }], // Parent folder IDs
    starred: {
      type: Boolean,
      default: false,
    },
    trashed: {
      type: Boolean,
      default: false,
    },
    shared: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);


// Tenant isolation + sorting
fileSchema.index({ userId: 1, modifiedTime: -1 });

// Multi-drive lookup
fileSchema.index({ userId: 1, driveAccountId: 1 });

// Prevent duplicates across drives
fileSchema.index({ googleFileId: 1, driveAccountId: 1 }, { unique: true });

// Text search optimization
fileSchema.index(
  { name: "text", description: "text" },
  { weights: { name: 10, description: 2 } }
);
export default mongoose.model("File", fileSchema);
