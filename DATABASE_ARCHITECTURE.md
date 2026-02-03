# DriveSync MongoDB Database Architecture Analysis

> **Document Version:** 1.0  
> **Last Updated:** January 2025  
> **Classification:** Technical Architecture Document

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Database Collections](#2-current-database-collections)
3. [Schema Design Quality Review](#3-schema-design-quality-review)
4. [Problems & Issues Identified](#4-problems--issues-identified)
5. [Recommended Improvements](#5-recommended-improvements)
6. [Future Models Required](#6-future-models-required)
7. [Scalability Strategy](#7-scalability-strategy)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Appendix: Optimized Schemas](#9-appendix-optimized-schemas)

---

## 1. Executive Summary

### Overview

DriveSync currently operates with a **minimal 4-collection MongoDB architecture** that handles user authentication, multi-Google Drive management, and file metadata storage. While functional for MVP, the current design has significant gaps that will impede scaling to production-grade SaaS operations.

### Quick Assessment

| Aspect | Current State | Target State | Gap Severity |
|--------|--------------|--------------|--------------|
| **Collections** | 4 | 15+ | 🔴 Critical |
| **Indexing** | Basic | Comprehensive | 🟡 Medium |
| **Security** | Plaintext tokens | Encrypted at-rest | 🔴 Critical |
| **Audit Trail** | None | Full logging | 🔴 Critical |
| **Multi-tenancy** | Implicit | Explicit isolation | 🟡 Medium |
| **Scalability** | Single instance | Sharded cluster | 🟡 Medium |

### Key Findings

1. **Security Risk**: OAuth tokens stored in plaintext
2. **Missing Indexes**: Several query patterns lack proper indexing
3. **No Audit Trail**: Zero activity logging for compliance
4. **No Subscription Management**: Cannot support SaaS billing
5. **Limited Schema Validation**: Mongoose schemas lack comprehensive validation

---

## 2. Current Database Collections

### 2.1 Collection Inventory

```
┌─────────────────────────────────────────────────────────────────┐
│                    DRIVESYNC DATABASE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   users     │───▶│  driveaccounts  │───▶│     files       │ │
│  │  (auth)     │    │   (storage)     │    │   (metadata)    │ │
│  └─────────────┘    └─────────────────┘    └─────────────────┘ │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │ oauthstates │                                               │
│  │  (temp)     │                                               │
│  └─────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Collection Details

#### **Collection: `users`**

| Purpose | User authentication and profile storage |
|---------|----------------------------------------|
| Document Count (Est.) | Low (early stage) |
| Average Document Size | ~500 bytes |
| Growth Rate | Linear with signups |

**Current Schema:**
```typescript
{
  _id: ObjectId,
  googleId: String,          // Optional - Google OAuth users only
  email: String,             // Required, unique
  password: String,          // Optional - email/password users only
  name: String,              // Optional
  picture: String,           // Optional - profile picture URL
  authType: 'google' | 'email',  // Required
  lastFetched: Date,         // Optional - last Drive fetch
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

**Indexes:**
- `email_1` (unique) - implied by `unique: true`
- No explicit composite indexes

---

#### **Collection: `driveaccounts`**

| Purpose | Connected Google Drive account storage |
|---------|----------------------------------------|
| Document Count (Est.) | 1-10x users |
| Average Document Size | ~2 KB |
| Growth Rate | Multiple per user |

**Current Schema:**
```typescript
{
  _id: ObjectId,
  userId: ObjectId,          // Required - ref to User
  name: String,              // Required - account display name
  email: String,             // Required - Google account email
  googleId: String,          // Required - Google account ID
  accessToken: String,       // Required - ⚠️ PLAINTEXT
  refreshToken: String,      // Required - ⚠️ PLAINTEXT
  connectionStatus: 'active' | 'inactive' | 'error' | 'revoked',
  scopes: [String],          // OAuth scopes granted
  lastSync: Date,            // Last sync timestamp
  lastFetched: Date,         // Last file fetch timestamp
  used: Number,              // Storage used (bytes)
  total: Number,             // Total storage (bytes)
  trashedFiles: Number,      // Count of trashed files
  totalFiles: Number,        // Total file count
  totalFolders: Number,      // Total folder count
  profileImg: String,        // Profile image URL
  duplicateFiles: Number,    // Duplicate file count
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `userId_1` - user lookup
- `googleId_1_userId_1` (unique) - prevent duplicate connections

---

#### **Collection: `files`**

| Purpose | Google Drive file metadata cache |
|---------|----------------------------------|
| Document Count (Est.) | 100-10,000x users |
| Average Document Size | ~1.5 KB |
| Growth Rate | Exponential with users |

**Current Schema:**
```typescript
{
  _id: ObjectId,
  driveAccountId: ObjectId,  // Required - ref to DriveAccount
  userId: ObjectId,          // Required - ref to User
  googleFileId: String,      // Required - Google's file ID
  name: String,              // Required - file name
  mimeType: String,          // Required - MIME type
  webViewLink: String,       // Google Drive view URL
  webContentLink: String,    // Direct download URL
  iconLink: String,          // File type icon URL
  thumbnailUrl: String,      // Thumbnail image URL
  createdTime: Date,         // File creation time
  modifiedTime: Date,        // Last modification time
  size: Number,              // File size in bytes
  owners: [{
    displayName: String,
    emailAddress: String
  }],
  parents: [String],         // Parent folder Google IDs
  starred: Boolean,
  trashed: Boolean,
  shared: Boolean,
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `userId_1_modifiedTime_-1` - tenant isolation + sorting
- `userId_1_driveAccountId_1` - multi-drive lookup
- `googleFileId_1_driveAccountId_1` (unique) - prevent duplicates
- `name_text_description_text` - full-text search

---

#### **Collection: `oauthstates`**

| Purpose | Temporary OAuth CSRF protection |
|---------|--------------------------------|
| Document Count (Est.) | Transient (should be ~0) |
| Average Document Size | ~200 bytes |
| Growth Rate | N/A - ephemeral |

**Current Schema:**
```typescript
{
  _id: ObjectId,
  state: String,             // Required, unique - CSRF token
  userId: ObjectId,          // Required - ref to User
  purpose: 'ADD_DRIVE',      // Required - OAuth flow purpose
  expiresAt: Date            // Default: 10 minutes from creation
}
```

**Indexes:**
- `state_1` (unique) - implied

**⚠️ Critical Issue:** No TTL index for automatic cleanup!

---

## 3. Schema Design Quality Review

### 3.1 Scoring Matrix

| Category | Score | Max | Notes |
|----------|-------|-----|-------|
| **Normalization** | 7 | 10 | Good separation of concerns |
| **Indexing** | 5 | 10 | Missing critical indexes |
| **Data Types** | 6 | 10 | Inconsistent number handling |
| **Validation** | 3 | 10 | Minimal validation rules |
| **Security** | 2 | 10 | Plaintext sensitive data |
| **Scalability** | 4 | 10 | No sharding consideration |
| **Relationships** | 6 | 10 | Good refs, missing cascades |
| **Documentation** | 3 | 10 | Inline comments only |

**Overall Score: 36/80 (45%) - Needs Improvement**

### 3.2 What's Done Well

#### ✅ Proper Reference Architecture
```typescript
// DriveAccount correctly references User
userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
}

// File correctly references both
driveAccountId: { type: ObjectId, ref: "DriveAccount" },
userId: { type: ObjectId, ref: "User" }
```

#### ✅ Good Composite Unique Indexes
```typescript
// Prevents same Google account linked twice to same user
driveAccountSchema.index({ googleId: 1, userId: 1 }, { unique: true });

// Prevents duplicate file records
fileSchema.index({ googleFileId: 1, driveAccountId: 1 }, { unique: true });
```

#### ✅ Text Search Implementation
```typescript
// Weighted text search on files
fileSchema.index(
  { name: "text", description: "text" },
  { weights: { name: 10, description: 2 } }
);
```

#### ✅ Enum Validation
```typescript
connectionStatus: {
  type: String,
  enum: ["active", "inactive", "error", "revoked"],
  default: "active",
}
```

### 3.3 Design Patterns Used

| Pattern | Usage | Quality |
|---------|-------|---------|
| **Referential** | User → DriveAccount → File | Good |
| **Timestamps** | All collections | Good |
| **Soft Enums** | authType, connectionStatus, purpose | Good |
| **Denormalization** | Storage stats in DriveAccount | Acceptable |

---

## 4. Problems & Issues Identified

### 4.1 🔴 CRITICAL: Security Vulnerabilities

#### Problem 1: Plaintext OAuth Tokens
```typescript
// driveAccount.ts - INSECURE
accessToken: { type: String, required: true },
refreshToken: { type: String, required: true },
```

**Risk Level:** 🔴 Critical  
**Impact:** Database breach exposes all user Google Drive access  
**CVSS Score:** 9.8 (Critical)

**Attack Scenario:**
1. Attacker gains read access to MongoDB (misconfiguration, injection)
2. Extracts all access/refresh tokens
3. Full access to all connected Google Drives
4. Data exfiltration, ransomware, account takeover

#### Problem 2: Plaintext Passwords
```typescript
// user.ts - INSECURE
password: { type: String }, // Only for email/password users
```

**Note:** Password may be hashed before storage (check auth service), but schema doesn't enforce it.

---

### 4.2 🔴 CRITICAL: Missing TTL Index

```typescript
// OAuthState.ts - Has expiresAt but NO TTL INDEX
expiresAt: {
  type: Date,
  default: () => new Date(Date.now() + 10 * 60 * 1000),
}
```

**Risk Level:** 🔴 Critical  
**Impact:** Database pollution, potential CSRF replay attacks

**Fix Required:**
```typescript
oauthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

### 4.3 🟡 Medium: Missing Indexes

#### Query Pattern: Find Active Drive Accounts
```typescript
// Current query (missing index)
DriveAccount.find({ userId, connectionStatus: 'active' });
```

**Missing Index:**
```typescript
driveAccountSchema.index({ userId: 1, connectionStatus: 1 });
```

#### Query Pattern: Find Trashed Files
```typescript
// Current query (missing index)
File.find({ userId, trashed: true });
```

**Missing Index:**
```typescript
fileSchema.index({ userId: 1, trashed: 1 });
```

#### Query Pattern: Find Files by MIME Type
```typescript
// Current query (missing index)
File.find({ userId, mimeType: /^image\// });
```

**Missing Index:**
```typescript
fileSchema.index({ userId: 1, mimeType: 1 });
```

#### Query Pattern: Find Starred Files
```typescript
// Current query (missing index)
File.find({ userId, starred: true });
```

**Missing Index:**
```typescript
fileSchema.index({ userId: 1, starred: 1 });
```

---

### 4.4 🟡 Medium: Naming Inconsistencies

| Current | Issue | Recommended |
|---------|-------|-------------|
| `googleFileId` | Inconsistent with `googleId` | `googleId` or `driveFileId` |
| `lastFetched` (User) | Ambiguous | `lastDriveFetchedAt` |
| `lastFetched` (DriveAccount) | Duplicate name | `lastMetadataFetchedAt` |
| `lastSync` | Ambiguous | `lastFileSyncAt` |
| `profileImg` | Abbreviation | `profileImageUrl` |
| `used`/`total` | Not descriptive | `storageUsedBytes`/`storageTotalBytes` |

---

### 4.5 🟡 Medium: Data Type Issues

#### Inconsistent Number Storage
```typescript
// Files - size can be undefined (Google Docs have no size)
size: { type: Number }  // ⚠️ Can be NaN or undefined

// DriveAccount - defaults to 0
used: { type: Number, default: 0 }
```

**Problem:** Aggregation queries can break:
```typescript
// Will return NaN if any size is undefined
const totalSize = await File.aggregate([
  { $match: { userId } },
  { $group: { _id: null, total: { $sum: "$size" } } }
]);
```

**Fix:**
```typescript
size: { type: Number, default: 0, min: 0 }
```

---

### 4.6 🟡 Medium: Missing Validation

```typescript
// No email format validation
email: { type: String, required: true, unique: true }

// No URL format validation
webViewLink: { type: String }

// No size constraints
name: { type: String, required: true }  // Could be megabytes of text
```

---

### 4.7 🟡 Medium: Redundant Data

```typescript
// DriveAccount stores counts that should be computed
trashedFiles: { type: Number, default: 0 },
totalFiles: { type: Number, default: 0 },
totalFolders: { type: Number, default: 0 },
duplicateFiles: { type: Number, default: 0 },
```

**Problem:** These values can drift out of sync with actual File collection.

**Solution Options:**
1. **Accept denormalization** - Keep for performance, sync via background jobs
2. **Compute on demand** - Remove fields, use aggregation
3. **Hybrid** - Cache with TTL, recompute when stale

---

### 4.8 🟢 Low: Missing Schema Features

#### No Cascade Deletes
```typescript
// When user deleted, orphan records remain:
// - DriveAccounts with deleted userId
// - Files with deleted userId or driveAccountId
// - OAuthStates with deleted userId
```

#### No Virtual Fields
```typescript
// Could add useful computed properties
userSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

driveAccountSchema.virtual('storagePercentUsed').get(function() {
  return this.total > 0 ? (this.used / this.total * 100).toFixed(2) : 0;
});
```

---

### 4.9 Complete Issue Summary

| ID | Severity | Category | Issue | Collection |
|----|----------|----------|-------|------------|
| SEC-001 | 🔴 Critical | Security | Plaintext OAuth tokens | driveaccounts |
| SEC-002 | 🔴 Critical | Security | No encryption at rest | All |
| IDX-001 | 🔴 Critical | Index | Missing TTL index | oauthstates |
| IDX-002 | 🟡 Medium | Index | Missing connectionStatus index | driveaccounts |
| IDX-003 | 🟡 Medium | Index | Missing trashed index | files |
| IDX-004 | 🟡 Medium | Index | Missing mimeType index | files |
| IDX-005 | 🟡 Medium | Index | Missing starred index | files |
| NAM-001 | 🟡 Medium | Naming | Inconsistent field names | Multiple |
| VAL-001 | 🟡 Medium | Validation | No email format validation | users |
| VAL-002 | 🟡 Medium | Validation | No URL validation | files |
| VAL-003 | 🟡 Medium | Validation | No string length limits | Multiple |
| DAT-001 | 🟡 Medium | Data | Number fields can be undefined | files |
| DEN-001 | 🟢 Low | Design | Denormalized counts can drift | driveaccounts |
| REL-001 | 🟢 Low | Relations | No cascade delete hooks | All |

---

## 5. Recommended Improvements

### 5.1 Security Fixes (Priority: IMMEDIATE)

#### 5.1.1 Encrypt OAuth Tokens

**Implementation:**

```typescript
// backend/src/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Updated Schema:**

```typescript
// driveAccount.ts - with encryption hooks
import { encrypt, decrypt } from '../utils/encryption';

const driveAccountSchema = new mongoose.Schema({
  // ... other fields ...
  accessToken: { type: String, required: true, set: encrypt, get: decrypt },
  refreshToken: { type: String, required: true, set: encrypt, get: decrypt },
});

driveAccountSchema.set('toJSON', { getters: true });
driveAccountSchema.set('toObject', { getters: true });
```

---

#### 5.1.2 Add TTL Index for OAuthState

```typescript
// OAuthState.ts
const oauthStateSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  purpose: { type: String, enum: ["ADD_DRIVE"], required: true },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) },
});

// TTL Index - Documents auto-delete after expiry
oauthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

### 5.2 Index Optimizations

#### Complete Index Strategy

```typescript
// ============ USER COLLECTION ============
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { sparse: true }); // Only Google users
userSchema.index({ authType: 1 });
userSchema.index({ createdAt: -1 }); // For admin dashboard

// ============ DRIVEACCOUNT COLLECTION ============
driveAccountSchema.index({ userId: 1 });
driveAccountSchema.index({ userId: 1, connectionStatus: 1 });
driveAccountSchema.index({ googleId: 1, userId: 1 }, { unique: true });
driveAccountSchema.index({ connectionStatus: 1, lastSync: 1 }); // For sync jobs
driveAccountSchema.index({ updatedAt: -1 }); // For recently updated

// ============ FILE COLLECTION ============
fileSchema.index({ userId: 1, modifiedTime: -1 });
fileSchema.index({ userId: 1, driveAccountId: 1 });
fileSchema.index({ userId: 1, trashed: 1 });
fileSchema.index({ userId: 1, starred: 1 });
fileSchema.index({ userId: 1, mimeType: 1 });
fileSchema.index({ userId: 1, shared: 1 });
fileSchema.index({ userId: 1, parents: 1 }); // Folder navigation
fileSchema.index({ googleFileId: 1, driveAccountId: 1 }, { unique: true });
fileSchema.index({ name: 'text', description: 'text' }, { 
  weights: { name: 10, description: 2 },
  name: 'FileTextIndex'
});

// Compound index for duplicate detection
fileSchema.index({ userId: 1, name: 1, size: 1, mimeType: 1 });

// ============ OAUTHSTATE COLLECTION ============
oauthStateSchema.index({ state: 1 }, { unique: true });
oauthStateSchema.index({ userId: 1 });
oauthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

### 5.3 Schema Validation Enhancements

```typescript
// ============ ENHANCED USER SCHEMA ============
const userSchema = new mongoose.Schema({
  googleId: { 
    type: String,
    sparse: true,
    index: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    maxlength: [254, 'Email too long']
  },
  password: { 
    type: String,
    minlength: [60, 'Password hash too short'], // bcrypt produces 60 chars
    maxlength: [60, 'Password hash too long'],
    select: false // Never return password in queries by default
  },
  name: { 
    type: String,
    trim: true,
    maxlength: [100, 'Name too long']
  },
  picture: { 
    type: String,
    match: [/^https?:\/\//, 'Invalid URL format'],
    maxlength: [2048, 'URL too long']
  },
  authType: { 
    type: String, 
    enum: {
      values: ['google', 'email'],
      message: '{VALUE} is not a valid auth type'
    },
    required: [true, 'Auth type is required']
  },
  lastDriveFetchedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});
```

```typescript
// ============ ENHANCED FILE SCHEMA ============
const fileSchema = new mongoose.Schema({
  driveAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DriveAccount",
    required: [true, 'Drive account ID is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, 'User ID is required'],
    index: true
  },
  googleFileId: {
    type: String,
    required: [true, 'Google file ID is required'],
    maxlength: [100, 'File ID too long']
  },
  name: {
    type: String,
    required: [true, 'File name is required'],
    maxlength: [1024, 'File name too long'] // Google limit
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    maxlength: [256, 'MIME type too long']
  },
  size: {
    type: Number,
    default: 0,
    min: [0, 'Size cannot be negative']
  },
  // ... rest of fields with validation
}, {
  timestamps: true
});
```

---

### 5.4 Cascade Delete Implementation

```typescript
// user.ts - Pre-delete middleware
userSchema.pre('deleteOne', { document: true, query: false }, async function() {
  const userId = this._id;
  
  // Delete all user's files
  await mongoose.model('File').deleteMany({ userId });
  
  // Delete all user's drive accounts
  await mongoose.model('DriveAccount').deleteMany({ userId });
  
  // Delete all pending OAuth states
  await mongoose.model('OAuthState').deleteMany({ userId });
});

// For deleteMany operations
userSchema.pre('deleteMany', async function() {
  const users = await this.model.find(this.getFilter()).select('_id');
  const userIds = users.map(u => u._id);
  
  await mongoose.model('File').deleteMany({ userId: { $in: userIds } });
  await mongoose.model('DriveAccount').deleteMany({ userId: { $in: userIds } });
  await mongoose.model('OAuthState').deleteMany({ userId: { $in: userIds } });
});

// driveAccount.ts - Pre-delete middleware
driveAccountSchema.pre('deleteOne', { document: true, query: false }, async function() {
  await mongoose.model('File').deleteMany({ driveAccountId: this._id });
});
```

---

## 6. Future Models Required

### 6.1 Model Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FUTURE DATA MODEL ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: Core SaaS              PHASE 2: Collaboration                    │
│  ┌──────────────┐                ┌──────────────┐  ┌──────────────┐       │
│  │ Subscription │                │    Team      │  │  TeamMember  │       │
│  └──────────────┘                └──────────────┘  └──────────────┘       │
│  ┌──────────────┐                ┌──────────────┐  ┌──────────────┐       │
│  │ ActivityLog  │                │  Invitation  │  │ TeamDrive    │       │
│  └──────────────┘                └──────────────┘  └──────────────┘       │
│                                                                             │
│  PHASE 3: Analytics              PHASE 4: Enterprise                        │
│  ┌──────────────┐                ┌──────────────┐  ┌──────────────┐       │
│  │StorageSnapshot│               │   ApiKey     │  │  AuditLog    │       │
│  └──────────────┘                └──────────────┘  └──────────────┘       │
│  ┌──────────────┐                ┌──────────────┐  ┌──────────────┐       │
│  │ Analytics    │                │    Role      │  │  Permission  │       │
│  └──────────────┘                └──────────────┘  └──────────────┘       │
│                                                                             │
│  PHASE 5: Operations                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   SyncJob    │  │ Notification │  │   Webhook    │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.2 Phase 1: Core SaaS Models

#### 6.2.1 Subscription Model

**Purpose:** Manage user subscriptions, billing cycles, and feature entitlements.

```typescript
// backend/src/models/subscription.ts
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },
  
  // Stripe Integration
  stripeCustomerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  stripeSubscriptionId: {
    type: String,
    sparse: true,
    index: true
  },
  stripePriceId: {
    type: String,
    sparse: true
  },
  
  // Plan Details
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free',
    index: true
  },
  status: {
    type: String,
    enum: [
      'active',
      'trialing', 
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused'
    ],
    default: 'active',
    index: true
  },
  
  // Billing Cycle
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  canceledAt: { type: Date },
  
  // Trial
  trialStart: { type: Date },
  trialEnd: { type: Date },
  
  // Feature Limits
  limits: {
    maxDriveAccounts: { type: Number, default: 2 },
    maxStorageBytes: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB
    maxFilesIndexed: { type: Number, default: 10000 },
    maxApiRequestsPerDay: { type: Number, default: 1000 },
    features: {
      duplicateDetection: { type: Boolean, default: true },
      storageAnalytics: { type: Boolean, default: false },
      bulkOperations: { type: Boolean, default: false },
      advancedSearch: { type: Boolean, default: false },
      teamCollaboration: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false }
    }
  },
  
  // Usage Tracking
  usage: {
    currentDriveAccounts: { type: Number, default: 0 },
    currentStorageBytes: { type: Number, default: 0 },
    currentFilesIndexed: { type: Number, default: 0 },
    apiRequestsToday: { type: Number, default: 0 },
    apiRequestsResetAt: { type: Date }
  },
  
  // Payment History Reference
  lastPaymentAt: { type: Date },
  lastPaymentAmount: { type: Number }, // In cents
  lastPaymentCurrency: { type: String, default: 'usd' },
  
  // Metadata
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 }); // Expiring subscriptions
subscriptionSchema.index({ plan: 1, status: 1 }); // Plan analytics

// Methods
subscriptionSchema.methods.isActive = function(): boolean {
  return ['active', 'trialing'].includes(this.status);
};

subscriptionSchema.methods.canAddDriveAccount = function(): boolean {
  return this.usage.currentDriveAccounts < this.limits.maxDriveAccounts;
};

subscriptionSchema.methods.hasFeature = function(feature: string): boolean {
  return this.limits.features[feature] === true;
};

// Statics
subscriptionSchema.statics.findByStripeCustomer = function(customerId: string) {
  return this.findOne({ stripeCustomerId: customerId });
};

export default mongoose.model("Subscription", subscriptionSchema);
```

**Relationships:**
- One-to-One with User
- Referenced by DriveAccount (for limit enforcement)

---

#### 6.2.2 ActivityLog Model

**Purpose:** Track all user actions for audit, analytics, and debugging.

```typescript
// backend/src/models/activityLog.ts
import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  // Actor
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  // Target (polymorphic)
  targetType: {
    type: String,
    enum: ['User', 'DriveAccount', 'File', 'Subscription', 'Team', 'ApiKey'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Action Details
  action: {
    type: String,
    enum: [
      // Auth
      'user.login',
      'user.logout',
      'user.register',
      'user.password_reset',
      
      // Drive Accounts
      'drive.connect',
      'drive.disconnect',
      'drive.sync_started',
      'drive.sync_completed',
      'drive.sync_failed',
      
      // Files
      'file.view',
      'file.download',
      'file.delete',
      'file.restore',
      'file.move',
      'file.share',
      'file.unshare',
      
      // Duplicates
      'duplicates.scan_started',
      'duplicates.scan_completed',
      'duplicates.delete',
      
      // Subscription
      'subscription.created',
      'subscription.upgraded',
      'subscription.downgraded',
      'subscription.canceled',
      'subscription.renewed',
      
      // Team
      'team.created',
      'team.member_added',
      'team.member_removed',
      'team.member_role_changed',
      
      // API
      'api.key_created',
      'api.key_revoked',
      'api.request'
    ],
    required: true,
    index: true
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Request Context
  ipAddress: { type: String },
  userAgent: { type: String },
  sessionId: { type: String },
  
  // Result
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  errorMessage: { type: String },
  
  // Timing
  durationMs: { type: Number }
}, {
  timestamps: true,
  // Don't allow updates - logs are immutable
  strict: true
});

// Indexes for common queries
activityLogSchema.index({ userId: 1, createdAt: -1 }); // User's recent activity
activityLogSchema.index({ action: 1, createdAt: -1 }); // Activity type timeline
activityLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 }); // Target history
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 day TTL

// Static methods for common queries
activityLogSchema.statics.logActivity = async function(data: {
  userId: mongoose.Types.ObjectId;
  targetType: string;
  targetId: mongoose.Types.ObjectId;
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure' | 'pending';
  errorMessage?: string;
  durationMs?: number;
}) {
  return this.create(data);
};

activityLogSchema.statics.getRecentActivity = function(
  userId: mongoose.Types.ObjectId, 
  limit = 50
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export default mongoose.model("ActivityLog", activityLogSchema);
```

**Relationships:**
- Many-to-One with User
- Polymorphic reference to any target entity

---

### 6.3 Phase 2: Team Collaboration Models

#### 6.3.1 Team Model

```typescript
// backend/src/models/team.ts
import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name too long']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens']
  },
  description: {
    type: String,
    maxlength: [500, 'Description too long']
  },
  
  // Owner (creator)
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  // Settings
  settings: {
    allowMemberInvites: { type: Boolean, default: false },
    defaultMemberRole: { 
      type: String, 
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    requireApprovalForSharing: { type: Boolean, default: false }
  },
  
  // Branding (Enterprise)
  branding: {
    logoUrl: { type: String },
    primaryColor: { type: String, match: /^#[0-9A-Fa-f]{6}$/ },
    customDomain: { type: String }
  },
  
  // Subscription link
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription"
  },
  
  // Stats (denormalized for performance)
  stats: {
    memberCount: { type: Number, default: 1 },
    driveAccountCount: { type: Number, default: 0 },
    totalStorageBytes: { type: Number, default: 0 }
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes
teamSchema.index({ slug: 1 }, { unique: true });
teamSchema.index({ ownerId: 1 });
teamSchema.index({ 'stats.memberCount': -1 }); // Largest teams

// Generate slug from name
teamSchema.pre('validate', function(next) {
  if (this.isNew && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

export default mongoose.model("Team", teamSchema);
```

---

#### 6.3.2 TeamMember Model

```typescript
// backend/src/models/teamMember.ts
import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  role: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer'],
    default: 'viewer',
    index: true
  },
  
  // Permissions override (null = use role defaults)
  permissions: {
    canInviteMembers: { type: Boolean },
    canRemoveMembers: { type: Boolean },
    canManageDrives: { type: Boolean },
    canViewAllFiles: { type: Boolean },
    canDeleteFiles: { type: Boolean },
    canExportData: { type: Boolean }
  },
  
  // Invitation tracking
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  invitedAt: { type: Date },
  joinedAt: { type: Date, default: Date.now },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active'
  },
  
  // Last activity
  lastActiveAt: { type: Date }
}, {
  timestamps: true
});

// Compound unique index - user can only be in team once
teamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

// Methods
teamMemberSchema.methods.hasPermission = function(permission: string): boolean {
  // Check explicit permission override first
  if (this.permissions && this.permissions[permission] !== undefined) {
    return this.permissions[permission];
  }
  
  // Fall back to role-based permissions
  const rolePermissions = {
    owner: ['canInviteMembers', 'canRemoveMembers', 'canManageDrives', 'canViewAllFiles', 'canDeleteFiles', 'canExportData'],
    admin: ['canInviteMembers', 'canRemoveMembers', 'canManageDrives', 'canViewAllFiles', 'canDeleteFiles'],
    editor: ['canViewAllFiles', 'canDeleteFiles'],
    viewer: ['canViewAllFiles']
  };
  
  return rolePermissions[this.role]?.includes(permission) ?? false;
};

export default mongoose.model("TeamMember", teamMemberSchema);
```

---

#### 6.3.3 Invitation Model

```typescript
// backend/src/models/invitation.ts
import mongoose from "mongoose";
import crypto from "crypto";

const invitationSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
    index: true
  },
  
  // Inviter
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // Invitee (email if not registered)
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    sparse: true
  },
  
  // Invitation details
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    default: 'viewer'
  },
  message: {
    type: String,
    maxlength: 500
  },
  
  // Token for invitation link
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'revoked'],
    default: 'pending',
    index: true
  },
  
  // Timestamps
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: true
  },
  respondedAt: { type: Date }
}, {
  timestamps: true
});

// TTL index for cleanup
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for duplicate prevention
invitationSchema.index(
  { teamId: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

// Generate token before save
invitationSchema.pre('validate', function(next) {
  if (this.isNew && !this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
  next();
});

export default mongoose.model("Invitation", invitationSchema);
```

---

### 6.4 Phase 3: Analytics Models

#### 6.4.1 StorageSnapshot Model

**Purpose:** Track storage usage over time for analytics and trend visualization.

```typescript
// backend/src/models/storageSnapshot.ts
import mongoose from "mongoose";

const storageSnapshotSchema = new mongoose.Schema({
  // Scope
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  driveAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DriveAccount",
    index: true
  },
  
  // Snapshot type
  granularity: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true,
    index: true
  },
  
  // Time bucket
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  
  // Storage metrics
  metrics: {
    totalBytes: { type: Number, required: true },
    usedBytes: { type: Number, required: true },
    availableBytes: { type: Number, required: true },
    utilizationPercent: { type: Number, required: true },
    
    // File counts
    totalFiles: { type: Number, default: 0 },
    totalFolders: { type: Number, default: 0 },
    trashedFiles: { type: Number, default: 0 },
    sharedFiles: { type: Number, default: 0 },
    starredFiles: { type: Number, default: 0 },
    
    // Duplicates
    duplicateCount: { type: Number, default: 0 },
    duplicateBytes: { type: Number, default: 0 },
    
    // By type breakdown
    byMimeType: [{
      mimeType: { type: String },
      count: { type: Number },
      bytes: { type: Number }
    }],
    
    // Large files
    largestFiles: [{
      fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
      name: { type: String },
      size: { type: Number },
      mimeType: { type: String }
    }]
  },
  
  // Delta from previous snapshot
  delta: {
    bytesChange: { type: Number, default: 0 },
    filesAdded: { type: Number, default: 0 },
    filesRemoved: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for time-series queries
storageSnapshotSchema.index({ userId: 1, granularity: 1, timestamp: -1 });
storageSnapshotSchema.index({ userId: 1, driveAccountId: 1, granularity: 1, timestamp: -1 });

// TTL indexes for data retention
// Keep hourly for 7 days
storageSnapshotSchema.index(
  { timestamp: 1 },
  { 
    expireAfterSeconds: 7 * 24 * 60 * 60,
    partialFilterExpression: { granularity: 'hourly' }
  }
);
// Keep daily for 90 days
storageSnapshotSchema.index(
  { timestamp: 1 },
  { 
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { granularity: 'daily' }
  }
);

export default mongoose.model("StorageSnapshot", storageSnapshotSchema);
```

---

#### 6.4.2 Analytics Model

**Purpose:** Store aggregated analytics for dashboard and reporting.

```typescript
// backend/src/models/analytics.ts
import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema({
  // Scope
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  // Time period
  period: {
    type: String,
    enum: ['day', 'week', 'month', 'year'],
    required: true
  },
  periodStart: {
    type: Date,
    required: true,
    index: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  
  // Usage Metrics
  usage: {
    // API usage
    apiRequests: { type: Number, default: 0 },
    apiErrors: { type: Number, default: 0 },
    
    // Sync operations
    syncOperations: { type: Number, default: 0 },
    filesScanned: { type: Number, default: 0 },
    
    // File operations
    filesViewed: { type: Number, default: 0 },
    filesDownloaded: { type: Number, default: 0 },
    filesDeleted: { type: Number, default: 0 },
    filesMoved: { type: Number, default: 0 },
    
    // Duplicate operations
    duplicateScans: { type: Number, default: 0 },
    duplicatesFound: { type: Number, default: 0 },
    duplicatesRemoved: { type: Number, default: 0 },
    spaceRecovered: { type: Number, default: 0 } // bytes
  },
  
  // Engagement Metrics
  engagement: {
    sessionsCount: { type: Number, default: 0 },
    totalSessionDuration: { type: Number, default: 0 }, // seconds
    averageSessionDuration: { type: Number, default: 0 },
    pagesViewed: { type: Number, default: 0 },
    uniqueDays: { type: Number, default: 0 }
  },
  
  // Feature Usage
  features: {
    dashboardViews: { type: Number, default: 0 },
    driveExplorerViews: { type: Number, default: 0 },
    duplicateToolViews: { type: Number, default: 0 },
    analyticsViews: { type: Number, default: 0 },
    settingsViews: { type: Number, default: 0 },
    searchQueries: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound unique index - one record per user per period
analyticsSchema.index(
  { userId: 1, period: 1, periodStart: 1 },
  { unique: true }
);

// Helper to get or create analytics record
analyticsSchema.statics.getOrCreate = async function(
  userId: mongoose.Types.ObjectId,
  period: 'day' | 'week' | 'month' | 'year',
  date: Date = new Date()
) {
  const periodStart = getPeriodStart(period, date);
  const periodEnd = getPeriodEnd(period, date);
  
  return this.findOneAndUpdate(
    { userId, period, periodStart },
    { 
      $setOnInsert: { 
        periodEnd,
        usage: {},
        engagement: {},
        features: {}
      }
    },
    { upsert: true, new: true }
  );
};

function getPeriodStart(period: string, date: Date): Date {
  const d = new Date(date);
  switch (period) {
    case 'day':
      d.setHours(0, 0, 0, 0);
      break;
    case 'week':
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      break;
    case 'month':
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case 'year':
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
  }
  return d;
}

function getPeriodEnd(period: string, date: Date): Date {
  const d = getPeriodStart(period, date);
  switch (period) {
    case 'day':
      d.setDate(d.getDate() + 1);
      break;
    case 'week':
      d.setDate(d.getDate() + 7);
      break;
    case 'month':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'year':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  d.setMilliseconds(d.getMilliseconds() - 1);
  return d;
}

export default mongoose.model("Analytics", analyticsSchema);
```

---

### 6.5 Phase 4: Enterprise Models

#### 6.5.1 ApiKey Model

```typescript
// backend/src/models/apiKey.ts
import mongoose from "mongoose";
import crypto from "crypto";

const apiKeySchema = new mongoose.Schema({
  // Owner
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    sparse: true,
    index: true
  },
  
  // Key identification
  name: {
    type: String,
    required: [true, 'API key name is required'],
    trim: true,
    maxlength: [100, 'Name too long']
  },
  description: {
    type: String,
    maxlength: [500, 'Description too long']
  },
  
  // The actual key (only prefix stored, hash for verification)
  keyPrefix: {
    type: String,
    required: true,
    index: true
  },
  keyHash: {
    type: String,
    required: true
  },
  
  // Permissions
  scopes: [{
    type: String,
    enum: [
      'read:drives',
      'write:drives',
      'read:files',
      'write:files',
      'delete:files',
      'read:analytics',
      'read:user',
      'write:user'
    ]
  }],
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerDay: { type: Number, default: 10000 }
  },
  
  // IP restrictions
  allowedIps: [{
    type: String,
    match: [/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/, 'Invalid IP or CIDR']
  }],
  
  // Usage tracking
  usage: {
    requestCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    lastUsedIp: { type: String }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active',
    index: true
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    index: true
  },
  revokedAt: { type: Date },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  revokeReason: { type: String }
}, {
  timestamps: true
});

// Indexes
apiKeySchema.index({ keyPrefix: 1 }, { unique: true });
apiKeySchema.index({ userId: 1, status: 1 });
apiKeySchema.index({ status: 1, expiresAt: 1 });

// Static method to generate new key
apiKeySchema.statics.generateKey = async function(data: {
  userId: mongoose.Types.ObjectId;
  name: string;
  scopes: string[];
  expiresAt?: Date;
}) {
  // Generate a random API key
  const key = `dsk_${crypto.randomBytes(32).toString('hex')}`;
  const keyPrefix = key.substring(0, 12); // dsk_XXXXXXXX
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  
  const apiKey = await this.create({
    ...data,
    keyPrefix,
    keyHash
  });
  
  // Return full key only once (on creation)
  return {
    apiKey,
    secretKey: key // This is the only time the full key is available
  };
};

// Static method to verify key
apiKeySchema.statics.verifyKey = async function(key: string) {
  const keyPrefix = key.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  
  const apiKey = await this.findOne({
    keyPrefix,
    keyHash,
    status: 'active'
  });
  
  if (!apiKey) return null;
  
  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    apiKey.status = 'expired';
    await apiKey.save();
    return null;
  }
  
  // Update usage
  apiKey.usage.requestCount++;
  apiKey.usage.lastUsedAt = new Date();
  await apiKey.save();
  
  return apiKey;
};

export default mongoose.model("ApiKey", apiKeySchema);
```

---

#### 6.5.2 AuditLog Model

**Purpose:** Immutable compliance-grade audit trail for enterprise.

```typescript
// backend/src/models/auditLog.ts
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  // Actor identification
  actorType: {
    type: String,
    enum: ['user', 'system', 'api', 'admin'],
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  actorEmail: { type: String },
  actorIp: { type: String },
  actorUserAgent: { type: String },
  apiKeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ApiKey"
  },
  
  // Organization context
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team"
  },
  
  // Event details
  eventType: {
    type: String,
    required: true,
    index: true
  },
  eventCategory: {
    type: String,
    enum: [
      'authentication',
      'authorization', 
      'data_access',
      'data_modification',
      'data_deletion',
      'configuration',
      'security',
      'billing',
      'integration'
    ],
    required: true,
    index: true
  },
  
  // Resource affected
  resourceType: {
    type: String,
    required: true
  },
  resourceId: { type: String },
  resourceName: { type: String },
  
  // Change details
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'export', 'import', 'share', 'unshare'],
    required: true
  },
  previousState: { type: mongoose.Schema.Types.Mixed },
  newState: { type: mongoose.Schema.Types.Mixed },
  changedFields: [{ type: String }],
  
  // Result
  outcome: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    required: true
  },
  errorCode: { type: String },
  errorMessage: { type: String },
  
  // Request context
  requestId: { type: String, index: true },
  sessionId: { type: String },
  correlationId: { type: String, index: true },
  
  // Compliance metadata
  dataClassification: {
    type: String,
    enum: ['public', 'internal', 'confidential', 'restricted'],
    default: 'internal'
  },
  complianceFlags: [{
    type: String,
    enum: ['gdpr', 'hipaa', 'sox', 'pci']
  }],
  
  // Timestamp (explicitly indexed for time-range queries)
  eventTimestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
}, {
  timestamps: false, // Use eventTimestamp instead
  strict: true,
  // Make collection append-only (no updates/deletes at app level)
  collection: 'auditlogs'
});

// Compound indexes for common audit queries
auditLogSchema.index({ actorId: 1, eventTimestamp: -1 });
auditLogSchema.index({ teamId: 1, eventTimestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, eventTimestamp: -1 });
auditLogSchema.index({ eventCategory: 1, eventType: 1, eventTimestamp: -1 });
auditLogSchema.index({ outcome: 1, eventTimestamp: -1 });

// Prevent modifications after creation
auditLogSchema.pre('updateOne', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

auditLogSchema.pre('updateMany', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

auditLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

// DO NOT add TTL index - audit logs must be retained per compliance requirements

export default mongoose.model("AuditLog", auditLogSchema);
```

---

#### 6.5.3 Role and Permission Models

```typescript
// backend/src/models/role.ts
import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  // Role identification
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  displayName: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  
  // Scope
  scope: {
    type: String,
    enum: ['system', 'team'],
    default: 'team'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    sparse: true
  },
  
  // Permissions
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Permission"
  }],
  
  // Hierarchy
  parentRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role"
  },
  
  // Metadata
  isSystem: { type: Boolean, default: false }, // Cannot be modified
  isDefault: { type: Boolean, default: false }, // Assigned to new users
  color: { type: String, match: /^#[0-9A-Fa-f]{6}$/ },
  icon: { type: String }
}, {
  timestamps: true
});

roleSchema.index({ name: 1 }, { unique: true });
roleSchema.index({ teamId: 1, isDefault: 1 });

export default mongoose.model("Role", roleSchema);
```

```typescript
// backend/src/models/permission.ts
import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema({
  // Permission identification
  name: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-z]+:[a-z_]+$/  // e.g., "files:read", "drives:delete"
  },
  displayName: {
    type: String,
    required: true
  },
  description: { type: String },
  
  // Categorization
  category: {
    type: String,
    enum: ['drives', 'files', 'team', 'billing', 'settings', 'analytics', 'admin'],
    required: true,
    index: true
  },
  
  // Permission type
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'manage', 'export'],
    required: true
  },
  
  // Dependencies (requires these permissions to be meaningful)
  requires: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Permission"
  }],
  
  // Conflicts (mutually exclusive permissions)
  conflictsWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Permission"
  }]
}, {
  timestamps: true
});

export default mongoose.model("Permission", permissionSchema);
```

---

### 6.6 Phase 5: Operations Models

#### 6.6.1 SyncJob Model

```typescript
// backend/src/models/syncJob.ts
import mongoose from "mongoose";

const syncJobSchema = new mongoose.Schema({
  // Ownership
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  driveAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DriveAccount",
    required: true,
    index: true
  },
  
  // Job type
  type: {
    type: String,
    enum: [
      'full_sync',           // Complete drive sync
      'incremental_sync',    // Changes since last sync
      'duplicate_scan',      // Duplicate detection
      'storage_analysis',    // Storage breakdown
      'cleanup'              // Delete trashed/old files
    ],
    required: true
  },
  
  // Scheduling
  triggerType: {
    type: String,
    enum: ['manual', 'scheduled', 'webhook', 'system'],
    required: true
  },
  scheduledAt: { type: Date },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'],
    default: 'pending',
    index: true
  },
  
  // Progress
  progress: {
    currentStep: { type: String },
    stepsCompleted: { type: Number, default: 0 },
    totalSteps: { type: Number },
    percentComplete: { type: Number, default: 0 },
    itemsProcessed: { type: Number, default: 0 },
    totalItems: { type: Number },
    bytesProcessed: { type: Number, default: 0 }
  },
  
  // Timing
  startedAt: { type: Date },
  completedAt: { type: Date },
  estimatedCompletion: { type: Date },
  timeoutAt: { type: Date },
  
  // Results
  result: {
    filesAdded: { type: Number, default: 0 },
    filesUpdated: { type: Number, default: 0 },
    filesRemoved: { type: Number, default: 0 },
    duplicatesFound: { type: Number, default: 0 },
    errorsCount: { type: Number, default: 0 },
    warnings: [{ type: String }]
  },
  
  // Error handling
  error: {
    code: { type: String },
    message: { type: String },
    stack: { type: String },
    retryable: { type: Boolean }
  },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  
  // Pagination state (for resumable syncs)
  cursor: {
    pageToken: { type: String },
    lastFileId: { type: String }
  },
  
  // Worker info
  workerId: { type: String },
  workerHost: { type: String }
}, {
  timestamps: true
});

// Indexes
syncJobSchema.index({ status: 1, scheduledAt: 1 }); // Job queue
syncJobSchema.index({ driveAccountId: 1, status: 1, createdAt: -1 }); // Drive's jobs
syncJobSchema.index({ workerId: 1, status: 1 }); // Worker's jobs
syncJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 day retention

// Methods
syncJobSchema.methods.markStarted = function(workerId: string, workerHost: string) {
  this.status = 'running';
  this.startedAt = new Date();
  this.workerId = workerId;
  this.workerHost = workerHost;
  this.timeoutAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min timeout
  return this.save();
};

syncJobSchema.methods.updateProgress = function(progress: Partial<typeof this.progress>) {
  Object.assign(this.progress, progress);
  return this.save();
};

syncJobSchema.methods.complete = function(result: typeof this.result) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.result = result;
  this.progress.percentComplete = 100;
  return this.save();
};

syncJobSchema.methods.fail = function(error: { code: string; message: string; retryable?: boolean }) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.error = error;
  return this.save();
};

export default mongoose.model("SyncJob", syncJobSchema);
```

---

#### 6.6.2 Notification Model

```typescript
// backend/src/models/notification.ts
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  // Recipient
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      // Storage
      'storage_warning',      // 80% used
      'storage_critical',     // 95% used
      'storage_full',         // 100% used
      
      // Sync
      'sync_completed',
      'sync_failed',
      
      // Duplicates
      'duplicates_found',
      
      // Account
      'drive_disconnected',
      'drive_error',
      'token_expiring',
      
      // Team
      'team_invitation',
      'team_member_joined',
      'team_member_left',
      
      // Billing
      'payment_failed',
      'subscription_expiring',
      'plan_upgraded',
      'plan_downgraded',
      
      // Security
      'new_device_login',
      'password_changed',
      'api_key_created',
      
      // System
      'maintenance_scheduled',
      'new_feature'
    ],
    required: true,
    index: true
  },
  
  // Content
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // Rich content
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  actionUrl: { type: String },
  actionLabel: { type: String },
  imageUrl: { type: String },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Status
  status: {
    type: String,
    enum: ['unread', 'read', 'archived', 'dismissed'],
    default: 'unread',
    index: true
  },
  
  // Delivery
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'slack', 'webhook']
  }],
  deliveryStatus: {
    email: { sent: Boolean, sentAt: Date, error: String },
    push: { sent: Boolean, sentAt: Date, error: String },
    slack: { sent: Boolean, sentAt: Date, error: String },
    webhook: { sent: Boolean, sentAt: Date, error: String }
  },
  
  // Interaction
  readAt: { type: Date },
  clickedAt: { type: Date },
  dismissedAt: { type: Date },
  
  // Grouping
  groupKey: { type: String, index: true }, // For collapsing similar notifications
  batchId: { type: String } // For bulk sends
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, status: 1, createdAt: -1 }); // User's notifications
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 }); // By type
notificationSchema.index({ groupKey: 1, createdAt: -1 }); // Grouped
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 day TTL

// Static: Create notification
notificationSchema.statics.notify = async function(data: {
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  priority?: string;
  channels?: string[];
}) {
  const notification = await this.create({
    ...data,
    channels: data.channels || ['in_app']
  });
  
  // TODO: Trigger delivery to other channels
  
  return notification;
};

// Static: Get unread count
notificationSchema.statics.getUnreadCount = function(userId: mongoose.Types.ObjectId) {
  return this.countDocuments({ userId, status: 'unread' });
};

// Static: Mark all read
notificationSchema.statics.markAllRead = function(userId: mongoose.Types.ObjectId) {
  return this.updateMany(
    { userId, status: 'unread' },
    { $set: { status: 'read', readAt: new Date() } }
  );
};

export default mongoose.model("Notification", notificationSchema);
```

---

#### 6.6.3 Webhook Model

```typescript
// backend/src/models/webhook.ts
import mongoose from "mongoose";
import crypto from "crypto";

const webhookSchema = new mongoose.Schema({
  // Owner
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    sparse: true
  },
  
  // Configuration
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: { type: String, maxlength: 500 },
  url: {
    type: String,
    required: true,
    match: [/^https:\/\//, 'Webhook URL must use HTTPS']
  },
  
  // Security
  secret: {
    type: String,
    required: true
  },
  
  // Events to subscribe to
  events: [{
    type: String,
    enum: [
      'sync.completed',
      'sync.failed',
      'file.created',
      'file.updated',
      'file.deleted',
      'drive.connected',
      'drive.disconnected',
      'drive.error',
      'duplicates.found',
      'storage.warning',
      'subscription.changed'
    ]
  }],
  
  // Filters
  filters: {
    driveAccountIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "DriveAccount"
    }],
    mimeTypes: [{ type: String }]
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'disabled'],
    default: 'active',
    index: true
  },
  
  // Health
  health: {
    consecutiveFailures: { type: Number, default: 0 },
    lastSuccessAt: { type: Date },
    lastFailureAt: { type: Date },
    lastError: { type: String }
  },
  
  // Stats
  stats: {
    totalDeliveries: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 }
  },
  
  // Advanced options
  options: {
    retryCount: { type: Number, default: 3 },
    timeout: { type: Number, default: 10000 }, // ms
    headers: { type: Map, of: String }
  }
}, {
  timestamps: true
});

// Generate secret on creation
webhookSchema.pre('validate', function(next) {
  if (this.isNew && !this.secret) {
    this.secret = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Method to sign payload
webhookSchema.methods.signPayload = function(payload: any): string {
  const timestamp = Date.now();
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', this.secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
};

export default mongoose.model("Webhook", webhookSchema);
```

---

## 7. Scalability Strategy

### 7.1 Current Architecture Assessment

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT: SINGLE INSTANCE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────┐         ┌─────────────┐                          │
│   │ Express │ ──────▶ │   MongoDB   │                          │
│   │ Server  │         │  (Single)   │                          │
│   └─────────┘         └─────────────┘                          │
│                                                                 │
│   ⚠️ Single point of failure                                    │
│   ⚠️ No horizontal scaling                                      │
│   ⚠️ No read replicas                                           │
│   ⚠️ No backup strategy                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TARGET: PRODUCTION-GRADE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │ Load        │                                                           │
│   │ Balancer    │                                                           │
│   └──────┬──────┘                                                           │
│          │                                                                   │
│   ┌──────┴──────┬──────────────┐                                            │
│   ▼             ▼              ▼                                            │
│ ┌─────┐     ┌─────┐        ┌─────┐                                         │
│ │App 1│     │App 2│   ...  │App N│  (Stateless API servers)                │
│ └──┬──┘     └──┬──┘        └──┬──┘                                         │
│    │           │              │                                             │
│    └───────────┼──────────────┘                                             │
│                │                                                             │
│         ┌──────┴──────┐                                                     │
│         ▼             ▼                                                     │
│   ┌──────────┐  ┌──────────┐                                               │
│   │  Redis   │  │  Redis   │  (Session + Cache cluster)                    │
│   │ Primary  │  │ Replica  │                                               │
│   └──────────┘  └──────────┘                                               │
│         │                                                                   │
│         ▼                                                                   │
│   ┌─────────────────────────────────────────────────────────┐              │
│   │                  MongoDB Replica Set                     │              │
│   │  ┌─────────┐    ┌─────────┐    ┌─────────┐             │              │
│   │  │ Primary │    │Secondary│    │Secondary│              │              │
│   │  │ (Write) │───▶│ (Read)  │───▶│ (Read)  │              │              │
│   │  └─────────┘    └─────────┘    └─────────┘             │              │
│   └─────────────────────────────────────────────────────────┘              │
│         │                                                                   │
│   ┌─────┴─────┐                                                            │
│   │  Arbiter  │  (Voting member for automatic failover)                    │
│   └───────────┘                                                            │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────┐              │
│   │                Background Job Queue                      │              │
│   │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐        │              │
│   │  │ Worker │  │ Worker │  │ Worker │  │ Worker │         │              │
│   │  │ Sync   │  │Analytics│  │Cleanup │  │ Email  │         │              │
│   │  └────────┘  └────────┘  └────────┘  └────────┘        │              │
│   └─────────────────────────────────────────────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 7.3 Sharding Strategy

#### When to Shard

| Collection | Shard When | Shard Key |
|------------|-----------|-----------|
| `files` | >100M documents | `{ userId: 1, googleFileId: 1 }` |
| `activitylogs` | >50M documents | `{ userId: 1, createdAt: 1 }` |
| `storagessnapshots` | >10M documents | `{ userId: 1, timestamp: 1 }` |
| `auditlogs` | >50M documents | `{ eventTimestamp: 1 }` |

#### Shard Key Selection Rationale

**Files Collection:**
```javascript
// Shard key: { userId: 1, googleFileId: 1 }

// ✅ Good: Queries always include userId (tenant isolation)
db.files.find({ userId: ObjectId("..."), trashed: true })  // Targeted

// ✅ Good: High cardinality prevents hot spots
// Each user has unique userId, files have unique googleFileId

// ⚠️ Trade-off: Cross-user queries require scatter-gather
db.files.aggregate([{ $group: { _id: "$mimeType", count: { $sum: 1 } } }])
// This is acceptable as admin queries are rare
```

#### Pre-Sharding Configuration

```javascript
// Enable sharding on database
sh.enableSharding("drivesync")

// Shard files collection
sh.shardCollection("drivesync.files", { userId: 1, googleFileId: 1 })

// Pre-split chunks for even distribution (do before bulk loads)
for (let i = 0; i < 16; i++) {
  const splitPoint = ObjectId.createFromHexString(
    i.toString(16).padStart(24, '0')
  );
  sh.splitAt("drivesync.files", { userId: splitPoint });
}
```

---

### 7.4 Replica Set Configuration

#### Production Replica Set

```javascript
// rs.conf() for production
{
  _id: "drivesync-rs",
  version: 1,
  members: [
    {
      _id: 0,
      host: "mongo-primary:27017",
      priority: 10,  // Preferred primary
      votes: 1
    },
    {
      _id: 1,
      host: "mongo-secondary-1:27017",
      priority: 5,
      votes: 1,
      tags: { dc: "us-east-1a", role: "analytics" }
    },
    {
      _id: 2,
      host: "mongo-secondary-2:27017",
      priority: 5,
      votes: 1,
      tags: { dc: "us-east-1b", role: "backup" }
    },
    {
      _id: 3,
      host: "mongo-arbiter:27017",
      arbiterOnly: true,
      votes: 1
    }
  ],
  settings: {
    electionTimeoutMillis: 10000,
    heartbeatTimeoutSecs: 10
  }
}
```

#### Read Preference Configuration

```typescript
// backend/src/config/database.ts
import mongoose from "mongoose";

const mongoOptions: mongoose.ConnectOptions = {
  // Use replica set
  replicaSet: 'drivesync-rs',
  
  // Read preference based on operation type
  readPreference: 'secondaryPreferred',
  
  // Write concern for durability
  w: 'majority',
  wtimeoutMS: 5000,
  
  // Read concern for consistency
  readConcern: { level: 'majority' },
  
  // Connection pooling
  maxPoolSize: 100,
  minPoolSize: 10,
  
  // Timeouts
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  
  // Retry logic
  retryWrites: true,
  retryReads: true
};

// For analytics queries (can use stale data)
export const analyticsConnection = mongoose.createConnection(
  process.env.MONGODB_URI!,
  {
    ...mongoOptions,
    readPreference: 'secondary',
    maxStalenessSeconds: 120
  }
);
```

---

### 7.5 Backup Strategy

#### Backup Schedule

| Backup Type | Frequency | Retention | Method |
|-------------|-----------|-----------|--------|
| **Continuous** | Real-time | 24 hours | MongoDB Atlas continuous backup |
| **Snapshot** | Every 6 hours | 7 days | mongodump + compression |
| **Daily** | 00:00 UTC | 30 days | Full backup to S3 |
| **Weekly** | Sunday 00:00 | 90 days | Full backup to S3 + Glacier |
| **Monthly** | 1st of month | 1 year | Full backup to Glacier |

#### Automated Backup Script

```bash
#!/bin/bash
# backup-mongodb.sh

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
S3_BUCKET="drivesync-backups"
MONGO_URI="${MONGODB_URI}"

# Create backup
mongodump \
  --uri="$MONGO_URI" \
  --out="$BACKUP_DIR/$TIMESTAMP" \
  --gzip \
  --oplog

# Upload to S3
aws s3 sync \
  "$BACKUP_DIR/$TIMESTAMP" \
  "s3://$S3_BUCKET/mongodb/$TIMESTAMP/" \
  --storage-class STANDARD_IA

# Cleanup local backups older than 7 days
find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} +

# Verify backup integrity
mongorestore \
  --uri="$MONGO_URI" \
  --dir="$BACKUP_DIR/$TIMESTAMP" \
  --dryRun \
  --gzip

echo "Backup completed: $TIMESTAMP"
```

#### Point-in-Time Recovery

```javascript
// Using MongoDB Atlas or Ops Manager for PITR
// Recovery procedure:
// 1. Identify the recovery point (before corruption/deletion)
// 2. Create a new cluster from snapshot
// 3. Apply oplog entries up to recovery point
// 4. Verify data integrity
// 5. Switch application to restored cluster
```

---

### 7.6 High Availability Configuration

#### MongoDB Atlas Recommended Settings

```yaml
# atlas-cluster.yaml (Infrastructure as Code)
cluster:
  name: drivesync-prod
  clusterType: REPLICASET
  replicationSpecs:
    - numShards: 1
      regionsConfig:
        US_EAST_1:
          analyticsNodes: 1
          electableNodes: 3
          priority: 7
          readOnlyNodes: 0
        US_WEST_2:
          analyticsNodes: 0
          electableNodes: 2
          priority: 6
          readOnlyNodes: 1
          
  providerSettings:
    providerName: AWS
    instanceSizeName: M30  # Production tier
    diskIOPS: 3000
    
  autoScaling:
    compute:
      enabled: true
      scaleDownEnabled: true
      minInstanceSize: M30
      maxInstanceSize: M60
    diskGB:
      enabled: true
      
  backupEnabled: true
  pitEnabled: true
  
  advancedConfiguration:
    javascriptEnabled: false  # Security
    minimumEnabledTlsProtocol: TLS1_2
    noTableScan: false
    oplogSizeMB: 2048
```

#### Connection String for HA

```
mongodb+srv://admin:<password>@drivesync-prod.xxxxx.mongodb.net/drivesync?retryWrites=true&w=majority&readPreference=secondaryPreferred&maxPoolSize=100
```

---

### 7.7 Performance Optimization

#### Index Monitoring

```javascript
// Find unused indexes
db.collection.aggregate([
  { $indexStats: {} },
  { $match: { "accesses.ops": { $eq: 0 } } }
]);

// Find slow queries
db.setProfilingLevel(1, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

#### Query Optimization Checklist

```javascript
// Explain query execution
db.files.find({ userId: ObjectId("..."), trashed: true })
  .explain("executionStats");

// Check for:
// ✅ IXSCAN (not COLLSCAN)
// ✅ nReturned ≈ totalDocsExamined
// ✅ executionTimeMillis < 100ms
// ✅ No in-memory sorts on large datasets
```

#### Memory Configuration

```yaml
# mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8  # 50% of RAM for dedicated servers
      
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
```

---

## 8. Implementation Roadmap

### 8.1 Phase Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE EVOLUTION ROADMAP                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WEEK 1-2: Security Hardening                                               │
│  ├─ Encrypt OAuth tokens at rest                                            │
│  ├─ Add TTL index to OAuthState                                             │
│  ├─ Add missing validation rules                                            │
│  └─ Implement cascade deletes                                               │
│                                                                             │
│  WEEK 3-4: Index Optimization                                               │
│  ├─ Add all missing indexes                                                 │
│  ├─ Remove duplicate/unused indexes                                         │
│  ├─ Configure index build in background                                     │
│  └─ Monitor query performance                                               │
│                                                                             │
│  WEEK 5-8: Core SaaS Models                                                 │
│  ├─ Implement Subscription model                                            │
│  ├─ Implement ActivityLog model                                             │
│  ├─ Integrate with Stripe                                                   │
│  └─ Add usage tracking                                                      │
│                                                                             │
│  WEEK 9-12: Analytics & Operations                                          │
│  ├─ Implement StorageSnapshot model                                         │
│  ├─ Implement SyncJob model                                                 │
│  ├─ Implement Notification model                                            │
│  └─ Build analytics aggregation pipeline                                    │
│                                                                             │
│  WEEK 13-16: Team Collaboration                                             │
│  ├─ Implement Team model                                                    │
│  ├─ Implement TeamMember model                                              │
│  ├─ Implement Invitation model                                              │
│  └─ Add team-based queries                                                  │
│                                                                             │
│  WEEK 17-20: Enterprise Features                                            │
│  ├─ Implement ApiKey model                                                  │
│  ├─ Implement AuditLog model                                                │
│  ├─ Implement Role/Permission models                                        │
│  └─ Add compliance reporting                                                │
│                                                                             │
│  WEEK 21-24: Scalability                                                    │
│  ├─ Set up replica set                                                      │
│  ├─ Implement backup automation                                             │
│  ├─ Configure monitoring & alerts                                           │
│  └─ Plan sharding strategy                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 8.2 Migration Scripts

#### Example: Encrypt Existing Tokens

```typescript
// migrations/20250101_encrypt_tokens.ts
import mongoose from "mongoose";
import { encrypt } from "../src/utils/encryption";

export async function up() {
  const DriveAccount = mongoose.model("DriveAccount");
  
  const cursor = DriveAccount.find({
    accessToken: { $not: /^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/ } // Not encrypted
  }).cursor();
  
  let count = 0;
  for await (const doc of cursor) {
    doc.accessToken = encrypt(doc.accessToken);
    doc.refreshToken = encrypt(doc.refreshToken);
    await doc.save();
    count++;
    
    if (count % 100 === 0) {
      console.log(`Encrypted ${count} accounts...`);
    }
  }
  
  console.log(`Migration complete. Encrypted ${count} accounts.`);
}

export async function down() {
  // Cannot decrypt without storing original values
  throw new Error("This migration is not reversible");
}
```

#### Example: Add TTL Index

```typescript
// migrations/20250102_add_oauth_ttl.ts
import mongoose from "mongoose";

export async function up() {
  const db = mongoose.connection.db;
  
  await db.collection("oauthstates").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  );
  
  console.log("TTL index added to oauthstates collection");
}

export async function down() {
  const db = mongoose.connection.db;
  await db.collection("oauthstates").dropIndex("expiresAt_1");
}
```

---

## 9. Appendix: Optimized Schemas

### 9.1 Complete Optimized User Schema

```typescript
// backend/src/models/user.ts (OPTIMIZED)
import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  googleId?: string;
  email: string;
  password?: string;
  name?: string;
  picture?: string;
  authType: 'google' | 'email';
  lastDriveFetchedAt?: Date;
  isActive: boolean;
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  displayName: string;
}

const userSchema = new Schema<IUser>({
  googleId: { 
    type: String,
    sparse: true,
    index: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    maxlength: [254, 'Email too long']
  },
  password: { 
    type: String,
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  name: { 
    type: String,
    trim: true,
    maxlength: [100, 'Name too long']
  },
  picture: { 
    type: String,
    match: [/^https?:\/\//, 'Invalid URL format'],
    maxlength: [2048, 'URL too long']
  },
  authType: { 
    type: String, 
    enum: {
      values: ['google', 'email'],
      message: '{VALUE} is not a valid auth type'
    },
    required: [true, 'Auth type is required']
  },
  lastDriveFetchedAt: { type: Date },
  isActive: { type: Boolean, default: true, index: true },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, select: false },
  verificationTokenExpiresAt: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  lastLoginAt: { type: Date },
  lastLoginIp: { type: String },
  loginCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ authType: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual: displayName
userSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

// Pre-save: Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method: Compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Pre-delete: Cascade
userSchema.pre('deleteOne', { document: true, query: false }, async function() {
  const userId = this._id;
  await mongoose.model('File').deleteMany({ userId });
  await mongoose.model('DriveAccount').deleteMany({ userId });
  await mongoose.model('OAuthState').deleteMany({ userId });
});

export default mongoose.model<IUser>("User", userSchema);
```

---

### 9.2 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE ERD (FUTURE STATE)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ┌──────────────┐                                  │
│                           │   TEAM       │                                  │
│                           ├──────────────┤                                  │
│                           │ _id          │                                  │
│                  ┌────────│ ownerId (FK) │                                  │
│                  │        │ subscriptionId│                                 │
│                  │        └──────┬───────┘                                  │
│                  │               │1                                         │
│                  │               │                                          │
│                  │               │N                                         │
│                  │        ┌──────┴───────┐         ┌──────────────┐        │
│                  │        │ TEAM_MEMBER  │         │  INVITATION  │        │
│                  │        ├──────────────┤    1    ├──────────────┤        │
│                  │        │ teamId (FK)  │─────────│ teamId (FK)  │        │
│                  │        │ userId (FK)  │         │ invitedBy    │        │
│                  │        │ role         │    N    │ email        │        │
│                  │        └──────────────┘         └──────────────┘        │
│                  │               │N                                         │
│                  │               │                                          │
│                  │               │1                                         │
│   ┌──────────────┴───────┐      │                                          │
│   │        USER          │◄─────┘                                          │
│   ├──────────────────────┤                                                 │
│   │ _id                  │                                                 │
│   │ email                │                                                 │
│   │ authType             │                                                 │
│   └──────────┬───────────┘                                                 │
│              │1                                                            │
│              │                                                             │
│    ┌─────────┼─────────┬─────────────┬─────────────┬─────────────┐        │
│    │         │         │             │             │             │        │
│    │N        │N        │N            │N            │N            │1       │
│    ▼         ▼         ▼             ▼             ▼             ▼        │
│ ┌──────┐ ┌──────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐   │
│ │DRIVE │ │OAUTH │ │ACTIVITY │ │ANALYTICS │ │NOTIFICA- │ │SUBSCRIPTION│   │
│ │ACCT  │ │STATE │ │LOG      │ │          │ │TION      │ │            │   │
│ └──┬───┘ └──────┘ └─────────┘ └──────────┘ └──────────┘ └────────────┘   │
│    │1                                                                      │
│    │                                                                       │
│    │N                                                                      │
│    ▼                                                                       │
│ ┌──────┐     ┌───────────┐     ┌──────────┐                               │
│ │FILE  │     │STORAGE    │     │SYNC_JOB  │                               │
│ │      │     │SNAPSHOT   │     │          │                               │
│ └──────┘     └───────────┘     └──────────┘                               │
│                                                                            │
│                                                                            │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
│   │   API_KEY    │    │  AUDIT_LOG   │    │   WEBHOOK    │                │
│   ├──────────────┤    ├──────────────┤    ├──────────────┤                │
│   │ userId (FK)  │    │ actorId (FK) │    │ userId (FK)  │                │
│   │ teamId (FK)  │    │ teamId (FK)  │    │ teamId (FK)  │                │
│   └──────────────┘    └──────────────┘    └──────────────┘                │
│                                                                            │
│                                                                            │
│   ┌──────────────┐    ┌──────────────┐                                    │
│   │    ROLE      │───▶│ PERMISSION   │                                    │
│   ├──────────────┤ N  ├──────────────┤                                    │
│   │ permissions[]│    │ name         │                                    │
│   │ teamId (FK)  │    │ category     │                                    │
│   └──────────────┘    └──────────────┘                                    │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘

LEGEND:
═══════
│1    = One side of relationship
│N    = Many side of relationship  
│FK   = Foreign Key reference
◄──── = Reference direction
```

---

### 9.3 Collection Size Projections

| Collection | 1K Users | 10K Users | 100K Users | Notes |
|------------|----------|-----------|------------|-------|
| users | 500 KB | 5 MB | 50 MB | Linear |
| driveaccounts | 5 MB | 50 MB | 500 MB | ~5 per user |
| files | 150 MB | 1.5 GB | 15 GB | ~1000 per user |
| oauthstates | ~0 | ~0 | ~0 | Ephemeral (TTL) |
| subscriptions | 500 KB | 5 MB | 50 MB | 1:1 with users |
| activitylogs | 50 MB | 500 MB | 5 GB | 90-day retention |
| storagessnapshots | 100 MB | 1 GB | 10 GB | Multi-granularity |
| syncjobs | 30 MB | 300 MB | 3 GB | 30-day retention |
| notifications | 50 MB | 500 MB | 5 GB | 90-day retention |
| auditlogs | 200 MB | 2 GB | 20 GB | No retention limit |
| **TOTAL** | ~400 MB | ~6 GB | ~60 GB | |

---

## Summary

This document provides a comprehensive analysis of DriveSync's MongoDB database architecture, identifying critical security vulnerabilities, missing indexes, and scalability limitations. The recommended improvements and future models outlined here will transform the database from an MVP-grade implementation to a production-ready, enterprise-scale SaaS platform.

**Key Action Items:**

1. 🔴 **IMMEDIATE**: Encrypt OAuth tokens and add TTL index to OAuthState
2. 🟡 **SHORT-TERM**: Add missing indexes and validation rules
3. 🟢 **MEDIUM-TERM**: Implement Subscription and ActivityLog models
4. 🔵 **LONG-TERM**: Set up replica set and plan sharding strategy

---

*Document generated for DriveSync database architecture planning.*
