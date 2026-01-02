import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  driveAccountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "DriveAccount", 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  googleFileId: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  mimeType: { 
    type: String, 
    required: true 
  },
  webViewLink: { 
    type: String 
  },
  webContentLink: { 
    type: String 
  },
  iconLink: { 
    type: String 
  },
  createdTime: { 
    type: Date 
  },
  modifiedTime: { 
    type: Date 
  },
  size: { 
    type: Number 
  },
  owners: [{
    displayName: String,
    emailAddress: String
  }],
  parents: [{ type: String }], // Parent folder IDs
  starred: { 
    type: Boolean, 
    default: false 
  },
  trashed: { 
    type: Boolean, 
    default: false 
  },
  shared: { 
    type: Boolean, 
    default: false 
  },
  description: { 
    type: String 
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
fileSchema.index({ userId: 1 });
fileSchema.index({ driveAccountId: 1 });
fileSchema.index({ googleFileId: 1 });
fileSchema.index({ name: "text", description: "text" }); // For search functionality
fileSchema.index({ modifiedTime: -1 }); // For sorting by modification time

export default mongoose.model("File", fileSchema);