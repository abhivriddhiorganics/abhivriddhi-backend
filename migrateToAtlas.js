require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Migration Script: Local to Atlas
 * 
 * Instructions:
 * 1. Set up your Atlas cluster and get the connection string.
 * 2. Run: node migrateToAtlas.js "your_atlas_connection_string"
 */

const LOCAL_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/abhivriddhi';
const ATLAS_URI = process.argv[2];

if (!ATLAS_URI) {
    console.error('❌ Error: Please provide the Atlas connection string as an argument.');
    console.log('Usage: node migrateToAtlas.js "mongodb+srv://user:pass@cluster.mongodb.net/dbname"');
    process.exit(1);
}

async function migrate() {
    let localConn, atlasConn;

    try {
        console.log('🚀 Starting migration sequence...');

        // 1. Connect to Local
        console.log(`📡 Connecting to Local DB: ${LOCAL_URI}`);
        localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        console.log('✅ Local DB Connected.');

        // 2. Connect to Atlas
        console.log(`☁️ Connecting to Atlas DB: ${ATLAS_URI.replace(/:([^@]+)@/, ':****@')}`);
        atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
        console.log('✅ Atlas DB Connected.');

        const collections = ['users', 'products', 'orders', 'otps'];

        for (const colName of collections) {
            console.log(`\n📦 Migrating collection: ${colName}...`);
            
            const localColl = localConn.db.collection(colName);
            const atlasColl = atlasConn.db.collection(colName);

            const documents = await localColl.find({}).toArray();
            console.log(`   - Found ${documents.length} documents in local ${colName}.`);

            if (documents.length > 0) {
                // Clear existing data in Atlas for this collection to avoid duplicates or conflicts
                console.log(`   - Clearing existing documents in Atlas ${colName}...`);
                await atlasColl.deleteMany({});

                console.log(`   - Inserting documents into Atlas...`);
                const result = await atlasColl.insertMany(documents);
                console.log(`   ✅ Successfully migrated ${result.insertedCount} documents to Atlas.`);
            } else {
                console.log(`   - Skipping empty collection.`);
            }
        }

        console.log('\n🎉 ALL DATA MIGRATED SUCCESSFULLY!');
        console.log('--------------------------------------------------');
        console.log('Next Steps:');
        console.log('1. Update your .env file with the Atlas URI.');
        console.log('2. Restart your backend server.');
        console.log('3. Your friend can now pull the code and share your data!');
        console.log('--------------------------------------------------');

    } catch (err) {
        console.error('\n❌ MIGRATION FAILED:', err.message);
        if (err.message.includes('Authentication failed')) {
            console.log('💡 Tip: Check your Atlas username and password.');
        } else if (err.message.includes('IP not whitelisted')) {
            console.log('💡 Tip: Ensure "Allow access from anywhere" (0.0.0.0/0) is enabled in Atlas Network Access.');
        }
    } finally {
        if (localConn) await localConn.close();
        if (atlasConn) await atlasConn.close();
        process.exit(0);
    }
}

migrate();
