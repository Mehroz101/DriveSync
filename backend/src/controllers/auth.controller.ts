import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, getUserById } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const result = await registerUser({ email, password, name });
    
    if (result.success) {
      res.status(201).json({
        message: 'User registered successfully',
        token: result.token,
        user: result.user
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    console.log(email,password)
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await loginUser({ email, password });
      console.log(result)
    if (result.success) {
      res.status(200).json({
        message: 'Login successful',
        token: result.token,
        data: result.user
      });
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Use userId from authenticated token, not from URL parameters
    const user = await getUserById(req.userId!);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For JWT-based auth, client-side token removal is sufficient
    // We can return a success response
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};