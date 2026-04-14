const { sendWhatsAppMessage, getIsWhatsAppReady } = require('./whatsappService');

/**
 * WhatsApp-Only OTP Service
 * Removed all paid SMS/Voice fallbacks (2Factor/Twilio) as requested.
 * OTPs will now only be delivered via WhatsApp.
 * IF WhatsApp is disconnected, check the Backend Terminal for the code.
 */

// ─── Main OTP Delivery ───────────────────────────────────────
const sendOTPBySMS = async (mobile, otp, purpose = 'verification') => {
  const purposeLabel = purpose === 'registration' ? 'Registration'
    : purpose === 'login' ? 'Login'
    : purpose === 'password-reset' ? 'Password Reset'
    : 'Verification';

  const message = `${otp} is your OTP for ${purposeLabel} at Abhivriddhi Organics. Valid for ${process.env.OTP_EXPIRE_MINUTES || 10} minutes. Do not share.`;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📱 OUTGOING OTP | ${purposeLabel}`);
  console.log(`To: ${mobile} | Code: ${otp}`);
  console.log(`${'='.repeat(60)}\n`);

  // 1️⃣ Attempt WhatsApp Delivery
  if (getIsWhatsAppReady()) {
    console.log(`[WhatsApp] Attempting delivery to ${mobile}...`);
    const waResult = await sendWhatsAppMessage(mobile, message);
    if (waResult.success) {
        console.log(`✅ [WhatsApp] Delivered successfully to ${mobile}`);
        return { provider: 'whatsapp', success: true };
    }
    console.error(`❌ [WhatsApp] Delivery FAILED: ${waResult.error || 'Unknown error'}`);
  } else {
    console.warn('⚠️  [WhatsApp] Client NOT READY. Scan QR code in terminal to reconnect.');
  }

  // 2️⃣ NO SMS FALLBACK (Removed as per user request)
  console.warn('\n⚠️  [NOTICE] SMS/Voice fallbacks (2Factor/Twilio) are DISABLED.');
  console.log(`\n\x1b[41m\x1b[37m${' '.repeat(10)} !!! EMERGENCY OTP ACCESS !!! ${' '.repeat(10)}\x1b[0m`);
  console.log(`\x1b[1m\x1b[33m 🔑 YOUR LOGIN CODE IS: \x1b[0m \x1b[103m\x1b[30m  ${otp}  \x1b[0m`);
  console.log(`\x1b[41m\x1b[37m${' '.repeat(46)}\x1b[0m\n`);

  return { provider: 'console', success: false };
};

// ─── Order Confirmation ───────────────────────────────────────
const sendOrderConfirmationSMS = async (mobile, orderId) => {
  const shortId = String(orderId).slice(-8).toUpperCase();
  const message = `Thanks for shopping at Abhivriddhi Organics! Your order INV-${shortId} is confirmed and will be shipped soon. Pure. Natural. Traditional.`;
  
  if (getIsWhatsAppReady()) {
    console.log(`[WhatsApp] Sending Order Confirmation to ${mobile}...`);
    const waResult = await sendWhatsAppMessage(mobile, message);
    if (waResult.success) {
      console.log(`✅ [WhatsApp] Order Confirmation delivered.`);
      return { provider: 'whatsapp', success: true };
    }
    console.error(`❌ [WhatsApp] Confirmation FAILED: ${waResult.error}`);
  } else {
    console.warn(`⚠️ [WhatsApp] Client NOT READY. Order confirmation skipped. Check console for details.`);
    console.log(`\n[MOCK ORDER SMS] To: ${mobile} | Message: ${message}\n`);
  }

  return { provider: 'console', success: false };
};

const sendSMS = sendOTPBySMS;
module.exports = { sendSMS, sendOTPBySMS, sendOrderConfirmationSMS };