const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  status: {
    type: String,
    enum: ['Active', 'Deactivated'],
    default: 'Active'
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please enter a valid email'
    }
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    validate: {
      validator: function(mobile) {
        return /^\+91[6-9]\d{9}$/.test(mobile);
      },
      message: 'Please enter a valid Indian mobile number (+91XXXXXXXXXX)'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  mobileVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpire: Date,
  otp: {
    code: String,
    expireAt: Date,
    type: {
      type: String,
      enum: ['email', 'mobile', 'both']
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    name: String,
    mobile: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  cart: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    weight: {
      type: String,
      enum: ['500gm', '750gm', '1Kg'],
      default: '500gm'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Note: unique:true on email and mobile already creates indexes — no need for schema.index()

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP method
userSchema.methods.generateOTP = function(type = 'both') {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expireAt: new Date(Date.now() + (parseInt(process.env.OTP_EXPIRE_MINUTES) || 10) * 60 * 1000),
    type: type
  };
  return otp;
};

// Verify OTP method
userSchema.methods.verifyOTP = function(code) {
  if (!this.otp || !this.otp.code || this.otp.expireAt < new Date()) {
    return false;
  }
  return this.otp.code === code;
};

// Clear OTP after verification
userSchema.methods.clearOTP = function() {
  this.otp = undefined;
};

// Transform output (remove sensitive data)
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.otp;
  delete userObject.verificationToken;
  delete userObject.verificationTokenExpire;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);