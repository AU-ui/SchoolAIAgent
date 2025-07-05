/**
 * EdTech Platform - Task Management Service
 * Handles task creation, assignment, tracking, and completion
 */

const { Pool } = require('pg');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

class TaskService {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    /**
     * Create a new task
     */
    async createTask(taskData) {
        const { 
            tenantId, title, description, assignedBy, assignedTo, 
            classId, priority, dueDate, tags 
        } = taskData;

        const query = `
            INSERT INTO tasks (tenant_id, title, description, assigned_by, assigned_to, 
                              class_id, priority, due_date, tags)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        try {
            const result = await this.pool.query(query, [
                tenantId, title, description, assignedBy, assignedTo, 
                classId, priority, dueDate, tags
            ]);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23503') { // Foreign key violation
                throw new ValidationError('Invalid user or class ID');
            }
            throw error;
        }
    }

    /**
     * Get tasks with filters
     */
    async getTasks(tenantId, filters = {}) {
        let query = `
            SELECT 
                t.*,
                u1.first_name as assigned_by_first_name,
                u1.last_name as assigned_by_last_name,
                u2.first_name as assigned_to_first_name,
                u2.last_name as assigned_to_last_name,
                c.name as class_name
            FROM tasks t
            LEFT JOIN users u1 ON t.assigned_by = u1.id
            LEFT JOIN users u2 ON t.assigned_to = u2.id
            LEFT JOIN classes c ON t.class_id = c.id
            WHERE t.tenant_id = $1
        `;

        const params = [tenantId];
        let paramCount = 1;

        if (filters.assignedTo) {
            paramCount++;
            query += ` AND t.assigned_to = $${paramCount}`;
            params.push(filters.assignedTo);
        }

        if (filters.assignedBy) {
            paramCount++;
            query += ` AND t.assigned_by = $${paramCount}`;
            params.push(filters.assignedBy);
        }

        if (filters.status) {
            paramCount++;
            query += ` AND t.status = $${paramCount}`;
            params.push(filters.status);
        }

        if (filters.priority) {
            paramCount++;
            query += ` AND t.priority = $${paramCount}`;
            params.push(filters.priority);
        }

        if (filters.classId) {
            paramCount++;
            query += ` AND t.class_id = $${paramCount}`;
            params.push(filters.classId);
        }

        if (filters.dueDateFrom) {
            paramCount++;
            query += ` AND t.due_date >= $${paramCount}`;
            params.push(filters.dueDateFrom);
        }

        if (filters.dueDateTo) {
            paramCount++;
            query += ` AND t.due_date <= $${paramCount}`;
            params.push(filters.dueDateTo);
        }

        // Add ordering
        query += ` ORDER BY 
            CASE 
                WHEN t.status = 'overdue' THEN 1
                WHEN t.status = 'pending' THEN 2
                WHEN t.status = 'in_progress' THEN 3
                ELSE 4
            END,
            t.due_date ASC,
            t.created_at DESC`;

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Get task by ID with details
     */
    async getTaskById(taskId, tenantId) {
        const query = `
            SELECT 
                t.*,
                u1.first_name as assigned_by_first_name,
                u1.last_name as assigned_by_last_name,
                u2.first_name as assigned_to_first_name,
                u2.last_name as assigned_to_last_name,
                c.name as class_name
            FROM tasks t
            LEFT JOIN users u1 ON t.assigned_by = u1.id
            LEFT JOIN users u2 ON t.assigned_to = u2.id
            LEFT JOIN classes c ON t.class_id = c.id
            WHERE t.id = $1 AND t.tenant_id = $2
        `;

        const result = await this.pool.query(query, [taskId, tenantId]);
        
        if (result.rows.length === 0) {
            throw new NotFoundError('Task not found');
        }

        return result.rows[0];
    }

    /**
     * Update task
     */
    async updateTask(taskId, updateData, tenantId) {
        const { 
            title, description, assignedTo, priority, dueDate, 
            status, completionNotes, tags 
        } = updateData;

        const query = `
            UPDATE tasks 
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                assigned_to = COALESCE($3, assigned_to),
                priority = COALESCE($4, priority),
                due_date = COALESCE($5, due_date),
                status = COALESCE($6, status),
                completion_notes = COALESCE($7, completion_notes),
                completed_at = CASE 
                    WHEN $6 = 'completed' AND completed_at IS NULL THEN CURRENT_TIMESTAMP
                    ELSE completed_at
                END,
                tags = COALESCE($8, tags),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9 AND tenant_id = $10
            RETURNING *
        `;

        const result = await this.pool.query(query, [
            title, description, assignedTo, priority, dueDate,
            status, completionNotes, tags, taskId, tenantId
        ]);

        if (result.rows.length === 0) {
            throw new NotFoundError('Task not found');
        }

        return result.rows[0];
    }

    /**
     * Delete task
     */
    async deleteTask(taskId, tenantId) {
        const query = `
            DELETE FROM tasks 
            WHERE id = $1 AND tenant_id = $2
            RETURNING *
        `;
        const result = await this.pool.query(query, [taskId, tenantId]);
        if (result.rows.length === 0) {
            throw new NotFoundError('Task not found');
        }
        return result.rows[0];
    }

    // ... (rest of the methods remain unchanged)
}

module.exports = TaskService; 