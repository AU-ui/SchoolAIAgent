/**
 * EdTech Platform - User Routes
 * Handles user profile management and settings
 */

const express = require('express');
const { validate } = require('../../middleware/validation');
const { authMiddleware } = require('../../middleware/auth');
const { asyncHandler, ValidationError, NotFoundError } = require('../../middleware/errorHandler');

const router = express.Router();

// Import services
const UserService = require('../../services/userService');
const userService = new UserService();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile',
    authMiddleware,
    asyncHandler(async (req, res) => {
        try {
            const userId = req.user.id;
            const user = await userService.findById(userId);
            
            if (!user) {
                throw new NotFoundError('User not found');
            }

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    })
);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/profile',
    authMiddleware,
    asyncHandler(async (req, res) => {
        try {
            const userId = req.user.id;
            const updateData = {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                phone: req.body.phone
            };

            // Remove undefined values
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            });

            if (Object.keys(updateData).length === 0) {
                throw new ValidationError('No valid fields to update');
            }

            const updatedUser = await userService.updateProfile(userId, updateData);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser
            });

        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    })
);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change current user's password
 * @access  Private
 */
router.put('/change-password',
    authMiddleware,
    asyncHandler(async (req, res) => {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                throw new ValidationError('Current password and new password are required');
            }

            // Get user with password for verification
            const user = await userService.findByIdWithPassword(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Verify current password
            const bcrypt = require('bcryptjs');
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isCurrentPasswordValid) {
                throw new ValidationError('Current password is incorrect');
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 12);

            // Update password
            await userService.updatePassword(userId, hashedNewPassword);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    })
);

module.exports = router; 