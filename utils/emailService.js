const { Resend } = require('resend');

/**
 * Email Service — powered by Resend API.
 * Bypasses Render's SMTP blocks and provides 99.9% reliability.
 */

// Initialize Resend with the API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender for Resend Free Tier (must be verified or onboarding@resend.dev)
const DEFAULT_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

/**
 * Core send function using Resend SDK
 */
const sendEmail = async ({ email, subject, html, attachments = [] }) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[MOCK EMAIL] RESEND_API_KEY missing. Printing to console:`);
    console.log(`To: ${email} | Subject: ${subject}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    // Transform attachments for Resend format
    const resendAttachments = (attachments || []).map(att => ({
      filename: att.filename,
      content: att.content // Resend handles Buffers directly
    }));

    const { data, error } = await resend.emails.send({
      from: `Abhivriddhi Organics 🌱 <${DEFAULT_FROM}>`,
      to: email,
      subject,
      html,
      attachments: resendAttachments
    });

    if (error) {
      throw error;
    }

    console.log(`✅ [Resend] Email sent to ${email} | ID: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (err) {
    console.error(`\n❌ [Resend] CRITICAL FAILURE sending to ${email}:`);
    console.error(`   - Error Message: ${err.message}`);
    
    // Check for "unverified email" error which is common on Resend Free Tier
    if (err.message.includes('not verified') || err.message.includes('onboarding')) {
      console.error('   👉 ROOT CAUSE: Resend Free Tier only allows sending to your own email until you verify your domain.');
      console.error('   👉 ACTION: Go to Resend Dashboard -> Domains and verify your website domain.');
    }

    return { success: false, error: err.message };
  }
};

/**
 * OTP Email
 */
const sendOTPByEmail = async (email, otp, purpose = 'verification') => {
  const label = purpose === 'registration' ? 'Registration'
    : purpose === 'login' ? 'Login' : 'Verification';
  const subject = `${otp} — Your OTP for ${label} | Abhivriddhi Organics`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }
    .card { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg,#1a3d0c,#4a7c23); color: #fff; padding: 32px 28px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 6px 0 0; opacity: .8; font-size: 13px; }
    .body { padding: 32px 28px; }
    .otp-box { background: #f0fdf4; border: 2px dashed #4a7c23; border-radius: 12px; text-align: center; padding: 24px; margin: 20px 0; }
    .otp-code { font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #1a3d0c; }
    .expire { font-size: 13px; color: #64748b; margin-top: 8px; }
    .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #9a3412; margin-top: 20px; }
    .footer { background: #f8fafc; text-align: center; padding: 18px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🫘 Abhivriddhi Organics</h1>
      <p>Your ${label} OTP</p>
    </div>
    <div class="body">
      <p style="color:#374151">Hello! Your One-Time Password for <strong>${label}</strong> is:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expire">⏱ Valid for ${process.env.OTP_EXPIRE_MINUTES || 10} minutes</div>
      </div>
      <div class="warning">⚠️ <strong>Never share this OTP</strong> with anyone. Abhivriddhi Organics will never ask for your OTP.</div>
    </div>
    <div class="footer">🌱 Pure • Natural • Traditional | Abhivriddhi Organics</div>
  </div>
</body>
</html>`;

  // Always log to console as a backup for Render users
  console.log(`\n!!! EMERGENCY OTP ACCESS !!!`);
  console.log(`🔑 YOUR ${label.toUpperCase()} CODE IS: ${otp}`);
  console.log(`To: ${email}\n`);

  return await sendEmail({ email, subject, html });
};

/**
 * Order Confirmation Email
 */
const sendInvoiceEmail = async (email, order, invoicePdf) => {
  const orderId = String(order._id).slice(-8).toUpperCase();
  const subject = `✅ Order Confirmed — INV-${orderId} | Abhivriddhi Organics`;

  const bodyHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
      .header { background: #4a7c23; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { padding: 20px; }
      .order-details { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .footer { font-size: 12px; color: #777; text-align: center; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Order Confirmed! 🎉</h1>
      </div>
      <div class="content">
        <p>Dear <strong>${order.shippingAddress?.fullName || 'Customer'}</strong>,</p>
        <p>Thank you for choosing <strong>Abhivriddhi Organics</strong>. Your order has been successfully placed and is being processed.</p>
        
        <div class="order-details">
          <p><strong>Order ID:</strong> #${orderId}</p>
          <p><strong>Total Amount:</strong> ₹${order.totalAmount.toLocaleString('en-IN')}</p>
          <p><strong>Delivery Address:</strong> ${order.shippingAddress?.city}, ${order.shippingAddress?.state}</p>
        </div>

        <p>Your official invoice is attached to this email as a PDF document.</p>
        <p>If you have any questions, feel free to reply to this email or contact us at <strong>support@abhivriddhiorganics.com</strong>.</p>
        <p>Pure • Natural • Traditional</p>
        <p><strong>Abhivriddhi Organics Team</strong> 🌱</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Abhivriddhi Organics. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;

  return await sendEmail({
    email,
    subject,
    html: bodyHtml,
    attachments: [
      {
        filename: `Invoice-INV-${orderId}.pdf`,
        content: invoicePdf
      }
    ]
  });
};

module.exports = { sendEmail, sendOTPByEmail, sendInvoiceEmail };