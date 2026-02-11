import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    googleAPI: ServiceHealth;
    fileSystem: ServiceHealth;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  lastChecked: string;
  error?: string;
}

class HealthService {
  private startTime: number = Date.now();
  
  async getHealthStatus(): Promise<HealthCheck> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    // Check all services in parallel
    const [database, googleAPI, fileSystem, systemInfo] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkGoogleAPI(),
      this.checkFileSystem(),
      this.getSystemInfo()
    ]);

    const services = {
      database: database.status === 'fulfilled' ? database.value : this.createUnhealthyService(database.reason),
      googleAPI: googleAPI.status === 'fulfilled' ? googleAPI.value : this.createUnhealthyService(googleAPI.reason),
      fileSystem: fileSystem.status === 'fulfilled' ? fileSystem.value : this.createUnhealthyService(fileSystem.reason),
    };

    const system = systemInfo.status === 'fulfilled' ? systemInfo.value : {
      memory: { used: 0, total: 0, percentage: 0 },
      cpu: { usage: 0 }
    };

    // Determine overall health
    const allServicesHealthy = Object.values(services).every(service => service.status === 'healthy');
    const overallStatus: 'healthy' | 'unhealthy' = allServicesHealthy ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp,
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      system
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Simple ping to check connection
      if (!mongoose.connection.db) {
        throw new Error('Database connection is not established');
      }
      await mongoose.connection.db.admin().ping();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 100 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error instanceof Error ? error: { message: String(error) } });
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkGoogleAPI(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Simple check to Google API (no authentication required)
      const response = await fetch('https://www.googleapis.com/oauth2/v1/certs', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.ok ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        ...(response.ok ? {} : { error: `HTTP ${response.status}` })
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkFileSystem(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Check if logs directory is writable
      const logsDir = path.join(process.cwd(), 'logs');
      await fs.access(logsDir, fs.constants.W_OK);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;
    
    return {
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      cpu: {
        usage: Math.round(process.cpuUsage().user / 1000) // Simplified CPU usage
      }
    };
  }

  private createUnhealthyService(error: any): ServiceHealth {
    return {
      status: 'unhealthy',
      lastChecked: new Date().toISOString(),
      error: error?.message || String(error)
    };
  }
}

const healthService = new HealthService();

// Health check endpoint
export const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await healthService.getHealthStatus();
    
    // Log unhealthy status
    if (health.status === 'unhealthy') {
      logger.warn('Health check failed', { 
        services: health.services,
        timestamp: health.timestamp 
      });
    }
    
    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check endpoint error', { error: error instanceof Error ? error.message : String(error) });
    next(error);
  }
};

// Simple liveness probe (for Kubernetes)
export const livenessProbe = (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
};

// Readiness probe (for Kubernetes)
export const readinessProbe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if application is ready to serve requests
    const isReady = mongoose.connection.readyState === 1; // Connected
    
    if (isReady) {
      res.status(200).json({ 
        status: 'ready', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } else {
      res.status(503).json({ 
        status: 'not ready', 
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      });
    }
  } catch (error) {
    logger.error('Readiness probe error', { error: error instanceof Error ? error.message : String(error) });
    next(error);
  }
};

// Metrics endpoint for monitoring (basic implementation)
export const metricsEndpoint = (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Simple text metrics format (Prometheus compatible)
  const metrics = `
# HELP nodejs_memory_heap_used_bytes Memory used by the Node.js heap
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP nodejs_memory_heap_total_bytes Total heap memory available
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP nodejs_uptime_seconds Node.js process uptime in seconds
# TYPE nodejs_uptime_seconds counter
nodejs_uptime_seconds ${uptime}

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET"} ${global.httpRequestCounts?.GET || 0}
http_requests_total{method="POST"} ${global.httpRequestCounts?.POST || 0}
http_requests_total{method="PUT"} ${global.httpRequestCounts?.PUT || 0}
http_requests_total{method="DELETE"} ${global.httpRequestCounts?.DELETE || 0}
`.trim();

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
};

// Middleware to count HTTP requests (for metrics)
export const requestCounterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!global.httpRequestCounts) {
    global.httpRequestCounts = { GET: 0, POST: 0, PUT: 0, DELETE: 0 };
  }
  
  const method = req.method as keyof typeof global.httpRequestCounts;
  if (global.httpRequestCounts[method] !== undefined) {
    global.httpRequestCounts[method]++;
  }
  
  next();
};

// Declare global types for metrics
declare global {
  var httpRequestCounts: {
    GET: number;
    POST: number;
    PUT: number;
    DELETE: number;
  };
}
