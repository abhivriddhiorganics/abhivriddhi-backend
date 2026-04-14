const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPByEmail } = require('../utils/emailService');
const { sendOTPBySMS } = require('../utils/smsService');
const { generateToken } = require('../utils/jwt');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper: normalize identifier (trim + lowercase for email)
function normalizeIdentifier(identifier, type) {
  if (!identifier) return identifier;
  identifier = identifier.trim();
  if (type === 'email' || identifier.includes('@')) {
    identifier = identifier.toLowerCase();
  }
  return identifier;
}

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('mobile')
    .trim()
    .matches(/^\+91[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number (+91XXXXXXXXXX)'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// @route   POST /api/auth/register
// @desc    Register user and send OTP
// @access  Public
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    let { name, email, mobile, password } = req.body;
    email = email.trim().toLowerCase();
    mobile = mobile.trim();
    name = name.trim();

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? 'Email already registered'
            : 'Mobile number already registered',
      });
    }

    // Create user
    const user = await User.create({ name, email, mobile, password });

    // Generate OTP
    const otp = user.generateOTP('both');
    await user.save();

    // Send OTP to email (fire-and-forget)
    try {
      await sendOTPByEmail(email, otp, 'registration');
    } catch (emailError) {
      console.error('Email OTP failed:', emailError.message);
    }

    // Send OTP to mobile (fire-and-forget)
    try {
      await sendOTPBySMS(mobile, otp, 'registration');
    } catch (smsError) {
      console.error('SMS OTP failed:', smsError.message);
    }

    // Save OTP record for email
    await OTP.create({ identifier: email, type: 'email', otp, purpose: 'registration' });
    // Save OTP record for mobile
    await OTP.create({ identifier: mobile, type: 'mobile', otp, purpose: 'registration' });

    res.status(201).json({
      success: true,
      message:
        'Registration successful! OTP sent to your email and mobile. Please verify to activate your account.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP for login or verification
// @access  Public
router.post('/send-otp', async (req, res) => {
  try {
    let { identifier, type, purpose = 'login' } = req.body;

    if (!identifier || !type) {
      return res.status(400).json({ success: false, message: 'Identifier and type are required' });
    }

    if (!['email', 'mobile'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be email or mobile' });
    }

    identifier = normalizeIdentifier(identifier, type);

    let otp;

    if (purpose === 'login') {
      // For login, user must already exist
      const user = await User.findOne(
        type === 'email' ? { email: identifier } : { mobile: identifier }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `${type === 'email' ? 'Email' : 'Mobile number'} not found. Please sign up first.`,
        });
      }

      otp = user.generateOTP(type);
      await user.save();
    } else {
      // For registration verification
      otp = Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Send OTP
    if (type === 'email') {
      await sendOTPByEmail(identifier, otp, purpose);
    } else {
      await sendOTPBySMS(identifier, otp, purpose);
    }

    // Save/replace OTP record
    await OTP.create({ identifier, type, otp, purpose });

    res.json({
      success: true,
      message: `OTP sent successfully to your ${type}. It expires in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.`,
      type,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and log in / complete registration
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    let { identifier, otp, type, purpose = 'login' } = req.body;

    if (!identifier || !otp || !type) {
      return res.status(400).json({ success: false, message: 'Identifier, OTP and type are required' });
    }

    if (!['email', 'mobile'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be email or mobile' });
    }

    identifier = normalizeIdentifier(identifier, type);
    otp = otp.toString().trim();

    // Find most recent unverified OTP record
    const otpRecord = await OTP.findOne({
      identifier,
      type,
      purpose,
      isVerified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or already used. Please request a new OTP.',
      });
    }

    // Check expiry
    if (otpRecord.expireAt < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.',
      });
    }

    // Verify OTP value
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${3 - otpRecord.attempts} attempt(s) remaining.`,
      });
    }

    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    // Find the user
    const user = await User.findOne(
      type === 'email' ? { email: identifier } : { mobile: identifier }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found. Please sign up first.' });
    }

    // Check account status
    if (user.status === 'Deactivated') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support to reactivate it.'
      });
    }

    if (purpose === 'registration') {
      if (type === 'email') user.emailVerified = true;
      else user.mobileVerified = true;

      // Mark fully verified if both done
      if (user.emailVerified && user.mobileVerified) {
        user.isVerified = true;
      }
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: purpose === 'registration' ? 'Account verified! Welcome to Abhivriddhi Organics.' : 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login with password
// @access  Public
router.post('/login', async (req, res) => {
  try {
    let { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/mobile and password are required' });
    }

    identifier = identifier.trim();
    if (identifier.includes('@')) identifier = identifier.toLowerCase();

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email/mobile and password.' });
    }

    // Check account status
    if (user.status === 'Deactivated') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support to reactivate it.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email/mobile and password.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
        addresses: user.addresses,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user data' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout (client-side token removal)
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// @route   POST /api/auth/forgot-password
// @desc    Send OTP for password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    let { identifier, type } = req.body;
    if (!identifier || !type) {
      return res.status(400).json({ success: false, message: 'Identifier and type are required' });
    }

    identifier = normalizeIdentifier(identifier, type);
    const user = await User.findOne(
      type === 'email' ? { email: identifier } : { mobile: identifier }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please check your credentials.',
      });
    }

    const otp = user.generateOTP(type);
    await user.save();

    // Send OTP
    if (type === 'email') {
      await sendOTPByEmail(identifier, otp, 'password-reset');
    } else {
      await sendOTPBySMS(identifier, otp, 'password-reset');
    }

    // Save OTP record for verification
    await OTP.create({ identifier, type, otp, purpose: 'password-reset' });

    res.json({
      success: true,
      message: `Reset OTP sent to your ${type}.`,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send reset OTP.' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Verify OTP and reset password
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    let { identifier, otp, type, newPassword } = req.body;
    if (!identifier || !otp || !newPassword || !type) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    identifier = normalizeIdentifier(identifier, type);
    otp = otp.toString().trim();

    // Verify OTP record
    const otpRecord = await OTP.findOne({
      identifier,
      type,
      purpose: 'password-reset',
      isVerified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.otp !== otp || otpRecord.expireAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Find and update user
    const user = await User.findOne(
      type === 'email' ? { email: identifier } : { mobile: identifier }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Reset password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

module.exports = router;
