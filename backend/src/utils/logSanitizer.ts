
const SENSITIVE_KEYS = [
  'password',
  'accesstoken',
  'refreshtoken',
  'token',
  'secret',
  'authorization',
  'cookie',
  'sessionid',
];

/**
 * Recursively sanitize an object, redacting values of sensitive keys.
 * Prevents accidental logging of tokens, passwords, etc.
 */
export const sanitizeForLogging = (obj: unknown, depth = 0): unknown => {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeForLogging(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return String(obj);
};
