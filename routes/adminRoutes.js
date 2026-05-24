const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const ShopConfig = require('../models/ShopConfig');
const MenuItem = require('../models/MenuItem');
const { protect, admin } = require('../middleware/auth');

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
router.get('/orders', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name phone hostelBlock roomNo')
      .sort({ createdAt: -1 });

    // Check and apply 7-minute late delivery penalty for active orders
    for (const order of orders) {
      if (!['Completed', 'Cancelled'].includes(order.status)) {
        const elapsedMs = new Date() - new Date(order.createdAt);
        if (elapsedMs > 7 * 60 * 1000 && !order.isLate) {
          order.isLate = true;
          order.originalAmountPaid = order.amountPaid;
          const penalty = Math.floor(order.amountPaid / 10);
          order.amountPaid = Math.max(0, order.amountPaid - penalty);
          await order.save();
        }
      }
    }

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin
router.put('/orders/:id', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, message: 'Please provide a status' });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name phone hostelBlock roomNo');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const oldStatus = order.status;

    // Check if transition is to 'Completed' (successful delivery)
    if (oldStatus !== 'Completed' && status === 'Completed') {
      // Automatically reduce stock for each item in the order
      for (const item of order.items) {
        await MenuItem.findByIdAndUpdate(item.menuItem, {
          $inc: { stock: -item.quantity }
        });
      }

      // Update completedAt and apply penalty if late
      order.completedAt = new Date();
      const elapsedMs = order.completedAt - new Date(order.createdAt);
      if (elapsedMs > 7 * 60 * 1000) {
        if (!order.isLate) {
          order.isLate = true;
          order.originalAmountPaid = order.amountPaid;
          const penalty = Math.floor(order.amountPaid / 10);
          order.amountPaid = Math.max(0, order.amountPaid - penalty);
        }
      }
    } else if (status === 'Cancelled') {
      order.completedAt = undefined;
    }

    order.status = status;
    const updatedOrder = await order.save();
    
    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all users & rewards
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update shop config
// @route   POST /api/admin/shop/status
// @access  Private/Admin
router.post('/shop/status', protect, admin, async (req, res) => {
  try {
    const { isManuallyClosed, isManuallyOpened, openHour, closeHour } = req.body;

    let config = await ShopConfig.findOne();
    if (!config) {
      config = new ShopConfig();
    }

    if (isManuallyClosed !== undefined) config.isManuallyClosed = isManuallyClosed;
    if (isManuallyOpened !== undefined) config.isManuallyOpened = isManuallyOpened;
    if (openHour !== undefined) config.openHour = openHour;
    if (closeHour !== undefined) config.closeHour = closeHour;

    await config.save();

    res.json({
      success: true,
      message: 'Shop status and configuration updated successfully',
      data: {
        isManuallyClosed: config.isManuallyClosed,
        isManuallyOpened: config.isManuallyOpened,
        openHour: config.openHour,
        closeHour: config.closeHour,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete an order
// @route   DELETE /api/admin/orders/:id
// @access  Private/Admin
router.delete('/orders/:id', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    await order.deleteOne();
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Approve a pending admin
// @route   PUT /api/admin/approve-admin/:id
// @access  Private/Admin
router.put('/approve-admin/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'User is not an admin' });
    }
    user.isAdminApproved = true;
    await user.save();
    res.json({ success: true, message: 'Admin approved successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
router.delete('/users/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1. Cannot delete self
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    // 2. Cannot delete permanent superadmin
    if (user.phone === '8218325600') {
      return res.status(403).json({ success: false, message: 'Cannot delete the permanent superadmin account.' });
    }

    // 3. Admin deletion restrictions
    if (user.role === 'admin') {
      // Only superadmin (phone 8218325600) can delete admins
      if (req.user.phone !== '8218325600') {
        return res.status(403).json({ success: false, message: 'Only the permanent superadmin (8218325600) has rights to delete other admins.' });
      }
    }

    // Pass: delete user
    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
