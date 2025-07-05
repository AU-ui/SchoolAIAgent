/**
 * EdTech Platform - Authentication Middleware
 * Verifies JWT tokens, attaches user info, and handles errors
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { pool } = require('../config/database');

dotenv.config();

// Secret key for JWT (should be in .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey';

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set();

// Session management
const activeSessions = new Map();

/**
 * Authentication middleware for Express.js
 * Checks for Bearer token, verifies it, and attaches user info to req.user
 */
function authMiddleware(req, res, next) {
    // Get the token from the Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header',
        });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Token not provided',
        });
    }

    try {
        // Check if token is blacklisted
        if (tokenBlacklist.has(token)) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token has been revoked',
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if session is still active
        const sessionKey = `${decoded.userId}-${decoded.sessionId}`;
        if (!activeSessions.has(sessionKey)) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Session has expired',
            });
        }

        // Attach user info to the request object
        req.user = decoded;
        // Optionally, attach tenant info if present in token
        if (decoded.tenantId) {
            req.tenantId = decoded.tenantId;
        }
        
        // Proceed to the next middleware/route
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token',
        });
    }
}

/**
 * Authentication middleware (alias for authMiddleware)
 */
function authenticateToken(req, res, next) {
    return authMiddleware(req, res, next);
}

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of roles that are allowed to access the route
 */
function authorizeRoles(allowedRoles) {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        // Check if user has required role
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions to access this resource'
            });
        }

        next();
    };
}

/**
 * Generate JWT tokens with session management
 */
function generateTokens(userId, email, role, tenantId) {
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const accessToken = jwt.sign(
        { 
            userId, 
            email, 
            role,
            tenantId,
            sessionId,
            type: 'access'
        },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { 
            userId, 
            sessionId,
            type: 'refresh' 
        },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    // Store session
    const sessionKey = `${userId}-${sessionId}`;
    activeSessions.set(sessionKey, {
        userId,
        email,
        role,
        tenantId,
        createdAt: new Date(),
        lastActivity: new Date()
    });

    return { accessToken, refreshToken, sessionId };
}

/**
 * Refresh access token
 */
function refreshAccessToken(refreshToken) {
    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        
        // Check if session exists
        const sessionKey = `${decoded.userId}-${decoded.sessionId}`;
        const session = activeSessions.get(sessionKey);
        
        if (!session) {
            throw new Error('Session not found');
        }

        // Update last activity
        session.lastActivity = new Date();
        activeSessions.set(sessionKey, session);

        // Generate new access token
        const accessToken = jwt.sign(
            { 
                userId: decoded.userId, 
                email: session.email, 
                role: session.role,
                tenantId: session.tenantId,
                sessionId: decoded.sessionId,
                type: 'access'
            },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        return { accessToken };
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
}

/**
 * Revoke token (add to blacklist)
 */
function revokeToken(token) {
    tokenBlacklist.add(token);
    
    // Clean up expired blacklisted tokens (in production, use Redis with TTL)
    setTimeout(() => {
        tokenBlacklist.delete(token);
    }, 24 * 60 * 60 * 1000); // 24 hours
}

/**
 * Revoke all user sessions
 */
function revokeAllUserSessions(userId) {
    for (const [sessionKey, session] of activeSessions.entries()) {
        if (session.userId === userId) {
            activeSessions.delete(sessionKey);
        }
    }
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
    const now = new Date();
    const sessionTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [sessionKey, session] of activeSessions.entries()) {
        if (now - session.lastActivity > sessionTimeout) {
            activeSessions.delete(sessionKey);
        }
    }
}

/**
 * Get active sessions for a user
 */
function getActiveSessions(userId) {
    const userSessions = [];
    for (const [sessionKey, session] of activeSessions.entries()) {
        if (session.userId === userId) {
            userSessions.push({
                sessionId: sessionKey.split('-')[1],
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                deviceInfo: session.deviceInfo
            });
        }
    }
    return userSessions;
}

// Clean up expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
    authMiddleware,
    authenticateToken,
    authorizeRoles,
    generateTokens,
    refreshAccessToken,
    revokeToken,
    revokeAllUserSessions,
    getActiveSessions
}; 