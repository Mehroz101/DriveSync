import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, getUserById } from '../services/auth.service.js';
import type { AuthenticatedRequest, User } from '../types/index.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      sendError(res, 'Email, password, and name are required', { statusCode: 400 });
      return;
    }

    const result = await registerUser({ email, password, name });
    
    if (result.success && result.user && result.token) {
      sendSuccess<{ user: User; token: string }>(res, {
        user: result.user,
        token: result.token
      }, {
        message: 'User registered successfully',
        statusCode: 201
      });
    } else {
      sendError(res, result.error || 'Registration failed', { statusCode: 400 });
    }
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      sendError(res, 'Email and password are required', { statusCode: 400 });
      return;
    }

    const result = await loginUser({ email, password });
    
    if (result.success && result.user && result.token) {
      sendSuccess<{ user: User; token: string }>(res, {
        user: result.user,
        token: result.token
      }, {
        message: 'Login successful'
      });
    } else {
      sendError(res, result.error || 'Invalid credentials', { statusCode: 401 });
    }
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Use userId from authenticated token, not from URL parameters
    const user = await getUserById(req.userId!);
    
    if (!user) {
      sendError(res, 'User not found', { statusCode: 404 });
      return;
    }
    
    const userResponse: User = {
      id: user._id.toString(),
      email: user.email,
      name: user.name || '',
      picture: user.picture || undefined,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      status: 'active',
      authType: user.authType
    };
    
    sendSuccess<User>(res, userResponse);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // For JWT-based auth, client-side token removal is sufficient
    sendSuccess(res, undefined, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};