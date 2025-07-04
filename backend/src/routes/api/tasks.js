/**
 * EdTech Platform - Task Management Routes
 * Handles task creation, assignment, tracking, and completion
 */

const express = require('express');
const { validate } = require('../../middleware/validation');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// Import services
const TaskService = require('../../services/taskService');

// Initialize services
const taskService = new TaskService();

// Task Routes
/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post('/',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const taskData = {
            ...req.body,
            assignedBy: req.user.id,
            tenantId: req.tenantId
        };

        const newTask = await taskService.createTask(taskData);

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: newTask
        });
    })
);

/**
 * @route   GET /api/tasks
 * @desc    Get tasks with filters
 * @access  Private
 */
router.get('/',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const filters = req.query;
        const tasks = await taskService.getTasks(req.tenantId, filters);

        res.json({
            success: true,
            data: tasks
        });
    })
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task by ID with details
 * @access  Private
 */
router.get('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const task = await taskService.getTaskById(id, req.tenantId);

        res.json({
            success: true,
            data: task
        });
    })
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.put('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = {
            ...req.body,
            tenantId: req.tenantId
        };

        const updatedTask = await taskService.updateTask(id, updateData, req.tenantId);

        res.json({
            success: true,
            message: 'Task updated successfully',
            data: updatedTask
        });
    })
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task
 * @access  Private
 */
router.delete('/:id',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        await taskService.deleteTask(id, req.tenantId);

        res.json({
            success: true,
            message: 'Task deleted successfully'
        });
    })
);

// Task Comments Routes
/**
 * @route   POST /api/tasks/:id/comments
 * @desc    Add comment to task
 * @access  Private
 */
router.post('/:id/comments',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { comment } = req.body;

        const newComment = await taskService.addComment(id, req.user.id, comment, req.tenantId);

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: newComment
        });
    })
);

/**
 * @route   GET /api/tasks/:id/comments
 * @desc    Get task comments
 * @access  Private
 */
router.get('/:id/comments',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const comments = await taskService.getTaskComments(id, req.tenantId);

        res.json({
            success: true,
            data: comments
        });
    })
);

// User-specific Task Routes
/**
 * @route   GET /api/tasks/assigned-to-me
 * @desc    Get tasks assigned to current user
 * @access  Private
 */
router.get('/assigned-to-me',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { status } = req.query;
        const tasks = await taskService.getTasksByAssignee(req.user.id, req.tenantId, status);

        res.json({
            success: true,
            data: tasks
        });
    })
);

/**
 * @route   GET /api/tasks/created-by-me
 * @desc    Get tasks created by current user
 * @access  Private
 */
router.get('/created-by-me',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const tasks = await taskService.getTasksByCreator(req.user.id, req.tenantId);

        res.json({
            success: true,
            data: tasks
        });
    })
);

/**
 * @route   GET /api/tasks/user/:userId
 * @desc    Get tasks assigned to a specific user
 * @access  Private (Admin, Teacher)
 */
router.get('/user/:userId',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const { userId } = req.params;
        const { status } = req.query;

        const tasks = await taskService.getTasksByAssignee(userId, req.tenantId, status);

        res.json({
            success: true,
            data: tasks
        });
    })
);

// Class-specific Task Routes
/**
 * @route   GET /api/tasks/class/:classId
 * @desc    Get tasks for a specific class
 * @access  Private
 */
router.get('/class/:classId',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { classId } = req.params;

        // Check if user has access to this class
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            // For students, check if they're enrolled in this class
            // This would require additional logic to check enrollment
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const tasks = await taskService.getTasksByClass(classId, req.tenantId);

        res.json({
            success: true,
            data: tasks
        });
    })
);

// Overdue Tasks Routes
/**
 * @route   GET /api/tasks/overdue
 * @desc    Get overdue tasks
 * @access  Private
 */
router.get('/overdue',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const overdueTasks = await taskService.getOverdueTasks(req.tenantId);

        res.json({
            success: true,
            data: overdueTasks
        });
    })
);

// Statistics Routes
/**
 * @route   GET /api/tasks/statistics
 * @desc    Get task statistics for tenant
 * @access  Private (Admin, Teacher)
 */
router.get('/statistics',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const statistics = await taskService.getTaskStatistics(req.tenantId);

        res.json({
            success: true,
            data: statistics
        });
    })
);

/**
 * @route   GET /api/tasks/statistics/user/:userId
 * @desc    Get task statistics for a specific user
 * @access  Private
 */
router.get('/statistics/user/:userId',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { userId } = req.params;

        // Check if user has permission to view this user's statistics
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const statistics = await taskService.getUserTaskStatistics(userId, req.tenantId);

        res.json({
            success: true,
            data: statistics
        });
    })
);

// Tag-based Routes
/**
 * @route   GET /api/tasks/tags
 * @desc    Get all unique tags used in tasks
 * @access  Private
 */
router.get('/tags',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const tags = await taskService.getTaskTags(req.tenantId);

        res.json({
            success: true,
            data: tags
        });
    })
);

/**
 * @route   GET /api/tasks/by-tags
 * @desc    Get tasks by tags
 * @access  Private
 */
router.get('/by-tags',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { tags } = req.query;
        
        if (!tags) {
            return res.status(400).json({
                success: false,
                message: 'Tags parameter is required'
            });
        }

        const tagArray = Array.isArray(tags) ? tags : [tags];
        const tasks = await taskService.getTasksByTags(tagArray, req.tenantId);

        res.json({
            success: true,
            data: tasks
        });
    })
);

// Maintenance Routes
/**
 * @route   POST /api/tasks/maintenance/update-overdue
 * @desc    Update task status to overdue
 * @access  Private (Admin)
 */
router.post('/maintenance/update-overdue',
    authenticateToken,
    authorizeRoles(['admin']),
    asyncHandler(async (req, res) => {
        const updatedCount = await taskService.updateOverdueTasks();

        res.json({
            success: true,
            message: `Updated ${updatedCount} tasks to overdue status`,
            data: { updatedCount }
        });
    })
);

module.exports = router;
