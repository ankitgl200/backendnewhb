const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add the item name'],
      trim: true,
      unique: true,
    },
    price: {
      type: Number,
      required: [true, 'Please add the item price'],
      min: [0, 'Price must be a positive number'],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: ['Snacks', 'Meals', 'Drinks', 'Desserts'],
    },
    image: {
      type: String,
      default: '', // base64 or public image url
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      default: 50,
      min: [0, 'Stock cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
