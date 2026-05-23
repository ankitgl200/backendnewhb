const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    pointsRedeemed: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Please add a delivery address'],
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate unique orderId (HB-XXXXXX)
orderSchema.pre('save', async function (next) {
  if (this.orderId) return next();

  const Order = mongoose.model('Order');
  let idExists = true;
  let newId = '';

  while (idExists) {
    // Generate random 6-digit uppercase alphanumeric code
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    newId = `HB-${code}`;

    const existingOrder = await Order.findOne({ orderId: newId });
    if (!existingOrder) {
      idExists = false;
    }
  }

  this.orderId = newId;
  next();
});

module.exports = mongoose.model('Order', orderSchema);
