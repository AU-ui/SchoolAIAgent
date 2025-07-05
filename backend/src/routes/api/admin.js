/**
 * EdTech Platform - Admin Routes
 * Handles administrative functions and teacher approval system
 */

const express = require('express');
const { validate } = require('../../middleware/validation');
const { asyncHandler, ValidationError, AuthenticationError } = require('../../middleware/errorHandler');
const StudentVerificationService = require('../../services/studentVerificationService');

const router = express.Router();

// Initialize services
const studentVerificationService = new StudentVerificationService();

/**
 * @route   GET /api/admin/pending-verifications
 * @desc    Get pending student verification requests
 * @access  Private (Teachers/Admins only)
 */
router.get('/pending-verifications',
    asyncHandler(async (req, res) => {
        try {
            const teacherId = req.user.id;
            const pendingRequests = await studentVerificationService.getPendingRequests(teacherId);

            res.json({
                success: true,
                data: {
                    pendingRequests,
                    count: pendingRequests.length
                }
            });

        } catch (error) {
            console.error('Error getting pending verifications:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/admin/approve-student/:requestId
 * @desc    Approve student registration
 * @access  Private (Teachers/Admins only)
 */
router.post('/approve-student/:requestId',
    asyncHandler(async (req, res) => {
        const { requestId } = req.params;
        const { approvalNotes } = req.body;
        const teacherId = req.user.id;

        try {
            const result = await studentVerificationService.approveStudentRegistration(
                requestId, 
                teacherId, 
                approvalNotes
            );

            res.json({
                success: true,
                message: result.message,
                data: result
            });

        } catch (error) {
            console.error('Error approving student:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/admin/reject-student/:requestId
 * @desc    Reject student registration
 * @access  Private (Teachers/Admins only)
 */
router.post('/reject-student/:requestId',
    asyncHandler(async (req, res) => {
        const { requestId } = req.params;
        const { rejectionReason } = req.body;
        const teacherId = req.user.id;

        try {
            const result = await studentVerificationService.rejectStudentRegistration(
                requestId, 
                teacherId, 
                rejectionReason
            );

            res.json({
                success: true,
                message: result.message,
                data: result
            });

        } catch (error) {
            console.error('Error rejecting student:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/admin/verification-stats
 * @desc    Get verification statistics
 * @access  Private (Admins only)
 */
router.get('/verification-stats',
    asyncHandler(async (req, res) => {
        try {
            // TODO: Implement statistics gathering
            const stats = {
                totalRequests: 0,
                pendingRequests: 0,
                approvedRequests: 0,
                rejectedRequests: 0,
                averageResponseTime: 0
            };

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error getting verification stats:', error);
            throw error;
        }
    })
);

module.exports = router;
