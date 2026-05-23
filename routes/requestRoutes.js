const express = require('express');
const router = express.Router();
const ProductRequest = require('../models/ProductRequest');
const { protect, admin } = require('../middleware/auth');

// @desc    Submit a product request
// @route   POST /api/requests
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, phone, roomNo, requestText } = req.body;

    if (!name || !phone || !roomNo || !requestText) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    const request = await ProductRequest.create({
      user: req.user._id,
      name,
      phone,
      roomNo,
      requestText
    });

    res.status(201).json({
      success: true,
      message: 'Product request submitted successfully!',
      data: request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get current user's product requests
// @route   GET /api/requests/my-requests
// @access  Private
router.get('/my-requests', protect, async (req, res) => {
  try {
    const requests = await ProductRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all product requests
// @route   GET /api/requests/admin
// @access  Private/Admin
router.get('/admin', protect, admin, async (req, res) => {
  try {
    const requests = await ProductRequest.find({}).sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update product request status
// @route   PUT /api/requests/admin/:id
// @access  Private/Admin
router.put('/admin/:id', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Please provide status' });
    }

    if (!['Pending', 'Reviewed', 'Added', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const request = await ProductRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = status;
    await request.save();

    res.json({ success: true, message: 'Request status updated successfully!', data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a product request
// @route   DELETE /api/requests/admin/:id
// @access  Private/Admin
router.delete('/admin/:id', protect, admin, async (req, res) => {
  try {
    const request = await ProductRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    await request.deleteOne();
    res.json({ success: true, message: 'Request deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
