/**
 * EdTech Platform - Student Routes
 * Handles student-specific operations and data access
 */

const express = require('express');
const { validate } = require('../../middleware/validation');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// Import services
const UserService = require('../../services/userService');
const AttendanceService = require('../../services/attendanceService');
const FeeService = require('../../services/feeService');
const TaskService = require('../../services/taskService');
const CommunicationService = require('../../services/communicationService');
const VisualLearningService = require('../../services/visualLearningService');

// Initialize services
const userService = new UserService();
const attendanceService = new AttendanceService();
const feeService = new FeeService();
const taskService = new TaskService();
const communicationService = new CommunicationService();
const visualLearningService = new VisualLearningService();

/**
 * @route   GET /api/student/profile
 * @desc    Get student profile
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/profile',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
        
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const student = await userService.findById(studentId);
        
        if (!student || student.role !== 'student') {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            data: student
        });
    })
);

/**
 * @route   PUT /api/student/profile
 * @desc    Update student profile
 * @access  Private (Student)
 */
router.put('/profile',
    authenticateToken,
    authorizeRoles(['student']),
    asyncHandler(async (req, res) => {
        const { firstName, lastName, phone, avatarUrl, preferences } = req.body;
        
        const updateData = {
            firstName,
            lastName,
            phone,
            avatarUrl,
            preferences
        };

        const updatedStudent = await userService.updateUser(req.user.id, updateData);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedStudent
        });
    })
);

/**
 * @route   GET /api/student/attendance
 * @desc    Get student attendance history
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/attendance',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
        const { startDate, endDate, classId } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const filters = { startDate, endDate, classId };
        const attendance = await attendanceService.getStudentAttendance(studentId, req.tenantId, filters);

        res.json({
            success: true,
            data: attendance
        });
    })
);

/**
 * @route   GET /api/student/attendance/statistics
 * @desc    Get student attendance statistics
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/attendance/statistics',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
        const { period } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const statistics = await attendanceService.getStudentAttendanceStatistics(studentId, req.tenantId, period);

        res.json({
            success: true,
            data: statistics
        });
    })
);

/**
 * @route   GET /api/student/fees
 * @desc    Get student fees
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/fees',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
        const { status } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const fees = await feeService.getStudentFees(studentId, req.tenantId, status);

        res.json({
            success: true,
            data: fees
        });
    })
);

/**
 * @route   GET /api/student/fees/statistics
 * @desc    Get student fee statistics
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/fees/statistics',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const statistics = await feeService.getStudentFeeStatistics(studentId, req.tenantId);

        res.json({
            success: true,
            data: statistics
        });
    })
);

/**
 * @route   GET /api/student/tasks
 * @desc    Get tasks assigned to student
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/tasks',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
        const { status } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const tasks = await taskService.getTasksByAssignee(studentId, req.tenantId, status);

        res.json({
            success: true,
            data: tasks
        });
    })
);

/**
 * @route   GET /api/student/tasks/statistics
 * @desc    Get student task statistics
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/tasks/statistics',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const statistics = await taskService.getUserTaskStatistics(studentId, req.tenantId);

        res.json({
            success: true,
            data: statistics
        });
    })
);

/**
 * @route   GET /api/student/messages
 * @desc    Get student messages
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/messages',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
        const { type, limit, offset } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const messages = await communicationService.getUserMessages(studentId, req.tenantId, {
            type,
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: messages
        });
    })
);

/**
 * @route   POST /api/student/messages
 * @desc    Send message as student
 * @access  Private (Student)
 */
router.post('/messages',
    authenticateToken,
    authorizeRoles(['student']),
    asyncHandler(async (req, res) => {
        const { recipientId, subject, content, type, attachments } = req.body;

        const messageData = {
            senderId: req.user.id,
            recipientId,
            subject,
            content,
            type: type || 'general',
            attachments,
            tenantId: req.tenantId
        };

        const message = await communicationService.sendMessage(messageData);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: message
        });
    })
);

/**
 * @route   GET /api/student/learning-progress
 * @desc    Get student learning progress
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/learning-progress',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
        const { classId, subjectId, period } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const progress = await visualLearningService.getStudentProgress(studentId, req.tenantId, {
            classId,
            subjectId,
            period
        });

        res.json({
            success: true,
            data: progress
        });
    })
);

/**
 * @route   GET /api/student/classes
 * @desc    Get student enrolled classes
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/classes',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const classes = await userService.getStudentClasses(studentId, req.tenantId);

        res.json({
            success: true,
            data: classes
        });
    })
);

/**
 * @route   GET /api/student/schedule
 * @desc    Get student class schedule
 * @access  Private (Student, Parent, Teacher, Admin)
 */
router.get('/schedule',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const studentId = req.user.role === 'student' ? req.user.id : req.query.studentId;
        const { date, week } = req.query;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        // Check permissions
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const schedule = await userService.getStudentSchedule(studentId, req.tenantId, {
            date,
            week
        });

        res.json({
            success: true,
            data: schedule
        });
    })
);

/**
 * @route   GET /api/student/notifications
 * @desc    Get student notifications
 * @access  Private (Student)
 */
router.get('/notifications',
    authenticateToken,
    authorizeRoles(['student']),
    asyncHandler(async (req, res) => {
        const { limit, offset, read } = req.query;

        const notifications = await communicationService.getUserNotifications(req.user.id, req.tenantId, {
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0,
            read: read === 'true'
        });

        res.json({
            success: true,
            data: notifications
        });
    })
);

/**
 * @route   PUT /api/student/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (Student)
 */
router.put('/notifications/:id/read',
    authenticateToken,
    authorizeRoles(['student']),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        await communicationService.markNotificationAsRead(id, req.user.id);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    })
);

module.exports = router; 