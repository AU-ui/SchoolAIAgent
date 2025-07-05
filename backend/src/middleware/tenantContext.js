/**
 * EdTech Platform - Tenant Context Middleware
 * Handles multi-tenant context for school isolation
 */

const { setTenantContext } = require('../config/database');

/**
 * Tenant Context Middleware
 * Extracts tenant information and sets up tenant-specific context
 */
function tenantContextMiddleware(req, res, next) {
    try {
        // Method 1: Extract tenant from JWT token (if user is authenticated)
        if (req.user && req.user.tenantId) {
            req.tenantId = req.user.tenantId;
            req.tenantContext = {
                id: req.user.tenantId,
                type: 'jwt_token',
                source: 'user_token'
            };
        }
        // Method 2: Extract tenant from X-Tenant-ID header
        else if (req.headers['x-tenant-id']) {
            req.tenantId = req.headers['x-tenant-id'];
            req.tenantContext = {
                id: req.headers['x-tenant-id'],
                type: 'header',
                source: 'x-tenant-id'
            };
        }
        // Method 3: Extract tenant from subdomain
        else if (req.headers.host) {
            const subdomain = extractSubdomain(req.headers.host);
            if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
                req.tenantId = subdomain;
                req.tenantContext = {
                    id: subdomain,
                    type: 'subdomain',
                    source: 'host_header'
                };
            }
        }
        // Method 4: Extract tenant from query parameter (for development/testing)
        else if (req.query.tenant) {
            req.tenantId = req.query.tenant;
            req.tenantContext = {
                id: req.query.tenant,
                type: 'query_param',
                source: 'query_parameter'
            };
        }

        // If no tenant found, use default or return error
        if (!req.tenantId) {
            // For public routes (like login, signup), allow without tenant
            if (isPublicRoute(req.path)) {
                req.tenantId = 'public';
                req.tenantContext = {
                    id: 'public',
                    type: 'default',
                    source: 'public_route'
                };
            } else {
                return res.status(400).json({
                    error: 'Tenant Required',
                    message: 'Tenant information is required for this request',
                    possible_sources: [
                        'JWT token with tenantId',
                        'X-Tenant-ID header',
                        'Subdomain (e.g., school1.edtech.com)',
                        'Query parameter (?tenant=school1)'
                    ]
                });
            }
        }

        // Validate tenant format (basic validation)
        if (!isValidTenantId(req.tenantId)) {
            return res.status(400).json({
                error: 'Invalid Tenant ID',
                message: 'Tenant ID format is invalid',
                tenant_id: req.tenantId
            });
        }

        // Set tenant context for database operations
        req.setTenantContext = async (client) => {
            if (req.tenantId && req.tenantId !== 'public') {
                await setTenantContext(client, req.tenantId);
            }
        };

        // Add tenant info to response headers (for debugging)
        if (process.env.NODE_ENV === 'development') {
            res.set('X-Tenant-ID', req.tenantId);
            res.set('X-Tenant-Source', req.tenantContext.source);
        }

        console.log(`🔗 Tenant Context: ${req.tenantId} (${req.tenantContext.source})`);
        next();

    } catch (error) {
        console.error('Tenant context middleware error:', error);
        return res.status(500).json({
            error: 'Tenant Context Error',
            message: 'Failed to process tenant context'
        });
    }
}

/**
 * Extract subdomain from host header
 * Example: school1.edtech.com -> school1
 */
function extractSubdomain(host) {
    const parts = host.split('.');
    if (parts.length >= 3) {
        return parts[0];
    }
    return null;
}

/**
 * Check if route is public (doesn't require tenant)
 */
function isPublicRoute(path) {
    const publicRoutes = [
        '/api/v1/auth/login',
        '/api/v1/auth/signup',
        '/api/v1/auth/forgot-password',
        '/api/v1/auth/reset-password',
        '/health',
        '/docs'
    ];
    
    return publicRoutes.some(route => path.startsWith(route));
}

/**
 * Validate tenant ID format
 */
function isValidTenantId(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
        return false;
    }
    
    // Basic validation: alphanumeric, hyphens, underscores only
    const validFormat = /^[a-zA-Z0-9_-]+$/.test(tenantId);
    const validLength = tenantId.length >= 2 && tenantId.length <= 50;
    
    return validFormat && validLength;
}

/**
 * Get tenant information for logging/debugging
 */
function getTenantInfo(req) {
    return {
        id: req.tenantId,
        context: req.tenantContext,
        user: req.user ? {
            id: req.user.id,
            role: req.user.role,
            email: req.user.email
        } : null,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    tenantContextMiddleware,
    extractSubdomain,
    isPublicRoute,
    isValidTenantId,
    getTenantInfo
}; 