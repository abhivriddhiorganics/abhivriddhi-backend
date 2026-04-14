const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    // Can be email or mobile number
  },
  type: {
    type: String,
    enum: ['email', 'mobile'],
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'verification', 'password-reset'],
    required: true
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + (parseInt(process.env.OTP_EXPIRE_MINUTES) || 10) * 60 * 1000),
    index: { expires: 0 } // TTL index - auto delete after expiry
  }
}, {
  timestamps: true
});

// Index for faster lookups
otpSchema.index({ identifier: 1, type: 1, purpose: 1 });

// Prevent duplicate active OTPs for same identifier and purpose
otpSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Remove any existing unverified OTPs for same identifier, type, and purpose
    await mongoose.model('OTP').deleteMany({
      identifier: this.identifier,
      type: this.type,
      purpose: this.purpose,
      isVerified: false
    });
  }
  next();
});

module.exports = mongoose.model('OTP', otpSchema);