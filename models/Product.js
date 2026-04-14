const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Atta', 'Millets', 'Rice', 'Honey', 'Oils', 'Specials'],
      message: 'Please select a valid category'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  inStock: {
    type: Boolean,
    default: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  imagePublicId: {
    type: String  // Cloudinary public_id for deletion
  },
  backImageUrl: {
    type: String
  },
  backImagePublicId: {
    type: String  // Cloudinary public_id for back image deletion
  },
  ratings: {
    type: Number,
    default: 4.5
  },
  reviews: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  // Supporting multiple weights if needed
  weights: [{
    label: String, // e.g. "500gm", "1Kg"
    price: Number,
    isAvailable: { type: Boolean, default: true }
  }]
}, {
  timestamps: true
});

// Create unique index for names to prevent duplicates
productSchema.index({ name: 1 });

// Compatibility Virtuals: Map new field names to legacy field names
productSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

productSchema.virtual('img').get(function() {
  return this.imageUrl;
});

productSchema.virtual('backImg').get(function() {
  return this.backImageUrl;
});

// Ensure virtuals are serialized
productSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    // Keep both _id and the virtual 'id' so all frontend components work
    ret.id = ret._id?.toString();
    return ret;
  }
});

productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
