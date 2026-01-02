// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String },
  picture: { type: String },
  lastFetched: { type: Date }, // optional: track last Drive fetch
}, {
  timestamps: true
});

export default mongoose.model("User", userSchema);
