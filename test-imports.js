try {
    console.log('Testing modules...');
    require('dotenv').config();
    console.log('dotenv ok');
    require('./routes/auth');
    console.log('auth ok');
    require('./routes/users');
    console.log('users ok');
    require('./routes/payment');
    console.log('payment ok');
    require('./routes/products');
    console.log('products ok');
    require('./models/User');
    console.log('User model ok');
    require('./utils/whatsappService');
    console.log('whatsappService ok');
    require('./routes/admin');
    console.log('admin ok');
    console.log('All modules loaded successfully!');
} catch (err) {
    console.error('Error loading module:', err);
}
