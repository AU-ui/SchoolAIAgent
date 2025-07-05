/**
 * EdTech Platform - Parent Routes
 * Handles parent-specific operations and access to child data
 */

const express = require('express');
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
 * Middleware to check if the parent has access to the child
 */
async function checkParentAccess(req, res, next) {
    const parentId = req.user.id;
    const childId = req.query.childId || req.body.childId || req.params.childId;
    if (!childId) {
        return res.status(400).json({ success: false, message: 'Child ID is required' });
    }
    const isLinked = await userService.isParentLinkedToChild(parentId, childId);
    if (!isLinked) {
        return res.status(403).json({ success: false, message: 'Access denied: Not linked to this child' });
    }
    req.childId = childId;
    next();
}

/**
 * @route   GET /api/parent/children
 * @desc    Get all children linked to the parent
 * @access  Private (Parent)
 */
router.get('/children',
    authenticateToken,
    authorizeRoles(['parent']),
    asyncHandler(async (req, res) => {
        const children = await userService.getChildrenForParent(req.user.id, req.tenantId);
        res.json({ success: true, data: children });
    })
);

/**
 * @route   GET /api/parent/child/profile
 * @desc    Get child profile
 * @access  Private (Parent)
 */
router.get('/child/profile',
    authenticateToken,
    authorizeRoles(['parent']),
    checkParentAccess,
    asyncHandler(async (req, res) => {
        const child = await userService.findById(req.childId);
        res.json({ success: true, data: child });
    })
);

/**
 * @route   GET /api/parent/child/attendance
 * @desc    Get child attendance history
 * @access  Private (Parent)
 */
router.get('/child/attendance',
    authenticateToken,
    authorizeRoles(['parent']),
    checkParentAccess,
    asyncHandler(async (req, res) => {
        const { startDate, endDate, classId } = req.query;
        const filters = { startDate, endDate, classId };
        const attendance = await attendanceService.getStudentAttendance(req.childId, req.tenantId, filters);
        res.json({ success: true, data: attendance });
    })
);

/**
 * @route   GET /api/parent/child/fees
 * @desc    Get child fees
 * @access  Private (Parent)
 */
router.get('/child/fees',
    authenticateToken,
    authorizeRoles(['parent']),
    checkParentAccess,
    asyncHandler(async (req, res) => {
        const { status } = req.query;
        const fees = await feeService.getStudentFees(req.childId, req.tenantId, status);
        res.json({ success: true, data: fees });
    })
);

/**
 * @route   GET /api/parent/child/tasks
 * @desc    Get child tasks
 * @access  Private (Parent)
 */
router.get('/child/tasks',
    authenticateToken,
    authorizeRoles(['parent']),
    checkParentAccess,
    asyncHandler(async (req, res) => {
        const { status } = req.query;
        const tasks = await taskService.getTasksByAssignee(req.childId, req.tenantId, status);
        res.json({ success: true, data: tasks });
    })
);

/**
 * @route   GET /api/parent/child/messages
 * @desc    Get child messages
 * @access  Private (Parent)
 */
router.get('/child/messages',
    authenticateToken,
    authorizeRoles(['parent']),
    checkParentAccess,
    asyncHandler(async (req, res) => {
        const { type, limit, offset } = req.query;
        const messages = await communicationService.getUserMessages(req.childId, req.tenantId, {
            type,
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0
        });
        res.json({ success: true, data: messages });
    })
);

/**
 * @route   GET /api/parent/child/notifications
 * @desc    Get child notifications
 * @access  Private (Parent)
 */
router.get('/child/notifications',
    authenticateToken,
    authorizeRoles(['parent']),
    checkParentAccess,
    asyncHandler(async (req, res) => {
        const { limit, offset, read } = req.query;
        const notifications = await communicationService.getUserNotifications(req.childId, req.tenantId, {
            limit: parseInt(limit) || 20,
            offset: parseInt(offset) || 0,
            read: read === 'true'
        });
        res.json({ success: true, data: notifications });
    })
);

/**
 * @route   GET /api/parent/child/learning-progress
 * @desc    Get child learning progress
 * @access  Private (Parent)
 */
router.get('/child/learning-progress',
    authenticateToken,
    authorizeRoles(['parent']),
    checkParentAccess,
    asyncHandler(async (req, res) => {
        const { classId, subjectId, period } = req.query;
        const progress = await visualLearningService.getStudentProgress(req.childId, req.tenantId, {
            classId,
            subjectId,
            period
        });
        res.json({ success: true, data: progress });
    })
);

/**
 * @route   GET /api/parent/child/classes
 * @desc    Get child enrolled classes
 * @access  Private (Parent)
 */
router.get('/child/classes',
    authenticateToken,
    authorizeRoles(['parent']),
    checkParentAccess,
    asyncHandler(async (req, res) => {
        const classes = await userService.getStudentClasses(req.childId, req.tenantId);
        res.json({ success: true, data: classes });
    })
);

/**
 * @route   GET /api/parent/child/schedule
 * @desc    Get child class schedule
 * @access  Private (Parent)
 */
router.get('/child/schedule',
    authenticateToken,
    authorizeRoles(['parent']),
    checkParentAccess,
    asyncHandler(async (req, res) => {
        const { date, week } = req.query;
        const schedule = await userService.getStudentSchedule(req.childId, req.tenantId, { date, week });
        res.json({ success: true, data: schedule });
    })
);

module.exports = router;
