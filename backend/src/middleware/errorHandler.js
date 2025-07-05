/**
 * EdTech Platform - Global Error Handler Middleware
 * Catches and formats all errors consistently
 */

/**
 * Global Error Handler Middleware
 * Must be the last middleware in the chain
 */
function errorHandler(err, req, res, next) {
    // Log error details
    console.error('🚨 Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        tenantId: req.tenantId || 'unknown',
        userId: req.user?.id || 'anonymous'
    });

    // Default error response
    let errorResponse = {
        error: 'Internal Server Error',
        message: 'Something went wrong',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    };

    let statusCode = 500;

    // Handle different types of errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        errorResponse = {
            error: 'Validation Error',
            message: 'Invalid data provided',
            details: err.details || err.message,
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
    }
    else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorResponse = {
            error: 'Unauthorized',
            message: 'Invalid or missing authentication token',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorResponse = {
            error: 'Token Expired',
            message: 'Authentication token has expired',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
    }
    else if (err.code === '23505') { // PostgreSQL unique constraint violation
        statusCode = 409;
        errorResponse = {
            error: 'Conflict',
            message: 'Resource already exists',
            details: err.detail || 'Duplicate entry found',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
    }
    else if (err.code === '23503') { // PostgreSQL foreign key constraint violation
        statusCode = 400;
        errorResponse = {
            error: 'Bad Request',
            message: 'Referenced resource does not exist',
            details: err.detail || 'Foreign key constraint failed',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
    }
    else if (err.code === '42P01') { // PostgreSQL undefined table
        statusCode = 500;
        errorResponse = {
            error: 'Database Error',
            message: 'Database table not found',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
    }
    else if (err.code === 'ENOTFOUND') { // DNS lookup failed
        statusCode = 503;
        errorResponse = {
            error: 'Service Unavailable',
            message: 'External service is not available',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
    }
    else if (err.code === 'ECONNREFUSED') { // Connection refused
        statusCode = 503;
        errorResponse = {
            error: 'Service Unavailable',
            message: 'Database connection failed',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
    }
    else if (err.status) {
        // Handle custom errors with status codes
        statusCode = err.status;
        errorResponse = {
            error: err.name || 'Custom Error',
            message: err.message,
            timestamp: new Date().toISOString(),
            path: req.originalUrl
        };
    }
    else if (process.env.NODE_ENV === 'development') {
        // In development, include more error details
        errorResponse = {
            error: err.name || 'Internal Server Error',
            message: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method
        };
    }

    // Add request ID if available
    if (req.id) {
        errorResponse.requestId = req.id;
    }

    // Add tenant context if available
    if (req.tenantId) {
        errorResponse.tenantId = req.tenantId;
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
}

/**
 * Custom Error Classes
 */
class ValidationError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'ValidationError';
        this.status = 400;
        this.details = details;
    }
}

class AuthenticationError extends Error {
    constructor(message = 'Authentication failed') {
        super(message);
        this.name = 'AuthenticationError';
        this.status = 401;
    }
}

class AuthorizationError extends Error {
    constructor(message = 'Access denied') {
        super(message);
        this.name = 'AuthorizationError';
        this.status = 403;
    }
}

class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
        this.status = 404;
    }
}

class ConflictError extends Error {
    constructor(message = 'Resource conflict') {
        super(message);
        this.name = 'ConflictError';
        this.status = 409;
    }
}

class RateLimitError extends Error {
    constructor(message = 'Too many requests') {
        super(message);
        this.name = 'RateLimitError';
        this.status = 429;
    }
}

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Error Logger (for external logging services)
 */
function logError(err, req) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: err.code
        },
        request: {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || 'anonymous',
            tenantId: req.tenantId || 'unknown'
        }
    };

    // In production, you might want to send this to a logging service
    // like Winston, Bunyan, or external services like Sentry
    console.error('📝 Error Log:', JSON.stringify(errorLog, null, 2));
}

module.exports = {
    errorHandler,
    asyncHandler,
    logError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError
}; 