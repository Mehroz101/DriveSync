
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  strength?: 'weak' | 'medium' | 'strong';
}

/**
 * Validate password strength.
 * Requires at least 8 chars, one letter, and one number.
 */
export const validatePasswordStrength = (password: string): PasswordValidationResult => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be at most 128 characters' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  // Determine strength
  const checks = [
    /[a-z]/.test(password),  // lowercase
    /[A-Z]/.test(password),  // uppercase
    /\d/.test(password),     // digit
    /[^a-zA-Z\d]/.test(password), // special char
  ].filter(Boolean).length;

  const strength: PasswordValidationResult['strength'] =
    checks >= 4 ? 'strong' : checks >= 3 ? 'medium' : 'weak';

  return { valid: true, strength };
};

/**
 * Escape special regex characters in user input to prevent regex injection.
 */
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
