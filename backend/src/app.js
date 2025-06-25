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
const authMiddleware = require('./middleware/auth');
const tenantMiddleware = require('./middleware/tenantContext');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/api/auth');
const adminRoutes = require('./routes/api/admin');
const teacherRoutes = require('./routes/api/teacher');
const parentRoutes = require('./routes/api/parent');
const studentRoutes = require('./routes/api/student');

// Import services
const MLService = require('./services/mlIntegrationService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

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
            ml_services: 'http://localhost:8000 (FastAPI)'
        },
        documentation: '/api/docs'
    });
});

// API Routes
app.use('/api/auth', authRoutes);

// Protected routes with authentication and tenant context
app.use('/api/admin', authMiddleware, tenantMiddleware, adminRoutes);
app.use('/api/teacher', authMiddleware, tenantMiddleware, teacherRoutes);
app.use('/api/parent', authMiddleware, tenantMiddleware, parentRoutes);
app.use('/api/student', authMiddleware, tenantMiddleware, studentRoutes);

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
});

module.exports = app; 