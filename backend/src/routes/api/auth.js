/**
 * @route   GET /api/auth/test
 * @desc    Test endpoint to verify API is working
 * @access  Public
 */
router.get('/test', (req, res) => {
    console.log('✅ Test endpoint hit!');
    res.json({ 
        message: 'Auth API is working!',
        timestamp: new Date().toISOString()
    });
});

/**
 * @route   POST /api/auth/test-email
 * @desc    Test email service
 * @access  Public
 */
router.post('/test-email', async (req, res) => {
    console.log('🧪 Testing email service...');
    try {
        await emailService.sendVerificationEmail('test@example.com', '123456');
        res.json({ message: 'Email test successful!' });
    } catch (error) {
        console.error('Email test failed:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 