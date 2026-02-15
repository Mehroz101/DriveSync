import dotenv from "dotenv";
import { Request, Response } from "express";
import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import compression from "compression";
import * as helmetModule from "helmet";
import * as rateLimitModule from "express-rate-limit";
import passport from "./config/passport.js";
import { httpLogger, logger } from "./utils/logger.js";
import { default as connectDB } from "./auth/db.js";
import { errorHandler } from "./middleware/error.middleware.js";
import driveRoutes from "./routes/drive.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import googleAuthRoutes from "./routes/auth.router.js";
import emailAuthRoutes from "./routes/auth.routes.js";
import fileRoutes from "./routes/file.routes.js";
import searchRoutes from "./routes/search.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import duplicatesRoutes from "./routes/duplicates.routes.js";

dotenv.config();

console.log('✅ Starting server initialization...');

// Error handling for uncaught exceptions
process.on("uncaughtException", (err) => {
  const errorMsg = err instanceof Error ? err.stack || err.message : String(err);
  logger.error("UNCAUGHT EXCEPTION:", errorMsg);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const errorMsg = reason instanceof Error ? reason.stack || reason.message : String(reason);
  logger.error("UNHANDLED REJECTION:", errorMsg);
  process.exit(1);
});

const helmet = (helmetModule as any).default || helmetModule;
const rateLimit = (rateLimitModule as any).default || rateLimitModule;

const app = express();
let server: any = null;

// Security middleware (must be first)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://googleapis.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for OAuth
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin image loading (thumbnails, profile images)
}));

// Compression middleware
app.use(compression({ level: 6, threshold: 1024 }));

// HTTP request logging
app.use(httpLogger);

// Health check endpoints (basic for now)
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({ 
    status: 'ready', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

app.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('# Basic metrics\nuptime ' + Math.floor(process.uptime()));
});


const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

// Configure CORS with specific origins for production security
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL || 'https://yourdomain.com']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({ 
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));

// Parse JSON with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware for Google OAuth
app.use(
  cookieSession({
    name: "session",
    keys: [(() => {
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('SESSION_SECRET is required in production');
        }
        logger.warn('⚠️  Using default session secret - NOT SECURE for production');
        return "development-secret-key-change-in-production";
      }
      return secret;
    })()],
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: 'lax'
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Remove Express header for security
app.disable('x-powered-by');

// Connect to MongoDB and start the HTTP server
async function startServer() {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected successfully');
  } catch (dbError) {
    console.warn('⚠️  MongoDB connection failed - starting server without database');
    console.warn('   Database error:', dbError instanceof Error ? dbError.message : String(dbError));
    console.warn('   Some features may not work properly');
  }

  try {
    app.use("/test", (req: Request, res: Response) => {
      res.send("Server is running");
    });
    app.use("/api/email-auth", emailAuthRoutes);
    app.use("/api/auth", googleAuthRoutes);
    app.use("/api/drive", driveRoutes);
    app.use("/api/file", fileRoutes);
    app.use("/api/profile", profileRoutes);
    app.use("/api", searchRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/duplicates", duplicatesRoutes);
    app.use(errorHandler);

    const port = process.env.PORT || 4000;
    server = app.listen(port, () => {
      logger.info(`✓ Server running on port ${port}`);
      console.log(`✓ Server running on port ${port}`);
      console.log(`📡 Health check: http://localhost:${port}/health`);
    });
  } catch (err) {
    console.error("🚨 Failed to start server:");
    if (err instanceof Error) {
      console.error("   Error:", err.message);
      console.error("   Stack:", err.stack);
    } else {
      console.error("   Unknown error:", err);
    }
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});