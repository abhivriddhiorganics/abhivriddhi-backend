const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { sendInvoiceEmail } = require('../utils/emailService');
const { generateInvoiceHTML, generateInvoicePDF } = require('../utils/invoiceService');
const { sendOrderConfirmationSMS } = require('../utils/smsService');
const { protect } = require('../middleware/auth');

const router = express.Router();


// @route   GET /api/payment/my-orders
// @desc    Get all orders for the logged-in user
// @access  Private
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 }); // Newest first

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Fetch my-orders error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching orders' });
  }
});

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || 'rzp_test_dummykey123456',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummysecret1234567890123',
});

// @route   POST /api/payment/checkout
// @desc    Create Razorpay order + save shipping details to DB
router.post('/checkout', async (req, res) => {
  try {
    const { shippingAddress, cartItems, totalAmount, userId } = req.body;

    if (!shippingAddress || !cartItems || !totalAmount) {
      return res.status(400).json({ success: false, message: 'Missing required order details' });
    }

    // Save pending order to DB first
    const newOrder = await Order.create({
      user: userId || null,
      shippingAddress,
      orderItems: cartItems,
      totalAmount,
      orderStatus: 'Payment Pending',
      paymentInfo: { status: 'Pending' }
    });

    // Create Razorpay order
    const options = {
      amount:   Math.round(totalAmount * 100),
      currency: 'INR',
      receipt:  `receipt_${newOrder._id}`,
    };

    try {
      const razorpayOrder = await razorpay.orders.create(options);
      newOrder.paymentInfo.orderId = razorpayOrder.id;
      await newOrder.save();

      return res.status(200).json({
        success:   true,
        order:     razorpayOrder,
        dbOrderId: newOrder._id,
        key_id:    process.env.RAZORPAY_KEY_ID,
      });
    } catch (rzpError) {
      console.error('Razorpay Order Creation Failed:', rzpError);
      if (rzpError.statusCode === 401) {
        return res.status(401).json({
          success: false,
          message: 'Razorpay Authentication Failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env'
        });
      }
      return res.status(500).json({ success: false, message: 'Failed to initialize payment gateway' });
    }

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, message: 'Server error during checkout' });
  }
});

// @route   POST /api/payment/verify
// @desc    Verify Razorpay signature, mark order paid, send invoice email
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummysecret1234567890123';
    const body   = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      await Order.findByIdAndUpdate(dbOrderId, {
        orderStatus: 'Cancelled',
        'paymentInfo.status': 'Failed'
      });
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Mark order as paid
    const order = await Order.findByIdAndUpdate(dbOrderId, {
      orderStatus: 'Processing',
      paidAt: new Date(),
      paymentInfo: {
        id:        razorpay_payment_id,
        orderId:   razorpay_order_id,
        signature: razorpay_signature,
        status:    'Completed'
      }
    }, { new: true });

    // Generate invoice PDF and email it + send SMS (fire-and-forget)
    if (order) {
      (async () => {
        try {
          // 1. Send SMS
          const customerMobile = order.shippingAddress?.mobile;
          console.log(`[DEBUG] Attempting to send SMS to: ${customerMobile}`);
          if (customerMobile) {
            await sendOrderConfirmationSMS(customerMobile, order._id);
          }

          // 2. Send Email Invoice
          const pdfBuffer = await generateInvoicePDF(order);
          const customerEmail = order.shippingAddress?.email;
          if (customerEmail) {
            const result = await sendInvoiceEmail(customerEmail, order, pdfBuffer);
            console.log(`[DEBUG] sendInvoiceEmail result:`, result);
            if (result.success) {
              console.log(`✅ Invoice emailed to ${customerEmail}`);
            } else {
              console.error(`❌ Invoice email FAILED for ${customerEmail}:`, result.error);
            }
          } else {
            console.warn('[DEBUG] No customer email found in order shipping address');
          }
        } catch (invoiceErr) {
          console.error('[DEBUG] Invoice/email/sms exception:', invoiceErr);
        }
      })();
    }

    res.status(200).json({
      success:   true,
      message:   'Payment verified successfully',
      dbOrderId,
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
});

// @route   GET /api/payment/invoice/:orderId
// @desc    Download invoice (PDF by default, HTML fallback if PDF fails)
router.get('/invoice/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const type = req.query.type; // 'html' or 'pdf'
    const orderIdSuffix = String(order._id).slice(-8).toUpperCase();

    // 1. Forced HTML view
    if (type === 'html') {
      const html = generateInvoiceHTML(order);
      return res.send(html);
    }

    // 2. Normal PDF view with HTML fallback
    const pdfBuffer = await generateInvoicePDF(order);
    
    if (pdfBuffer && pdfBuffer.length > 0) {
      console.log(`[Invoice] Preparing PDF response for Order: ${order._id}`);
      
      // Strict PDF Headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="Abhivriddhi-INV-${orderIdSuffix}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      return res.end(pdfBuffer, 'binary');
    } else {
      // Fallback: Serve HTML if PDF generation failed
      console.warn(`[Invoice] PDF generation failed/empty for ${order._id}, serving HTML fallback.`);
      const html = generateInvoiceHTML(order);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

  } catch (error) {
    console.error('Invoice system error:', error);
    res.status(500).send('<h1>Error during invoice generation</h1><p>Please try again later or contact support.</p>');
  }
});

module.exports = router;
