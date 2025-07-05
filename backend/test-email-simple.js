/**
 * Simple email test
 */

const emailService = require('./src/services/emailService');

async function testEmail() {
    console.log('🧪 Testing email service...');
    
    try {
        const result = await emailService.sendVerificationEmail('test@example.com', '123456');
        console.log('✅ Email test successful:', result);
    } catch (error) {
        console.error('❌ Email test failed:', error);
    }
}

testEmail(); 