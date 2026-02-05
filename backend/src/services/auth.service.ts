import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import { generateToken } from '../utils/jwt.js';
import { JwtPayload } from '../types/index.js';
import { LoginCredentials, RegisterData, AuthResult } from '../types/index.js';

export const registerUser = async (userData: RegisterData): Promise<AuthResult> => {
  try {
    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (userData.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }

    if (!userData.name || userData.name.trim().length === 0) {
      return { success: false, error: 'Name is required' };
    }

    // Sanitize name to prevent injection attacks
    const sanitizedName = userData.name.trim().replace(/[<>]/g, '');

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return { success: false, error: 'User already exists' };
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create new user
    const newUser = new User({
      email: userData.email,
      password: hashedPassword,
      name: sanitizedName,
      authType: 'email', // Differentiate from Google OAuth users
    });

    await newUser.save();

    // Generate JWT token
    const tokenPayload: JwtPayload = {
      userId: newUser._id.toString(),
      email: newUser.email,
    };
    const token = generateToken(tokenPayload);

    return {
      success: true,
      token,
      user: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
      },
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
};

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResult> => {
  try {
    // Find user by email
    const user = await User.findOne({ email: credentials.email });
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Check if user registered via email (not Google OAuth)
    if (user.authType && user.authType !== 'email') {
      return { success: false, error: 'Please use Google login for this account' };
    }
    if(!user.password) return { success: false, error: 'No password found for this account' };
    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Generate JWT token
    const tokenPayload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
    };
    const token = generateToken(tokenPayload);

    return {
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
};

export const getUserById = async (userId: string) => {
  try {
    return await User.findById(userId).select('-password');
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}