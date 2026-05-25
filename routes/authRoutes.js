const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'hostelbitesjwtsecretkey12345', {
    expiresIn: '60d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { name, phone, password, hostelBlock, roomNo, role } = req.body;

    if (!name || !phone || !password || !hostelBlock || roomNo === undefined || !role) {
      return res.status(400).json({ success: false, message: 'Please fill in all fields' });
    }

    if (!['X', 'Y', 'Z'].includes(hostelBlock)) {
      return res.status(400).json({ success: false, message: 'Hostel block must be X, Y, or Z' });
    }

    const room = Number(roomNo);
    if (isNaN(room) || room < 1 || room > 20) {
      return res.status(400).json({ success: false, message: 'Room number must be between 1 and 20' });
    }

    if (!['customer', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selection' });
    }

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    // Determine admin approval status
    // Customer registers immediately approved. Admin registers pending, unless it is the permanent admin phone 8218325600.
    const isAdminApproved = (role === 'customer' || phone === '8218325600');

    // Create user
    const user = await User.create({
      name,
      phone,
      password,
      hostelBlock,
      roomNo: room,
      role,
      isAdminApproved
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          hostelBlock: user.hostelBlock,
          roomNo: user.roomNo,
          isAdminApproved: user.isAdminApproved,
          rewards: user.rewards,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Please provide credentials' });
    }

    const user = await User.findOne({ phone }).select('+password');

    if (user && (await user.matchPassword(password))) {
      // Check admin approval
      if (user.role === 'admin' && !user.isAdminApproved) {
        return res.status(403).json({
          success: false,
          isPending: true,
          message: 'Your admin account request is pending approval by present admins.'
        });
      }

      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          hostelBlock: user.hostelBlock,
          roomNo: user.roomNo,
          isAdminApproved: user.isAdminApproved,
          rewards: user.rewards,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          hostelBlock: user.hostelBlock,
          roomNo: user.roomNo,
          isAdminApproved: user.isAdminApproved,
          rewards: user.rewards,
        },
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Recharge user wallet balance
// @route   POST /api/auth/recharge
// @access  Private
router.post('/recharge', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid Rs amount to recharge' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.rewards = (user.rewards || 0) + Number(amount);
    await user.save();
    res.json({
      success: true,
      message: `Successfully recharged Rs. ${amount}!`,
      data: {
        rewards: user.rewards
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password matches
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
