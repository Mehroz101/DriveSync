// Test setup file
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Global test database instance
let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  await mongoose.connect(uri);
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Clear database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing-only';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
