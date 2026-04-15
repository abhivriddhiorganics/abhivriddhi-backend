const mongoose = require('mongoose');

const TARGET_URI = 'mongodb+srv://abhivriddhiorganics_db_user:YW5ZE8NDBKFJp3Jw@abhivriddhiorganics.wjxb7g1.mongodb.net/abhivriddhi?retryWrites=true&w=majority';

async function check() {
  try {
    const conn = await mongoose.createConnection(TARGET_URI).asPromise();
    console.log('✅ Connected to TARGET');
    
    const db = conn.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections present:', collections.map(c => c.name));

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }

    await conn.close();
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

check();
