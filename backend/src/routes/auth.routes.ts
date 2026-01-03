import express from 'express';
import { register, login, getProfile, logout } from '../controllers/auth.controller.js';

const router = express.Router();

// Email/password authentication routes
router.post('/register', register);
router.post('/login', login);
router.get('/profile/:userId', getProfile);
router.post('/logout', logout);

// Keep existing Google OAuth routes in the old router
// Those will handle Google OAuth flows

export default router;