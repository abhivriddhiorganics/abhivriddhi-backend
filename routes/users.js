const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── DEV ONLY: View all database data ─────────────────────────
// Access at: http://localhost:5000/api/users/admin/data
router.get('/admin/data', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }
  try {
    const users = await User.find({}).select('-password -otp -verificationToken').lean();
    const orders = await Order.find({}).lean();
    res.json({
      summary: {
        totalUsers: users.length,
        totalOrders: orders.length,
      },
      users,
      orders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validation rules
const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('firstName').optional().trim().isLength({ max: 50 }),
  body('lastName').optional().trim().isLength({ max: 50 }),
  body('gender').optional().isIn(['Male', 'Female', 'Other']),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('mobile').optional().matches(/^\+91[6-9]\d{9}$/).withMessage('Please provide a valid Indian mobile number (+91XXXXXXXXXX)')
];

const addAddressValidation = [
  body('type').isIn(['home', 'work', 'other']).withMessage('Type must be home, work, or other'),
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('mobile').matches(/^\+91[6-9]\d{9}$/).withMessage('Please provide a valid Indian mobile number'),
  body('addressLine1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').matches(/^\d{6}$/).withMessage('Pincode must be 6 digits')
];

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateProfileValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, firstName, lastName, gender, email, mobile } = req.body;
    const userId = req.user._id;

    // Check if email or mobile is already taken by another user
    if (email || mobile) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          email ? { email } : null,
          mobile ? { mobile } : null
        ].filter(Boolean)
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.email === email ? 'Email already taken' : 'Mobile number already taken'
        });
      }
    }

    // Update user
    const updateData = {};
    if (name) updateData.name = name;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (gender) updateData.gender = gender;
    
    if (email) {
      updateData.email = email;
      updateData.emailVerified = false; // Require re-verification
    }
    if (mobile) {
      updateData.mobile = mobile;
      updateData.mobileVerified = false; // Require re-verification
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/deactivate
// @desc    Deactivate user account
// @access  Private
router.put('/deactivate', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { status: 'Deactivated' },
      { new: true }
    );
    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Deactivation failed' });
  }
});

// @route   DELETE /api/users/delete
// @desc    Permanently delete user account
// @access  Private
router.delete('/delete', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    // Note: You might want to delete orders or keep them as 'anonymous' depending on policy
    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Deletion failed' });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', protect, [
  body('currentPassword').exists().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/users/addresses
// @desc    Add new address
// @access  Private
router.post('/addresses', protect, addAddressValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const addressData = req.body;
    const userId = req.user._id;

    // If this is the default address, unset other defaults
    if (addressData.isDefault) {
      await User.updateOne(
        { _id: userId },
        { $unset: { 'addresses.$[].isDefault': false } }
      );
    }

    // Add address
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { addresses: addressData } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      addresses: user.addresses
    });

  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/addresses/:addressId
// @desc    Update address
// @access  Private
router.put('/addresses/:addressId', protect, addAddressValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { addressId } = req.params;
    const addressData = req.body;
    const userId = req.user._id;

    // If setting as default, unset other defaults
    if (addressData.isDefault) {
      await User.updateOne(
        { _id: userId },
        { $unset: { 'addresses.$[].isDefault': false } }
      );
    }

    // Update address
    const user = await User.findOneAndUpdate(
      { _id: userId, 'addresses._id': addressId },
      { $set: { 'addresses.$': addressData } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      message: 'Address updated successfully',
      addresses: user.addresses
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/users/addresses/:addressId
// @desc    Delete address
// @access  Private
router.delete('/addresses/:addressId', protect, async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      message: 'Address deleted successfully',
      addresses: user.addresses
    });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/users/addresses
// @desc    Get user addresses
// @access  Private
router.get('/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');

    res.json({
      success: true,
      addresses: user.addresses
    });

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get addresses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;