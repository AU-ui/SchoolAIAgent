/**
 * Test script to verify signup process
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testSignupProcess() {
    console.log('🧪 Testing Signup Process...\n');

    try {
        // Test 1: Signup
        console.log('📝 Test 1: Creating account...');
        const signupData = {
            first_name: 'Test',
            last_name: 'User',
            email: 'test@example.com',
            password: 'password123',
            school_id: 'SCH001'
        };

        const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, signupData);
        console.log('✅ Signup response:', signupResponse.data);

        if (signupResponse.data.success) {
            const verificationCode = signupResponse.data.verification_code;
            console.log(`Verification code: ${verificationCode}\n`);

            // Test 2: Email verification
            console.log('📧 Test 2: Verifying email...');
            const verifyData = {
                email: 'test@example.com',
                verification_code: verificationCode
            };

            const verifyResponse = await axios.post(`${API_BASE_URL}/auth/verify-email`, verifyData);
            console.log('✅ Email verification response:', verifyResponse.data);

            // Test 3: Assign role
            console.log('👤 Test 3: Assigning role...');
            const roleData = {
                email: 'test@example.com',
                role: 'teacher'
            };

            const roleResponse = await axios.post(`${API_BASE_URL}/auth/assign-role`, roleData);
            console.log('✅ Role assignment response:', roleResponse.data);

            // Test 4: Login
            console.log('🔐 Test 4: Testing login...');
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
                role: 'teacher'
            };

            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
            console.log('✅ Login response:', loginResponse.data);

            console.log('\n🎉 All tests completed successfully!');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testSignupProcess(); 