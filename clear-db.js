/**
 * clear-db.js
 * Safely removes all documents from the Products collection.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/abhivriddhi';

async function clearProducts() {
  try {
    console.log(`\n🔄 Connecting to: ${MONGO_URI.includes('cluster') ? 'MongoDB Cloud' : 'Local MongoDB'}...`);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected successfully!');

    // Get current count
    const count = await Product.countDocuments();
    console.log(`📊 Found ${count} products to remove.`);

    if (count > 0) {
      console.log('🗑  Clearing PRODUCTS collection...');
      await Product.deleteMany({});
      console.log('✅ Collection cleared successfully.');
    } else {
      console.log('ℹ️  Collection is already empty.');
    }

  } catch (err) {
    console.error('❌ Error clearing database:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB.\n');
    process.exit(0);
  }
}

clearProducts();
