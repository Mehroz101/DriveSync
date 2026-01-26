import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error connecting to MongoDB: ${message}`);
    // Throw so the caller can handle the error (e.g., abort startup or retry)
    throw error;
  }
};

export default connectDB;
