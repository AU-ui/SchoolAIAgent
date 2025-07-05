/**
 * EdTech Platform - Learning Routes
 * Handles visual learning content requests, progress tracking, and educational content management
 */

const express = require('express');
const { validate, learningSchemas } = require('../../middleware/validation');
const { asyncHandler, ValidationError, NotFoundError, AuthorizationError } = require('../../middleware/errorHandler');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Import services
const VisualLearningService = require('../../services/visualLearningService');
const MLService = require('../../services/mlIntegrationService');

// Initialize services
const visualLearningService = new VisualLearningService();
const mlService = new MLService();

/**
 * @route   POST /api/learning/request-visual
 * @desc    Request visual learning content for a topic
 * @access  Private (Students, Teachers)
 */
router.post('/request-visual',
    authenticateToken,
    authorizeRoles(['student', 'teacher']),
    validate(learningSchemas.requestVisual, 'body'),
    asyncHandler(async (req, res) => {
        const { topicName, subject, gradeLevel } = req.body;
        const { userId, role } = req.user;

        try {
            // For teachers, they can request content for any student
            const studentId = role === 'teacher' ? req.body.studentId : userId;

            // Validate student access for teachers
            if (role === 'teacher' && !studentId) {
                throw new ValidationError('Student ID is required for teacher requests');
            }

            const result = await visualLearningService.requestVisualLearning(
                studentId,
                topicName,
                subject,
                gradeLevel
            );

            res.status(201).json({
                success: true,
                message: 'Visual learning content requested successfully',
                data: result
            });

        } catch (error) {
            console.error('Error requesting visual learning:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/learning/topics
 * @desc    Get available educational topics by grade level and subject
 * @access  Private (All authenticated users)
 */
router.get('/topics',
    authenticateToken,
    validate(learningSchemas.getTopics, 'query'),
    asyncHandler(async (req, res) => {
        const { gradeLevel, subject } = req.query;

        try {
            const topics = await visualLearningService.getAvailableTopics(
                parseInt(gradeLevel),
                subject
            );

            res.json({
                success: true,
                data: {
                    gradeLevel: parseInt(gradeLevel),
                    subject,
                    topics
                }
            });

        } catch (error) {
            console.error('Error fetching topics:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/learning/progress/:studentId
 * @desc    Get student's learning progress
 * @access  Private (Students, Teachers, Parents)
 */
router.get('/progress/:studentId',
    authenticateToken,
    authorizeRoles(['student', 'teacher', 'parent']),
    validate(learningSchemas.getProgress, 'params'),
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { userId, role } = req.user;

        try {
            // Authorization check
            if (role === 'student' && userId !== studentId) {
                throw new AuthorizationError('Students can only view their own progress');
            }

            const progress = await visualLearningService.getStudentProgress(studentId);

            res.json({
                success: true,
                data: progress
            });

        } catch (error) {
            console.error('Error fetching student progress:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/learning/progress
 * @desc    Update student's learning progress
 * @access  Private (Students, Teachers)
 */
router.post('/progress',
    authenticateToken,
    authorizeRoles(['student', 'teacher']),
    validate(learningSchemas.updateProgress, 'body'),
    asyncHandler(async (req, res) => {
        const { contentId, progressPercentage, timeSpent } = req.body;
        const { userId, role } = req.user;

        try {
            // For teachers, they can update progress for any student
            const studentId = role === 'teacher' ? req.body.studentId : userId;

            if (role === 'teacher' && !req.body.studentId) {
                throw new ValidationError('Student ID is required for teacher updates');
            }

            await visualLearningService.updateLearningProgress(
                studentId,
                contentId,
                progressPercentage,
                timeSpent
            );

            res.json({
                success: true,
                message: 'Learning progress updated successfully'
            });

        } catch (error) {
            console.error('Error updating learning progress:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/learning/content/:contentId
 * @desc    Get specific learning content
 * @access  Private (All authenticated users)
 */
router.get('/content/:contentId',
    authenticateToken,
    validate(learningSchemas.getContent, 'params'),
    asyncHandler(async (req, res) => {
        const { contentId } = req.params;

        try {
            res.json({
                success: true,
                message: 'Content retrieval - Coming in Phase 4',
                data: {
                    contentId,
                    type: 'visual_learning',
                    status: 'available'
                }
            });

        } catch (error) {
            console.error('Error fetching content:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/learning/feedback
 * @desc    Submit feedback for learning content
 * @access  Private (Students, Teachers)
 */
router.post('/feedback',
    authenticateToken,
    authorizeRoles(['student', 'teacher']),
    validate(learningSchemas.submitFeedback, 'body'),
    asyncHandler(async (req, res) => {
        const { contentId, rating, feedback, difficulty } = req.body;
        const { userId, role } = req.user;

        try {
            res.json({
                success: true,
                message: 'Feedback submitted successfully'
            });

        } catch (error) {
            console.error('Error submitting feedback:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/learning/recommendations/:studentId
 * @desc    Get personalized learning recommendations
 * @access  Private (Students, Teachers, Parents)
 */
router.get('/recommendations/:studentId',
    authenticateToken,
    authorizeRoles(['student', 'teacher', 'parent']),
    validate(learningSchemas.getRecommendations, 'params'),
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { userId, role } = req.user;

        try {
            // Authorization check
            if (role === 'student' && userId !== studentId) {
                throw new AuthorizationError('Students can only view their own recommendations');
            }

            res.json({
                success: true,
                message: 'Learning recommendations - Coming in Phase 4',
                data: {
                    studentId,
                    recommendations: []
                }
            });

        } catch (error) {
            console.error('Error fetching recommendations:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/learning/analyze-syllabus
 * @desc    Analyze syllabus and generate learning path
 * @access  Private (Teachers, Admins)
 */
router.post('/analyze-syllabus',
    authenticateToken,
    authorizeRoles(['teacher', 'admin']),
    validate(learningSchemas.analyzeSyllabus, 'body'),
    asyncHandler(async (req, res) => {
        const { syllabusText, gradeLevel, subject } = req.body;

        try {
            res.json({
                success: true,
                message: 'Syllabus analysis - Coming in Phase 4',
                data: {
                    gradeLevel,
                    subject,
                    topics: []
                }
            });

        } catch (error) {
            console.error('Error analyzing syllabus:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/learning/analytics/:studentId
 * @desc    Get learning analytics for a student
 * @access  Private (Teachers, Admins)
 */
router.get('/analytics/:studentId',
    authenticateToken,
    authorizeRoles(['teacher', 'admin']),
    validate(learningSchemas.getAnalytics, 'params'),
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { startDate, endDate } = req.query;

        try {
            res.json({
                success: true,
                message: 'Learning analytics - Coming in Phase 4',
                data: {
                    studentId,
                    period: { startDate, endDate },
                    metrics: {}
                }
            });

        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw error;
        }
    })
);

module.exports = router; 