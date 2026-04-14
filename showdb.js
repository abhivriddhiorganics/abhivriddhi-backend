require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb:// ';

async function showData() {
  await mongoose.connect(MONGO_URI);
  console.log('\n✅ Connected to MongoDB:', MONGO_URI, '\n');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('📭 Database is empty — no collections found.');
  }

  for (const col of collections) {
    const name = col.name;
    const docs = await db.collection(name).find({}).toArray();
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📦 Collection: ${name.toUpperCase()} (${docs.length} document${docs.length !== 1 ? 's' : ''})`);
    console.log('═'.repeat(60));
    if (docs.length === 0) {
      console.log('  (empty)');
    } else {
      docs.forEach((doc, i) => {
        // Mask sensitive fields
        if (doc.password) doc.password = '**hidden**';
        if (doc.otp) doc.otp = '**hidden**';
        console.log(`\n  [${i + 1}]`, JSON.stringify(doc, null, 4).replace(/^/gm, '  '));
      });
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Done.\n');
  await mongoose.disconnect();
}

showData().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
