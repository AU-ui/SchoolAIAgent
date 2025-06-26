/**
 * EdTech Platform - Express.js API Router
 * Main API router organizing all routes for Pain Points #1 and #5
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const teacherRoutes = require('./teacher');
const parentRoutes = require('./parent');
const studentRoutes = require('./student');
const mlRoutes = require('./ml');

// API versioning
const API_VERSION = 'v1';

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'EdTech Platform API',
        version: API_VERSION,
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: `/api/${API_VERSION}/auth`,
            admin: `/api/${API_VERSION}/admin`,
            teacher: `/api/${API_VERSION}/teacher`,
            parent: `/api/${API_VERSION}/parent`,
            student: `/api/${API_VERSION}/student`,
            ml: `/api/${API_VERSION}/ml`
        }
    });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
    res.json({
        title: 'EdTech Platform API Documentation',
        version: API_VERSION,
        description: 'API for Pain Points #1 (Teacher Administrative Burden) and #5 (Parent-School Communication)',
        pain_points: {
            point_1: {
                name: 'Teacher Administrative Burden',
                features: [
                    'Smart Attendance Tracking',
                    'AI Report Generation',
                    'Task Management',
                    'Fee Management',
                    'Paper Generation',
                    'Timetable Management',
                    'Grade Calculation',
                    'Resource Management'
                ]
            },
            point_5: {
                name: 'Parent-School Communication',
                features: [
                    'Multi-Language Messaging',
                    'Automated Notifications',
                    'Parent Engagement Analytics',
                    'Fee Payment Notifications',
                    'Academic Progress Updates',
                    'Conference Scheduling',
                    'Homework Tracking',
                    'Behavior Reporting'
                ]
            }
        },
        architecture: {
            backend: 'Express.js (Port 3000)',
            ml_services: 'FastAPI (Port 8000)',
            database: 'PostgreSQL',
            frontend: 'React.js'
        }
    });
});

// Mount route modules
router.use(`/${API_VERSION}/auth`, authRoutes);
router.use(`/${API_VERSION}/admin`, adminRoutes);
router.use(`/${API_VERSION}/teacher`, teacherRoutes);
router.use(`/${API_VERSION}/parent`, parentRoutes);
router.use(`/${API_VERSION}/student`, studentRoutes);
router.use(`/${API_VERSION}/ml`, mlRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
    res.status(404).json({
        error: 'API Endpoint Not Found',
        message: `Route ${req.originalUrl} not found`,
        available_endpoints: [
            `/api/${API_VERSION}/auth`,
            `/api/${API_VERSION}/admin`,
            `/api/${API_VERSION}/teacher`,
            `/api/${API_VERSION}/parent`,
            `/api/${API_VERSION}/student`,
            `/api/${API_VERSION}/ml`
        ],
        timestamp: new Date().toISOString()
    });
});

module.exports = router; 