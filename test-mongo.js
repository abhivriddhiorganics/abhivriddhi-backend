const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoDB() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    console.log('📍 Connection URI:', process.env.MONGODB_URI ? 'Set' : 'NOT SET');

    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI not found in .env file');
      console.log('💡 Add this to your .env file:');
      console.log('   MONGODB_URI=mongodb://localhost:27017/abhivriddhi');
      console.log('   OR for MongoDB Atlas:');
      console.log('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/abhivriddhi');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000, // Timeout after 5s instead of 30s
    });

    console.log('✅ MongoDB connected successfully!');

    // Test database operations
    const db = mongoose.connection.db;
    const collections = await db.collections();
    console.log(`📊 Database: ${db.databaseName}`);
    console.log(`📁 Collections found: ${collections.length}`);

    // Test creating a document
    const Test = mongoose.model('TestConnection', new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    }));

    const testDoc = await Test.create({ message: 'MongoDB is working!' });
    console.log('✅ Test document created:', testDoc._id);

    // Clean up
    await Test.deleteOne({ _id: testDoc._id });
    console.log('🧹 Test document cleaned up');

    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully');

    console.log('\n🎉 MongoDB setup is perfect! Ready to run the backend.');
    console.log('\n🚀 Next: Run "npm run dev" to start your server');

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 Fix: Start MongoDB service');
      console.log('   Local: net start MongoDB');
      console.log('   Docker: docker start mongodb');
    }

    if (error.message.includes('Authentication failed')) {
      console.log('\n🔧 Fix: Check username/password in connection string');
    }

    if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.log('\n🔧 Fix: Check your internet connection or MongoDB Atlas URL');
    }

    console.log('\n📖 Check MONGODB_SETUP.md for detailed troubleshooting');
  }
}

testMongoDB();