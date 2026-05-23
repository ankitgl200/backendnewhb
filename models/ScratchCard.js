const mongoose = require('mongoose');

const scratchCardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    rewardIndex: {
      type: Number, // 0-6 index
      required: true,
      min: 0,
      max: 6,
    },
    description: {
      type: String,
      required: true,
    },
    isScratched: {
      type: Boolean,
      default: false,
    },
    scratchedAt: {
      type: Date,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
    },
    adminAwardNotified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

scratchCardSchema.virtual('threshold').get(function() {
  const thresholds = [30, 60, 90, 100, 200, 200, 0];
  return thresholds[this.rewardIndex] !== undefined ? thresholds[this.rewardIndex] : 0;
});

module.exports = mongoose.model('ScratchCard', scratchCardSchema);
