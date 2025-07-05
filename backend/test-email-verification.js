/**
 * Test Email Verification Process
 * This script tests the complete signup and email verification flow
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testEmailVerification() {
    console.log('🧪 Testing Email Verification Process...\n');

    try {
        // Step 1: Test signup
        console.log('📝 Step 1: Testing user signup...');
        const signupData = {
            first_name: 'Test',
            last_name: 'User',
            email: 'test@example.com',
            password: 'TestPassword123!',
            school_id: 'SCH001'
        };

        const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, signupData);
        console.log('✅ Signup successful:', signupResponse.data);

        // In development mode, the verification code is returned in the response
        const verificationCode = signupResponse.data.verification_code;
        console.log(` Verification code: ${verificationCode}`);

        // Step 2: Test email verification
        console.log('\n📧 Step 2: Testing email verification...');
        const verifyData = {
            email: 'test@example.com',
            verification_code: verificationCode
        };

        const verifyResponse = await axios.post(`${API_BASE_URL}/auth/verify-email`, verifyData);
        console.log('✅ Email verification successful:', verifyResponse.data);

        // Step 3: Test role assignment
        console.log('\n👤 Step 3: Testing role assignment...');
        const roleData = {
            email: 'test@example.com',
            role: 'teacher'
        };

        const roleResponse = await axios.post(`${API_BASE_URL}/auth/assign-role`, roleData);
        console.log('✅ Role assignment successful:', roleResponse.data);

        // Step 4: Test login
        console.log('\n🔐 Step 4: Testing login...');
        const loginData = {
            email: 'test@example.com',
            password: 'TestPassword123!',
            role: 'teacher'
        };

        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
        console.log('✅ Login successful:', loginResponse.data);

        console.log('\n🎉 All tests passed! Email verification system is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Solution: Make sure the backend server is running on port 5000');
            console.log('   Run: cd backend && npm start');
        }
    }
}

// Run the test
testEmailVerification(); 