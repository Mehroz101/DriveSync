import mongoose from "mongoose";

const oauthStateSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  purpose: {
    type: String,
    enum: ["ADD_DRIVE"],
    required: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000),
  },
});

export default mongoose.model("OAuthState", oauthStateSchema);
