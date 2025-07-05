/**
 * EdTech Platform - Teacher Routes
 * Handles teacher-specific operations and class management
 */

const express = require('express');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// Import services
const UserService = require('../../services/userService');
const AttendanceService = require('../../services/attendanceService');
const TaskService = require('../../services/taskService');
const CommunicationService = require('../../services/communicationService');
const VisualLearningService = require('../../services/visualLearningService');

// Initialize services
const userService = new UserService();
const attendanceService = new AttendanceService();
const taskService = new TaskService();
const communicationService = new CommunicationService();
const visualLearningService = new VisualLearningService();

/**
 * @route   GET /api/teacher/profile
 * @desc    Get teacher profile
 * @access  Private (Teacher)
 */
router.get('/profile',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const teacher = await userService.findById(req.user.id);
        res.json({ success: true, data: teacher });
    })
);

/**
 * @route   PUT /api/teacher/profile
 * @desc    Update teacher profile
 * @access  Private (Teacher)
 */
router.put('/profile',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { firstName, lastName, phone, avatarUrl, bio, subjects, preferences } = req.body;
        const updateData = { firstName, lastName, phone, avatarUrl, bio, subjects, preferences };
        const updatedTeacher = await userService.updateUser(req.user.id, updateData);
        res.json({ success: true, message: 'Profile updated successfully', data: updatedTeacher });
    })
);

/**
 * @route   GET /api/teacher/classes
 * @desc    Get classes taught by teacher
 * @access  Private (Teacher)
 */
router.get('/classes',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const classes = await userService.getTeacherClasses(req.user.id, req.tenantId);
        res.json({ success: true, data: classes });
    })
);

/**
 * @route   GET /api/teacher/classes/:classId/students
 * @desc    Get students in a specific class
 * @access  Private (Teacher)
 */
router.get('/classes/:classId/students',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { classId } = req.params;
        const students = await userService.getClassStudents(classId, req.tenantId);
        res.json({ success: true, data: students });
    })
);

/**
 * @route   GET /api/teacher/classes/:classId/attendance
 * @desc    Get attendance for a specific class
 * @access  Private (Teacher)
 */
router.get('/classes/:classId/attendance',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { classId } = req.params;
        const { date, startDate, endDate } = req.query;
        const attendance = await attendanceService.getClassAttendance(classId, req.tenantId, { date, startDate, endDate });
        res.json({ success: true, data: attendance });
    })
);

/**
 * @route   POST /api/teacher/classes/:classId/attendance
 * @desc    Mark attendance for a class
 * @access  Private (Teacher)
 */
router.post('/classes/:classId/attendance',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { classId } = req.params;
        const { date, attendanceData } = req.body;
        const result = await attendanceService.markClassAttendance(classId, req.user.id, date, attendanceData, req.tenantId);
        res.status(201).json({ success: true, message: 'Attendance marked successfully', data: result });
    })
);

/**
 * @route   GET /api/teacher/students
 * @desc    Get all students taught by teacher
 * @access  Private (Teacher)
 */
router.get('/students',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const students = await userService.getTeacherStudents(req.user.id, req.tenantId);
        res.json({ success: true, data: students });
    })
);

/**
 * @route   GET /api/teacher/students/:studentId
 * @desc    Get specific student details
 * @access  Private (Teacher)
 */
router.get('/students/:studentId',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const student = await userService.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        res.json({ success: true, data: student });
    })
);

/**
 * @route   GET /api/teacher/students/:studentId/attendance
 * @desc    Get student attendance
 * @access  Private (Teacher)
 */
router.get('/students/:studentId/attendance',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { startDate, endDate, classId } = req.query;
        const filters = { startDate, endDate, classId };
        const attendance = await attendanceService.getStudentAttendance(studentId, req.tenantId, filters);
        res.json({ success: true, data: attendance });
    })
);

/**
 * @route   GET /api/teacher/students/:studentId/progress
 * @desc    Get student learning progress
 * @access  Private (Teacher)
 */
router.get('/students/:studentId/progress',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { classId, subjectId, period } = req.query;
        const progress = await visualLearningService.getStudentProgress(studentId, req.tenantId, { classId, subjectId, period });
        res.json({ success: true, data: progress });
    })
);

/**
 * @route   POST /api/teacher/tasks
 * @desc    Create a new task
 * @access  Private (Teacher)
 */
router.post('/tasks',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const taskData = { ...req.body, assignedBy: req.user.id, tenantId: req.tenantId };
        const newTask = await taskService.createTask(taskData);
        res.status(201).json({ success: true, message: 'Task created successfully', data: newTask });
    })
);

/**
 * @route   GET /api/teacher/tasks
 * @desc    Get tasks created by teacher
 * @access  Private (Teacher)
 */
router.get('/tasks',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const tasks = await taskService.getTasksByCreator(req.user.id, req.tenantId);
        res.json({ success: true, data: tasks });
    })
);

/**
 * @route   PUT /api/teacher/tasks/:id
 * @desc    Update a task
 * @access  Private (Teacher)
 */
router.put('/tasks/:id',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = { ...req.body, tenantId: req.tenantId };
        const updatedTask = await taskService.updateTask(id, updateData, req.tenantId);
        res.json({ success: true, message: 'Task updated successfully', data: updatedTask });
    })
);

/**
 * @route   DELETE /api/teacher/tasks/:id
 * @desc    Delete a task
 * @access  Private (Teacher)
 */
router.delete('/tasks/:id',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        await taskService.deleteTask(id, req.tenantId);
        res.json({ success: true, message: 'Task deleted successfully' });
    })
);

/**
 * @route   POST /api/teacher/messages
 * @desc    Send a message
 * @access  Private (Teacher)
 */
router.post('/messages',
    authenticateToken,
    authorizeRoles(['teacher']),
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
        res.status(201).json({ success: true, message: 'Message sent successfully', data: message });
    })
);

/**
 * @route   GET /api/teacher/messages
 * @desc    Get teacher messages
 * @access  Private (Teacher)
 */
router.get('/messages',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { type, limit, offset } = req.query;
        const messages = await communicationService.getUserMessages(req.user.id, req.tenantId, {
            type,
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0
        });
        res.json({ success: true, data: messages });
    })
);

/**
 * @route   GET /api/teacher/notifications
 * @desc    Get teacher notifications
 * @access  Private (Teacher)
 */
router.get('/notifications',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { limit, offset, read } = req.query;
        const notifications = await communicationService.getUserNotifications(req.user.id, req.tenantId, {
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0,
            read: read === 'true'
        });
        res.json({ success: true, data: notifications });
    })
);

/**
 * @route   PUT /api/teacher/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (Teacher)
 */
router.put('/notifications/:id/read',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        await communicationService.markNotificationAsRead(id, req.user.id);
        res.json({ success: true, message: 'Notification marked as read' });
    })
);

/**
 * @route   GET /api/teacher/dashboard
 * @desc    Get teacher dashboard data
 * @access  Private (Teacher)
 */
router.get('/dashboard',
    authenticateToken,
    authorizeRoles(['teacher']),
    asyncHandler(async (req, res) => {
        const dashboardData = await userService.getTeacherDashboard(req.user.id, req.tenantId);
        res.json({ success: true, data: dashboardData });
    })
);

module.exports = router;
