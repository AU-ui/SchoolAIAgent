/**
 * EdTech Platform - API Key Authentication Middleware
 * Manages API key authentication, validation, and usage tracking
 */

const crypto = require('crypto');
const { pool } = require('../config/database');

// API key storage (in production, use Redis or database)
const apiKeys = new Map();
const apiKeyUsage = new Map();

/**
 * Generate a new API key
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @param {string} name - API key name
 * @param {Array} permissions - Array of permissions
 * @param {Date} expiresAt - Expiration date
 * @returns {Object} API key object
 */
function generateApiKey(userId, tenantId, name, permissions = [], expiresAt = null) {
    const keyId = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('hex');
    const apiKey = `${keyId}.${secret}`;
    
    const keyData = {
        id: keyId,
        userId,
        tenantId,
        name,
        permissions,
        createdAt: new Date(),
        expiresAt,
        isActive: true,
        lastUsed: null,
        usageCount: 0
    };
    
    apiKeys.set(keyId, keyData);
    
    return {
        apiKey,
        keyData
    };
}

/**
 * Validate API key
 * @param {string} apiKey - API key to validate
 * @returns {Object|null} Key data if valid, null otherwise
 */
function validateApiKey(apiKey) {
    if (!apiKey || !apiKey.includes('.')) {
        return null;
    }
    
    const [keyId, secret] = apiKey.split('.');
    const keyData = apiKeys.get(keyId);
    
    if (!keyData || !keyData.isActive) {
        return null;
    }
    
    // Check expiration
    if (keyData.expiresAt && new Date() > keyData.expiresAt) {
        keyData.isActive = false;
        return null;
    }
    
    return keyData;
}

/**
 * API key authentication middleware
 */
function apiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'API key required'
        });
    }
    
    const keyData = validateApiKey(apiKey);
    if (!keyData) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired API key'
        });
    }
    
    // Update usage statistics
    keyData.lastUsed = new Date();
    keyData.usageCount++;
    
    // Attach key data to request
    req.apiKey = keyData;
    req.userId = keyData.userId;
    req.tenantId = keyData.tenantId;
    
    next();
}

/**
 * Permission-based authorization middleware
 * @param {Array} requiredPermissions - Array of required permissions
 */
function requirePermissions(requiredPermissions) {
    return (req, res, next) => {
        if (!req.apiKey) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'API key authentication required'
            });
        }
        
        const hasAllPermissions = requiredPermissions.every(permission => 
            req.apiKey.permissions.includes(permission)
        );
        
        if (!hasAllPermissions) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient API key permissions'
            });
        }
        
        next();
    };
}

/**
 * Rate limiting for API keys
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
function apiKeyRateLimit(maxRequests = 100, windowMs = 60000) {
    return (req, res, next) => {
        if (!req.apiKey) {
            return next();
        }
        
        const keyId = req.apiKey.id;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Get or initialize usage tracking
        if (!apiKeyUsage.has(keyId)) {
            apiKeyUsage.set(keyId, []);
        }
        
        const usage = apiKeyUsage.get(keyId);
        
        // Remove old requests outside the window
        const recentRequests = usage.filter(timestamp => timestamp > windowStart);
        
        if (recentRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: 'API key rate limit exceeded'
            });
        }
        
        // Add current request
        recentRequests.push(now);
        apiKeyUsage.set(keyId, recentRequests);
        
        next();
    };
}

/**
 * Get API key usage statistics
 * @param {string} keyId - API key ID
 * @returns {Object} Usage statistics
 */
function getApiKeyUsage(keyId) {
    const keyData = apiKeys.get(keyId);
    if (!keyData) {
        return null;
    }
    
    const usage = apiKeyUsage.get(keyId) || [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;
    
    return {
        keyId,
        name: keyData.name,
        totalRequests: usage.length,
        requestsToday: usage.filter(timestamp => timestamp > now - dayMs).length,
        requestsThisWeek: usage.filter(timestamp => timestamp > now - weekMs).length,
        requestsThisMonth: usage.filter(timestamp => timestamp > now - monthMs).length,
        lastUsed: keyData.lastUsed,
        createdAt: keyData.createdAt,
        expiresAt: keyData.expiresAt,
        isActive: keyData.isActive
    };
}

/**
 * Revoke API key
 * @param {string} keyId - API key ID
 * @returns {boolean} Success status
 */
function revokeApiKey(keyId) {
    const keyData = apiKeys.get(keyId);
    if (!keyData) {
        return false;
    }
    
    keyData.isActive = false;
    apiKeys.set(keyId, keyData);
    
    // Clean up usage data
    apiKeyUsage.delete(keyId);
    
    return true;
}

/**
 * List all API keys for a user
 * @param {string} userId - User ID
 * @returns {Array} Array of API key data
 */
function listUserApiKeys(userId) {
    const userKeys = [];
    
    for (const [keyId, keyData] of apiKeys.entries()) {
        if (keyData.userId === userId) {
            userKeys.push({
                id: keyId,
                name: keyData.name,
                permissions: keyData.permissions,
                createdAt: keyData.createdAt,
                expiresAt: keyData.expiresAt,
                isActive: keyData.isActive,
                lastUsed: keyData.lastUsed,
                usageCount: keyData.usageCount
            });
        }
    }
    
    return userKeys;
}

/**
 * Clean up expired API keys
 */
function cleanupExpiredApiKeys() {
    const now = new Date();
    
    for (const [keyId, keyData] of apiKeys.entries()) {
        if (keyData.expiresAt && now > keyData.expiresAt) {
            keyData.isActive = false;
            apiKeys.set(keyId, keyData);
        }
    }
}

/**
 * Get API key analytics
 * @param {string} tenantId - Tenant ID
 * @returns {Object} Analytics data
 */
function getApiKeyAnalytics(tenantId) {
    const tenantKeys = [];
    
    for (const [keyId, keyData] of apiKeys.entries()) {
        if (keyData.tenantId === tenantId) {
            tenantKeys.push({
                keyId,
                name: keyData.name,
                userId: keyData.userId,
                permissions: keyData.permissions,
                createdAt: keyData.createdAt,
                lastUsed: keyData.lastUsed,
                usageCount: keyData.usageCount,
                isActive: keyData.isActive
            });
        }
    }
    
    const totalKeys = tenantKeys.length;
    const activeKeys = tenantKeys.filter(key => key.isActive).length;
    const totalUsage = tenantKeys.reduce((sum, key) => sum + key.usageCount, 0);
    
    return {
        totalKeys,
        activeKeys,
        inactiveKeys: totalKeys - activeKeys,
        totalUsage,
        averageUsagePerKey: totalKeys > 0 ? totalUsage / totalKeys : 0,
        keys: tenantKeys
    };
}

// Clean up expired keys every hour
setInterval(cleanupExpiredApiKeys, 60 * 60 * 1000);

module.exports = {
    generateApiKey,
    validateApiKey,
    apiKeyAuth,
    requirePermissions,
    apiKeyRateLimit,
    getApiKeyUsage,
    revokeApiKey,
    listUserApiKeys,
    getApiKeyAnalytics
}; 