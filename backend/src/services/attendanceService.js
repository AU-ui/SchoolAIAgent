/**
 * EdTech Platform - Attendance Service
 * Handles attendance management, tracking, and ML-powered insights
 */

const { pool } = require('../config/database');
const { ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler');
const MLService = require('./mlIntegrationService');

class AttendanceService {
    constructor() {
        this.mlService = new MLService();
    }

    /**
     * Mark attendance for a student
     */
    async markAttendance(attendanceData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Set tenant context
            if (attendanceData.tenantId && attendanceData.tenantId !== 'public') {
                await client.query('SET app.current_tenant = $1', [attendanceData.tenantId]);
            }

            const query = `
                INSERT INTO attendance (
                    student_id, teacher_id, date, is_present, 
                    qr_code, remarks, tenant_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const values = [
                attendanceData.studentId,
                attendanceData.teacherId,
                attendanceData.date,
                attendanceData.isPresent,
                attendanceData.qrCode,
                attendanceData.remarks,
                attendanceData.tenantId,
                new Date(),
                new Date()
            ];

            const result = await client.query(query, values);
            await client.query('COMMIT');

            return this.formatAttendanceResponse(result.rows[0]);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error marking attendance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Mark bulk attendance for a class
     */
    async markBulkAttendance(bulkData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Set tenant context
            if (bulkData.tenantId && bulkData.tenantId !== 'public') {
                await client.query('SET app.current_tenant = $1', [bulkData.tenantId]);
            }

            const results = {
                marked: [],
                errors: []
            };

            for (const attendance of bulkData.attendanceData) {
                try {
                    const query = `
                        INSERT INTO attendance (
                            student_id, teacher_id, class_id, date, is_present, 
                            remarks, tenant_id, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT (student_id, date) DO UPDATE SET
                            is_present = EXCLUDED.is_present,
                            remarks = EXCLUDED.remarks,
                            updated_at = EXCLUDED.updated_at
                        RETURNING *
                    `;

                    const values = [
                        attendance.studentId,
                        bulkData.teacherId,
                        bulkData.classId,
                        bulkData.date,
                        attendance.isPresent,
                        attendance.remarks,
                        bulkData.tenantId,
                        new Date(),
                        new Date()
                    ];

                    const result = await client.query(query, values);
                    results.marked.push(this.formatAttendanceResponse(result.rows[0]));

                } catch (error) {
                    results.errors.push({
                        studentId: attendance.studentId,
                        error: error.message
                    });
                }
            }

            await client.query('COMMIT');
            return results;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error marking bulk attendance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get attendance by date for a student
     */
    async getAttendanceByDate(studentId, date) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT * FROM attendance 
                WHERE student_id = $1 AND date = $2
            `;

            const result = await client.query(query, [studentId, date]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return this.formatAttendanceResponse(result.rows[0]);

        } catch (error) {
            console.error('Error getting attendance by date:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get student attendance history
     */
    async getStudentAttendance(studentId, options) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT a.*, s.first_name, s.last_name, t.first_name as teacher_first_name, t.last_name as teacher_last_name
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                JOIN teachers t ON a.teacher_id = t.id
                WHERE a.student_id = $1
            `;

            const values = [studentId];
            let paramCount = 2;

            if (options.startDate) {
                query += ` AND a.date >= $${paramCount++}`;
                values.push(options.startDate);
            }

            if (options.endDate) {
                query += ` AND a.date <= $${paramCount++}`;
                values.push(options.endDate);
            }

            query += ` ORDER BY a.date DESC`;

            const result = await client.query(query, values);
            
            return result.rows.map(row => this.formatAttendanceResponse(row));

        } catch (error) {
            console.error('Error getting student attendance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get class attendance
     */
    async getClassAttendance(classId, options) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT a.*, s.first_name, s.last_name, s.roll_number
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE a.class_id = $1
            `;

            const values = [classId];
            let paramCount = 2;

            if (options.date) {
                query += ` AND a.date = $${paramCount++}`;
                values.push(options.date);
            } else {
                if (options.startDate) {
                    query += ` AND a.date >= $${paramCount++}`;
                    values.push(options.startDate);
                }

                if (options.endDate) {
                    query += ` AND a.date <= $${paramCount++}`;
                    values.push(options.endDate);
                }
            }

            query += ` ORDER BY s.roll_number, a.date DESC`;

            const result = await client.query(query, values);
            
            return result.rows.map(row => this.formatAttendanceResponse(row));

        } catch (error) {
            console.error('Error getting class attendance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update attendance record
     */
    async updateAttendance(attendanceId, updateData) {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE attendance 
                SET is_present = $1, remarks = $2, updated_at = $3, updated_by = $4
                WHERE id = $5
                RETURNING *
            `;

            const values = [
                updateData.isPresent,
                updateData.remarks,
                new Date(),
                updateData.updatedBy,
                attendanceId
            ];

            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                throw new NotFoundError('Attendance record not found');
            }

            return this.formatAttendanceResponse(result.rows[0]);

        } catch (error) {
            console.error('Error updating attendance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get attendance statistics for a student
     */
    async getAttendanceStats(studentId, options) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_days,
                    COUNT(CASE WHEN is_present = true THEN 1 END) as present_days,
                    COUNT(CASE WHEN is_present = false THEN 1 END) as absent_days,
                    ROUND(
                        (COUNT(CASE WHEN is_present = true THEN 1 END)::float / COUNT(*)) * 100, 2
                    ) as attendance_percentage
                FROM attendance 
                WHERE student_id = $1
            `;

            const values = [studentId];
            let paramCount = 2;

            if (options.startDate) {
                query += ` AND date >= $${paramCount++}`;
                values.push(options.startDate);
            }

            if (options.endDate) {
                query += ` AND date <= $${paramCount++}`;
                values.push(options.endDate);
            }

            const result = await client.query(query, values);
            
            return result.rows[0];

        } catch (error) {
            console.error('Error getting attendance stats:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get class attendance statistics
     */
    async getClassAttendanceStats(classId, options) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT 
                    COUNT(DISTINCT student_id) as total_students,
                    COUNT(*) as total_attendance_records,
                    COUNT(CASE WHEN is_present = true THEN 1 END) as total_present,
                    COUNT(CASE WHEN is_present = false THEN 1 END) as total_absent,
                    ROUND(
                        (COUNT(CASE WHEN is_present = true THEN 1 END)::float / COUNT(*)) * 100, 2
                    ) as overall_attendance_percentage
                FROM attendance 
                WHERE class_id = $1
            `;

            const values = [classId];
            let paramCount = 2;

            if (options.startDate) {
                query += ` AND date >= $${paramCount++}`;
                values.push(options.startDate);
            }

            if (options.endDate) {
                query += ` AND date <= $${paramCount++}`;
                values.push(options.endDate);
            }

            const result = await client.query(query, values);
            
            return result.rows[0];

        } catch (error) {
            console.error('Error getting class attendance stats:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Verify teacher access to student
     */
    async verifyTeacherAccess(teacherId, studentId, tenantId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 1 FROM class_assignments ca
                JOIN student_class_assignments sca ON ca.class_id = sca.class_id
                WHERE ca.teacher_id = $1 AND sca.student_id = $2 AND ca.tenant_id = $3
                LIMIT 1
            `;

            const result = await client.query(query, [teacherId, studentId, tenantId]);
            
            return result.rows.length > 0;

        } catch (error) {
            console.error('Error verifying teacher access:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Verify teacher access to class
     */
    async verifyClassAccess(teacherId, classId, tenantId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 1 FROM class_assignments 
                WHERE teacher_id = $1 AND class_id = $2 AND tenant_id = $3
                LIMIT 1
            `;

            const result = await client.query(query, [teacherId, classId, tenantId]);
            
            return result.rows.length > 0;

        } catch (error) {
            console.error('Error verifying class access:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Verify attendance access based on role
     */
    async verifyAttendanceAccess(userId, targetId, userRole, tenantId) {
        const client = await pool.connect();
        try {
            switch (userRole) {
                case 'teacher':
                    return await this.verifyTeacherAccess(userId, targetId, tenantId);
                
                case 'parent':
                    const parentQuery = `
                        SELECT 1 FROM parent_student_relationships 
                        WHERE parent_id = $1 AND student_id = $2 AND tenant_id = $3
                        LIMIT 1
                    `;
                    const parentResult = await client.query(parentQuery, [userId, targetId, tenantId]);
                    return parentResult.rows.length > 0;
                
                case 'student':
                    return userId === targetId;
                
                case 'admin':
                    return true; // Admins have access to everything
                
                default:
                    return false;
            }

        } catch (error) {
            console.error('Error verifying attendance access:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Generate QR code for attendance
     */
    async generateAttendanceQR(qrData) {
        const client = await pool.connect();
        try {
            const qrCode = this.generateRandomQRCode();
            const expiresAt = new Date(Date.now() + qrData.duration * 1000);

            const query = `
                INSERT INTO attendance_qr_codes (
                    qr_code, class_id, teacher_id, expires_at, tenant_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const values = [
                qrCode,
                qrData.classId,
                qrData.teacherId,
                expiresAt,
                qrData.tenantId,
                new Date()
            ];

            const result = await client.query(query, values);
            
            return {
                qrCode: qrCode,
                expiresAt: expiresAt,
                classId: qrData.classId
            };

        } catch (error) {
            console.error('Error generating QR code:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Scan QR code for attendance
     */
    async scanAttendanceQR(scanData) {
        const client = await pool.connect();
        try {
            // Validate QR code
            const qrQuery = `
                SELECT * FROM attendance_qr_codes 
                WHERE qr_code = $1 AND expires_at > NOW() AND is_used = false
            `;

            const qrResult = await client.query(qrQuery, [scanData.qrCode]);
            
            if (qrResult.rows.length === 0) {
                throw new ValidationError('Invalid or expired QR code');
            }

            const qrCode = qrResult.rows[0];

            // Mark QR code as used
            await client.query(
                'UPDATE attendance_qr_codes SET is_used = true WHERE id = $1',
                [qrCode.id]
            );

            // Mark attendance
            const attendance = await this.markAttendance({
                studentId: scanData.studentId,
                teacherId: qrCode.teacher_id,
                classId: qrCode.class_id,
                date: new Date().toISOString().split('T')[0],
                isPresent: true,
                qrCode: scanData.qrCode,
                remarks: 'Marked via QR code',
                tenantId: scanData.tenantId
            });

            // Get class info
            const classQuery = `
                SELECT c.name as class_name, c.section
                FROM classes c
                WHERE c.id = $1
            `;

            const classResult = await client.query(classQuery, [qrCode.class_id]);
            const classInfo = classResult.rows[0];

            return {
                attendance: attendance,
                classInfo: classInfo
            };

        } catch (error) {
            console.error('Error scanning QR code:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Generate random QR code
     */
    generateRandomQRCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Trigger attendance analysis for ML
     */
    async triggerAttendanceAnalysis(studentId, tenantId) {
        try {
            // This would trigger ML analysis in the background
            console.log(`Triggering ML analysis for student ${studentId}`);
            // await this.mlService.analyzeStudentAttendance(studentId, tenantId);
        } catch (error) {
            console.error('Error triggering attendance analysis:', error);
        }
    }

    /**
     * Trigger class attendance analysis for ML
     */
    async triggerClassAttendanceAnalysis(classId, tenantId) {
        try {
            // This would trigger ML analysis in the background
            console.log(`Triggering ML analysis for class ${classId}`);
            // await this.mlService.analyzeClassAttendance(classId, tenantId);
        } catch (error) {
            console.error('Error triggering class attendance analysis:', error);
        }
    }

    /**
     * Generate student attendance report
     */
    async generateStudentAttendanceReport(reportData) {
        try {
            // Get attendance data
            const attendance = await this.getStudentAttendance(reportData.studentId, {
                startDate: reportData.startDate,
                endDate: reportData.endDate,
                tenantId: reportData.tenantId
            });

            // Get statistics
            const stats = await this.getAttendanceStats(reportData.studentId, {
                startDate: reportData.startDate,
                endDate: reportData.endDate,
                tenantId: reportData.tenantId
            });

            // Get ML insights
            const insights = await this.mlService.getAttendanceInsights({
                studentId: reportData.studentId,
                startDate: reportData.startDate,
                endDate: reportData.endDate,
                tenantId: reportData.tenantId
            });

            return {
                studentId: reportData.studentId,
                period: {
                    startDate: reportData.startDate,
                    endDate: reportData.endDate
                },
                attendance: attendance,
                statistics: stats,
                insights: insights,
                generatedAt: new Date(),
                format: reportData.format
            };

        } catch (error) {
            console.error('Error generating attendance report:', error);
            throw error;
        }
    }

    /**
     * Format attendance response
     */
    formatAttendanceResponse(attendance) {
        if (!attendance) return null;

        return {
            id: attendance.id,
            studentId: attendance.student_id,
            teacherId: attendance.teacher_id,
            classId: attendance.class_id,
            date: attendance.date,
            isPresent: attendance.is_present,
            qrCode: attendance.qr_code,
            remarks: attendance.remarks,
            tenantId: attendance.tenant_id,
            createdAt: attendance.created_at,
            updatedAt: attendance.updated_at,
            updatedBy: attendance.updated_by,
            // Additional fields from joins
            studentName: attendance.first_name && attendance.last_name ? 
                `${attendance.first_name} ${attendance.last_name}` : null,
            teacherName: attendance.teacher_first_name && attendance.teacher_last_name ? 
                `${attendance.teacher_first_name} ${attendance.teacher_last_name}` : null,
            rollNumber: attendance.roll_number
        };
    }
}

module.exports = AttendanceService;
