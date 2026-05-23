const express = require('express');
const router = express.Router();
const ScratchCard = require('../models/ScratchCard');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

// Map reward indices to descriptions
const REWARD_DESCRIPTIONS = [
  '1 Rs off on order above 30',
  '2 Rs off on order above 60',
  '3 Rs off on order above 90',
  '5% off on order above 100',
  '10% off on order above 200',
  'One item free on order above 200',
  'Better luck next time'
];

// @desc    Get user's scratch cards
// @route   GET /api/rewards/my-cards
// @access  Private
router.get('/my-cards', protect, async (req, res) => {
  try {
    // Automatically remove used rewards
    await ScratchCard.deleteMany({ user: req.user._id, isUsed: true });

    const cards = await ScratchCard.find({ user: req.user._id })
      .populate('order', 'status')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: cards.length, data: cards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Scratch a card
// @route   PUT /api/rewards/scratch/:id
// @access  Private
router.put('/scratch/:id', protect, async (req, res) => {
  try {
    const card = await ScratchCard.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Scratch card not found' });
    }

    if (card.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to scratch this card' });
    }

    if (card.isScratched) {
      return res.status(400).json({ success: false, message: 'Card has already been scratched' });
    }

    card.isScratched = true;
    card.scratchedAt = Date.now();

    if (card.rewardIndex === 6) {
      await card.deleteOne();
      return res.json({ 
        success: true, 
        message: 'Better luck next time!', 
        data: { _id: card._id, rewardIndex: 6, description: card.description, isScratched: true, isDeleted: true } 
      });
    }

    await card.save();
    res.json({ success: true, message: 'Card scratched successfully!', data: card });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Admin awards a specific scratch card to a user
// @route   POST /api/rewards/admin/give
// @access  Private/Admin
router.post('/admin/give', protect, admin, async (req, res) => {
  try {
    const { userId, rewardIndex } = req.body;

    if (!userId || rewardIndex === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide userId and rewardIndex' });
    }

    const index = Number(rewardIndex);
    if (isNaN(index) || index < 0 || index > 6) {
      return res.status(400).json({ success: false, message: 'Invalid rewardIndex (must be between 0 and 6)' });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const description = REWARD_DESCRIPTIONS[index];
    const card = await ScratchCard.create({
      user: userId,
      rewardIndex: index,
      description,
      isScratched: false,
      isUsed: false
    });

    res.status(201).json({
      success: true,
      message: `Successfully awarded scratch card: "${description}"`,
      data: card
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Mark scratch card admin notification as seen
// @route   PUT /api/rewards/mark-notified/:id
// @access  Private
router.put('/mark-notified/:id', protect, async (req, res) => {
  try {
    const card = await ScratchCard.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Scratch card not found' });
    }
    if (card.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this card' });
    }
    card.adminAwardNotified = true;
    await card.save();
    res.json({ success: true, message: 'Card marked as notified.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a scratch card (e.g. unwanted/expired rewards)
// @route   DELETE /api/rewards/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const card = await ScratchCard.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Scratch card not found' });
    }
    if (card.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this card' });
    }
    await card.deleteOne();
    res.json({ success: true, message: 'Reward deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
