require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const initialProducts = [
  { name: 'Jowar Atta', category: 'Atta', price: 275, inStock: true, imageUrl: '/images/jowar-atta.jpg', description: 'Light, gluten-free, and rooted in tradition just the way your body understands nourishment.' },
  { name: 'Bajra Atta', category: 'Atta', price: 250, inStock: true, imageUrl: '/images/jowar-atta.jpg', description: 'Pearl millet flour packed with iron and essential minerals for your daily nutrition.' },
  { name: 'Ragi Atta', category: 'Atta', price: 299, inStock: true, imageUrl: '/images/ragi-atta.jpg', description: 'Iron and calcium-rich finger millet flour for healthy, wholesome everyday cooking.' },
  { name: 'Maize Atta', category: 'Atta', price: 220, inStock: true, imageUrl: '/images/jowar-atta.jpg', description: 'Stone-ground maize flour, naturally sweet and wholesome for traditional recipes.' },
  { name: 'Wheat Flour', category: 'Atta', price: 195, inStock: false, imageUrl: '/images/wheat-atta.jpg', description: 'Whole wheat flour stone-ground to retain maximum nutrition and earthy flavor.' },
  { name: 'Barnyard Millet', category: 'Millets', price: 290, inStock: true, imageUrl: '/images/multigrain-atta.jpg', description: 'Low-calorie millet rich in fiber, iron and minerals perfect for a healthy diet.' },
  { name: 'Foxtail Millet', category: 'Millets', price: 310, inStock: true, imageUrl: '/images/multigrain-atta.jpg', description: 'High protein millet that is gluten-free, easy to digest and naturally delicious.' },
  { name: 'Little Millet', category: 'Millets', price: 280, inStock: true, imageUrl: '/images/multigrain-atta.jpg', description: 'Tiny but mighty — a powerhouse of B vitamins, fiber and essential minerals.' },
  { name: 'Kodo Millet', category: 'Millets', price: 295, inStock: false, imageUrl: '/images/multigrain-atta.jpg', description: 'Ancient grain known for antidiabetic properties and high nutritional density.' },
  { name: 'Brown Rice', category: 'Rice', price: 350, inStock: true, imageUrl: '/images/jowar-atta.jpg', description: 'Whole grain brown rice packed with dietary fiber and essential B vitamins.' },
  { name: 'Red Rice', category: 'Rice', price: 380, inStock: true, imageUrl: '/images/jowar-atta.jpg', description: 'Antioxidant-rich red rice with a nutty flavor, chewy texture and superior nutrition.' },
  { name: 'Organic Honey', category: 'Honey', price: 450, inStock: true, imageUrl: '/images/jowar-atta.jpg', description: 'Raw, unfiltered organic honey sourced directly from pristine forest hives.' }
];

async function seed() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected.');

    console.log('🧹 Clearing existing products...');
    await Product.deleteMany({});
    console.log('✅ Cleared.');

    console.log('📦 Inserting initial products...');
    const result = await Product.insertMany(initialProducts);
    console.log(`✅ Successfully seeded ${result.length} products.`);

    console.log('\n📊 Product List:');
    result.forEach(p => console.log(`   - ${p.name} (${p.category})`));

    // Also migrate weights
    console.log('\n⚖️ Migrating weights...');
    for (const product of result) {
      const base = product.price;
      product.weights = [
        { label: '500gm', price: base, isAvailable: true },
        { label: '750gm', price: Math.round(base * 1.5), isAvailable: true },
        { label: '1Kg',   price: Math.round(base * 2), isAvailable: true },
      ];
      await product.save();
    }
    console.log('✅ Weights migrated.');

    console.log('\n🎉 ALL DONE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ SEEDING FAILED:', err.message);
    process.exit(1);
  }
}

seed();
