 * EdTech Platform - Token Service
 * Handles token management for authentication, verification, and password reset
 */

const { pool } = require('../config/database');

class TokenService {
    /**
     * Save refresh token to database
     */
    async saveRefreshToken(userId, refreshToken) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO user_sessions (user_id, refresh_token, expires_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id) DO UPDATE SET
                    refresh_token = EXCLUDED.refresh_token,
                    expires_at = EXCLUDED.expires_at,
                    created_at = NOW()
            `;

            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            const values = [userId, refreshToken, expiresAt];

            await client.query(query, values);
            console.log(`Refresh token saved for user ${userId}`);

        } catch (error) {
            console.error('Error saving refresh token:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Validate refresh token
     */
    async validateRefreshToken(userId, refreshToken) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT * FROM user_sessions 
                WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW()
            `;

            const result = await client.query(query, [userId, refreshToken]);
            
            return result.rows.length > 0;

        } catch (error) {
            console.error('Error validating refresh token:', error);
            return false;
        } finally {
            client.release();
        }
    }

    /**
     * Invalidate refresh token
     */
    async invalidateRefreshToken(userId, refreshToken) {
        const client = await pool.connect();
        try {
            const query = `
                DELETE FROM user_sessions 
                WHERE user_id = $1 AND refresh_token = $2
            `;

            const result = await client.query(query, [userId, refreshToken]);
            
            if (result.rowCount > 0) {
                console.log(`Refresh token invalidated for user ${userId}`);
                return true;
            }
            
            return false;

        } catch (error) {
            console.error('Error invalidating refresh token:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Clear all user sessions
     */
    async clearUserSessions(userId) {
        const client = await pool.connect();
        try {
            const query = `
                DELETE FROM user_sessions 
                WHERE user_id = $1
            `;

            const result = await client.query(query, [userId]);
            
            console.log(`Cleared ${result.rowCount} sessions for user ${userId}`);
            return result.rowCount;

        } catch (error) {
            console.error('Error clearing user sessions:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create verification token
     */
    async createVerificationToken(userId, token) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO verification_tokens (user_id, token, type, expires_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, type) DO UPDATE SET
                    token = EXCLUDED.token,
                    expires_at = EXCLUDED.expires_at,
                    created_at = NOW()
            `;

            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            const values = [userId, token, 'email_verification', expiresAt];

            await client.query(query, values);
            console.log(`Verification token created for user ${userId}`);

        } catch (error) {
            console.error('Error creating verification token:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Validate verification token
     */
    async validateVerificationToken(token) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT * FROM verification_tokens 
                WHERE token = $1 AND type = 'email_verification' AND expires_at > NOW()
            `;

            const result = await client.query(query, [token]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            console.error('Error validating verification token:', error);
            return null;
        } finally {
            client.release();
        }
    }

    /**
     * Invalidate verification token
     */
    async invalidateVerificationToken(token) {
        const client = await pool.connect();
        try {
            const query = `
                DELETE FROM verification_tokens 
                WHERE token = $1
            `;

            const result = await client.query(query, [token]);
            
            if (result.rowCount > 0) {
                console.log(`Verification token invalidated`);
                return true;
            }
            
            return false;

        } catch (error) {
            console.error('Error invalidating verification token:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create password reset token
     */
    async createPasswordResetToken(userId, token, expiresAt) {
        const client = await pool.connect();
        try {
            const query = `
                INSERT INTO verification_tokens (user_id, token, type, expires_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, type) DO UPDATE SET
                    token = EXCLUDED.token,
                    expires_at = EXCLUDED.expires_at,
                    created_at = NOW()
            `;

            const values = [userId, token, 'password_reset', expiresAt];

            await client.query(query, values);
            console.log(`Password reset token created for user ${userId}`);

        } catch (error) {
            console.error('Error creating password reset token:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Validate password reset token
     */
    async validatePasswordResetToken(token) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT * FROM verification_tokens 
                WHERE token = $1 AND type = 'password_reset' AND expires_at > NOW()
            `;

            const result = await client.query(query, [token]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            console.error('Error validating password reset token:', error);
            return null;
        } finally {
            client.release();
        }
    }

    /**
     * Invalidate password reset token
     */
    async invalidatePasswordResetToken(token) {
        const client = await pool.connect();
        try {
            const query = `
                DELETE FROM verification_tokens 
                WHERE token = $1 AND type = 'password_reset'
            `;

            const result = await client.query(query, [token]);
            
            if (result.rowCount > 0) {
                console.log(`Password reset token invalidated`);
                return true;
            }
            
            return false;

        } catch (error) {
            console.error('Error invalidating password reset token:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create verification code
     */
    async createVerificationCode(userId, code) {
        const query = `
            INSERT INTO verification_codes (
                user_id, code, expires_at, created_at
            ) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW())
            ON DUPLICATE KEY UPDATE 
                code = VALUES(code), 
                expires_at = VALUES(expires_at), 
                created_at = NOW()
        `;
        
        try {
            await pool.execute(query, [userId, code]);
            return true;
        } catch (error) {
            console.error('Error creating verification code:', error);
            throw new Error('Failed to create verification code');
        }
    }

    /**
     * Validate verification code
     */
    async validateVerificationCode(userId, code) {
        const query = `
            SELECT * FROM verification_codes 
            WHERE user_id = ? AND code = ? AND expires_at > NOW() AND used = false
        `;
        
        try {
            const [rows] = await pool.execute(query, [userId, code]);
            return rows.length > 0;
        } catch (error) {
            console.error('Error validating verification code:', error);
            throw new Error('Failed to validate verification code');
                console.log(`Password reset token invalidated`);
                return true;
            }
            
            return false;

        } catch (error) {
            console.error('Error invalidating password reset token:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = TokenService;

        const query = `
            INSERT INTO verification_codes (
                user_id, code, expires_at, created_at
            ) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW())
            ON DUPLICATE KEY UPDATE 
                code = VALUES(code), 
                expires_at = VALUES(expires_at), 
                created_at = NOW()
        `;
        
        try {
            await pool.execute(query, [userId, code]);
            return true;
        } catch (error) {
            console.error('Error creating verification code:', error);
            throw new Error('Failed to create verification code');
        }
    }

    /**
     * Validate verification code
     */
    async validateVerificationCode(userId, code) {
        const query = `
            SELECT * FROM verification_codes 
            WHERE user_id = ? AND code = ? AND expires_at > NOW() AND used = false
        `;
        
        try {
            const [rows] = await pool.execute(query, [userId, code]);
            return rows.length > 0;
        } catch (error) {
            console.error('Error validating verification code:', error);
            throw new Error('Failed to validate verification code');