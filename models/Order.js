const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for guest checkouts, though our flow requires auth
  },
  shippingAddress: {
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    addressLine: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    pincode: { type: String, required: true }
  },
  orderItems: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      image: { type: String }
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentInfo: {
    id: { type: String }, // Razorpay payment ID
    orderId: { type: String }, // Razorpay order ID
    signature: { type: String }, // Razorpay signature
    status: { 
      type: String, 
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending'
    }
  },
  orderStatus: {
    type: String,
    enum: ['Payment Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Payment Pending'
  },
  paidAt: {
    type: Date
  }
}, {
  timestamps: true
});

orderSchema.index({ user: 1 });

module.exports = mongoose.model('Order', orderSchema);
