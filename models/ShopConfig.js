const mongoose = require('mongoose');

const shopConfigSchema = new mongoose.Schema(
  {
    isManuallyClosed: {
      type: Boolean,
      default: false,
    },
    isManuallyOpened: {
      type: Boolean,
      default: false,
    },
    openHour: {
      type: Number,
      default: 8, // 8 AM
    },
    closeHour: {
      type: Number,
      default: 12, // 12 PM noon
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ShopConfig', shopConfigSchema);
