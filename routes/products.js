const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, availability } = req.query;
    let query = {};

    if (category && category !== 'all' && category !== 'All') {
      query.category = category;
    }

    if (availability === 'in-stock') {
      query.inStock = true;
    } else if (availability === 'out-of-stock') {
      query.inStock = false;
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    console.error('All products fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving products' });
  }
});

const mongoose = require('mongoose');

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID format' 
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err) {
    console.error('Single product fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving product' });
  }
});

module.exports = router;
