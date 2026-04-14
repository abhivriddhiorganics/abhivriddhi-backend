const nodemailer = require('nodemailer');

// ── Create transporter (lazy singleton) ──────────────────────
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || user.includes('your_email') || !pass || pass.includes('your_app_password')) {
    return null; // not configured
  }

  console.log(`[EMAIL] Initializing transporter with user: ${user} on port: ${process.env.EMAIL_PORT || 465}`);
  _transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: true, 
    auth: { user, pass },
    connectionTimeout: 10000, // 10s
    greetingTimeout: 5000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false 
    }
  });

  console.log('✅ [EMAIL] Transporter initialized and ready for on-demand requests.');

  return _transporter;
};

// ── Core send ─────────────────────────────────────────────────
const sendEmail = async ({ email, subject, html, attachments = [] }) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`\n[MOCK EMAIL] To: ${email} | Subject: ${subject}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Abhivriddhi Organics 🌱" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
      attachments
    });

    console.log(`✅ Email sent to ${email} | messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [EMAIL] CRITICAL FAILURE sending to ${email}:`);
    console.error(`   - Error Message: ${err.message}`);
    console.error(`   - Error Code: ${err.code}`);
    console.error(`   - Full Stack: ${err.stack}`);
    console.error('   👉 ACTION: Please verify your Gmail App Password in Render Env Vars.');
    return { success: false, error: err.message };
  }
};

// ── OTP Email ─────────────────────────────────────────────────
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

  console.log(`\n============================`);
  console.log(`[EMAIL OTP] To: ${email} | Code: ${otp} | Purpose: ${label}`);
  console.log(`============================\n`);

  return await sendEmail({ email, subject, html });
};

// ── Order Confirmation Email ──────────────────────────────────
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

        <p>Your official invoice is attached to this email as a <strong>Professional PDF document</strong>.</p>
        
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
        content: invoicePdf,
        contentType: 'application/pdf'
      }
    ]
  });
};

module.exports = { sendEmail, sendOTPByEmail, sendInvoiceEmail, getTransporter };