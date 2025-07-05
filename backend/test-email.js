/**
        
        await emailService.sendPasswordResetEmail(testEmail, resetToken);
        console.log('✅ Password reset email test completed\n');

        // Test 3: Send custom email
        console.log('📧 Test 3: Sending custom email...');
        await emailService.sendEmail({
            to: testEmail,
            subject: 'Test Email from EdTech Platform',
            html: `
                <h1>Test Email</h1>
                <p>This is a test email to verify the email service is working.</p>
                <p>Time: ${new Date().toISOString()}</p>
            `
        });
        console.log('✅ Custom email test completed\n');

        console.log('🎉 All email tests completed successfully!');
        console.log('\n📝 Note: In development mode, emails are logged to console instead of being sent.');
        console.log('📝 Check the console output above for email content.');

    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testEmailService(); 
testEmail(); 
testEmail(); 