const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://abhivriddhiorganics_db_user:nZ0D1tbSZTiUcwd1@abhivriddhiorganics.wjxb7g1.mongodb.net/abhivriddhi?retryWrites=true&w=majority';

async function checkDatabase() {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const Product = mongoose.model('Product', new mongoose.Schema({
      name: String,
      shortDescription: String,
      benefits: String
    }));

    const products = await Product.find({}).limit(5);
    console.log('--- Last 5 Products in live Atlas DB ---');
    products.forEach(p => {
      console.log(`- Name: ${p.name}`);
      console.log(`  _id: ${p._id}`);
      console.log(`  Short Desc: "${p.shortDescription || 'MISSING'}"`);
      console.log(`  Benefits: "${p.benefits || 'MISSING'}"`);
      console.log('---------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkDatabase();
