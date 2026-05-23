const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const { protect, admin } = require('../middleware/auth');

// @desc    Get all team members
// @route   GET /api/team
// @access  Public
router.get('/', async (req, res) => {
  try {
    const team = await TeamMember.find({}).sort({ createdAt: 1 });
    res.json({ success: true, count: team.length, data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Add a team member
// @route   POST /api/team/admin
// @access  Private/Admin
router.post('/admin', protect, admin, async (req, res) => {
  try {
    const { name, role, bio } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide team member name' });
    }

    const member = await TeamMember.create({
      name,
      role: role || undefined,
      bio: bio || undefined
    });

    res.status(201).json({
      success: true,
      message: 'Team member added successfully!',
      data: member
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a team member
// @route   DELETE /api/team/admin/:id
// @access  Private/Admin
router.delete('/admin/:id', protect, admin, async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    await member.deleteOne();
    res.json({ success: true, message: 'Team member deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
