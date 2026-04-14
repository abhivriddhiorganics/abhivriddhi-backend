const mongoose = require('mongoose');
require('dotenv').config();

// Test database connection
const testConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/abhivriddhi');
    console.log('✅ MongoDB connection successful');

    // Test User model
    const User = require('./models/User');
    console.log('✅ User model loaded successfully');

    // Test OTP model
    const OTP = require('./models/OTP');
    console.log('✅ OTP model loaded successfully');

    // Test utilities
    const { generateToken } = require('./utils/jwt');
    const token = generateToken('test-user-id');
    console.log('✅ JWT utility working:', token ? 'Token generated' : 'Failed');

    console.log('\n🎉 All database and utility tests passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure your .env file with real credentials');
    console.log('2. Run: npm run dev');
    console.log('3. Test API endpoints with Postman or similar');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

testConnection();