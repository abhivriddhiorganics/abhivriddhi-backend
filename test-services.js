require('dotenv').config();
const { sendOTPByEmail } = require('./utils/emailService');
const { sendOTPBySMS } = require('./utils/smsService');
const { initializeWhatsApp, getIsWhatsAppReady } = require('./utils/whatsappService');

async function testServices() {
    console.log('--- Testing Services ---');
    
    const testEmail = 'test@example.com'; 
    const testMobile = '+919876543210'; 
    
    console.log('\n1. Testing Email...');
    try {
        const emailRes = await sendOTPByEmail(testEmail, '123456', 'test');
        console.log('Email Result:', emailRes);
    } catch (err) {
        console.error('Email Error:', err.message);
    }

    console.log('\n2. Testing WhatsApp/SMS...');
    console.log('WhatsApp Ready Status:', getIsWhatsAppReady());
    
    // We need to wait for WhatsApp to initialize if we want to test it
    initializeWhatsApp();
    
    console.log('Waiting 10 seconds for WhatsApp initialization...');
    setTimeout(async () => {
        console.log('WhatsApp Ready Status after 10s:', getIsWhatsAppReady());
        try {
            const smsRes = await sendOTPBySMS(testMobile, '654321', 'test');
            console.log('SMS/WA Result:', smsRes);
        } catch (err) {
            console.error('SMS/WA Error:', err.message);
        }
        process.exit(0);
    }, 15000);
}

testServices();
