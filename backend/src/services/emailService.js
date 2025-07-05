/**
 * EdTech Platform - Email Service
 * Super simple console version
 */

class EmailService {
    /**
     * Send verification email
     */
    async sendVerificationEmail(email, verificationCode) {
        console.log('\n');
        console.log('📧 ==========================================');
        console.log('📧 EMAIL SENT SUCCESSFULLY');
        console.log('📧 ==========================================');
        console.log('📧 To:', email);
        console.log('📧 Subject: Verify Your Email - EdTech Platform');
        console.log('📧 Verification Code:', verificationCode);
        console.log('📧 ==========================================');
        console.log('\n');
        
        return { success: true, messageId: 'console-' + Date.now() };
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, resetToken) {
        console.log('\n');
        console.log('📧 ==========================================');
        console.log('📧 PASSWORD RESET EMAIL SENT');
        console.log('📧 ==========================================');
        console.log('📧 To:', email);
        console.log('📧 Subject: Reset Your Password - EdTech Platform');
        console.log('📧 Reset Token:', resetToken);
        console.log('📧 ==========================================');
        console.log('\n');
        
        return { success: true, messageId: 'console-' + Date.now() };
    }
}

module.exports = new EmailService(); 