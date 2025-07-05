/**
 * EdTech Platform - Communication Routes
 * Handles parent-school communication with ML-powered features (Pain Point #5)
 */

const express = require('express');
const { validate } = require('../../middleware/validation');
const { communicationSchemas } = require('../../middleware/validation');
const { asyncHandler, ValidationError, AuthorizationError } = require('../../middleware/errorHandler');

const router = express.Router();

// Import services
const CommunicationService = require('../../services/communicationService');
const MLService = require('../../services/mlIntegrationService');
const emailService = require('../../services/emailService');

// Initialize services
const communicationService = new CommunicationService();
const mlService = new MLService();

/**
 * @route   POST /api/communication/send
 * @desc    Send a message between users
 * @access  Private (All authenticated users)
 */
router.post('/send',
    validate(communicationSchemas.sendMessage, 'body'),
    asyncHandler(async (req, res) => {
        const { receiverId, content, type, priority, attachments } = req.body;
        const senderId = req.user.userId;
        const senderRole = req.user.role;
        const tenantId = req.tenantId;

        try {
            // Verify sender has permission to communicate with receiver
            const hasPermission = await communicationService.verifyCommunicationPermission(
                senderId, receiverId, senderRole, tenantId
            );

            if (!hasPermission) {
                throw new AuthorizationError('You do not have permission to send messages to this user');
            }

            // Process message with ML for sentiment analysis and suggestions
            const mlAnalysis = await mlService.processCommunication({
                senderId,
                receiverId,
                content,
                type,
                language: req.body.language || 'English',
                urgencyLevel: priority
            });

            // Create message
            const message = await communicationService.createMessage({
                senderId,
                receiverId,
                content,
                type,
                priority,
                attachments,
                tenantId,
                mlAnalysis
            });

            // Send real-time notification
            await communicationService.sendNotification({
                receiverId,
                type: 'new_message',
                title: 'New Message',
                content: `You have a new ${type} message`,
                data: { messageId: message.id }
            });

            // Send email notification if enabled
            if (req.body.sendEmailNotification) {
                await emailService.sendNotificationEmail(
                    receiverId,
                    'New Message',
                    `You have received a new ${type} message from ${req.user.firstName} ${req.user.lastName}`
                );
            }

            res.status(201).json({
                success: true,
                message: 'Message sent successfully',
                data: {
                    message: message,
                    mlAnalysis: mlAnalysis
                }
            });

        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/communication/conversations
 * @desc    Get user's conversations
 * @access  Private (All authenticated users)
 */
router.get('/conversations',
    validate(communicationSchemas.getConversations, 'query'),
    asyncHandler(async (req, res) => {
        const { limit = 20, offset = 0, status } = req.query;
        const userId = req.user.userId;
        const tenantId = req.tenantId;

        try {
            const conversations = await communicationService.getConversations({
                userId,
                limit: parseInt(limit),
                offset: parseInt(offset),
                status,
                tenantId
            });

            res.json({
                success: true,
                data: {
                    conversations: conversations.conversations,
                    total: conversations.total,
                    unreadCount: conversations.unreadCount
                }
            });

        } catch (error) {
            console.error('Error getting conversations:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/communication/conversation/:conversationId
 * @desc    Get messages in a conversation
 * @access  Private (All authenticated users)
 */
router.get('/conversation/:conversationId',
    validate(communicationSchemas.getMessages, 'query'),
    asyncHandler(async (req, res) => {
        const { conversationId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const userId = req.user.userId;
        const tenantId = req.tenantId;

        try {
            // Verify user has access to this conversation
            const hasAccess = await communicationService.verifyConversationAccess(
                userId, conversationId, tenantId
            );

            if (!hasAccess) {
                throw new AuthorizationError('You do not have access to this conversation');
            }

            const messages = await communicationService.getConversationMessages({
                conversationId,
                userId,
                limit: parseInt(limit),
                offset: parseInt(offset),
                tenantId
            });

            // Mark messages as read
            await communicationService.markMessagesAsRead(conversationId, userId, tenantId);

            res.json({
                success: true,
                data: {
                    messages: messages.messages,
                    total: messages.total,
                    conversation: messages.conversation
                }
            });

        } catch (error) {
            console.error('Error getting conversation messages:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/communication/conversation/:conversationId/reply
 * @desc    Reply to a conversation
 * @access  Private (All authenticated users)
 */
router.post('/conversation/:conversationId/reply',
    validate(communicationSchemas.replyMessage, 'body'),
    asyncHandler(async (req, res) => {
        const { conversationId } = req.params;
        const { content, attachments } = req.body;
        const senderId = req.user.userId;
        const tenantId = req.tenantId;

        try {
            // Verify user has access to this conversation
            const hasAccess = await communicationService.verifyConversationAccess(
                senderId, conversationId, tenantId
            );

            if (!hasAccess) {
                throw new AuthorizationError('You do not have access to this conversation');
            }

            // Get conversation details
            const conversation = await communicationService.getConversation(conversationId, tenantId);

            // Process reply with ML
            const mlAnalysis = await mlService.processCommunication({
                senderId,
                receiverId: conversation.participants.find(p => p.id !== senderId)?.id,
                content,
                type: 'reply',
                language: req.body.language || 'English'
            });

            // Create reply
            const reply = await communicationService.createReply({
                conversationId,
                senderId,
                content,
                attachments,
                tenantId,
                mlAnalysis
            });

            // Send notification
            await communicationService.sendNotification({
                receiverId: conversation.participants.find(p => p.id !== senderId)?.id,
                type: 'message_reply',
                title: 'Message Reply',
                content: 'Someone replied to your message',
                data: { messageId: reply.id, conversationId }
            });

            res.status(201).json({
                success: true,
                message: 'Reply sent successfully',
                data: {
                    reply: reply,
                    mlAnalysis: mlAnalysis
                }
            });

        } catch (error) {
            console.error('Error sending reply:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/communication/broadcast
 * @desc    Send broadcast message to multiple recipients
 * @access  Private (Teachers, Admins)
 */
router.post('/broadcast',
    validate(communicationSchemas.broadcastMessage, 'body'),
    asyncHandler(async (req, res) => {
        const { recipients, content, type, priority, scheduleFor } = req.body;
        const senderId = req.user.userId;
        const senderRole = req.user.role;
        const tenantId = req.tenantId;

        try {
            // Verify sender has permission to broadcast
            if (!['teacher', 'admin'].includes(senderRole)) {
                throw new AuthorizationError('Only teachers and admins can send broadcast messages');
            }

            // Process broadcast with ML
            const mlAnalysis = await mlService.processCommunication({
                senderId,
                receiverId: 'broadcast',
                content,
                type,
                language: req.body.language || 'English',
                urgencyLevel: priority
            });

            // Create broadcast
            const broadcast = await communicationService.createBroadcast({
                senderId,
                recipients,
                content,
                type,
                priority,
                scheduleFor,
                tenantId,
                mlAnalysis
            });

            // Send notifications to all recipients
            await communicationService.sendBroadcastNotifications({
                recipients,
                broadcast,
                tenantId
            });

            res.status(201).json({
                success: true,
                message: 'Broadcast sent successfully',
                data: {
                    broadcast: broadcast,
                    recipientsCount: recipients.length,
                    mlAnalysis: mlAnalysis
                }
            });

        } catch (error) {
            console.error('Error sending broadcast:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/communication/notifications
 * @desc    Get user's notifications
 * @access  Private (All authenticated users)
 */
router.get('/notifications',
    validate(communicationSchemas.getNotifications, 'query'),
    asyncHandler(async (req, res) => {
        const { limit = 20, offset = 0, unreadOnly = false } = req.query;
        const userId = req.user.userId;
        const tenantId = req.tenantId;

        try {
            const notifications = await communicationService.getNotifications({
                userId,
                limit: parseInt(limit),
                offset: parseInt(offset),
                unreadOnly: unreadOnly === 'true',
                tenantId
            });

            res.json({
                success: true,
                data: {
                    notifications: notifications.notifications,
                    total: notifications.total,
                    unreadCount: notifications.unreadCount
                }
            });

        } catch (error) {
            console.error('Error getting notifications:', error);
            throw error;
        }
    })
);

/**
 * @route   POST /api/communication/notifications/mark-read
 * @desc    Mark notifications as read
 * @access  Private (All authenticated users)
 */
router.post('/notifications/mark-read',
    validate(communicationSchemas.markNotificationsRead, 'body'),
    asyncHandler(async (req, res) => {
        const { notificationIds } = req.body;
        const userId = req.user.userId;
        const tenantId = req.tenantId;

        try {
            const result = await communicationService.markNotificationsAsRead({
                userId,
                notificationIds,
                tenantId
            });

            res.json({
                success: true,
                message: 'Notifications marked as read',
                data: {
                    markedCount: result.markedCount
                }
            });

        } catch (error) {
            console.error('Error marking notifications as read:', error);
            throw error;
        }
    })
);

/**
 * @route   GET /api/communication/analytics
 * @desc    Get communication analytics and insights
 * @access  Private (Teachers, Admins)
 */
router.get('/analytics',
    asyncHandler(async (req, res) => {
        const { startDate, endDate, type } = req.query;
        const userId = req.user.userId;
        const tenantId = req.tenantId;

        try {
            const analytics = await communicationService.getAnalytics({
                userId,
                tenantId,
                startDate,
                endDate,
                type
            });

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            console.error('Error getting communication analytics:', error);
            throw error;
        }
    })
);

module.exports = router; 