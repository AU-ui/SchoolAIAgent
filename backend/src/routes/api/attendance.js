/**
 * EdTech Platform - Attendance Routes
 * Handles attendance tracking, QR codes, and reporting
 */

const express = require('express');
const { validate } = require('../../middleware/validation');
const { attendanceSchemas } = require('../../middleware/validation');
const { asyncHandler, ValidationError, AuthenticationError, AuthorizationError } = require('../../middleware/errorHandler');

const router = express.Router();

// Import services
const AttendanceService = require('../../services/attendanceService');
const attendanceService = new AttendanceService();

/**
 * @route   POST /api/attendance/start-session
 * @desc    Start a new attendance session for a class
 * @access  Private (Teachers only)
 */
router.post('/start-session',
    validate(attendanceSchemas.startSession, 'body'),
    asyncHandler(async (req, res) => {
        const { classId, duration, location } = req.body;
        const teacherId = req.user.userId;

        try {
            const session = await attendanceService.startAttendanceSession({
                classId,
                teacherId,
                duration,
                location
            });

            res.status(201).json({
                success: true,
                message: 'Attendance session started successfully',
                data: session
            });

        } catch (error) {
            console.error('Error starting attendance session:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/attendance/session/:sessionId/qr
 * @desc    Generate QR code for attendance session
 * @access  Private (Teachers only)
 */
router.get('/session/:sessionId/qr',
    asyncHandler(async (req, res) => {
        const { sessionId } = req.params;
        const teacherId = req.user.userId;

        try {
            const qrCode = await attendanceService.generateQrCode(sessionId, teacherId);
            
            res.json({
                success: true,
                data: qrCode
            });

        } catch (error) {
            console.error('Error generating QR code:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/attendance/mark
 * @desc    Mark attendance using QR code or manual entry
 * @access  Private
 */
router.post('/mark',
    validate(attendanceSchemas.markAttendance, 'body'),
    asyncHandler(async (req, res) => {
        const { sessionId, studentId, method, qrCode, location } = req.body;
        const userId = req.user.userId;

        try {
            const attendance = await attendanceService.markAttendance({
                sessionId,
                studentId,
                userId,
                method,
                qrCode,
                location
            });

            res.status(201).json({
                success: true,
                message: 'Attendance marked successfully',
                data: attendance
            });

        } catch (error) {
            console.error('Error marking attendance:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/attendance/session/:sessionId
 * @desc    Get attendance session details
 * @access  Private
 */
router.get('/session/:sessionId',
    asyncHandler(async (req, res) => {
        const { sessionId } = req.params;
        const userId = req.user.userId;

        try {
            const session = await attendanceService.getSessionDetails(sessionId, userId);
            
            res.json({
                success: true,
                data: session
            });

        } catch (error) {
            console.error('Error getting session details:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/attendance/student/:studentId
 * @desc    Get attendance history for a student
 * @access  Private (Teachers, Parents, Students)
 */
router.get('/student/:studentId',
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { startDate, endDate, classId } = req.query;
        const userId = req.user.userId;

        try {
            const attendance = await attendanceService.getStudentAttendance({
                studentId,
                userId,
                startDate,
                endDate,
                classId
            });

            res.json({
                success: true,
                data: attendance
            });

        } catch (error) {
            console.error('Error getting student attendance:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/attendance/class/:classId
 * @desc    Get attendance summary for a class
 * @access  Private (Teachers only)
 */
router.get('/class/:classId',
    asyncHandler(async (req, res) => {
        const { classId } = req.params;
        const { date, period } = req.query;
        const teacherId = req.user.userId;

        try {
            const summary = await attendanceService.getClassAttendanceSummary({
                classId,
                teacherId,
                date,
                period
            });

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            console.error('Error getting class attendance summary:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/attendance/bulk-mark
 * @desc    Mark attendance for multiple students
 * @access  Private (Teachers only)
 */
router.post('/bulk-mark',
    validate(attendanceSchemas.bulkMarkAttendance, 'body'),
    asyncHandler(async (req, res) => {
        const { sessionId, students } = req.body;
        const teacherId = req.user.userId;

        try {
            const results = await attendanceService.bulkMarkAttendance({
                sessionId,
                teacherId,
                students
            });

            res.status(201).json({
                success: true,
                message: 'Bulk attendance marked successfully',
                data: results
            });

        } catch (error) {
            console.error('Error bulk marking attendance:', error);
            throw error;
        }
    })
);

/**
 * @route   PUT /api/attendance/:attendanceId
 * @desc    Update attendance record
 * @access  Private (Teachers only)
 */
router.put('/:attendanceId',
    validate(attendanceSchemas.updateAttendance, 'body'),
    asyncHandler(async (req, res) => {
        const { attendanceId } = req.params;
        const updateData = req.body;
        const teacherId = req.user.userId;

        try {
            const attendance = await attendanceService.updateAttendance({
                attendanceId,
                teacherId,
                updateData
            });

            res.json({
                success: true,
                message: 'Attendance updated successfully',
                data: attendance
            });

        } catch (error) {
            console.error('Error updating attendance:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/attendance/reports/class/:classId
 * @desc    Generate attendance report for a class
 * @access  Private (Teachers, Admins)
 */
router.get('/reports/class/:classId',
    asyncHandler(async (req, res) => {
        const { classId } = req.params;
        const { startDate, endDate, format } = req.query;
        const userId = req.user.userId;

        try {
            const report = await attendanceService.generateClassReport({
                classId,
                userId,
                startDate,
                endDate,
                format
            });

            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            console.error('Error generating class report:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/attendance/reports/student/:studentId
 * @desc    Generate attendance report for a student
 * @access  Private (Teachers, Parents, Students)
 */
router.get('/reports/student/:studentId',
    asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { startDate, endDate, format } = req.query;
        const userId = req.user.userId;

        try {
            const report = await attendanceService.generateStudentReport({
                studentId,
                userId,
                startDate,
                endDate,
                format
            });

            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            console.error('Error generating student report:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/attendance/analytics
 * @desc    Get attendance analytics and insights
 * @access  Private (Teachers, Admins)
 */
router.get('/analytics',
    asyncHandler(async (req, res) => {
        const { classId, startDate, endDate, metric } = req.query;
        const userId = req.user.userId;

        try {
            const analytics = await attendanceService.getAnalytics({
                userId,
                classId,
                startDate,
                endDate,
                metric
            });

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            console.error('Error getting attendance analytics:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/attendance/notify-absent
 * @desc    Send notifications for absent students
 * @access  Private (Teachers only)
 */
router.post('/notify-absent',
    validate(attendanceSchemas.notifyAbsent, 'body'),
    asyncHandler(async (req, res) => {
        const { sessionId, absentStudents, message } = req.body;
        const teacherId = req.user.userId;

        try {
            const notifications = await attendanceService.notifyAbsentStudents({
                sessionId,
                teacherId,
                absentStudents,
                message
            });

            res.json({
                success: true,
                message: 'Absence notifications sent successfully',
                data: notifications
            });

        } catch (error) {
            console.error('Error sending absence notifications:', error);
            throw error;
        }
    })
);

module.exports = router; 