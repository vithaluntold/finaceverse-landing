// ============================================
// ORCHESTRATOR - Authentication Service
// Login, session management, and user validation
// ============================================

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pino from 'pino';
import crypto from 'crypto';

const logger = pino({ name: 'orchestrator-auth-service' });

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'superadmin' | 'admin' | 'operator' | 'viewer';
  tenantId: string;
  permissions: string[];
  isActive: boolean;
  totpEnabled: boolean;
  totpSecret?: string;
  lastLogin?: Date;
  failedAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  ip: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
  totpCode?: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: Omit<User, 'passwordHash' | 'totpSecret'>;
  requiresTOTP?: boolean;
  error?: string;
  code?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const AUTH_CONFIG = {
  jwtSecret: process.env.ORCHESTRATOR_JWT_SECRET || process.env.JWT_SECRET || 'orchestrator-secret-change-in-production',
  jwtIssuer: process.env.JWT_ISSUER || 'finaceverse-orchestrator',
  accessTokenExpiry: '1h',
  refreshTokenExpiry: '7d',
  accessTokenExpiryMs: 60 * 60 * 1000, // 1 hour
  refreshTokenExpiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  bcryptRounds: 12,
};

// ============================================
// IN-MEMORY USER STORE (Replace with database in production)
// ============================================

const users: Map<string, User> = new Map();
const sessions: Map<string, Session> = new Map();
const refreshTokens: Map<string, string> = new Map(); // refreshToken -> sessionId

// Initialize default superadmin user
async function initializeDefaultUsers(): Promise<void> {
  const superadminPassword = process.env.ORCHESTRATOR_ADMIN_PASSWORD || 'SuperAdmin@2026!';
  const passwordHash = await bcrypt.hash(superadminPassword, AUTH_CONFIG.bcryptRounds);

  const superadmin: User = {
    id: 'orchestrator-superadmin-001',
    username: 'orchestrator_admin',
    email: 'orchestrator@finaceverse.com',
    passwordHash,
    role: 'superadmin',
    tenantId: 'platform',
    permissions: ['*'],
    isActive: true,
    totpEnabled: false,
    failedAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.set(superadmin.username, superadmin);
  logger.info('Default orchestrator superadmin user initialized');
}

// Initialize on module load
initializeDefaultUsers().catch(err => {
  logger.error({ error: err }, 'Failed to initialize default users');
});

// ============================================
// USER MANAGEMENT
// ============================================

export async function createUser(userData: Omit<User, 'id' | 'passwordHash' | 'failedAttempts' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<User> {
  if (users.has(userData.username)) {
    throw new Error('Username already exists');
  }

  const passwordHash = await bcrypt.hash(userData.password, AUTH_CONFIG.bcryptRounds);
  
  const user: User = {
    id: `user-${crypto.randomUUID()}`,
    username: userData.username,
    email: userData.email,
    passwordHash,
    role: userData.role,
    tenantId: userData.tenantId,
    permissions: userData.permissions,
    isActive: userData.isActive,
    totpEnabled: userData.totpEnabled,
    totpSecret: userData.totpSecret,
    failedAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users.set(user.username, user);
  logger.info({ userId: user.id, username: user.username }, 'User created');
  
  return user;
}

export function getUser(username: string): User | undefined {
  return users.get(username);
}

export function getUserById(id: string): User | undefined {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return undefined;
}

export function listUsers(): Omit<User, 'passwordHash' | 'totpSecret'>[] {
  return Array.from(users.values()).map(({ passwordHash, totpSecret, ...user }) => user);
}

export async function updateUserPassword(username: string, newPassword: string): Promise<boolean> {
  const user = users.get(username);
  if (!user) return false;

  user.passwordHash = await bcrypt.hash(newPassword, AUTH_CONFIG.bcryptRounds);
  user.updatedAt = new Date();
  users.set(username, user);
  
  logger.info({ username }, 'User password updated');
  return true;
}

export function deactivateUser(username: string): boolean {
  const user = users.get(username);
  if (!user) return false;

  user.isActive = false;
  user.updatedAt = new Date();
  users.set(username, user);
  
  logger.info({ username }, 'User deactivated');
  return true;
}

// ============================================
// LOGIN & AUTHENTICATION
// ============================================

export async function login(credentials: LoginCredentials, ip: string, userAgent: string): Promise<LoginResult> {
  const { username, password, totpCode } = credentials;

  // Find user
  const user = users.get(username);
  if (!user) {
    logger.warn({ username }, 'Login attempt for non-existent user');
    return { success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
  }

  // Check if user is active
  if (!user.isActive) {
    logger.warn({ username }, 'Login attempt for inactive user');
    return { success: false, error: 'Account is deactivated', code: 'ACCOUNT_DEACTIVATED' };
  }

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    logger.warn({ username, lockedUntil: user.lockedUntil }, 'Login attempt for locked account');
    return { 
      success: false, 
      error: `Account locked. Try again in ${Math.ceil(remainingMs / 60000)} minutes`,
      code: 'ACCOUNT_LOCKED'
    };
  }

  // Verify password
  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    user.failedAttempts++;
    
    if (user.failedAttempts >= AUTH_CONFIG.maxFailedAttempts) {
      user.lockedUntil = new Date(Date.now() + AUTH_CONFIG.lockoutDuration);
      logger.warn({ username, attempts: user.failedAttempts }, 'Account locked due to failed attempts');
    }
    
    users.set(username, user);
    return { success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
  }

  // Check TOTP if enabled
  if (user.totpEnabled) {
    if (!totpCode) {
      return { success: false, requiresTOTP: true, code: 'TOTP_REQUIRED' };
    }
    // TOTP validation would go here
    // For now, accept any 6-digit code (implement proper TOTP in production)
    if (!/^\d{6}$/.test(totpCode)) {
      return { success: false, error: 'Invalid TOTP code', code: 'INVALID_TOTP' };
    }
  }

  // Reset failed attempts on successful login
  user.failedAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLogin = new Date();
  users.set(username, user);

  // Generate tokens
  const sessionId = crypto.randomUUID();
  const token = generateAccessToken(user, sessionId);
  const refreshToken = generateRefreshToken(sessionId);

  // Create session
  const session: Session = {
    id: sessionId,
    userId: user.id,
    token,
    refreshToken,
    expiresAt: new Date(Date.now() + AUTH_CONFIG.accessTokenExpiryMs),
    refreshExpiresAt: new Date(Date.now() + AUTH_CONFIG.refreshTokenExpiryMs),
    ip,
    userAgent,
    createdAt: new Date(),
    lastActivityAt: new Date(),
  };

  sessions.set(sessionId, session);
  refreshTokens.set(refreshToken, sessionId);

  logger.info({ userId: user.id, username, sessionId }, 'User logged in successfully');

  const { passwordHash, totpSecret, ...safeUser } = user;

  return {
    success: true,
    token,
    refreshToken,
    expiresIn: AUTH_CONFIG.accessTokenExpiryMs / 1000,
    user: safeUser,
  };
}

export function logout(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  refreshTokens.delete(session.refreshToken);
  sessions.delete(sessionId);

  logger.info({ sessionId }, 'Session logged out');
  return true;
}

export async function refreshSession(refreshToken: string): Promise<LoginResult> {
  const sessionId = refreshTokens.get(refreshToken);
  if (!sessionId) {
    return { success: false, error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' };
  }

  const session = sessions.get(sessionId);
  if (!session) {
    refreshTokens.delete(refreshToken);
    return { success: false, error: 'Session not found', code: 'SESSION_NOT_FOUND' };
  }

  if (session.refreshExpiresAt < new Date()) {
    refreshTokens.delete(refreshToken);
    sessions.delete(sessionId);
    return { success: false, error: 'Refresh token expired', code: 'REFRESH_TOKEN_EXPIRED' };
  }

  const user = getUserById(session.userId);
  if (!user || !user.isActive) {
    refreshTokens.delete(refreshToken);
    sessions.delete(sessionId);
    return { success: false, error: 'User not found or inactive', code: 'USER_INACTIVE' };
  }

  // Generate new tokens
  const newToken = generateAccessToken(user, sessionId);
  const newRefreshToken = generateRefreshToken(sessionId);

  // Update session
  refreshTokens.delete(refreshToken);
  refreshTokens.set(newRefreshToken, sessionId);
  
  session.token = newToken;
  session.refreshToken = newRefreshToken;
  session.expiresAt = new Date(Date.now() + AUTH_CONFIG.accessTokenExpiryMs);
  session.refreshExpiresAt = new Date(Date.now() + AUTH_CONFIG.refreshTokenExpiryMs);
  session.lastActivityAt = new Date();
  sessions.set(sessionId, session);

  const { passwordHash, totpSecret, ...safeUser } = user;

  return {
    success: true,
    token: newToken,
    refreshToken: newRefreshToken,
    expiresIn: AUTH_CONFIG.accessTokenExpiryMs / 1000,
    user: safeUser,
  };
}

// ============================================
// TOKEN GENERATION
// ============================================

function generateAccessToken(user: User, sessionId: string): string {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      permissions: user.permissions,
      sessionId,
    },
    AUTH_CONFIG.jwtSecret,
    {
      expiresIn: AUTH_CONFIG.accessTokenExpiry,
      issuer: AUTH_CONFIG.jwtIssuer,
    }
  );
}

function generateRefreshToken(sessionId: string): string {
  return crypto.randomBytes(64).toString('hex') + '.' + sessionId;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function getUserSessions(userId: string): Session[] {
  return Array.from(sessions.values()).filter(s => s.userId === userId);
}

export function invalidateAllUserSessions(userId: string): number {
  let count = 0;
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId) {
      refreshTokens.delete(session.refreshToken);
      sessions.delete(sessionId);
      count++;
    }
  }
  logger.info({ userId, sessionsInvalidated: count }, 'All user sessions invalidated');
  return count;
}

// ============================================
// EXPORT AUTH CONFIG FOR MIDDLEWARE
// ============================================

export { AUTH_CONFIG };
