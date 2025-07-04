/**
 * EdTech Platform - Fee Management Routes
 * Handles fee categories, student fees, payments, and reminders
 */

const express = require('express');
const { validate } = require('../../middleware/validation');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// Import services
const FeeService = require('../../services/feeService');
const emailService = require('../../services/emailService');

// Initialize services
const feeService = new FeeService();

// Fee Categories Routes
/**
 * @route   POST /api/fees/categories
 * @desc    Create a new fee category
 * @access  Private (Admin, Teacher)
 */
router.post('/categories',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const categoryData = {
            ...req.body,
            tenantId: req.tenantId
        };

        const newCategory = await feeService.createFeeCategory(categoryData);

        res.status(201).json({
            success: true,
            message: 'Fee category created successfully',
            data: newCategory
        });
    })
);

/**
 * @route   GET /api/fees/categories
 * @desc    Get all fee categories for tenant
 * @access  Private
 */
router.get('/categories',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const categories = await feeService.getFeeCategories(req.tenantId);

        res.json({
            success: true,
            data: categories
        });
    })
);

/**
 * @route   GET /api/fees/categories/stats
 * @desc    Get fee categories with usage statistics
 * @access  Private (Admin, Teacher)
 */
router.get('/categories/stats',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const categoriesWithStats = await feeService.getFeeCategoriesWithStats(req.tenantId);

        res.json({
            success: true,
            data: categoriesWithStats
        });
    })
);

/**
 * @route   PUT /api/fees/categories/:id
 * @desc    Update fee category
 * @access  Private (Admin, Teacher)
 */
router.put('/categories/:id',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = {
            ...req.body,
            tenantId: req.tenantId
        };

        const updatedCategory = await feeService.updateFeeCategory(id, updateData);

        res.json({
            success: true,
            message: 'Fee category updated successfully',
            data: updatedCategory
        });
    })
);

/**
 * @route   DELETE /api/fees/categories/:id
 * @desc    Delete fee category
 * @access  Private (Admin)
 */
router.delete('/categories/:id',
    authenticateToken,
    authorizeRoles(['admin']),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        await feeService.deleteFeeCategory(id, req.tenantId);

        res.json({
            success: true,
            message: 'Fee category deleted successfully'
        });
    })
);

// Student Fees Routes
/**
 * @route   POST /api/fees/student-fees
 * @desc    Create student fee record
 * @access  Private (Admin, Teacher)
 */
router.post('/student-fees',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const feeData = {
            ...req.body,
            tenantId: req.tenantId
        };

        const newFee = await feeService.createStudentFee(feeData);

        res.status(201).json({
            success: true,
            message: 'Student fee record created successfully',
            data: newFee
        });
    })
);

/**
 * @route   GET /api/fees/student-fees
 * @desc    Get all student fees with filters
 * @access  Private (Admin, Teacher)
 */
router.get('/student-fees',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const filters = req.query;
        const fees = await feeService.getAllStudentFees(req.tenantId, filters);

        res.json({
            success: true,
            data: fees
        });
    })
);

/**
 * @route   GET /api/fees/student-fees/student/:studentId
 * @desc    Get fees for a specific student
 * @access  Private
 */
router.get('/student-fees/student/:studentId',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { status } = req.query;

        // Check if user has permission to view this student's fees
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
 * @route   GET /api/fees/student-fees/overdue
 * @desc    Get overdue fees
 * @access  Private (Admin, Teacher)
 */
router.get('/student-fees/overdue',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const overdueFees = await feeService.getOverdueFees(req.tenantId);

        res.json({
            success: true,
            data: overdueFees
        });
    })
);

// Payment Routes
/**
 * @route   POST /api/fees/payments
 * @desc    Record a fee payment
 * @access  Private (Admin, Teacher)
 */
router.post('/payments',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const paymentData = {
            ...req.body,
            tenantId: req.tenantId
        };

        const paymentResult = await feeService.recordPayment(paymentData);

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            data: paymentResult
        });
    })
);

/**
 * @route   GET /api/fees/payments/student/:studentId
 * @desc    Get payment history for a student
 * @access  Private
 */
router.get('/payments/student/:studentId',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;

        // Check if user has permission to view this student's payments
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const payments = await feeService.getPaymentHistory(studentId, req.tenantId);

        res.json({
            success: true,
            data: payments
        });
    })
);

// Statistics Routes
/**
 * @route   GET /api/fees/statistics
 * @desc    Get fee statistics for tenant
 * @access  Private (Admin, Teacher)
 */
router.get('/statistics',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const statistics = await feeService.getFeeStatistics(req.tenantId);

        res.json({
            success: true,
            data: statistics
        });
    })
);

/**
 * @route   GET /api/fees/statistics/student/:studentId
 * @desc    Get fee statistics for a specific student
 * @access  Private
 */
router.get('/statistics/student/:studentId',
    authenticateToken,
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;

        // Check if user has permission to view this student's statistics
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

// Reminder Routes
/**
 * @route   GET /api/fees/reminders
 * @desc    Generate fee reminders for overdue fees
 * @access  Private (Admin, Teacher)
 */
router.get('/reminders',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const reminders = await feeService.generateFeeReminders(req.tenantId);

        res.json({
            success: true,
            data: reminders
        });
    })
);

/**
 * @route   POST /api/fees/reminders/send
 * @desc    Send fee reminders via email
 * @access  Private (Admin, Teacher)
 */
router.post('/reminders/send',
    authenticateToken,
    authorizeRoles(['admin', 'teacher']),
    asyncHandler(async (req, res) => {
        const reminders = await feeService.generateFeeReminders(req.tenantId);
        
        let sentCount = 0;
        const failedEmails = [];

        for (const reminder of reminders) {
            try {
                await emailService.sendFeeReminder(
                    reminder.studentEmail,
                    reminder.studentName,
                    reminder.feeCategory,
                    reminder.outstandingAmount,
                    reminder.dueDate,
                    reminder.daysOverdue
                );
                sentCount++;
            } catch (error) {
                console.error(`Failed to send reminder to ${reminder.studentEmail}:`, error);
                failedEmails.push(reminder.studentEmail);
            }
        }

        res.json({
            success: true,
            message: `Fee reminders sent successfully`,
            data: {
                totalReminders: reminders.length,
                sentCount,
                failedEmails
            }
        });
    })
);

// Maintenance Routes
/**
 * @route   POST /api/fees/maintenance/update-overdue
 * @desc    Update fee status to overdue
 * @access  Private (Admin)
 */
router.post('/maintenance/update-overdue',
    authenticateToken,
    authorizeRoles(['admin']),
    asyncHandler(async (req, res) => {
        const updatedCount = await feeService.updateOverdueFees();

        res.json({
            success: true,
            message: `Updated ${updatedCount} fees to overdue status`,
            data: { updatedCount }
        });
    })
);

module.exports = router;
