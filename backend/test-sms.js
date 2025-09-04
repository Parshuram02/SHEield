require('dotenv').config();
const twilio = require('twilio');

// Test Twilio configuration
async function testTwilio() {
    console.log('🧪 Testing Twilio Configuration...\n');
    
    // Check environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    
    console.log('Environment Variables:');
    console.log(`TWILIO_ACCOUNT_SID: ${accountSid ? '✅ Set' : '❌ Missing'}`);
    console.log(`TWILIO_AUTH_TOKEN: ${authToken ? '✅ Set' : '❌ Missing'}`);
    console.log(`TWILIO_FROM_NUMBER: ${fromNumber ? '✅ Set' : '❌ Missing'}\n`);
    
    if (!accountSid || !authToken || !fromNumber) {
        console.log('❌ Missing required Twilio environment variables');
        console.log('Please set them in your .env file and try again');
        return;
    }
    
    try {
        // Initialize Twilio client
        const client = twilio(accountSid, authToken);
        console.log('✅ Twilio client initialized successfully\n');
        
        // Test account info
        console.log('📱 Testing Twilio Account...');
        const account = await client.api.accounts(accountSid).fetch();
        console.log(`Account Name: ${account.friendlyName}`);
        console.log(`Account Status: ${account.status}`);
        console.log(`Account Type: ${account.type}\n`);
        
        // Test phone number
        console.log('📞 Testing Phone Number...');
        const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
            phoneNumber: fromNumber
        });
        
        if (incomingPhoneNumbers.length > 0) {
            const phoneNumber = incomingPhoneNumbers[0];
            console.log(`Phone Number: ${phoneNumber.phoneNumber}`);
            console.log(`Friendly Name: ${phoneNumber.friendlyName}`);
            console.log(`Capabilities:`, phoneNumber.capabilities);
            console.log('✅ Phone number verified successfully\n');
        } else {
            console.log('❌ Phone number not found in your Twilio account');
            console.log('Make sure the number is purchased and configured in Twilio\n');
        }
        
        console.log('🎉 Twilio configuration test completed successfully!');
        console.log('Your SMS system should work properly now.\n');
        
    } catch (error) {
        console.error('❌ Twilio test failed:', error.message);
        
        if (error.code === 20003) {
            console.log('This usually means your Twilio credentials are invalid');
            console.log('Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
        } else if (error.code === 20404) {
            console.log('This usually means your phone number is not found');
            console.log('Please check your TWILIO_FROM_NUMBER');
        }
    }
}

// Test SMS message creation
function testSMSMessage() {
    console.log('📝 Testing SMS Message Creation...\n');
    
    const testAlert = {
        type: 'scream',
        occurredAt: new Date(),
        location: { lat: 40.7128, lng: -74.0060 },
        audioFiles: ['test_audio.webm']
    };
    
    const testContact = {
        name: 'Test Contact',
        phoneE164: '+1234567890'
    };
    
    const baseUrl = 'http://localhost:8000';
    
    // Simulate the SMS message creation logic
    let message = `🚨 EMERGENCY ALERT 🚨\n`;
    message += `User needs help!\n`;
    message += `Type: ${testAlert.type.toUpperCase()}\n`;
    message += `Location: ${testAlert.location.lat.toFixed(4)}, ${testAlert.location.lng.toFixed(4)}\n`;
    message += `Time: ${testAlert.occurredAt.toLocaleTimeString()}\n`;
    message += `Evidence: ${baseUrl}/api/evidence/test-id`;
    
    console.log('Sample SMS Message:');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));
    console.log(`Message Length: ${message.length} characters`);
    console.log(`Single SMS: ${message.length <= 160 ? '✅ Yes' : '❌ No (will be split)'}\n`);
    
    if (message.length > 160) {
        console.log('💡 Tip: Consider shortening the message to fit in a single SMS');
        console.log('This reduces costs and improves delivery reliability');
    }
}

// Run tests
async function runTests() {
    console.log('🚀 SHEield SMS System Test\n');
    console.log('='.repeat(50) + '\n');
    
    await testTwilio();
    console.log('='.repeat(50) + '\n');
    testSMSMessage();
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Test completed!');
}

// Run if called directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testTwilio, testSMSMessage };



