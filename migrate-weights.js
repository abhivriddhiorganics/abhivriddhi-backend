/**
 * migrate-weights.js
 * One-time script: Adds default weight variants (500gm, 750gm, 1Kg)
 * to all products that currently have no weights configured.
 * Prices are calculated proportionally from the product's current price.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/abhivriddhi';

async function migrateWeights() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!\n');

    const products = await Product.find({
      $or: [
        { weights: { $exists: false } },
        { weights: { $size: 0 } }
      ]
    });

    if (products.length === 0) {
      console.log('✅ All products already have weights configured. Nothing to migrate.');
      return;
    }

    console.log(`Found ${products.length} products without weights. Migrating...\n`);

    for (const product of products) {
      const base = product.price;
      product.weights = [
        { label: '500gm', price: base,                   isAvailable: true },
        { label: '750gm', price: Math.round(base * 1.5), isAvailable: true },
        { label: '1Kg',   price: Math.round(base * 2),   isAvailable: true },
      ];
      await product.save();
      console.log(`  ✓ ${product.name}: 500gm=₹${base}, 750gm=₹${Math.round(base*1.5)}, 1Kg=₹${Math.round(base*2)}`);
    }

    console.log(`\n✅ Migration complete. Updated ${products.length} products.`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

migrateWeights();
