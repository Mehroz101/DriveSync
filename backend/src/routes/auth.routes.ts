import express from 'express';
import { register, login, getProfile, logout } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Email/password authentication routes
router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile); // Protected route, no userId parameter
router.post('/logout', logout);

// Keep existing Google OAuth routes in the old router
// Those will handle Google OAuth flows

export default router;