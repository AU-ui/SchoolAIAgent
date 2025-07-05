/**
 * EdTech Platform - Student Verification Service
 * Handles verification of genuine students vs fake registrations
 */

const crypto = require('crypto');
const { ValidationError, AuthenticationError } = require('../middleware/errorHandler');

class StudentVerificationService {
    constructor() {
        this.verificationMethods = {
            SCHOOL_CODE: 'school_code',
            TEACHER_APPROVAL: 'teacher_approval',
            PARENT_VERIFICATION: 'parent_verification',
            STUDENT_ID: 'student_id',
            EMAIL_DOMAIN: 'email_domain',
            PHONE_VERIFICATION: 'phone_verification'
        };
    }

    /**
     * Verify student registration with multiple methods
     */
    async verifyStudentRegistration(studentData, verificationMethod) {
        const { email, firstName, lastName, tenantId, studentId, phone, schoolCode } = studentData;

        try {
            // Method 1: School Code Verification
            if (verificationMethod === this.verificationMethods.SCHOOL_CODE) {
                return await this.verifyWithSchoolCode(tenantId, schoolCode, studentData);
            }

            // Method 2: Teacher Approval
            if (verificationMethod === this.verificationMethods.TEACHER_APPROVAL) {
                return await this.verifyWithTeacherApproval(studentData);
            }

            // Method 3: Student ID Verification
            if (verificationMethod === this.verificationMethods.STUDENT_ID) {
                return await this.verifyWithStudentID(tenantId, studentId, studentData);
            }

            // Method 4: Email Domain Verification
            if (verificationMethod === this.verificationMethods.EMAIL_DOMAIN) {
                return await this.verifyWithEmailDomain(email, tenantId);
            }

            // Method 5: Phone Verification
            if (verificationMethod === this.verificationMethods.PHONE_VERIFICATION) {
                return await this.verifyWithPhone(phone, studentData);
            }

            throw new ValidationError('Invalid verification method');

        } catch (error) {
            console.error('Student verification error:', error);
            throw error;
        }
    }

    /**
     * Verify student with teacher approval
     */
    async verifyWithTeacherApproval(studentData) {
        try {
            // Create pending verification request
            const verificationRequest = await this.createVerificationRequest(studentData);

            // Send notification to teachers/admins
            await this.notifyTeachersForApproval(verificationRequest);

            return {
                verified: false,
                pending: true,
                method: this.verificationMethods.TEACHER_APPROVAL,
                requestId: verificationRequest.id,
                message: 'Student verification pending teacher approval'
            };
        } catch (error) {
            console.error('Teacher approval verification error:', error);
            throw error;
        }
    }

    /**
     * Create verification request in database
     */
    async createVerificationRequest(studentData) {
        const { email, firstName, lastName, tenantId, phone, ipAddress, userAgent } = studentData;

        const requestData = {
            id: crypto.randomUUID(),
            studentEmail: email,
            studentFirstName: firstName,
            studentLastName: lastName,
            tenantId: tenantId,
            phone: phone,
            ipAddress: ipAddress,
            userAgent: userAgent,
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
        };

        // Store in database
        await this.storeVerificationRequest(requestData);

        return requestData;
    }

    /**
     * Notify teachers and admins about pending approval
     */
    async notifyTeachersForApproval(verificationRequest) {
        try {
            // Get all teachers and admins in the school
            const teachersAndAdmins = await this.getTeachersAndAdmins(verificationRequest.tenantId);

            // Send email notifications
            for (const teacher of teachersAndAdmins) {
                await this.sendApprovalNotification(teacher, verificationRequest);
            }

            // Send in-app notifications
            await this.sendInAppNotifications(teachersAndAdmins, verificationRequest);

            console.log(`Sent approval notifications to ${teachersAndAdmins.length} teachers/admins`);
        } catch (error) {
            console.error('Error sending approval notifications:', error);
            // Don't throw error, as this shouldn't block the registration
        }
    }

    /**
     * Handle teacher approval of student registration
     */
    async approveStudentRegistration(requestId, teacherId, approvalNotes = '') {
        try {
            // Get verification request
            const request = await this.getVerificationRequest(requestId);
            if (!request) {
                throw new ValidationError('Verification request not found');
            }

            if (request.status !== 'pending') {
                throw new ValidationError('Request is not pending approval');
            }

            // Verify teacher has permission to approve
            const teacher = await this.getTeacherById(teacherId);
            if (!teacher || teacher.tenantId !== request.tenantId) {
                throw new AuthenticationError('Unauthorized to approve this request');
            }

            // Update request status
            await this.updateVerificationRequest(requestId, {
                status: 'approved',
                approvedBy: teacherId,
                approvedAt: new Date(),
                approvalNotes: approvalNotes
            });

            // Activate student account
            await this.activateStudentAccount(request.studentEmail);

            // Send approval notification to student
            await this.sendStudentApprovalNotification(request.studentEmail);

            // Log approval action
            await this.logApprovalAction(requestId, teacherId, 'approved', approvalNotes);

            return {
                success: true,
                message: 'Student registration approved successfully'
            };

        } catch (error) {
            console.error('Error approving student registration:', error);
            throw error;
        }
    }

    /**
     * Handle teacher rejection of student registration
     */
    async rejectStudentRegistration(requestId, teacherId, rejectionReason = '') {
        try {
            // Get verification request
            const request = await this.getVerificationRequest(requestId);
            if (!request) {
                throw new ValidationError('Verification request not found');
            }

            if (request.status !== 'pending') {
                throw new ValidationError('Request is not pending approval');
            }

            // Verify teacher has permission to reject
            const teacher = await this.getTeacherById(teacherId);
            if (!teacher || teacher.tenantId !== request.tenantId) {
                throw new AuthenticationError('Unauthorized to reject this request');
            }

            // Update request status
            await this.updateVerificationRequest(requestId, {
                status: 'rejected',
                rejectedBy: teacherId,
                rejectedAt: new Date(),
                rejectionReason: rejectionReason
            });

            // Send rejection notification to student
            await this.sendStudentRejectionNotification(request.studentEmail, rejectionReason);

            // Log rejection action
            await this.logApprovalAction(requestId, teacherId, 'rejected', rejectionReason);

            return {
                success: true,
                message: 'Student registration rejected'
            };

        } catch (error) {
            console.error('Error rejecting student registration:', error);
            throw error;
        }
    }

    /**
     * Get pending verification requests for a teacher
     */
    async getPendingRequests(teacherId) {
        try {
            const teacher = await this.getTeacherById(teacherId);
            if (!teacher) {
                throw new AuthenticationError('Teacher not found');
            }

            const requests = await this.getVerificationRequestsByTenant(teacher.tenantId, 'pending');
            return requests;
        } catch (error) {
            console.error('Error getting pending requests:', error);
            throw error;
        }
    }

    /**
     * Check for suspicious registration patterns
     */
    async detectSuspiciousActivity(studentData) {
        const { email, phone, ipAddress, userAgent } = studentData;

        const suspiciousPatterns = [];

        // Check for multiple registrations from same IP
        const ipRegistrations = await this.getRegistrationsByIP(ipAddress);
        if (ipRegistrations.length > 3) {
            suspiciousPatterns.push('Multiple registrations from same IP');
        }

        // Check for similar email patterns
        const similarEmails = await this.findSimilarEmails(email);
        if (similarEmails.length > 2) {
            suspiciousPatterns.push('Similar email patterns detected');
        }

        // Check for rapid registrations
        const recentRegistrations = await this.getRecentRegistrations(ipAddress);
        if (recentRegistrations.length > 1) {
            suspiciousPatterns.push('Rapid registration attempts');
        }

        // Check for disposable email domains
        if (this.isDisposableEmail(email)) {
            suspiciousPatterns.push('Disposable email domain detected');
        }

        return {
            isSuspicious: suspiciousPatterns.length > 0,
            patterns: suspiciousPatterns,
            riskScore: this.calculateRiskScore(suspiciousPatterns)
        };
    }

    /**
     * Helper methods
     */
    generateSecureCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    isValidStudentIDFormat(studentId) {
        // Implement school-specific student ID validation
        const patterns = {
            'default': /^[A-Z]{2}\d{6}$/, // Example: ST123456
            'numeric': /^\d{8}$/, // Example: 12345678
            'alphanumeric': /^[A-Z0-9]{8}$/ // Example: ST123456
        };

        return Object.values(patterns).some(pattern => pattern.test(studentId));
    }

    isDisposableEmail(email) {
        const disposableDomains = [
            'tempmail.org', 'guerrillamail.com', '10minutemail.com',
            'mailinator.com', 'throwaway.email', 'temp-mail.org'
        ];

        const domain = email.split('@')[1];
        return disposableDomains.includes(domain);
    }

    calculateRiskScore(patterns) {
        const riskWeights = {
            'Multiple registrations from same IP': 0.3,
            'Similar email patterns detected': 0.2,
            'Rapid registration attempts': 0.25,
            'Disposable email domain detected': 0.25
        };

        return patterns.reduce((score, pattern) => {
            return score + (riskWeights[pattern] || 0.1);
        }, 0);
    }

    // Database methods (to be implemented)
    async getRegistrationsByIP(ipAddress) {
        // TODO: Implement database query
        return [];
    }

    async findSimilarEmails(email) {
        // TODO: Implement database query
        return [];
    }

    async getRecentRegistrations(ipAddress) {
        // TODO: Implement database query
        return [];
    }

    async storeVerificationRequest(requestData) {
        // TODO: Implement database query to store verification request
        console.log('Storing verification request:', requestData);
    }

    async getTeachersAndAdmins(tenantId) {
        // TODO: Implement database query to get teachers and admins
        return [
            { id: 'teacher1', email: 'teacher1@school.edu', name: 'John Teacher' },
            { id: 'admin1', email: 'admin@school.edu', name: 'School Admin' }
        ];
    }

    async sendApprovalNotification(teacher, verificationRequest) {
        // TODO: Implement email service call
        console.log(`Sending approval notification to ${teacher.email}`);
    }

    async sendInAppNotifications(teachers, verificationRequest) {
        // TODO: Implement in-app notification system
        console.log('Sending in-app notifications to teachers');
    }

    async getVerificationRequest(requestId) {
        // TODO: Implement database query
        return null;
    }

    async getTeacherById(teacherId) {
        // TODO: Implement database query
        return null;
    }

    async updateVerificationRequest(requestId, updateData) {
        // TODO: Implement database query
        console.log('Updating verification request:', requestId, updateData);
    }

    async activateStudentAccount(studentEmail) {
        // TODO: Implement database query to activate student account
        console.log('Activating student account:', studentEmail);
    }

    async sendStudentApprovalNotification(studentEmail) {
        // TODO: Implement email service call
        console.log('Sending approval notification to student:', studentEmail);
    }

    async sendStudentRejectionNotification(studentEmail, reason) {
        // TODO: Implement email service call
        console.log('Sending rejection notification to student:', studentEmail, reason);
    }

    async logApprovalAction(requestId, teacherId, action, notes) {
        // TODO: Implement database query to log action
        console.log('Logging approval action:', { requestId, teacherId, action, notes });
    }

    async getVerificationRequestsByTenant(tenantId, status) {
        // TODO: Implement database query
        return [];
    }
}

module.exports = StudentVerificationService;
