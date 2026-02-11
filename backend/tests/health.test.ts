/// <reference types="jest" />
// filepath: /Users/macintosh/Documents/GitHub/DriveSync/backend/tests/health.test.ts
import request from 'supertest';
import express from 'express';
import { healthCheck, livenessProbe, readinessProbe } from '../src/middleware/health.middleware.js';

// Create a test app with just health endpoints
const createTestApp = () => {
  const app = express();
  app.get('/health', healthCheck);
  app.get('/health/live', livenessProbe);
  app.get('/health/ready', readinessProbe);
  return app;
};

describe('Health Endpoints', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('googleAPI');
      expect(response.body.services).toHaveProperty('fileSystem');
    });

    it('should include system information', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('system');
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.system.memory).toHaveProperty('used');
      expect(response.body.system.memory).toHaveProperty('total');
      expect(response.body.system.memory).toHaveProperty('percentage');
    });
  });

  describe('GET /health/live', () => {
    it('should return liveness probe', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness probe', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database');
    });
  });
});
