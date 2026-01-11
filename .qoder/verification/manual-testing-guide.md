# Authentication System - Manual Testing Guide

This guide provides step-by-step instructions for manually testing the refactored authentication system to verify all security improvements are working correctly.

---

## Prerequisites

1. **Backend Running:** `cd backend && npm run dev` (Port 4000)
2. **Frontend Running:** `cd frontend && npm run dev` (Port 5173)
3. **MongoDB Running:** Connection to local or remote MongoDB instance
4. **Google OAuth Configured:** Valid Google OAuth credentials in backend `.env`
5. **Browser Tools:** Chrome DevTools or similar for inspecting network requests and localStorage

---

## Test Suite 1: Email Registration and Login

### Test 1.1: Register New User

**Objective:** Verify email registration with input validation

**Steps:**
1. Navigate to `http://localhost:5173/register`
2. Fill in the form:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `short` (should fail - less than 8 chars)
   - Confirm Password: `short`
3. Click "Create Account"

**Expected Result:**
- ❌ Error message: "Password must be at least 8 characters"

**Steps (continued):**
4. Update password to `password123` (8+ characters)
5. Update confirm password to `password123`
6. Click "Create Account"

**Expected Result:**
- ✅ User registered successfully
- ✅ Redirected to `/dashboard`
- ✅ JWT token stored in localStorage (key: `token`)
- ❌ No `userId` in localStorage

**Verification:**
```javascript
// In browser console
localStorage.getItem('token') // Should return a JWT string
localStorage.getItem('userId') // Should return null
```

### Test 1.2: Login with Email

**Objective:** Verify email login flow

**Steps:**
1. Clear localStorage: `localStorage.clear()`
2. Navigate to `http://localhost:5173/login`
3. Enter credentials:
   - Email: `test@example.com`
   - Password: `password123`
4. Click "Sign in"

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to `/dashboard`
- ✅ JWT token stored in localStorage
- ✅ User profile and drive accounts loaded (if any connected)

### Test 1.3: Invalid Credentials

**Objective:** Verify error handling for invalid login

**Steps:**
1. Navigate to `http://localhost:5173/login`
2. Enter wrong password:
   - Email: `test@example.com`
   - Password: `wrongpassword`
3. Click "Sign in"

**Expected Result:**
- ❌ Error message: "Invalid credentials"
- ❌ Not redirected
- ❌ No token stored

---

## Test Suite 2: Google OAuth Flow

### Test 2.1: Google OAuth Login

**Objective:** Verify Google OAuth creates user and DriveAccount

**Steps:**
1. Clear localStorage
2. Navigate to `http://localhost:5173/login`
3. Click "Sign in with Google"
4. Authenticate with Google account
5. Grant permissions

**Expected Result:**
- ✅ Redirected to `http://localhost:5173/auth/callback?token=...`
- ✅ Token extracted from URL and stored in localStorage
- ❌ No `userId` in URL parameters
- ✅ Redirected to `/dashboard`
- ✅ User profile displayed (Google account info)
- ✅ First Google Drive account automatically connected

**Network Tab Verification:**
```
GET /auth/google/callback → Backend
Redirect → http://localhost:5173/auth/callback?token=JWT_HERE
(No userId in URL)
```

---

## Test Suite 3: Token-Based API Calls

### Test 3.1: Protected Routes Require Token

**Objective:** Verify all protected routes reject requests without token

**Steps:**
1. Clear localStorage
2. Open browser DevTools → Network tab
3. Manually call protected API:
```javascript
fetch('http://localhost:4000/api/drive/files', {
  headers: { 'Content-Type': 'application/json' }
})
.then(res => res.json())
.then(console.log)
```

**Expected Result:**
- ❌ Status: 401 Unauthorized
- ❌ Response: `{ error: "Access token required" }`

### Test 3.2: Valid Token Grants Access

**Objective:** Verify authenticated requests succeed

**Steps:**
1. Login with email or Google OAuth
2. In browser console:
```javascript
const token = localStorage.getItem('token');
fetch('http://localhost:4000/api/drive/accounts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(console.log)
```

**Expected Result:**
- ✅ Status: 200 OK
- ✅ Response: `{ accounts: [...] }`
- ✅ Only authenticated user's drive accounts returned

### Test 3.3: No userId in API Requests

**Objective:** Verify frontend doesn't send userId in URLs

**Steps:**
1. Navigate to `/dashboard` while authenticated
2. Open Network tab in DevTools
3. Observe API calls

**Expected Requests:**
```
GET /api/drive/files (no userId in URL)
GET /api/drive/accounts (no userId in URL)
GET /api/drive/profile (no userId in URL)
```

**Verify Headers:**
- ✅ Authorization: Bearer JWT_TOKEN
- ❌ No userId anywhere in request

---

## Test Suite 4: Multi-Drive Account Security

### Test 4.1: Add Second Drive Account

**Objective:** Verify OAuth state security for adding drives

**Steps:**
1. Login and go to `/dashboard`
2. Click "Add Drive Account"
3. Observe the redirect URL in address bar

**Expected URL:**
```
http://localhost:4000/auth/add-drive-account
(No userId query parameter!)
```

4. Authenticate with a different Google account
5. Grant permissions

**Expected Result:**
- ✅ Redirected back to `/dashboard?driveAdded=true&accountId=...`
- ✅ New drive account appears in list
- ✅ Account linked to authenticated user only

**Backend Logs Verification:**
```
Drive account linked → user=USER_ID, google=GOOGLE_ID
```

### Test 4.2: OAuth State Tampering Prevention

**Objective:** Verify state signature validation

**Steps:**
1. Click "Add Drive Account"
2. Intercept the redirect to Google OAuth (copy URL)
3. Modify the `state` parameter in the URL
4. Complete OAuth flow with modified state

**Expected Result:**
- ❌ Redirected to `/dashboard?driveAdded=false&error=Invalid or expired OAuth state`
- ❌ Drive account NOT created
- ✅ Security breach prevented

**Backend Logs:**
```
Error: Invalid state signature
OR
Error: Invalid or expired OAuth state
```

### Test 4.3: State Expiration

**Objective:** Verify OAuth state expires after 15 minutes

**Steps:**
1. Click "Add Drive Account"
2. Copy the OAuth URL (with state parameter)
3. Wait 16 minutes
4. Navigate to the copied URL and complete OAuth

**Expected Result:**
- ❌ Error: "Invalid or expired OAuth state"
- ❌ Drive account NOT created

---

## Test Suite 5: Cross-User Data Access Prevention

### Test 5.1: Setup Two Users

**Objective:** Create two distinct users for testing

**Steps:**
1. Register User A: `usera@example.com` / `password123`
2. Add Google Drive account for User A
3. Logout
4. Register User B: `userb@example.com` / `password456`
5. Add different Google Drive account for User B

### Test 5.2: Attempt Cross-User Account Access

**Objective:** Verify User B cannot access User A's data

**Steps:**
1. Login as User B
2. Get User B's token from localStorage
3. Get User A's drive account ID (from database or previous session)
4. Attempt to delete User A's drive account:
```javascript
const token = localStorage.getItem('token');
const userAAccountId = 'USER_A_DRIVE_ACCOUNT_ID';

fetch(`http://localhost:4000/api/drive/accounts/${userAAccountId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(console.log)
```

**Expected Result:**
- ❌ Status: 403 Forbidden
- ❌ Response: `{ error: "You do not have permission to remove this drive account" }`
- ✅ User A's drive account remains intact

### Test 5.3: Drive Files Isolation

**Objective:** Verify users only see their own files

**Steps:**
1. Login as User A
2. Note files displayed on dashboard
3. Logout
4. Login as User B
5. Note files displayed on dashboard

**Expected Result:**
- ✅ User A sees only files from User A's drive accounts
- ✅ User B sees only files from User B's drive accounts
- ❌ No overlap between users' file lists

---

## Test Suite 6: Session and Token Management

### Test 6.1: Token Expiration

**Objective:** Verify expired tokens are rejected

**Steps:**
1. Login with email/password
2. Wait for token to expire (7 days by default - for testing, manually create expired token or modify JWT_SECRET)
3. Refresh dashboard page
4. Observe API calls

**Expected Result (after expiration):**
- ❌ API calls return 403 Forbidden
- ❌ Error: "Invalid or expired token"
- ✅ User should be redirected to login

### Test 6.2: Logout

**Objective:** Verify logout clears token

**Steps:**
1. Login to dashboard
2. Click logout (if implemented) or manually:
```javascript
localStorage.removeItem('token');
window.location.href = '/login';
```

**Expected Result:**
- ✅ Token removed from localStorage
- ✅ Redirected to login page
- ❌ Cannot access protected routes

---

## Test Suite 7: Input Validation

### Test 7.1: Email Format Validation

**Objective:** Verify email format is enforced

**Steps:**
1. Navigate to `/register`
2. Enter invalid email: `notanemail`
3. Password: `password123`
4. Confirm password: `password123`
5. Click "Create Account"

**Expected Result:**
- ❌ Browser validation error or backend error
- ❌ Account not created

### Test 7.2: Name Sanitization

**Objective:** Verify XSS prevention in name field

**Steps:**
1. Navigate to `/register`
2. Enter name: `<script>alert('XSS')</script>`
3. Valid email and password
4. Click "Create Account"

**Expected Result:**
- ✅ Account created
- ✅ Name stored as: `scriptalert('XSS')/script` (< and > removed)
- ❌ No script execution

---

## Test Suite 8: Error Handling

### Test 8.1: Duplicate Email Registration

**Objective:** Verify duplicate email prevention

**Steps:**
1. Register user with `duplicate@example.com`
2. Logout
3. Attempt to register again with `duplicate@example.com`

**Expected Result:**
- ❌ Error: "User already exists"
- ❌ No second account created

### Test 8.2: Google OAuth with Existing Email User

**Objective:** Verify authType separation

**Steps:**
1. Register with email: `mixed@example.com` / `password123`
2. Logout
3. Attempt Google OAuth login with same email

**Expected Result:**
- ✅ Two separate user records created (different authTypes)
- ⚠️ Or implement logic to link accounts (design decision)

---

## Security Checklist

After completing all tests, verify:

- [ ] ✅ No userId stored in localStorage
- [ ] ✅ No userId in URL parameters for protected routes
- [ ] ✅ All API calls include Authorization header with JWT
- [ ] ✅ Users cannot access other users' drive accounts
- [ ] ✅ Users cannot delete other users' drive accounts
- [ ] ✅ OAuth state is cryptographically signed
- [ ] ✅ Expired OAuth state is rejected
- [ ] ✅ Password minimum 8 characters enforced
- [ ] ✅ Email format validated
- [ ] ✅ Name sanitized against XSS
- [ ] ✅ Duplicate emails prevented
- [ ] ✅ Invalid tokens rejected with 401/403
- [ ] ✅ Protected routes inaccessible without token

---

## Common Issues and Troubleshooting

### Issue: "Invalid or expired token" on every request
**Solution:** Check JWT_SECRET is consistent between backend instances

### Issue: OAuth state validation fails
**Solution:** Verify OAUTH_STATE_SECRET or JWT_SECRET is set

### Issue: CORS errors
**Solution:** Check backend CORS configuration allows frontend origin

### Issue: Token not stored after login
**Solution:** Check browser console for JavaScript errors, verify setAuthToken() is called

### Issue: Dashboard shows "Loading..." indefinitely
**Solution:** Check Network tab for API errors, verify token is being sent with requests

---

## Production Testing Recommendations

Before deploying to production:

1. **Load Testing:** Test with multiple concurrent users
2. **Penetration Testing:** Hire security experts to audit
3. **Token Refresh:** Implement and test token refresh mechanism
4. **Rate Limiting:** Test rate limiting on auth endpoints
5. **HTTPS:** Verify all testing passes over HTTPS
6. **Mobile Testing:** Test OAuth flows on mobile browsers
7. **Session Timeout:** Test behavior after long inactivity periods

---

## Conclusion

Completing this manual testing guide ensures the authentication system is secure, functional, and ready for production deployment. Any failures in these tests indicate critical issues that must be resolved before launch.
