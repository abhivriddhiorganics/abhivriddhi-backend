const mongoose = require('mongoose');

const SOURCE_URI = 'mongodb+srv://priyanshu_lokhande:Anshullok123@deployment-prod.nnjbd5s.mongodb.net/abhivriddhi?retryWrites=true&w=majority';
const TARGET_URI = 'mongodb+srv://abhivriddhiorganics_db_user:YW5ZE8NDBKFJp3Jw@abhivriddhiorganics.wjxb7g1.mongodb.net/abhivriddhi?retryWrites=true&w=majority';

async function migrate() {
  console.log('🚀 Starting MongoDB Migration...');
  
  try {
    // 1. Connect to SOURCE
    const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
    console.log('✅ Connected to SOURCE Database');

    // 2. Connect to TARGET
    const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
    console.log('✅ Connected to TARGET Database');

    const collections = ['users', 'products', 'orders']; // Core collections to migrate

    for (const colName of collections) {
      console.log(`📦 Migrating collection: ${colName}...`);
      
      const sourceCol = sourceConn.collection(colName);
      const targetCol = targetConn.collection(colName);

      const docs = await sourceCol.find({}).toArray();
      
      if (docs.length > 0) {
        // Clear target first to prevent duplicates if re-run
        await targetCol.deleteMany({});
        
        // Insert all documents
        const result = await targetCol.insertMany(docs);
        console.log(`✅ Successfully migrated ${result.insertedCount} documents for ${colName}.`);
      } else {
        console.log(`⚠️ Collection ${colName} is empty. Skipping.`);
      }
    }

    console.log('\n✨ ALL DATA MIGRATED SUCCESSFULLY! ✨');
    
    await sourceConn.close();
    await targetConn.close();
    process.exit(0);

  } catch (err) {
    console.error('❌ MIGRATION FAILED:', err.message);
    process.exit(1);
  }
}

migrate();
