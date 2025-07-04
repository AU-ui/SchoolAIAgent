/**
 * EdTech Platform - Real-time Security Alerts Middleware
 * Monitors security events, detects threats, and sends notifications
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// Security events storage (in production, use Redis or database)
const securityEvents = new Map();
const alertRules = new Map();
const activeAlerts = new Map();

// Event emitter for real-time notifications
const securityEventEmitter = new EventEmitter();

/**
 * Security event types
 */
const EVENT_TYPES = {
    // Authentication events
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    LOGOUT: 'logout',
    PASSWORD_CHANGE: 'password_change',
    PASSWORD_RESET: 'password_reset',
    
    // Authorization events
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    PERMISSION_DENIED: 'permission_denied',
    ROLE_CHANGE: 'role_change',
    
    // API events
    API_KEY_CREATED: 'api_key_created',
    API_KEY_REVOKED: 'api_key_revoked',
    API_RATE_LIMIT_EXCEEDED: 'api_rate_limit_exceeded',
    
    // Device events
    NEW_DEVICE_DETECTED: 'new_device_detected',
    SUSPICIOUS_DEVICE: 'suspicious_device',
    DEVICE_REMOVED: 'device_removed',
    
    // Data events
    DATA_ACCESS: 'data_access',
    DATA_MODIFICATION: 'data_modification',
    DATA_EXPORT: 'data_export',
    
    // System events
    CONFIGURATION_CHANGE: 'configuration_change',
    SYSTEM_ERROR: 'system_error',
    BACKUP_CREATED: 'backup_created',
    
    // Threat events
    BRUTE_FORCE_ATTEMPT: 'brute_force_attempt',
    SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
    XSS_ATTEMPT: 'xss_attempt',
    DDoS_ATTEMPT: 'ddos_attempt'
};

/**
 * Alert severity levels
 */
const SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Create security event
 * @param {string} type - Event type
 * @param {Object} data - Event data
 * @param {string} userId - User ID (optional)
 * @param {string} tenantId - Tenant ID (optional)
 * @param {string} severity - Severity level
 * @returns {Object} Security event
 */
function createSecurityEvent(type, data, userId = null, tenantId = null, severity = SEVERITY_LEVELS.MEDIUM) {
    const eventId = crypto.randomUUID();
    const timestamp = new Date();
    
    const event = {
        id: eventId,
        type,
        data,
        userId,
        tenantId,
        severity,
        timestamp,
        processed: false,
        alertGenerated: false
    };
    
    // Store event
    securityEvents.set(eventId, event);
    
    // Emit event for real-time processing
    securityEventEmitter.emit('securityEvent', event);
    
    return event;
}

/**
 * Security monitoring middleware
 */
function securityMonitor(req, res, next) {
    // Monitor request for security events
    const startTime = Date.now();
    
    // Override res.end to capture response data
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        
        // Check for security events based on response
        if (res.statusCode === 401) {
            createSecurityEvent(
                EVENT_TYPES.UNAUTHORIZED_ACCESS,
                {
                    path: req.path,
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                },
                req.user?.userId,
                req.tenantId,
                SEVERITY_LEVELS.MEDIUM
            );
        }
        
        if (res.statusCode === 403) {
            createSecurityEvent(
                EVENT_TYPES.PERMISSION_DENIED,
                {
                    path: req.path,
                    method: req.method,
                    ip: req.ip,
                    userId: req.user?.userId
                },
                req.user?.userId,
                req.tenantId,
                SEVERITY_LEVELS.MEDIUM
            );
        }
        
        if (res.statusCode >= 500) {
            createSecurityEvent(
                EVENT_TYPES.SYSTEM_ERROR,
                {
                    path: req.path,
                    method: req.method,
                    statusCode: res.statusCode,
                    duration
                },
                req.user?.userId,
                req.tenantId,
                SEVERITY_LEVELS.HIGH
            );
        }
        
        // Call original end method
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
}

/**
 * Add alert rule
 * @param {string} name - Rule name
 * @param {Object} rule - Rule configuration
 */
function addAlertRule(name, rule) {
    alertRules.set(name, {
        id: name,
        ...rule,
        enabled: true,
        createdAt: new Date()
    });
}

/**
 * Remove alert rule
 * @param {string} name - Rule name
 */
function removeAlertRule(name) {
    alertRules.delete(name);
}

/**
 * Process security events and generate alerts
 */
function processSecurityEvents() {
    for (const [eventId, event] of securityEvents.entries()) {
        if (event.processed) continue;
        
        // Check each alert rule
        for (const [ruleName, rule] of alertRules.entries()) {
            if (!rule.enabled) continue;
            
            if (shouldGenerateAlert(event, rule)) {
                generateAlert(event, rule);
            }
        }
        
        // Mark event as processed
        event.processed = true;
        securityEvents.set(eventId, event);
    }
}

/**
 * Check if alert should be generated
 * @param {Object} event - Security event
 * @param {Object} rule - Alert rule
 * @returns {boolean} Should generate alert
 */
function shouldGenerateAlert(event, rule) {
    // Check event type
    if (rule.eventTypes && !rule.eventTypes.includes(event.type)) {
        return false;
    }
    
    // Check severity
    if (rule.minSeverity && getSeverityLevel(event.severity) < getSeverityLevel(rule.minSeverity)) {
        return false;
    }
    
    // Check conditions
    if (rule.conditions) {
        for (const condition of rule.conditions) {
            if (!evaluateCondition(event, condition)) {
                return false;
            }
        }
    }
    
    // Check frequency limits
    if (rule.frequencyLimit) {
        const recentEvents = getRecentEvents(event.type, rule.frequencyLimit.window);
        if (recentEvents.length >= rule.frequencyLimit.count) {
            return false;
        }
    }
    
    return true;
}

/**
 * Get severity level as number
 * @param {string} severity - Severity string
 * @returns {number} Severity level
 */
function getSeverityLevel(severity) {
    const levels = {
        [SEVERITY_LEVELS.LOW]: 1,
        [SEVERITY_LEVELS.MEDIUM]: 2,
        [SEVERITY_LEVELS.HIGH]: 3,
        [SEVERITY_LEVELS.CRITICAL]: 4
    };
    return levels[severity] || 1;
}

/**
 * Evaluate condition
 * @param {Object} event - Security event
 * @param {Object} condition - Condition to evaluate
 * @returns {boolean} Condition result
 */
function evaluateCondition(event, condition) {
    const { field, operator, value } = condition;
    
    let fieldValue;
    if (field.includes('.')) {
        const parts = field.split('.');
        fieldValue = event;
        for (const part of parts) {
            fieldValue = fieldValue?.[part];
        }
    } else {
        fieldValue = event[field];
    }
    
    switch (operator) {
        case 'equals':
            return fieldValue === value;
        case 'not_equals':
            return fieldValue !== value;
        case 'contains':
            return String(fieldValue).includes(value);
        case 'greater_than':
            return fieldValue > value;
        case 'less_than':
            return fieldValue < value;
        case 'in':
            return Array.isArray(value) && value.includes(fieldValue);
        default:
            return false;
    }
}

/**
 * Get recent events
 * @param {string} type - Event type
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Array} Recent events
 */
function getRecentEvents(type, windowMs) {
    const cutoffTime = new Date(Date.now() - windowMs);
    const recentEvents = [];
    
    for (const [eventId, event] of securityEvents.entries()) {
        if (event.type === type && event.timestamp > cutoffTime) {
            recentEvents.push(event);
        }
    }
    
    return recentEvents;
}

/**
 * Generate alert
 * @param {Object} event - Security event
 * @param {Object} rule - Alert rule
 */
function generateAlert(event, rule) {
    const alertId = crypto.randomUUID();
    const timestamp = new Date();
    
    const alert = {
        id: alertId,
        ruleId: rule.id,
        eventId: event.id,
        title: rule.title || `Security Alert: ${event.type}`,
        message: rule.message || `Security event detected: ${event.type}`,
        severity: event.severity,
        data: {
            event: event,
            rule: rule
        },
        timestamp,
        status: 'active',
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null
    };
    
    // Store alert
    activeAlerts.set(alertId, alert);
    
    // Emit alert for real-time notification
    securityEventEmitter.emit('securityAlert', alert);
    
    // Send notifications
    sendAlertNotifications(alert);
    
    return alert;
}

/**
 * Send alert notifications
 * @param {Object} alert - Security alert
 */
function sendAlertNotifications(alert) {
    // In production, integrate with notification services
    // Email, SMS, Slack, webhook, etc.
    
    console.log(`🚨 SECURITY ALERT: ${alert.title}`);
    console.log(`Severity: ${alert.severity}`);
    console.log(`Message: ${alert.message}`);
    console.log(`Timestamp: ${alert.timestamp}`);
    console.log('---');
    
    // Example notification methods:
    // sendEmailAlert(alert);
    // sendSlackAlert(alert);
    // sendWebhookAlert(alert);
}

/**
 * Acknowledge alert
 * @param {string} alertId - Alert ID
 * @param {string} userId - User ID who acknowledged
 */
function acknowledgeAlert(alertId, userId) {
    const alert = activeAlerts.get(alertId);
    if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date();
        activeAlerts.set(alertId, alert);
    }
}

/**
 * Get active alerts
 * @param {string} tenantId - Tenant ID (optional)
 * @returns {Array} Active alerts
 */
function getActiveAlerts(tenantId = null) {
    const alerts = [];
    
    for (const [alertId, alert] of activeAlerts.entries()) {
        if (alert.status === 'active') {
            if (!tenantId || alert.data.event.tenantId === tenantId) {
                alerts.push(alert);
            }
        }
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get security events
 * @param {Object} filters - Filter options
 * @returns {Array} Security events
 */
function getSecurityEvents(filters = {}) {
    const events = [];
    
    for (const [eventId, event] of securityEvents.entries()) {
        let include = true;
        
        if (filters.type && event.type !== filters.type) include = false;
        if (filters.severity && event.severity !== filters.severity) include = false;
        if (filters.userId && event.userId !== filters.userId) include = false;
        if (filters.tenantId && event.tenantId !== filters.tenantId) include = false;
        if (filters.startDate && event.timestamp < filters.startDate) include = false;
        if (filters.endDate && event.timestamp > filters.endDate) include = false;
        
        if (include) {
            events.push(event);
        }
    }
    
    return events.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get security analytics
 * @param {string} tenantId - Tenant ID
 * @returns {Object} Security analytics
 */
function getSecurityAnalytics(tenantId) {
    const events = getSecurityEvents({ tenantId });
    
    const analytics = {
        totalEvents: events.length,
        eventsByType: {},
        eventsBySeverity: {},
        eventsByDay: {},
        recentAlerts: getActiveAlerts(tenantId).length,
        riskScore: calculateRiskScore(events)
    };
    
    for (const event of events) {
        // Events by type
        analytics.eventsByType[event.type] = (analytics.eventsByType[event.type] || 0) + 1;
        
        // Events by severity
        analytics.eventsBySeverity[event.severity] = (analytics.eventsBySeverity[event.severity] || 0) + 1;
        
        // Events by day
        const day = event.timestamp.toISOString().split('T')[0];
        analytics.eventsByDay[day] = (analytics.eventsByDay[day] || 0) + 1;
    }
    
    return analytics;
}

/**
 * Calculate risk score based on events
 * @param {Array} events - Security events
 * @returns {number} Risk score (0-100)
 */
function calculateRiskScore(events) {
    let score = 0;
    
    for (const event of events) {
        const severityWeight = getSeverityLevel(event.severity);
        const timeWeight = Math.max(0, 1 - (Date.now() - event.timestamp.getTime()) / (7 * 24 * 60 * 60 * 1000));
        
        score += severityWeight * timeWeight * 10;
    }
    
    return Math.min(score, 100);
}

/**
 * Clean up old events and alerts
 */
function cleanupSecurityData() {
    const eventCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
    const alertCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    
    // Clean up old events
    for (const [eventId, event] of securityEvents.entries()) {
        if (event.timestamp < eventCutoff) {
            securityEvents.delete(eventId);
        }
    }
    
    // Clean up old alerts
    for (const [alertId, alert] of activeAlerts.entries()) {
        if (alert.timestamp < alertCutoff) {
            activeAlerts.delete(alertId);
        }
    }
}

// Set up default alert rules
addAlertRule('brute_force_detection', {
    title: 'Brute Force Attack Detected',
    message: 'Multiple failed login attempts detected',
    eventTypes: [EVENT_TYPES.LOGIN_FAILED],
    minSeverity: SEVERITY_LEVELS.MEDIUM,
    frequencyLimit: {
        window: 5 * 60 * 1000, // 5 minutes
        count: 5
    }
});

addAlertRule('unauthorized_access', {
    title: 'Unauthorized Access Attempt',
    message: 'Multiple unauthorized access attempts detected',
    eventTypes: [EVENT_TYPES.UNAUTHORIZED_ACCESS],
    minSeverity: SEVERITY_LEVELS.HIGH,
    frequencyLimit: {
        window: 10 * 60 * 1000, // 10 minutes
        count: 3
    }
});

addAlertRule('system_error', {
    title: 'System Error Detected',
    message: 'Multiple system errors detected',
    eventTypes: [EVENT_TYPES.SYSTEM_ERROR],
    minSeverity: SEVERITY_LEVELS.HIGH,
    frequencyLimit: {
        window: 15 * 60 * 1000, // 15 minutes
        count: 3
    }
});

// Process events every minute
setInterval(processSecurityEvents, 60 * 1000);

// Clean up data daily
setInterval(cleanupSecurityData, 24 * 60 * 60 * 1000);

module.exports = {
    securityMonitor,
    createSecurityEvent,
    addAlertRule,
    removeAlertRule,
    getActiveAlerts,
    getSecurityEvents,
    getSecurityAnalytics,
    acknowledgeAlert,
    securityEventEmitter,
    EVENT_TYPES,
    SEVERITY_LEVELS
};
