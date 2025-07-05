/**
 * EdTech Platform - User Service
 * Handles user management, authentication, and profile operations
 */

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ValidationError, NotFoundError, AuthorizationError } = require('../middleware/errorHandler');

class UserService {
    constructor() {
        this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    }

    /**
     * Create a new user
     */
    async createUser(userData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Set tenant context
            if (userData.tenantId && userData.tenantId !== 'public') {
                await client.query('SET app.current_tenant = $1', [userData.tenantId]);
            }

            // Check if user already exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [userData.email]
            );

            if (existingUser.rows.length > 0) {
                throw new ValidationError('User with this email already exists');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(userData.password, this.saltRounds);

            // Insert user
            const query = `
                INSERT INTO users (
                    tenant_id, email, password_hash, first_name, last_name, 
                    role, phone, tenant_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, email, first_name, last_name, role, is_active, created_at
            `;

            const values = [
                userData.tenantId || 'public',
                userData.email,
                passwordHash,
                userData.firstName,
                userData.lastName,
                userData.role,
                userData.phone || null,
                userData.tenantId || 'public',
                new Date(),
                new Date()
            ];

            const result = await client.query(query, values);
            await client.query('COMMIT');

            return this.formatUserResponse(result.rows[0]);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating user:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Authenticate user login
     */
    async authenticateUser(email, password, tenantId = 'public') {
        const client = await pool.connect();
        try {
            // Set tenant context
            if (tenantId && tenantId !== 'public') {
                await client.query('SET app.current_tenant = $1', [tenantId]);
            }

            const query = `
                SELECT u.*, t.name as tenant_name 
                FROM users u 
                LEFT JOIN tenants t ON u.tenant_id = t.id 
                WHERE u.email = $1 AND u.tenant_id = $2
            `;

            const result = await client.query(query, [email, tenantId]);

            if (result.rows.length === 0) {
                throw new ValidationError('Invalid email or password');
            }

            const user = result.rows[0];

            // Check if user is active
            if (!user.is_active) {
                throw new AuthorizationError('Account is deactivated');
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                throw new ValidationError('Invalid email or password');
            }

            // Update last login
            await client.query(
                'UPDATE users SET last_login_at = $1 WHERE id = $2',
                [new Date(), user.id]
            );

            return this.formatUserResponse(user);

        } catch (error) {
            console.error('Error authenticating user:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Generate JWT tokens
     */
    async generateTokens(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
        };

        const accessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        );

        const refreshToken = jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        // Store refresh token in database
        await this.storeRefreshToken(user.id, refreshToken);

        return {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '15m'
        };
    }

    /**
     * Store refresh token
     */
    async storeRefreshToken(userId, refreshToken) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO user_sessions (user_id, refresh_token, expires_at)
                VALUES ($1, $2, $3)
            `;

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            await client.query(query, [userId, refreshToken, expiresAt]);

        } catch (error) {
            console.error('Error storing refresh token:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            // Check if token exists in database
            const client = await pool.connect();
            const tokenExists = await client.query(
                'SELECT 1 FROM user_sessions WHERE refresh_token = $1 AND expires_at > NOW()',
                [refreshToken]
            );
            client.release();

            if (tokenExists.rows.length === 0) {
                throw new AuthorizationError('Invalid refresh token');
            }

            // Get user data
            const user = await this.getUserById(decoded.id);
            if (!user || !user.isActive) {
                throw new AuthorizationError('User not found or inactive');
            }

            // Generate new access token
            const payload = {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId
            };

            const accessToken = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
            );

            return {
                accessToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '15m'
            };

        } catch (error) {
            console.error('Error refreshing token:', error);
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT u.*, t.name as tenant_name 
                FROM users u 
                LEFT JOIN tenants t ON u.tenant_id = t.id 
                WHERE u.id = $1
            `;

            const result = await client.query(query, [userId]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.formatUserResponse(result.rows[0]);

        } catch (error) {
            console.error('Error getting user by ID:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId, updateData) {
        const client = await pool.connect();
        try {
            const allowedFields = ['firstName', 'lastName', 'phone'];
            const updateFields = [];
            const values = [];
            let paramCount = 1;

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    updateFields.push(`${this.camelToSnake(key)} = $${paramCount++}`);
                    values.push(value);
                }
            }

            if (updateFields.length === 0) {
                throw new ValidationError('No valid fields to update');
            }

            values.push(new Date(), userId);

            const query = `
                UPDATE users 
                SET ${updateFields.join(', ')}, updated_at = $${paramCount++}
                WHERE id = $${paramCount++}
                RETURNING *
            `;

            const result = await client.query(query, values);

            if (result.rows.length === 0) {
                throw new NotFoundError('User not found');
            }

            return this.formatUserResponse(result.rows[0]);

        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Change password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const client = await pool.connect();
        try {
            // Get current user
            const user = await client.query(
                'SELECT password_hash FROM users WHERE id = $1',
                [userId]
            );

            if (user.rows.length === 0) {
                throw new NotFoundError('User not found');
            }

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(
                currentPassword, 
                user.rows[0].password_hash
            );

            if (!isCurrentPasswordValid) {
                throw new ValidationError('Current password is incorrect');
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

            // Update password
            await client.query(
                'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
                [newPasswordHash, new Date(), userId]
            );

            return { message: 'Password changed successfully' };

        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Forgot password
     */
    async forgotPassword(email) {
        const client = await pool.connect();
        try {
            const user = await client.query(
                'SELECT id, email, first_name FROM users WHERE email = $1',
                [email]
            );

            if (user.rows.length === 0) {
                // Don't reveal if user exists
                return { message: 'If the email exists, a reset link has been sent' };
            }

            const resetToken = this.generateResetToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

            await client.query(
                'UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3',
                [resetToken, expiresAt, user.rows[0].id]
            );

            // TODO: Send email with reset link
            console.log(`Password reset token for ${email}: ${resetToken}`);

            return { message: 'If the email exists, a reset link has been sent' };

        } catch (error) {
            console.error('Error in forgot password:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Reset password
     */
    async resetPassword(token, newPassword) {
        const client = await pool.connect();
        try {
            const user = await client.query(
                'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires_at > NOW()',
                [token]
            );

            if (user.rows.length === 0) {
                throw new ValidationError('Invalid or expired reset token');
            }

            const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

            await client.query(
                'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = $2 WHERE id = $3',
                [passwordHash, new Date(), user.rows[0].id]
            );

            return { message: 'Password reset successfully' };

        } catch (error) {
            console.error('Error resetting password:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Logout user
     */
    async logoutUser(refreshToken) {
        const client = await pool.connect();
        try {
            await client.query(
                'DELETE FROM user_sessions WHERE refresh_token = $1',
                [refreshToken]
            );

            return { message: 'Logged out successfully' };

        } catch (error) {
            console.error('Error logging out:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Generate reset token
     */
    generateResetToken() {
        return require('crypto').randomBytes(32).toString('hex');
    }

    /**
     * Convert camelCase to snake_case
     */
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    /**
     * Format user response
     */
    formatUserResponse(user) {
        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            phone: user.phone,
            avatarUrl: user.avatar_url,
            isActive: user.is_active,
            isVerified: user.is_verified,
            tenantId: user.tenant_id,
            tenantName: user.tenant_name,
            lastLoginAt: user.last_login_at,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };
    }
}

module.exports = UserService; 