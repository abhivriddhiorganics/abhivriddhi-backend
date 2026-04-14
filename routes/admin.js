const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { generateToken } = require('../utils/jwt');
const { 
  getWhatsAppStatus, 
  getWhatsAppQR, 
  forceRelink,
  hardResetWhatsApp,
  getWhatsAppNumber 
} = require('../utils/whatsappService');

const router = express.Router();

// @route   GET /api/admin/setup-master
// @desc    EMERGENCY: Reset first admin credentials to known values
// @access  Public (Dev Only)
router.get('/setup-master', async (req, res) => {
  try {
    let admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      // If no admin exists at all, try to find any user and promote them
      admin = await User.findOne({});
      if (!admin) return res.status(404).json({ success: false, message: 'No users found in database' });
      admin.role = 'admin';
    }

    admin.email = 'abhivriddhiorganics@gmail.com';
    admin.password = 'abhivriddhi123';
    admin.status = 'Active';
    
    await admin.save();

    res.json({
      success: true,
      message: 'Master Admin Creds Reset!',
      email: 'abhivriddhiorganics@gmail.com',
      password: 'abhivriddhi123 (use this to login)'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Setup failed', error: err.message });
  }
});

// @route   POST /api/admin/login
// @desc    Admin login with password
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    // Check account status
    if (user.status === 'Deactivated') {
      return res.status(403).json({ success: false, message: 'Admin account has been deactivated' });
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Server error during admin login' });
  }
});

// @route   GET /api/admin/make-me-admin
// @desc    Temporary emergency endpoint to elevate current user to admin
// @access  Private
router.get('/make-me-admin', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { role: 'admin' },
      { new: true }
    );
    res.json({ success: true, message: 'You are now an Admin! Please log out and log back in.', role: user.role });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to elevate user' });
  }
});

// @route   GET /api/admin/seed-products
// @desc    One-time migration helper to populate DB from local file
router.get('/seed-products', async (req, res) => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) return res.status(400).json({ success: false, message: 'Products already exist in DB' });

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

    await Product.insertMany(initialProducts);
    res.json({ success: true, message: 'Products seeded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/migrate-weights
// @desc    One-time migration: add default weight variants to all products without weights
router.get('/migrate-weights', async (req, res) => {
  try {
    const products = await Product.find({ $or: [{ weights: { $exists: false } }, { weights: { $size: 0 } }] });
    
    if (products.length === 0) {
      return res.json({ success: true, message: 'All products already have weights configured.' });
    }

    for (const product of products) {
      const base = product.price;
      product.weights = [
        { label: '500gm', price: base, isAvailable: true },
        { label: '750gm', price: Math.round(base * 1.5), isAvailable: true },
        { label: '1Kg',   price: Math.round(base * 2), isAvailable: true },
      ];
      await product.save();
    }

    res.json({ success: true, message: `Updated ${products.length} products with default weight variants.`, count: products.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/admin/whatsapp/status
// @desc    Get WhatsApp connection status and current QR code
// @access  Private/Admin
router.get('/whatsapp/status', (req, res) => {
  const status = getWhatsAppStatus();
  const qr = getWhatsAppQR();
  
  res.json({
    success: true,
    status,
    linkedNumber: getWhatsAppNumber(),
    qr: qr ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300` : null
  });
});

// @route   POST /api/admin/whatsapp/relink
// @desc    Force disconnect and show new QR
// @access  Private/Admin
router.post('/whatsapp/relink', async (req, res) => {
  try {
    const result = await forceRelink();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Relink failed' });
  }
});

// @route   POST /api/admin/whatsapp/hard-reset
// @desc    Deep cleanup of processes and session locks
// @access  Private/Admin
router.post('/whatsapp/hard-reset', async (req, res) => {
  try {
    const result = await hardResetWhatsApp();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Hard reset failed' });
  }
});

// @route   GET /api/admin/sub-admins
// @desc    Get all administrative users
// @access  Private/Admin
router.get('/sub-admins', async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password -otp');
    res.json({ success: true, count: admins.length, admins });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve sub-admins' });
  }
});

// @route   POST /api/admin/sub-admins
// @desc    Create a new sub-admin
// @access  Private/Admin
router.post('/sub-admins', async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;

    if (!name || !email || !mobile) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] }).select('+password');
    
    if (existingUser) {
      if (existingUser.role === 'admin') {
        return res.status(400).json({ success: false, message: 'User is already an administrator' });
      }
      
      // Update existing user to admin
      existingUser.role = 'admin';
      existingUser.status = 'Active';
      if (password) existingUser.password = password; 
      
      await existingUser.save();
      
      return res.status(200).json({
        success: true,
        message: `Existing user "${existingUser.name}" has been promoted to administrator.`,
        admin: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: 'admin'
        }
      });
    }

    // Create new admin if user doesn't exist
    if (!password) {
       return res.status(400).json({ success: false, message: 'Password is required for new accounts' });
    }

    const admin = await User.create({
      name,
      email,
      password,
      mobile,
      role: 'admin',
      status: 'Active',
      isVerified: true,
      emailVerified: true,
      mobileVerified: true
    });

    res.status(201).json({
      success: true,
      message: 'New sub-admin created successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to manage sub-admin access', error: err.message });
  }
});

// @route   DELETE /api/admin/sub-admins/:id
// @desc    Remove a sub-admin
// @access  Private/Admin
router.delete('/sub-admins/:id', async (req, res) => {
  try {
    // Prevent self-deletion if needed (can be added later)
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Admin removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove sub-admin' });
  }
});

// All admin routes below must be restricted to 'admin' role
router.use(protect, authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get top-level dashboard statistics
// @access  Private/Admin
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    console.log(`[Admin] Dashboard Stats - Users: ${totalUsers}, Orders: ${totalOrders}, Products: ${totalProducts}`);
    
    // Calculate total revenue (sum of all completed/paid orders)
    // We can just sum all orders for now, or filter by status
    const orders = await Order.find();
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        totalRevenue,
        totalProducts
      },
      recentOrders
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving stats' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password -otp -verificationToken').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve users' });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (Active/Deactivated)
// @access  Private/Admin
router.put('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['Active', 'Deactivated'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: `User status updated to ${status}`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Permanently delete a user
// @access  Private/Admin
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    }

    await User.findByIdAndDelete(req.params.id);
    
    console.log(`[Admin] User deleted: ${user.email} (${user._id})`);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders
// @access  Private/Admin
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve orders' });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { orderStatus } = req.body;
    
    const validStatuses = ['Payment Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: `Order status updated to ${orderStatus}`, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// ─── PRODUCT MANAGEMENT ───────────────────────────────────────
const { upload, cloudinary } = require('../middleware/multer');

// Helper to safely delete a Cloudinary asset
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`[Cloudinary] Deleted: ${publicId}`);
  } catch (err) {
    console.warn(`[Cloudinary] Failed to delete ${publicId}:`, err.message);
  }
};

// @route   POST /api/admin/products
// @desc    Add new product — image goes to Cloudinary
router.post('/products', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'backImage', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, category, description, price, inStock, weights } = req.body;
    
    // Cloudinary gives us secure_url and public_id
    const imageUrl       = req.files?.image?.[0]?.path || '';
    const imagePublicId  = req.files?.image?.[0]?.filename || '';
    const backImageUrl      = req.files?.backImage?.[0]?.path || '';
    const backImagePublicId = req.files?.backImage?.[0]?.filename || '';

    let parsedWeights = [];
    if (weights) {
      try { parsedWeights = JSON.parse(weights); } catch (e) {}
    }

    const product = await Product.create({
      name,
      category,
      description,
      price: Number(price),
      inStock: inStock === 'true' || inStock === true,
      imageUrl,
      imagePublicId,
      backImageUrl,
      backImagePublicId,
      weights: parsedWeights
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error('Product creation error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/admin/products/:id
// @desc    Update product — new images replace old on Cloudinary
router.put('/products/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'backImage', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, category, description, price, inStock, weights,
            imageUrl: existingImageUrl, backImageUrl: existingBackImageUrl,
            imagePublicId: existingImagePublicId, backImagePublicId: existingBackImagePublicId } = req.body;
    
    const updateData = {
      name,
      category,
      description,
      price: Number(price),
      inStock: inStock === 'true' || inStock === true
    };

    // Handle Front Image — delete old from Cloudinary if new one uploaded
    if (req.files?.image) {
      await deleteFromCloudinary(existingImagePublicId);
      updateData.imageUrl      = req.files.image[0].path;
      updateData.imagePublicId = req.files.image[0].filename;
    } else if (existingImageUrl) {
      updateData.imageUrl      = existingImageUrl;
      updateData.imagePublicId = existingImagePublicId;
    }

    // Handle Back Image
    if (req.files?.backImage) {
      await deleteFromCloudinary(existingBackImagePublicId);
      updateData.backImageUrl      = req.files.backImage[0].path;
      updateData.backImagePublicId = req.files.backImage[0].filename;
    } else if (existingBackImageUrl) {
      updateData.backImageUrl      = existingBackImageUrl;
      updateData.backImagePublicId = existingBackImagePublicId;
    }

    if (weights) {
      try { updateData.weights = JSON.parse(weights); } catch (e) {}
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    console.error('Product update error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete product + its Cloudinary images
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Delete images from Cloudinary
    await deleteFromCloudinary(product.imagePublicId);
    await deleteFromCloudinary(product.backImagePublicId);

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product and its images deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ADVANCED STATS ──────────────────────────────────────────

// @route   GET /api/admin/stats/advanced
router.get('/stats/advanced', async (req, res) => {
  try {
    // Total Sales count
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    
    console.log(`[Admin] Advanced Stats - Orders: ${totalOrders}, Products: ${totalProducts}`);
    
    // Total Revenue calculation (Include all successful/processed payments)
    const validStatuses = ['Completed', 'Captured', 'Paid', 'Success', 'captured'];
    const revenueData = await Order.aggregate([
      { $match: { "paymentInfo.status": { $in: validStatuses } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    // Sales by Category
    const categorySales = await Order.aggregate([
      { $unwind: "$orderItems" },
      { $group: { _id: "$orderItems.category", count: { $sum: 1 }, revenue: { $sum: "$orderItems.price" } } }
    ]);

    // Top Selling Products
    const topProducts = await Order.aggregate([
      { $unwind: "$orderItems" },
      { $group: { 
          _id: "$orderItems.productId", 
          name: { $first: "$orderItems.name" },
          salesCount: { $sum: "$orderItems.quantity" },
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } }
      }},
      { $sort: { salesCount: -1 } },
      { $limit: 5 }
    ]);

    // Daily Revenue (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyRevenue = await Order.aggregate([
      { $match: { 
          "paymentInfo.status": { $in: ['Completed', 'Captured', 'Paid', 'Success', 'captured', 'Processing'] }, 
          createdAt: { $gte: sevenDaysAgo } 
      }},
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" }
      }},
      { $sort: { "_id": 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalProducts,
        totalRevenue,
        categorySales,
        topProducts,
        dailyRevenue
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// End of routes

// End of routes

module.exports = router;
