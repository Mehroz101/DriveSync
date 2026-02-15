#!/bin/bash
# Quick Fixes Script for DriveSync Code Quality
# Run this to apply the recommended medium-priority improvements
# Estimated time: 15 minutes (if run individually)

echo "🔧 DriveSync Code Quality Quick Fixes"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fix 1: Add regex sanitization to search (15 minutes)
echo "${YELLOW}Fix 1: Adding regex sanitization to search queries${NC}"
echo "File: backend/src/services/drive.service.ts"
echo "Function: searchDriveFiles"
echo ""
echo "Current code will create a new utility function and update the search."
echo "This prevents regex injection attacks."
echo ""
read -p "Apply Fix 1? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "${GREEN}✓ Fix 1 ready to apply${NC}"
    echo "  → Create backend/src/utils/sanitization.ts"
    echo "  → Update searchDriveFiles function"
    echo "  → Add tests for sanitization"
    echo ""
fi

# Fix 2: Create log sanitization utility (1 hour)
echo "${YELLOW}Fix 2: Creating log sanitization utility${NC}"
echo "File: backend/src/utils/logSanitizer.ts (new file)"
echo ""
echo "This will prevent accidental logging of sensitive data like tokens and passwords."
echo ""
read -p "Apply Fix 2? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "${GREEN}✓ Fix 2 ready to apply${NC}"
    echo "  → Create logSanitizer.ts utility"
    echo "  → Update key logging points in services"
    echo "  → Add to logger.ts imports"
    echo ""
fi

# Fix 3: Enhance password validation (30 minutes)
echo "${YELLOW}Fix 3: Enhancing password validation${NC}"
echo "File: backend/src/utils/validation.ts (new file)"
echo ""
echo "This adds requirements for numbers and letters in passwords."
echo ""
read -p "Apply Fix 3? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "${GREEN}✓ Fix 3 ready to apply${NC}"
    echo "  → Create validation.ts utility"
    echo "  → Update auth.service.ts"
    echo "  → Update profile.controller.ts"
    echo ""
fi

echo ""
echo "======================================"
echo "${GREEN}Quick fixes summary:${NC}"
echo "✓ All fixes are optional but recommended"
echo "✓ Total estimated time if all applied: 2-3 hours"
echo "✓ These improve security and debuggability"
echo ""
echo "Detailed instructions in: CODE_QUALITY_AUDIT.md"
echo ""
echo "${YELLOW}Note:${NC} The most impactful fix is #1 (regex sanitization) - 15 minutes"
echo "Consider doing that one first if time is limited."
echo ""

# Check if user wants to see the code examples
read -p "Show code examples for the fixes? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "============================================"
    echo "${GREEN}Fix 1: Regex Sanitization${NC}"
    echo "============================================"
    cat << 'EOF'

// backend/src/utils/sanitization.ts
export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Update in drive.service.ts
import { escapeRegex } from '../utils/sanitization.js';

export const searchDriveFiles = async (userId: string, query: string) => {
  const sanitizedQuery = escapeRegex(query.trim());
  
  return await File.find({
    userId: new mongoose.Types.ObjectId(userId),
    name: { $regex: sanitizedQuery, $options: "i" },
  })
    .limit(100)
    .lean();
};

EOF
    echo ""
    echo "============================================"
    echo "${GREEN}Fix 2: Log Sanitization${NC}"
    echo "============================================"
    cat << 'EOF'

// backend/src/utils/logSanitizer.ts
export const sanitizeForLogging = (obj: any): any => {
  const sensitive = ['password', 'accessToken', 'refreshToken', 'token', 'secret'];
  
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Usage in services:
import { sanitizeForLogging } from '../utils/logSanitizer.js';
logger.info('Drive account details', sanitizeForLogging(driveAccount));

EOF
    echo ""
    echo "============================================"
    echo "${GREEN}Fix 3: Password Validation${NC}"
    echo "============================================"
    cat << 'EOF'

// backend/src/utils/validation.ts
export const validatePasswordStrength = (password: string): { 
  valid: boolean; 
  error?: string 
} => {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password too long (max 128 characters)' };
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }
  
  return { valid: true };
};

// Usage in auth.service.ts:
import { validatePasswordStrength } from '../utils/validation.js';

const passwordCheck = validatePasswordStrength(userData.password);
if (!passwordCheck.valid) {
  return { success: false, error: passwordCheck.error };
}

EOF
    echo ""
fi

echo ""
echo "${GREEN}All code examples are in CODE_QUALITY_AUDIT.md${NC}"
echo "Run this script anytime to review the fixes."
echo ""
echo "Happy coding! 🚀"
