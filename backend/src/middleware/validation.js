/**
 * EdTech Platform - Request Validation Middleware
 * Validates incoming request data using Joi schemas
 */

const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

/**
 * Generic validation middleware
 * @param {Object} schema - Joi schema object
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
function validate(schema, property = 'body') {
    return (req, res, next) => {
        const data = req[property];
        
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));

            const validationError = new ValidationError(
                'Validation failed',
                errorDetails
            );
            
            return next(validationError);
        }

        req[property] = value;
        next();
    };
}

/**
 * Enhanced validation with custom error messages and sanitization
 */
function validateWithSanitization(schema, property = 'body') {
    return (req, res, next) => {
        const data = req[property];
        
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false,
            convert: true, // Convert types when possible
            presence: 'required' // All fields required by default
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type,
                value: detail.context?.value
            }));

            const validationError = new ValidationError(
                'Validation failed',
                errorDetails
            );
            
            return next(validationError);
        }

        // Additional sanitization
        const sanitizedValue = sanitizeData(value);
        req[property] = sanitizedValue;
        next();
    };
}

/**
 * Sanitize data to prevent XSS and injection attacks
 */
function sanitizeData(data) {
    if (typeof data === 'string') {
        return data
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }
    
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeData(value);
        }
        return sanitized;
    }
    
    return data;
}

/**
 * Custom validation functions
 */
const customValidators = {
    // Email validation with domain checking
    email: Joi.string().email({ 
        tlds: { allow: ['com', 'org', 'edu', 'gov', 'net'] } 
    }).max(254),
    
    // Phone number validation (international format)
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    
    // Password strength validation
    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    // UUID validation
    uuid: Joi.string().guid({ version: 'uuidv4' }),
    
    // Date validation (ISO format)
    date: Joi.date().iso(),
    
    // URL validation
    url: Joi.string().uri({ scheme: ['http', 'https'] }),
    
    // File size validation (in bytes)
    fileSize: (maxSize) => Joi.number().max(maxSize),
    
    // Grade level validation (1-12)
    gradeLevel: Joi.number().integer().min(1).max(12),
    
    // Subject validation
    subject: Joi.string().valid('science', 'math', 'history', 'geography', 'literature', 'languages'),
    
    // Role validation
    role: Joi.string().valid('admin', 'teacher', 'parent', 'student'),
    
    // Status validation
    status: Joi.string().valid('active', 'inactive', 'pending', 'suspended'),
    
    // Priority validation
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
    
    // Content type validation
    contentType: Joi.string().valid('text', 'image', 'file', 'announcement', 'academic_update', 'behavior_update'),
    
    // Attendance status validation
    attendanceStatus: Joi.string().valid('present', 'absent', 'late', 'excused'),
    
    // Learning content type validation
    learningContentType: Joi.string().valid('image', 'video', 'interactive', 'diagram', 'animation'),
    
    // Difficulty level validation
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    
    // Rating validation (1-5)
    rating: Joi.number().integer().min(1).max(5),
    
    // Percentage validation (0-100)
    percentage: Joi.number().min(0).max(100),
    
    // Time validation (seconds)
    timeSpent: Joi.number().integer().min(0),
    
    // Engagement score validation (0-1)
    engagementScore: Joi.number().min(0).max(1),
    
    // Safety score validation (0-1)
    safetyScore: Joi.number().min(0).max(1),
    
    // Confidence score validation (0-1)
    confidenceScore: Joi.number().min(0).max(1)
};

/**
 * Authentication schemas
 */
const authSchemas = {
    login: Joi.object({
        email: customValidators.email.required(),
        password: Joi.string().required(),
        tenantId: customValidators.uuid.optional()
    }),
    
    signup: Joi.object({
        email: customValidators.email.required(),
        password: customValidators.password.required(),
        firstName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
        lastName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
        role: customValidators.role.required(),
        tenantId: customValidators.uuid.optional(),
        phone: customValidators.phone.optional()
    }),
    
    refreshToken: Joi.object({
        refreshToken: Joi.string().required()
    }),
    
    forgotPassword: Joi.object({
        email: customValidators.email.required()
    }),
    
    resetPassword: Joi.object({
        token: Joi.string().required(),
        password: customValidators.password.required()
    }),
    
    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: customValidators.password.required(),
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    })
};

/**
 * Attendance schemas
 */
const attendanceSchemas = {
    startSession: Joi.object({
        classId: customValidators.uuid.required(),
        duration: Joi.number().integer().min(1).max(480).default(60), // minutes
        location: Joi.string().max(100).optional()
    }),
    
    markAttendance: Joi.object({
        sessionId: customValidators.uuid.required(),
        studentId: customValidators.uuid.required(),
        method: Joi.string().valid('qr', 'manual', 'gps').required(),
        qrCode: Joi.string().optional(),
        location: Joi.object({
            latitude: Joi.number().min(-90).max(90).optional(),
            longitude: Joi.number().min(-180).max(180).optional()
        }).optional()
    }),
    
    bulkMarkAttendance: Joi.object({
        sessionId: customValidators.uuid.required(),
        students: Joi.array().items(Joi.object({
            studentId: customValidators.uuid.required(),
            status: customValidators.attendanceStatus.required(),
            remarks: Joi.string().max(200).optional()
        })).min(1).required()
    }),
    
    updateAttendance: Joi.object({
        status: customValidators.attendanceStatus.required(),
        remarks: Joi.string().max(200).optional()
    }),
    
    notifyAbsent: Joi.object({
        sessionId: customValidators.uuid.required(),
        absentStudents: Joi.array().items(customValidators.uuid).min(1).required(),
        message: Joi.string().max(500).optional()
    }),
    
    getAttendance: Joi.object({
        startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
        limit: Joi.number().integer().min(1).max(100).default(20),
        offset: Joi.number().integer().min(0).default(0)
    })
};

/**
 * Communication schemas
 */
const communicationSchemas = {
    sendMessage: Joi.object({
        receiverId: customValidators.uuid.required(),
        content: Joi.string().min(1).max(1000).required(),
        type: customValidators.contentType.default('text'),
        priority: customValidators.priority.default('normal'),
        attachments: Joi.array().items(customValidators.url).max(5).optional()
    }),
    
    getConversations: Joi.object({
        limit: Joi.number().integer().min(1).max(100).default(20),
        offset: Joi.number().integer().min(0).default(0),
        status: Joi.string().valid('active', 'archived').optional()
    }),
    
    getMessages: Joi.object({
        limit: Joi.number().integer().min(1).max(100).default(50),
        offset: Joi.number().integer().min(0).default(0)
    }),
    
    replyMessage: Joi.object({
        content: Joi.string().min(1).max(1000).required(),
        attachments: Joi.array().items(customValidators.url).max(5).optional()
    }),
    
    updateMessage: Joi.object({
        content: Joi.string().min(1).max(1000).required(),
        action: Joi.string().valid('edit', 'delete').required()
    }),
    
    broadcastMessage: Joi.object({
        recipients: Joi.array().items(customValidators.uuid).min(1).required(),
        content: Joi.string().min(1).max(1000).required(),
        type: Joi.string().valid('announcement', 'reminder', 'emergency', 'academic').default('announcement'),
        priority: customValidators.priority.default('normal'),
        scheduleFor: customValidators.date.optional()
    }),
    
    getNotifications: Joi.object({
        limit: Joi.number().integer().min(1).max(100).default(20),
        offset: Joi.number().integer().min(0).default(0),
        unreadOnly: Joi.boolean().default(false)
    }),
    
    markNotificationsRead: Joi.object({
        notificationIds: Joi.array().items(customValidators.uuid).required()
    })
};

/**
 * Learning schemas
 */
const learningSchemas = {
    requestVisual: Joi.object({
        topicName: Joi.string().min(2).max(100).required(),
        subject: customValidators.subject.required(),
        gradeLevel: customValidators.gradeLevel.required(),
        studentId: customValidators.uuid.optional() // For teachers requesting content for students
    }),
    
    getTopics: Joi.object({
        gradeLevel: customValidators.gradeLevel.required(),
        subject: customValidators.subject.optional()
    }),
    
    getProgress: Joi.object({
        studentId: customValidators.uuid.required()
    }),
    
    updateProgress: Joi.object({
        contentId: customValidators.uuid.required(),
        progressPercentage: customValidators.percentage.required(),
        timeSpent: customValidators.timeSpent.required(), // seconds
        studentId: customValidators.uuid.optional() // For teachers updating student progress
    }),
    
    getContent: Joi.object({
        contentId: customValidators.uuid.required()
    }),
    
    submitFeedback: Joi.object({
        contentId: customValidators.uuid.required(),
        rating: customValidators.rating.optional(),
        difficulty: customValidators.rating.optional(),
        feedback: Joi.string().max(1000).optional()
    }),
    
    getRecommendations: Joi.object({
        studentId: customValidators.uuid.required()
    }),
    
    analyzeSyllabus: Joi.object({
        syllabusText: Joi.string().min(10).max(10000).required(),
        gradeLevel: customValidators.gradeLevel.required(),
        subject: customValidators.subject.required()
    }),
    
    getAnalytics: Joi.object({
        studentId: customValidators.uuid.required(),
        startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
    }),
    
    createTopic: Joi.object({
        topicName: Joi.string().min(2).max(100).required(),
        subject: customValidators.subject.required(),
        gradeLevel: customValidators.gradeLevel.required(),
        description: Joi.string().max(500).optional(),
        learningObjectives: Joi.array().items(Joi.string().max(200)).optional(),
        prerequisites: Joi.array().items(Joi.string().max(200)).optional(),
        estimatedDuration: Joi.number().integer().min(5).max(480).optional() // minutes
    }),
    
    updateTopic: Joi.object({
        description: Joi.string().max(500).optional(),
        learningObjectives: Joi.array().items(Joi.string().max(200)).optional(),
        prerequisites: Joi.array().items(Joi.string().max(200)).optional(),
        estimatedDuration: Joi.number().integer().min(5).max(480).optional(),
        isActive: Joi.boolean().optional()
    }),
    
    createLearningPath: Joi.object({
        name: Joi.string().min(2).max(200).required(),
        description: Joi.string().max(1000).optional(),
        gradeLevel: customValidators.gradeLevel.required(),
        subject: customValidators.subject.required(),
        topicSequence: Joi.array().items(customValidators.uuid).min(1).required(),
        estimatedDuration: Joi.number().integer().min(5).max(1440).optional(), // minutes
        difficultyLevel: customValidators.difficultyLevel.optional()
    }),
    
    reportContent: Joi.object({
        contentId: customValidators.uuid.required(),
        reportType: Joi.string().valid('inappropriate', 'inaccurate', 'too_difficult', 'too_easy', 'technical_issue', 'other').required(),
        description: Joi.string().min(10).max(1000).required()
    }),
    
    getLearningSessions: Joi.object({
        studentId: customValidators.uuid.required(),
        startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
        limit: Joi.number().integer().min(1).max(100).default(20),
        offset: Joi.number().integer().min(0).default(0)
    }),
    
    startLearningSession: Joi.object({
        contentId: customValidators.uuid.required(),
        deviceInfo: Joi.object().optional(),
        locationInfo: Joi.object().optional()
    }),
    
    endLearningSession: Joi.object({
        sessionId: customValidators.uuid.required(),
        interactionCount: Joi.number().integer().min(0).optional(),
        engagementScore: customValidators.engagementScore.optional()
    })
};

// Export schemas and validation function
module.exports = {
    validate,
    validateWithSanitization,
    sanitizeData,
    customValidators,
    authSchemas,
    attendanceSchemas,
    communicationSchemas,
    learningSchemas
}; 