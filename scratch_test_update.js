const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://abhivriddhiorganics_db_user:nZ0D1tbSZTiUcwd1@abhivriddhiorganics.wjxb7g1.mongodb.net/abhivriddhi?retryWrites=true&w=majority';

async function testUpdate() {
  try {
    console.log('Connecting to Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const Product = mongoose.model('Product', new mongoose.Schema({
      name: String,
      shortDescription: String,
      benefits: String
    }));

    const updateId = '69e1fc3fff7956b91cca2007'; // Ragi atta
    console.log(`Updating Ragi atta (${updateId})...`);
    
    const timestamp = new Date().toLocaleTimeString();
    const result = await Product.findByIdAndUpdate(updateId, {
      shortDescription: `Updated via Script at ${timestamp}`,
      benefits: `Benefit A\nBenefit B at ${timestamp}`
    }, { new: true });

    console.log('--- Update Result ---');
    console.log(`- Name: ${result.name}`);
    console.log(`- New Short Desc: "${result.shortDescription}"`);
    console.log('---------------------');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testUpdate();
