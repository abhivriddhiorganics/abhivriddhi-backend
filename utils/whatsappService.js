const axios = require('axios');

/**
 * WhatsApp Service — powered by Official Meta WhatsApp Business API.
 * Replaces the unstable whatsapp-web.js (headless browser/Puppeteer).
 * This service is lightweight, avoids memory pressure, and works perfectly on Render.
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;

// State simulation for API compatibility
let isReady = !!(WHATSAPP_TOKEN && PHONE_NUMBER_ID);
let connectionStatus = isReady ? 'Official API Connected' : 'Disconnected (Missing Keys)';

/**
 * Initialize WhatsApp Client (Placeholder for new API)
 */
const initializeWhatsApp = async () => {
    console.log('\n[WhatsApp] Using Official Meta API Mode.');
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        console.warn('⚠️ [WhatsApp] Meta API Keys missing in .env (WHATSAPP_TOKEN / PHONE_NUMBER_ID)');
        connectionStatus = 'Disconnected (Missing Keys)';
        isReady = false;
    } else {
        console.log('✅ [WhatsApp] Official API Configuration Loaded.');
        connectionStatus = 'Official API Connected';
        isReady = true;
    }
};

/**
 * Send WhatsApp Message using Meta API
 * Handles both plain text and templates (future proof)
 */
const sendWhatsAppMessage = async (mobile, message) => {
    if (!isReady) {
        return { success: false, error: 'WhatsApp API not configured' };
    }

    try {
        // Format number to 91XXXXXXXXXX
        let cleanNumber = mobile.replace(/\D/g, '');
        if (cleanNumber.length === 10) cleanNumber = `91${cleanNumber}`;

        console.log(`[WhatsApp] Sending message to ${cleanNumber}...`);

        const response = await axios.post(
            BASE_URL,
            {
                messaging_product: 'whatsapp',
                to: cleanNumber,
                type: 'text',
                text: { body: message }
            },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ [WhatsApp] Message sent successfully via Meta API.');
        return { success: true, data: response.data };
    } catch (err) {
        const errorMsg = err.response?.data?.error?.message || err.message;
        console.error('❌ [WhatsApp] Meta API Error:', errorMsg);
        
        // Check for common test mode errors
        if (errorMsg.includes('not in the allow list')) {
            console.warn('⚠️ [WhatsApp] TEST MODE ERROR: You must add this number to your Meta dashboard "To" list first.');
        }

        return { success: false, error: errorMsg };
    }
};

/**
 * Placeholders for API compatibility with existing Admin routes
 */
const forceRelink = async () => {
    console.log('[WhatsApp] Force Relink called (Meta API mode - no-op)');
    return { success: true, message: 'Meta API is permanent and does not need relinking.' };
};

const hardResetWhatsApp = async () => {
    console.log('[WhatsApp] Hard Reset called (Meta API mode - no-op)');
    await initializeWhatsApp();
    return { success: true, message: 'Meta API re-cached.' };
};

module.exports = {
    initializeWhatsApp,
    sendWhatsAppMessage,
    forceRelink,
    hardResetWhatsApp,
    getIsWhatsAppReady: () => isReady,
    getWhatsAppStatus: () => connectionStatus,
    getWhatsAppNumber: () => PHONE_NUMBER_ID || null,
    getWhatsAppQR: () => '' // No QR code in Meta API mode
};
