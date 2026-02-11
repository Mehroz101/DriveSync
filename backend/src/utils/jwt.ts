import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.js';

// Re-export JwtPayload so other modules can import it from this module
export type { JwtPayload };

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};