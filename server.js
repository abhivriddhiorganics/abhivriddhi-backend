// Server last updated: 2026-04-12T05:25 — Env Priority
require('dotenv').config();
console.log('🚀 [System] Backend boot sequence initiated...');
console.log('  - config loaded: dotenv (Primary)');

const express = require('express');
console.log('  - modules loaded: express');
const compression = require('compression');
console.log('  - modules loaded: compression');
const mongoose = require('mongoose');
console.log('  - modules loaded: mongoose');
const cors = require('cors');
console.log('  - modules loaded: cors');
const helmet = require('helmet');
console.log('  - modules loaded: helmet');
const rateLimit = require('express-rate-limit');
console.log('  - modules loaded: rate-limit');

// --- SYSTEM STABILITY ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n⚠️ [SYSTEM] UNHANDLED REJECTION:', reason);
  // Log and monitor, but consider exiting if state is corrupted
});

process.on('uncaughtException', (err) => {
  console.error('\n❌ [SYSTEM] UNCAUGHT EXCEPTION:', err.stack || err.message);
  // EXIT logic: It is safer to let the process crash and restart than to run in a broken state
  process.exit(1);
});
// ------------------------


const authRoutes = require('./routes/auth');
console.log('  - routes loaded: auth');
const userRoutes = require('./routes/users');
console.log('  - routes loaded: users');
const paymentRoutes = require('./routes/payment');
console.log('  - routes loaded: payment');
const productRoutes = require('./routes/products');
console.log('  - routes loaded: products');
const User = require('./models/User');
console.log('  - models loaded: User');
const { initializeWhatsApp } = require('./utils/whatsappService');
console.log('  - services loaded: whatsappService');
const adminRoutes = require('./routes/admin');
console.log('  - routes loaded: admin');

const app = express();

// Trust Render's proxy for accurate rate limiting
app.set('trust proxy', 1);

// Use GZIP compression for faster data transfer
app.use(compression());

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins for dev
    callback(null, true);
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again in 15 minutes.' }
});
app.use('/api/', limiter);

// OTP rate limiting (stricter)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // increased from 5 to 15 for better testing headroom
  message: { success: false, message: 'Too many OTP requests, please try again later.' }
});
app.use('/api/auth/send-otp', otpLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection and Admin seeding
const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('No admin found. Creating default admin...');
      await User.create({
        name: 'Abhivriddhi Admin',
        email: 'abhivriddhiorganics@gmail.com',
        mobile: '+919999999999',
        password: 'adminPassword123!',
        role: 'admin',
        isVerified: true
      });
      console.log('Default admin created: abhivriddhiorganics@gmail.com / adminPassword123!');
    }
  } catch (err) {
    console.error('Admin seeding failed:', err.message);
  }
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/abhivriddhi')
  .then(() => {
    console.log('MongoDB connected successfully');
    seedAdmin();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', require('./routes/admin'));

// Serve uploaded product images statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 2000;
const HOST = '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`\n🚀 [System] Server running on http://${HOST}:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  
  // Initialize WhatsApp Bot - Isolated from main API boot
  setImmediate(() => {
    console.log('   Starting background services: [WhatsApp]');
    initializeWhatsApp().catch(err => {
      console.error('❌ [WhatsApp] Initial boot failure:', err.message);
      // We do NOT crash the server here, just log it.
    });
  });
});

// Handle server errors (e.g. Port in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [System] Port ${PORT} is already in use.`);
    process.exit(1);
  } else {
    console.error('\n❌ [System] Server error:', err);
  }
});

// Graceful Shutdown
const gracefulShutdown = () => {
    console.log('\n🛑 [System] Shutdown signal received. Closing server...');
    server.close(async () => {
        console.log('  - HTTP server closed.');
        try {
            await mongoose.connection.close();
            console.log('  - MongoDB connection closed.');
            process.exit(0);
        } catch (err) {
            console.error('  - Error during shutdown:', err.message);
            process.exit(1);
        }
    });
    
    // Safety exit if shutdown hangs
    setTimeout(() => {
        console.error('  - Forceful shutdown triggered (timeout)');
        process.exit(1);
    }, 5000);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);


module.exports = app;