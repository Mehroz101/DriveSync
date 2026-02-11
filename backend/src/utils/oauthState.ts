import crypto from 'crypto';
import type { OAuthState } from '../types/index.js';

const STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || 'fallback_state_secret';
const STATE_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a cryptographically secure OAuth state parameter
 * @param userId - The authenticated user's ID
 * @param meta - Optional additional data to include (e.g. { driveId })
 * @returns Base64-encoded signed state string
 */
export function generateOAuthState(userId: string, meta?: Record<string, string>): string {
  const state: OAuthState = {
    userId,
    csrfToken: crypto.randomBytes(32).toString('hex'),
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
    meta,
  };
  console.log("inside generateOAuth",state)

  const stateJSON = JSON.stringify(state);
  const stateBase64 = Buffer.from(stateJSON).toString('base64');

  // Create HMAC signature
  const signature = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(stateBase64)
    .digest('hex');

  // Return format: {base64Payload}.{signature}
  return `${stateBase64}.${signature}`;
}

/**
 * Validate and parse an OAuth state parameter
 * @param signedState - The signed state string from OAuth callback
 * @returns Parsed state object if valid, null if invalid
 */
export function validateOAuthState(signedState: string): OAuthState | null {
  try {
    const parts = signedState.split('.');
    if (parts.length !== 2) {
      console.error('Invalid state format: missing signature');
      return null;
    }

    const [stateBase64, receivedSignature] = parts;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', STATE_SECRET)
      .update(stateBase64)
      .digest('hex');

    if (receivedSignature !== expectedSignature) {
      console.error('Invalid state signature');
      return null;
    }

    // Decode state
    const stateJSON = Buffer.from(stateBase64, 'base64').toString('utf-8');
    const state: OAuthState = JSON.parse(stateJSON);

    // Check expiration
    const age = Date.now() - state.timestamp;
    if (age > STATE_EXPIRATION_MS) {
      console.error('State expired:', { age, max: STATE_EXPIRATION_MS });
      return null;
    }

    // Validate required fields
    if (!state.userId || !state.csrfToken || !state.nonce) {
      console.error('State missing required fields');
      return null;
    }

    return state;
  } catch (error) {
    console.error('Error validating OAuth state:', error);
    return null;
  }
}

/**
 * In-memory nonce tracker to prevent replay attacks
 * In production, use Redis or similar for distributed systems
 */
const usedNonces = new Set<string>();

// Clean up old nonces every hour
setInterval(() => {
  usedNonces.clear();
}, 60 * 60 * 1000);

/**
 * Check if a nonce has been used and mark it as used
 * @param nonce - The nonce to check
 * @returns true if nonce is unused (valid), false if already used
 */
export function checkAndMarkNonce(nonce: string): boolean {
  if (usedNonces.has(nonce)) {
    return false;
  }
  usedNonces.add(nonce);
  return true;
}
