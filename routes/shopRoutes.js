const express = require('express');
const router = express.Router();
const ShopConfig = require('../models/ShopConfig');

// Helper function to calculate shop status
const getShopStatus = async () => {
  let config = await ShopConfig.findOne();
  if (!config) {
    // Create default config if it doesn't exist
    config = await ShopConfig.create({
      isManuallyClosed: false,
      isManuallyOpened: false,
      openHour: 8,
      closeHour: 12, // 12 PM noon
      isBlockXOpen: true,
      isBlockYOpen: true,
      isBlockZOpen: true,
    });
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  
  // Calculate raw open/close states
  let isOpenByTime = currentHour >= config.openHour && currentHour < config.closeHour;

  let isOpen = isOpenByTime;
  let reason = '';

  if (config.isManuallyClosed) {
    isOpen = false;
    reason = 'The shop has been manually closed by the administration.';
  } else if (config.isManuallyOpened) {
    isOpen = true;
    reason = 'The shop is open via administrative override.';
  } else {
    if (isOpen) {
      reason = `The shop is open (Operating hours: ${formatHour(config.openHour)} to ${formatHour(config.closeHour)}).`;
    } else {
      reason = `The shop is closed. Normal operating hours are ${formatHour(config.openHour)} to ${formatHour(config.closeHour)}.`;
    }
  }

  return {
    isOpen,
    reason,
    openHour: config.openHour,
    closeHour: config.closeHour,
    isManuallyClosed: config.isManuallyClosed,
    isManuallyOpened: config.isManuallyOpened,
    isBlockXOpen: config.isBlockXOpen !== undefined ? config.isBlockXOpen : true,
    isBlockYOpen: config.isBlockYOpen !== undefined ? config.isBlockYOpen : true,
    isBlockZOpen: config.isBlockZOpen !== undefined ? config.isBlockZOpen : true,
    currentTime: now.toLocaleTimeString(),
  };
};

// Format hour helper (e.g. 8 -> 8 AM, 12 -> 12 PM, 13 -> 1 PM)
const formatHour = (hour) => {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
};

// @desc    Get shop open/close status
// @route   GET /api/shop/status
// @access  Public
router.get('/status', async (req, res) => {
  try {
    const status = await getShopStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = { router, getShopStatus };
