const mongoose = require('mongoose');

const productRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: [true, 'Please add your name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please add your phone number'],
      trim: true,
    },
    roomNo: {
      type: String,
      required: [true, 'Please add your room number'],
      trim: true,
    },
    requestText: {
      type: String,
      required: [true, 'Please add details of requested product'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Added', 'Rejected'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ProductRequest', productRequestSchema);
