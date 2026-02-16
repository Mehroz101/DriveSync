// Vercel serverless function handler
import dotenv from "dotenv";
import app from "../src/server.js";
import { logger } from "../src/utils/logger.js";
import { default as connectDB } from "../src/auth/db.js";

dotenv.config();

let dbConnected = false;

// Initialize database connection once
export async function initializeDatabase() {
  if (dbConnected) return;
  
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected successfully');
    dbConnected = true;
  } catch (dbError) {
    console.warn('⚠️  MongoDB connection failed');
    console.warn('   Database error:', dbError instanceof Error ? dbError.message : String(dbError));
    console.warn('   Some features may not work properly');
  }
}

// Export app as the default Vercel handler
export default async (req: any, res: any) => {
  // Ensure database is connected
  await initializeDatabase();
  
  // Call the Express app
  return app(req, res);
};
