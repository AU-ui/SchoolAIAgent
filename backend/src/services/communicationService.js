/**
 * EdTech Platform - Communication Service
 * Handles messaging, conversations, notifications, and ML integration
 */

const { pool } = require('../config/database');
const { ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler');

class CommunicationService {
    constructor() {
        // Initialize WebSocket or real-time service here
        this.notificationService = null;
    }

    /**
     * Create a new message
     */
    async createMessage(messageData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Set tenant context
            if (messageData.tenantId && messageData.tenantId !== 'public') {
                await client.query('SET app.current_tenant = $1', [messageData.tenantId]);
            }

            // Check if conversation exists between users
            let conversationId = await this.getExistingConversation(
                messageData.senderId, 
                messageData.receiverId, 
                messageData.tenantId
            );

            // Create new conversation if doesn't exist
            if (!conversationId) {
                conversationId = await this.createConversation({
                    participants: [messageData.senderId, messageData.receiverId],
                    tenantId: messageData.tenantId
                });
            }

            // Insert message
            const messageQuery = `
                INSERT INTO messages (
                    conversation_id, sender_id, content, message_type, 
                    priority, attachments, ml_analysis, tenant_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const messageValues = [
                conversationId,
                messageData.senderId,
                messageData.content,
                messageData.type,
                messageData.priority || 'normal',
                messageData.attachments ? JSON.stringify(messageData.attachments) : null,
                messageData.mlAnalysis ? JSON.stringify(messageData.mlAnalysis) : null,
                messageData.tenantId,
                new Date()
            ];

            const messageResult = await client.query(messageQuery, messageValues);
            const message = messageResult.rows[0];

            // Update conversation last activity
            await client.query(
                'UPDATE conversations SET last_activity = $1, updated_at = $2 WHERE id = $3',
                [new Date(), new Date(), conversationId]
            );

            await client.query('COMMIT');

            return this.formatMessageResponse(message);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating message:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get existing conversation between two users
     */
    async getExistingConversation(user1Id, user2Id, tenantId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT c.id FROM conversations c
                JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
                JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
                WHERE cp1.user_id = $1 AND cp2.user_id = $2 
                AND c.tenant_id = $3 AND c.conversation_type = 'direct'
                LIMIT 1
            `;

            const result = await client.query(query, [user1Id, user2Id, tenantId]);
            
            return result.rows.length > 0 ? result.rows[0].id : null;

        } catch (error) {
            console.error('Error getting existing conversation:', error);
            return null;
        } finally {
            client.release();
        }
    }

    /**
     * Create a new conversation
     */
    async createConversation(conversationData) {
        const client = await pool.connect();
        try {
            const conversationQuery = `
                INSERT INTO conversations (
                    conversation_type, tenant_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4)
                RETURNING id
            `;

            const conversationValues = [
                'direct',
                conversationData.tenantId,
                new Date(),
                new Date()
            ];

            const conversationResult = await client.query(conversationQuery, conversationValues);
            const conversationId = conversationResult.rows[0].id;

            // Add participants
            for (const participantId of conversationData.participants) {
                await client.query(
                    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)',
                    [conversationId, participantId]
                );
            }

            return conversationId;

        } catch (error) {
            console.error('Error creating conversation:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get user's conversations
     */
    async getConversations(options) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT DISTINCT c.*, 
                    COUNT(m.id) as message_count,
                    COUNT(CASE WHEN m.is_read = false AND m.sender_id != $1 THEN 1 END) as unread_count,
                    MAX(m.created_at) as last_message_at
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                LEFT JOIN messages m ON c.id = m.conversation_id
                WHERE cp.user_id = $1 AND c.tenant_id = $2
            `;

            const values = [options.userId, options.tenantId];
            let paramCount = 3;

            if (options.status) {
                query += ` AND c.status = $${paramCount++}`;
                values.push(options.status);
            }

            query += `
                GROUP BY c.id
                ORDER BY c.last_activity DESC
                LIMIT $${paramCount++} OFFSET $${paramCount++}
            `;
            values.push(options.limit, options.offset);

            const result = await client.query(query, values);

            // Get total count
            const countQuery = `
                SELECT COUNT(DISTINCT c.id) as total
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                WHERE cp.user_id = $1 AND c.tenant_id = $2
            `;
            const countResult = await client.query(countQuery, [options.userId, options.tenantId]);

            // Get unread count
            const unreadQuery = `
                SELECT COUNT(*) as unread_count
                FROM messages m
                JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
                WHERE cp.user_id = $1 AND m.is_read = false AND m.sender_id != $1
                AND m.tenant_id = $2
            `;
            const unreadResult = await client.query(unreadQuery, [options.userId, options.tenantId]);

            return {
                conversations: result.rows.map(row => this.formatConversationResponse(row)),
                total: parseInt(countResult.rows[0].total),
                unreadCount: parseInt(unreadResult.rows[0].unread_count)
            };

        } catch (error) {
            console.error('Error getting conversations:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get conversation messages
     */
    async getConversationMessages(options) {
        const client = await pool.connect();
        try {
            // Get conversation details
            const conversationQuery = `
                SELECT c.*, 
                    array_agg(DISTINCT u.id) as participant_ids,
                    array_agg(DISTINCT u.first_name || ' ' || u.last_name) as participant_names
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                JOIN users u ON cp.user_id = u.id
                WHERE c.id = $1 AND c.tenant_id = $2
                GROUP BY c.id
            `;

            const conversationResult = await client.query(conversationQuery, [options.conversationId, options.tenantId]);
            
            if (conversationResult.rows.length === 0) {
                throw new NotFoundError('Conversation not found');
            }

            const conversation = conversationResult.rows[0];

            // Get messages
            const messagesQuery = `
                SELECT m.*, u.first_name, u.last_name, u.role
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = $1 AND m.tenant_id = $2
                ORDER BY m.created_at DESC
                LIMIT $3 OFFSET $4
            `;

            const messagesResult = await client.query(messagesQuery, [
                options.conversationId, 
                options.tenantId, 
                options.limit, 
                options.offset
            ]);

            // Get total message count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM messages
                WHERE conversation_id = $1 AND tenant_id = $2
            `;
            const countResult = await client.query(countQuery, [options.conversationId, options.tenantId]);

            return {
                messages: messagesResult.rows.map(row => this.formatMessageResponse(row)),
                total: parseInt(countResult.rows[0].total),
                conversation: this.formatConversationResponse(conversation)
            };

        } catch (error) {
            console.error('Error getting conversation messages:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Add reply to conversation
     */
    async addReplyToConversation(replyData) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO messages (
                    conversation_id, sender_id, content, message_type, 
                    attachments, ml_analysis, tenant_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                replyData.conversationId,
                replyData.senderId,
                replyData.content,
                'reply',
                replyData.attachments ? JSON.stringify(replyData.attachments) : null,
                replyData.mlAnalysis ? JSON.stringify(replyData.mlAnalysis) : null,
                replyData.tenantId,
                new Date()
            ];

            const result = await client.query(query, values);

            // Update conversation last activity
            await client.query(
                'UPDATE conversations SET last_activity = $1, updated_at = $2 WHERE id = $3',
                [new Date(), new Date(), replyData.conversationId]
            );

            return this.formatMessageResponse(result.rows[0]);

        } catch (error) {
            console.error('Error adding reply:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Mark messages as read
     */
    async markMessagesAsRead(conversationId, userId, tenantId) {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE messages 
                SET is_read = true, read_at = $1
                WHERE conversation_id = $2 AND sender_id != $3 AND tenant_id = $4
            `;

            await client.query(query, [new Date(), conversationId, userId, tenantId]);

        } catch (error) {
            console.error('Error marking messages as read:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Edit message
     */
    async editMessage(editData) {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE messages 
                SET content = $1, edited_at = $2, edited_by = $3
                WHERE id = $4 AND tenant_id = $5
                RETURNING *
            `;

            const values = [
                editData.content,
                new Date(),
                editData.editedBy,
                editData.messageId,
                editData.tenantId
            ];

            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                throw new NotFoundError('Message not found');
            }

            return this.formatMessageResponse(result.rows[0]);

        } catch (error) {
            console.error('Error editing message:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Delete message (soft delete)
     */
    async deleteMessage(deleteData) {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE messages 
                SET deleted_at = $1, deleted_by = $2
                WHERE id = $3 AND tenant_id = $4
                RETURNING *
            `;

            const values = [
                new Date(),
                deleteData.deletedBy,
                deleteData.messageId,
                deleteData.tenantId
            ];

            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                throw new NotFoundError('Message not found');
            }

            return this.formatMessageResponse(result.rows[0]);

        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create broadcast message
     */
    async createBroadcast(broadcastData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Create broadcast record
            const broadcastQuery = `
                INSERT INTO broadcasts (
                    sender_id, content, broadcast_type, priority, 
                    schedule_for, tenant_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `;

            const broadcastValues = [
                broadcastData.senderId,
                broadcastData.content,
                broadcastData.type,
                broadcastData.priority,
                broadcastData.scheduleFor,
                broadcastData.tenantId,
                new Date()
            ];

            const broadcastResult = await client.query(broadcastQuery, broadcastValues);
            const broadcastId = broadcastResult.rows[0].id;

            // Add recipients
            for (const recipientId of broadcastData.recipients) {
                await client.query(
                    'INSERT INTO broadcast_recipients (broadcast_id, recipient_id) VALUES ($1, $2)',
                    [broadcastId, recipientId]
                );
            }

            await client.query('COMMIT');

            return {
                id: broadcastId,
                senderId: broadcastData.senderId,
                content: broadcastData.content,
                type: broadcastData.type,
                recipients: broadcastData.recipients,
                scheduleFor: broadcastData.scheduleFor
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating broadcast:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Send broadcast notifications
     */
    async sendBroadcastNotifications(broadcast) {
        try {
            // This would integrate with WebSocket or push notification service
            console.log(`Sending broadcast notifications for broadcast ${broadcast.id}`);
            
            // For now, just log the notification
            for (const recipientId of broadcast.recipients) {
                await this.sendNotification({
                    receiverId: recipientId,
                    type: 'broadcast',
                    title: 'Broadcast Message',
                    content: broadcast.content,
                    data: { broadcastId: broadcast.id }
                });
            }

        } catch (error) {
            console.error('Error sending broadcast notifications:', error);
        }
    }

    /**
     * Send notification
     */
    async sendNotification(notificationData) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO notifications (
                    user_id, type, title, content, data, tenant_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const values = [
                notificationData.receiverId,
                notificationData.type,
                notificationData.title,
                notificationData.content,
                notificationData.data ? JSON.stringify(notificationData.data) : null,
                notificationData.tenantId || 'public',
                new Date()
            ];

            const result = await client.query(query, values);

            // Here you would also send real-time notification via WebSocket
            console.log(`Notification sent to user ${notificationData.receiverId}: ${notificationData.title}`);

            return result.rows[0];

        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get notifications
     */
    async getNotifications(options) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT * FROM notifications 
                WHERE user_id = $1 AND tenant_id = $2
            `;

            const values = [options.userId, options.tenantId];
            let paramCount = 3;

            if (options.unreadOnly) {
                query += ` AND is_read = false`;
            }

            query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
            values.push(options.limit, options.offset);

            const result = await client.query(query, values);

            // Get total count
            let countQuery = `
                SELECT COUNT(*) as total FROM notifications 
                WHERE user_id = $1 AND tenant_id = $2
            `;
            if (options.unreadOnly) {
                countQuery += ` AND is_read = false`;
            }
            const countResult = await client.query(countQuery, [options.userId, options.tenantId]);

            // Get unread count
            const unreadQuery = `
                SELECT COUNT(*) as unread_count FROM notifications 
                WHERE user_id = $1 AND tenant_id = $2 AND is_read = false
            `;
            const unreadResult = await client.query(unreadQuery, [options.userId, options.tenantId]);

            return {
                notifications: result.rows,
                total: parseInt(countResult.rows[0].total),
                unreadCount: parseInt(unreadResult.rows[0].unread_count)
            };

        } catch (error) {
            console.error('Error getting notifications:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Mark notifications as read
     */
    async markNotificationsAsRead(markData) {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE notifications 
                SET is_read = true, read_at = $1
                WHERE user_id = $2 AND id = ANY($3) AND tenant_id = $4
            `;

            const result = await client.query(query, [
                new Date(),
                markData.userId,
                markData.notificationIds,
                markData.tenantId
            ]);

            return {
                markedCount: result.rowCount
            };

        } catch (error) {
            console.error('Error marking notifications as read:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Verify communication permission
     */
    async verifyCommunicationPermission(senderId, receiverId, senderRole, tenantId) {
        const client = await pool.connect();
        try {
            // Different permission rules based on role
            switch (senderRole) {
                case 'teacher':
                    // Teachers can communicate with their students and parents
                    const teacherQuery = `
                        SELECT 1 FROM class_assignments ca
                        JOIN student_class_assignments sca ON ca.class_id = sca.class_id
                        LEFT JOIN parent_student_relationships psr ON sca.student_id = psr.student_id
                        WHERE ca.teacher_id = $1 AND (sca.student_id = $2 OR psr.parent_id = $2)
                        AND ca.tenant_id = $3
                        LIMIT 1
                    `;
                    const teacherResult = await client.query(teacherQuery, [senderId, receiverId, tenantId]);
                    return teacherResult.rows.length > 0;

                case 'parent':
                    // Parents can communicate with their children's teachers
                    const parentQuery = `
                        SELECT 1 FROM parent_student_relationships psr
                        JOIN student_class_assignments sca ON psr.student_id = sca.student_id
                        JOIN class_assignments ca ON sca.class_id = ca.class_id
                        WHERE psr.parent_id = $1 AND ca.teacher_id = $2 AND psr.tenant_id = $3
                        LIMIT 1
                    `;
                    const parentResult = await client.query(parentQuery, [senderId, receiverId, tenantId]);
                    return parentResult.rows.length > 0;

                case 'admin':
                    return true; // Admins can communicate with everyone

                default:
                    return false;
            }

        } catch (error) {
            console.error('Error verifying communication permission:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Verify conversation access
     */
    async verifyConversationAccess(userId, conversationId, tenantId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 1 FROM conversation_participants cp
                JOIN conversations c ON cp.conversation_id = c.id
                WHERE cp.user_id = $1 AND c.id = $2 AND c.tenant_id = $3
                LIMIT 1
            `;

            const result = await client.query(query, [userId, conversationId, tenantId]);
            return result.rows.length > 0;

        } catch (error) {
            console.error('Error verifying conversation access:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Verify message ownership
     */
    async verifyMessageOwnership(userId, messageId, tenantId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT 1 FROM messages 
                WHERE id = $1 AND sender_id = $2 AND tenant_id = $3
                LIMIT 1
            `;

            const result = await client.query(query, [messageId, userId, tenantId]);
            return result.rows.length > 0;

        } catch (error) {
            console.error('Error verifying message ownership:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Verify broadcast permission
     */
    async verifyBroadcastPermission(senderId, recipients, senderRole, tenantId) {
        const client = await pool.connect();
        try {
            for (const recipientId of recipients) {
                const hasPermission = await this.verifyCommunicationPermission(
                    senderId, recipientId, senderRole, tenantId
                );
                if (!hasPermission) {
                    return false;
                }
            }
            return true;

        } catch (error) {
            console.error('Error verifying broadcast permission:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Get communication history for ML analysis
     */
    async getCommunicationHistory(options) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT m.*, c.conversation_type, u.role as sender_role
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN users u ON m.sender_id = u.id
                WHERE (m.sender_id = $1 OR m.receiver_id = $1) AND m.tenant_id = $2
            `;

            const values = [options.userId, options.tenantId];
            let paramCount = 3;

            if (options.startDate) {
                query += ` AND m.created_at >= $${paramCount++}`;
                values.push(options.startDate);
            }

            if (options.endDate) {
                query += ` AND m.created_at <= $${paramCount++}`;
                values.push(options.endDate);
            }

            query += ` ORDER BY m.created_at DESC`;

            const result = await client.query(query, values);
            
            return result.rows.map(row => ({
                id: row.id,
                content: row.content,
                type: row.message_type,
                senderRole: row.sender_role,
                conversationType: row.conversation_type,
                createdAt: row.created_at,
                mlAnalysis: row.ml_analysis ? JSON.parse(row.ml_analysis) : null
            }));

        } catch (error) {
            console.error('Error getting communication history:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get conversation details
     */
    async getConversation(conversationId, tenantId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT c.*, 
                    array_agg(DISTINCT u.id) as participant_ids,
                    array_agg(DISTINCT u.first_name || ' ' || u.last_name) as participant_names
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                JOIN users u ON cp.user_id = u.id
                WHERE c.id = $1 AND c.tenant_id = $2
                GROUP BY c.id
            `;

            const result = await client.query(query, [conversationId, tenantId]);
            
            if (result.rows.length === 0) {
                throw new NotFoundError('Conversation not found');
            }

            return this.formatConversationResponse(result.rows[0]);

        } catch (error) {
            console.error('Error getting conversation:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Set auto-response rule
     */
    async setAutoResponse(autoResponseData) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO auto_responses (
                    user_id, triggers, response, is_active, tenant_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const values = [
                autoResponseData.userId,
                JSON.stringify(autoResponseData.triggers),
                autoResponseData.response,
                autoResponseData.isActive,
                autoResponseData.tenantId,
                new Date()
            ];

            const result = await client.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('Error setting auto-response:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get communication templates
     */
    async getTemplates(options) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT * FROM communication_templates 
                WHERE tenant_id = $1
            `;

            const values = [options.tenantId];
            let paramCount = 2;

            if (options.category) {
                query += ` AND category = $${paramCount++}`;
                values.push(options.category);
            }

            if (options.language) {
                query += ` AND language = $${paramCount++}`;
                values.push(options.language);
            }

            query += ` ORDER BY name`;

            const result = await client.query(query, values);
            return result.rows;

        } catch (error) {
            console.error('Error getting templates:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create communication template
     */
    async createTemplate(templateData) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO communication_templates (
                    user_id, name, content, category, language, 
                    variables, tenant_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const values = [
                templateData.userId,
                templateData.name,
                templateData.content,
                templateData.category,
                templateData.language,
                templateData.variables ? JSON.stringify(templateData.variables) : null,
                templateData.tenantId,
                new Date()
            ];

            const result = await client.query(query, values);
            return result.rows[0];

        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get template by ID
     */
    async getTemplate(templateId, tenantId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT * FROM communication_templates 
                WHERE id = $1 AND tenant_id = $2
            `;

            const result = await client.query(query, [templateId, tenantId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            console.error('Error getting template:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Process template with variables
     */
    async processTemplate(template, variables) {
        let content = template.content;
        
        if (variables && template.variables) {
            const templateVars = JSON.parse(template.variables);
            
            for (const [key, value] of Object.entries(variables)) {
                if (templateVars.includes(key)) {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    content = content.replace(regex, value);
                }
            }
        }
        
        return content;
    }

    /**
     * Format message response
     */
    formatMessageResponse(message) {
        if (!message) return null;

        return {
            id: message.id,
            conversationId: message.conversation_id,
            senderId: message.sender_id,
            content: message.content,
            type: message.message_type,
            priority: message.priority,
            attachments: message.attachments ? JSON.parse(message.attachments) : null,
            mlAnalysis: message.ml_analysis ? JSON.parse(message.ml_analysis) : null,
            isRead: message.is_read,
            readAt: message.read_at,
            editedAt: message.edited_at,
            editedBy: message.edited_by,
            deletedAt: message.deleted_at,
            deletedBy: message.deleted_by,
            tenantId: message.tenant_id,
            createdAt: message.created_at,
            // Additional fields from joins
            senderName: message.first_name && message.last_name ? 
                `${message.first_name} ${message.last_name}` : null,
            senderRole: message.role
        };
    }

    /**
     * Format conversation response
     */
    formatConversationResponse(conversation) {
        if (!conversation) return null;

        return {
            id: conversation.id,
            type: conversation.conversation_type,
            status: conversation.status,
            lastActivity: conversation.last_activity,
            messageCount: conversation.message_count,
            unreadCount: conversation.unread_count,
            lastMessageAt: conversation.last_message_at,
            tenantId: conversation.tenant_id,
            createdAt: conversation.created_at,
            updatedAt: conversation.updated_at,
            // Additional fields from joins
            participantIds: conversation.participant_ids,
            participantNames: conversation.participant_names
        };
    }
}

module.exports = CommunicationService;
