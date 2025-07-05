/**
 * User Service
 * Handles all user-related database operations
 */

const pool = require('../config/database');

class UserService {
    /**
     * Create a new user
     */
    async createUser(userData) {
        const query = `
            INSERT INTO users (
                first_name, last_name, email, password, school_id, 
                email_verified, role, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const values = [
            userData.first_name,
            userData.last_name,
            userData.email,
            userData.password,
            userData.school_id,
            userData.email_verified || false,
            userData.role || null,
            userData.status || 'pending_verification'
        ];
        
        try {
            const result = await pool.query(query, values);
            return { id: result.insertId, ...userData };
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error('Failed to create user');
        }
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ? AND status != "deleted"';
        
        try {
            const [rows] = await pool.query(query, [email]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw new Error('Failed to find user');
        }
    }

    /**
     * Find user by ID
     */
    async findById(userId) {
        const query = 'SELECT * FROM users WHERE id = ? AND status != "deleted"';
        
        try {
            const [rows] = await pool.query(query, [userId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw new Error('Failed to find user');
        }
    }

    /**
     * Verify user email
     */
    async verifyEmail(userId) {
        const query = `
            UPDATE users 
            SET email_verified = true, status = 'active', updated_at = NOW() 
            WHERE id = ?
        `;
        
        try {
            await pool.query(query, [userId]);
            return true;
        } catch (error) {
            console.error('Error verifying email:', error);
            throw new Error('Failed to verify email');
        }
    }

    /**
     * Assign role to user
     */
    async assignRole(userId, role) {
        const query = `
            UPDATE users 
            SET role = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        
        try {
            await pool.query(query, [role, userId]);
            return true;
        } catch (error) {
            console.error('Error assigning role:', error);
            throw new Error('Failed to assign role');
        }
    }

    /**
     * Update user status
     */
    async updateStatus(userId, status) {
        const query = `
            UPDATE users 
            SET status = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        
        try {
            await pool.query(query, [status, userId]);
            return true;
        } catch (error) {
            console.error('Error updating status:', error);
            throw new Error('Failed to update status');
        }
    }

    /**
     * Update last login
     */
    async updateLastLogin(userId) {
        const query = `
            UPDATE users 
            SET last_login = NOW(), updated_at = NOW() 
            WHERE id = ?
        `;
        
        try {
            await pool.query(query, [userId]);
            return true;
        } catch (error) {
            console.error('Error updating last login:', error);
            throw new Error('Failed to update last login');
        }
    }

    /**
     * Update password
     */
    async updatePassword(userId, hashedPassword) {
        const query = `
            UPDATE users 
            SET password = ?, updated_at = NOW() 
            WHERE id = ?
        `;
        
        try {
            await pool.query(query, [hashedPassword, userId]);
            return true;
        } catch (error) {
            console.error('Error updating password:', error);
            throw new Error('Failed to update password');
        }
    }

    /**
     * Get users by role
     */
    async getUsersByRole(role) {
        const query = 'SELECT * FROM users WHERE role = ? AND status = "active"';
        
        try {
            const [rows] = await pool.query(query, [role]);
            return rows;
        } catch (error) {
            console.error('Error getting users by role:', error);
            throw new Error('Failed to get users');
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, updateData) {
        const allowedFields = ['first_name', 'last_name', 'phone', 'avatar'];
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        updates.push('updated_at = NOW()');
        values.push(userId);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        
        try {
            await pool.query(query, values);
            return this.findById(userId);
        } catch (error) {
            console.error('Error updating profile:', error);
            throw new Error('Failed to update profile');
        }
    }

    /**
     * Find user by ID with password (for authentication)
     */
    async findByIdWithPassword(userId) {
        const query = 'SELECT * FROM users WHERE id = ? AND status != "deleted"';
        
        try {
            const [rows] = await pool.query(query, [userId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding user by ID with password:', error);
            throw new Error('Failed to find user');
        }
    }
}

module.exports = UserService; 