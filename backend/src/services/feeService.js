/**
 * EdTech Platform - Fee Management Service
 * Handles fee calculation, payment tracking, and reporting
 */

const { Pool } = require('pg');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

class FeeService {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    /**
     * Get all fees for a student
     */
    async getStudentFees(studentId, tenantId) {
        const query = `
            SELECT * FROM fees
            WHERE student_id = $1 AND tenant_id = $2
            ORDER BY due_date ASC
        `;
        const result = await this.pool.query(query, [studentId, tenantId]);
        return result.rows;
    }

    /**
     * Get all outstanding fees for a student
     */
    async getOutstandingFees(studentId, tenantId) {
        const query = `
            SELECT * FROM fees
            WHERE student_id = $1 AND tenant_id = $2 AND status = 'unpaid'
            ORDER BY due_date ASC
        `;
        const result = await this.pool.query(query, [studentId, tenantId]);
        return result.rows;
    }

    /**
     * Record a fee payment
     */
    async recordPayment(feeId, paymentData, tenantId) {
        const { amount, paymentDate, paymentMethod, reference } = paymentData;
        const query = `
            UPDATE fees
            SET status = 'paid',
                paid_amount = $1,
                paid_date = $2,
                payment_method = $3,
                payment_reference = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5 AND tenant_id = $6
            RETURNING *
        `;
        const result = await this.pool.query(query, [
            amount, paymentDate, paymentMethod, reference, feeId, tenantId
        ]);
        if (result.rows.length === 0) {
            throw new NotFoundError('Fee record not found');
        }
        return result.rows[0];
    }

    /**
     * Get fee summary for a student
     */
    async getFeeSummary(studentId, tenantId) {
        const query = `
            SELECT 
                COUNT(*) FILTER (WHERE status = 'unpaid') AS unpaid_count,
                SUM(amount) FILTER (WHERE status = 'unpaid') AS total_due,
                SUM(amount) FILTER (WHERE status = 'paid') AS total_paid
            FROM fees
            WHERE student_id = $1 AND tenant_id = $2
        `;
        const result = await this.pool.query(query, [studentId, tenantId]);
        return result.rows[0];
    }

    /**
     * Get all fees for a class
     */
    async getClassFees(classId, tenantId) {
        const query = `
            SELECT * FROM fees
            WHERE class_id = $1 AND tenant_id = $2
            ORDER BY due_date ASC
        `;
        const result = await this.pool.query(query, [classId, tenantId]);
        return result.rows;
    }

    // ... (add more methods as needed)
}

module.exports = FeeService; 