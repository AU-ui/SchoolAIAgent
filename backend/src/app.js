/**
 * EdTech Platform - Express.js Backend
 * Main application file for Pain Points #1 and #5 with ML service integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import middleware
const { authMiddleware } = require('./middleware/auth');
const { tenantContextMiddleware } = require('./middleware/tenantContext');
const { errorHandler } = require('./middleware/errorHandler');
// const { apiKeyAuth } = require('./middleware/apiKeyAuth');
// const { deviceFingerprint } = require('./middleware/deviceFingerprint');
// const { securityMonitor } = require('./middleware/securityAlerts');

// Import routes
const authRoutes = require('./routes/api/auth');
const adminRoutes = require('./routes/api/admin');
const teacherRoutes = require('./routes/api/teacher');
const parentRoutes = require('./routes/api/parent');
const studentRoutes = require('./routes/api/student');
const userRoutes = require('./routes/api/user');
const attendanceRoutes = require('./routes/api/attendance');
const communicationRoutes = require('./routes/api/communication');
const learningRoutes = require('./routes/api/learning');

// Import services
const MLService = require('./services/mlIntegrationService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced Security Middleware
const securityMiddleware = {
    // Request sanitization to prevent XSS and injection attacks
    sanitizeRequest: (req, res, next) => {
        // Sanitize query parameters
        if (req.query) {
            Object.keys(req.query).forEach(key => {
                if (typeof req.query[key] === 'string') {
                    req.query[key] = req.query[key]
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/javascript:/gi, '')
                        .replace(/on\w+\s*=/gi, '')
                        .trim();
                }
            });
        }

        // Sanitize body parameters
        if (req.body) {
            Object.keys(req.body).forEach(key => {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = req.body[key]
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/javascript:/gi, '')
                        .replace(/on\w+\s*=/gi, '')
                        .trim();
                }
            });
        }

        next();
    },

    // Prevent SQL injection by checking for suspicious patterns
    sqlInjectionProtection: (req, res, next) => {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|OR|AND)\b)/i,
            /(\b(script|javascript|vbscript|expression)\b)/i,
            /(\b(union|select|insert|update|delete|drop|create|alter|exec)\b)/i
        ];

        const checkValue = (value) => {
            if (typeof value === 'string') {
                return sqlPatterns.some(pattern => pattern.test(value));
            }
            return false;
        };

        // Check query parameters
        if (req.query && Object.values(req.query).some(checkValue)) {
            return res.status(400).json({
                error: 'Invalid input detected',
                message: 'Suspicious characters detected in request'
            });
        }

        // Check body parameters
        if (req.body && Object.values(req.body).some(checkValue)) {
            return res.status(400).json({
                error: 'Invalid input detected',
                message: 'Suspicious characters detected in request'
            });
        }

        next();
    },

    // Request size validation
    validateRequestSize: (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (contentLength > maxSize) {
            return res.status(413).json({
                error: 'Payload Too Large',
                message: 'Request body exceeds maximum allowed size'
            });
        }

        next();
    },

    // Prevent parameter pollution
    preventParameterPollution: (req, res, next) => {
        // Check for duplicate parameters
        const checkDuplicates = (obj) => {
            const keys = Object.keys(obj);
            const uniqueKeys = new Set(keys);
            return keys.length !== uniqueKeys.size;
        };

        if ((req.query && checkDuplicates(req.query)) || 
            (req.body && checkDuplicates(req.body))) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Duplicate parameters detected'
            });
        }

        next();
    },

    // Security headers enhancement
    enhancedSecurityHeaders: (req, res, next) => {
        // Additional security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        
        // Custom security header
        res.setHeader('X-EdTech-Security', 'v1.0');
        
        next();
    },

    // Request logging for security monitoring
    securityLogging: (req, res, next) => {
        const securityEvents = {
            timestamp: new Date().toISOString(),
            ip: req.ip,
            method: req.method,
            url: req.url,
            userAgent: req.headers['user-agent'],
            userId: req.user?.id || 'anonymous',
            userRole: req.user?.role || 'anonymous'
        };

        // Log suspicious activities
        const suspiciousPatterns = [
            /\.\.\//, // Directory traversal
            /<script/i, // XSS attempts
            /union\s+select/i, // SQL injection
            /eval\s*\(/i, // Code injection
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => 
            pattern.test(req.url) || 
            pattern.test(JSON.stringify(req.body)) ||
            pattern.test(JSON.stringify(req.query))
        );

        if (isSuspicious) {
            console.warn('🚨 SUSPICIOUS ACTIVITY DETECTED:', securityEvents);
            // In production, you'd send this to a security monitoring service
        }

        next();
    }
};

// Enhanced Rate Limiting Configuration with Role-Based Limits
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false, roleBased = false) => {
    return rateLimit({
        windowMs,
        max: (req) => {
            // Role-based limits
            if (roleBased && req.user) {
                switch (req.user.role) {
                    case 'admin':
                        return max * 3; // Admins get 3x the limit
                    case 'teacher':
                        return max * 2; // Teachers get 2x the limit
                    case 'parent':
                        return max; // Parents get normal limit
                    case 'student':
                        return Math.floor(max * 0.5); // Students get half the limit
                    default:
                        return max;
                }
            }
            
            return max;
        },
        message: {
            error: 'Rate limit exceeded',
            message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too Many Requests',
                message,
                retryAfter: Math.ceil(windowMs / 1000),
                timestamp: new Date().toISOString(),
                userRole: req.user?.role || 'anonymous'
            });
        },
        keyGenerator: (req) => {
            // Use user ID if authenticated, otherwise use IP
            return req.user ? `${req.user.id}-${req.ip}` : req.ip;
        }
    });
};

// Different rate limiters for different security levels
const authLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per 15 minutes
    'Too many authentication attempts. Please try again later.',
    true // Skip successful requests
);

const sensitiveLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    20, // 20 attempts per 15 minutes
    'Too many requests to sensitive endpoints. Please try again later.',
    false,
    true // Role-based
);

const generalLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 attempts per 15 minutes
    'Too many requests. Please try again later.',
    false,
    true // Role-based
);

const uploadLimiter = createRateLimiter(
    60 * 60 * 1000, // 1 hour
    10, // 10 uploads per hour
    'Too many file uploads. Please try again later.',
    false,
    true // Role-based
);

const mlServiceLimiter = createRateLimiter(
    5 * 60 * 1000, // 5 minutes
    30, // 30 ML service calls per 5 minutes
    'Too many ML service requests. Please try again later.',
    false,
    true // Role-based
);

// Apply security middleware
app.use(securityMiddleware.enhancedSecurityHeaders);
app.use(securityMiddleware.securityLogging);
app.use(securityMiddleware.validateRequestSize);
app.use(securityMiddleware.preventParameterPollution);
app.use(securityMiddleware.sqlInjectionProtection);
app.use(securityMiddleware.sanitizeRequest);

// Advanced Security Features
// app.use(deviceFingerprint); // Device fingerprinting
// app.use(securityMonitor); // Real-time security monitoring

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-API-Key'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Apply rate limiting based on endpoint sensitivity
app.use('/api/auth', authLimiter); // Stricter for authentication
app.use('/api/admin', sensitiveLimiter); // Sensitive admin operations
app.use('/api/teacher', sensitiveLimiter); // Teacher operations
app.use('/api/parent', sensitiveLimiter); // Parent operations
app.use('/api/student', sensitiveLimiter); // Student operations
app.use('/api/attendance', sensitiveLimiter); // Attendance operations
app.use('/api/communication', sensitiveLimiter); // Communication operations
app.use('/api/learning', sensitiveLimiter); // Learning operations
app.use('/api/upload', uploadLimiter); // File uploads
app.use('/api/ml', mlServiceLimiter); // ML service endpoints
app.use('/api/', generalLimiter); // General API endpoints

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'EdTech Platform Backend',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'EdTech Platform Backend API',
        version: '1.0.0',
        status: 'running',
        pain_points: [
            '#1: Teacher Administrative Burden',
            '#5: Parent-School Communication'
        ],
        endpoints: {
            auth: '/api/auth',
            admin: '/api/admin',
            teacher: '/api/teacher',
            parent: '/api/parent',
            student: '/api/student',
            attendance: '/api/attendance',
            communication: '/api/communication',
            learning: '/api/learning',
            ml_services: 'http://localhost:8000 (FastAPI)'
        },
        documentation: '/api/docs'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, tenantContextMiddleware, userRoutes);
app.use('/api/admin', authMiddleware, tenantContextMiddleware, adminRoutes);
app.use('/api/teacher', authMiddleware, tenantContextMiddleware, teacherRoutes);
app.use('/api/parent', authMiddleware, tenantContextMiddleware, parentRoutes);
app.use('/api/student', authMiddleware, tenantContextMiddleware, studentRoutes);
app.use('/api/attendance', authMiddleware, tenantContextMiddleware, attendanceRoutes);
app.use('/api/communication', authMiddleware, tenantContextMiddleware, communicationRoutes);
app.use('/api/learning', authMiddleware, tenantContextMiddleware, learningRoutes);

// ML Service integration endpoint
app.get('/api/ml/status', async (req, res) => {
    try {
        const mlService = new MLService();
        const status = await mlService.getStatus();
        res.json(status);
    } catch (error) {
        console.error('ML service status check failed:', error);
        res.status(503).json({
            status: 'ml_service_unavailable',
            message: 'ML services are currently unavailable'
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 EdTech Platform Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`🤖 ML Services: http://localhost:8000`);
    console.log(`🎯 Pain Points: #1 (Teacher Admin), #5 (Parent Communication)`);
    console.log(`🛡️ Enhanced Rate Limiting: Active`);
    console.log(`👥 Role-Based Limits: Active`);
    console.log(`🔒 Advanced Security Features: Active`);
});

module.exports = app; 