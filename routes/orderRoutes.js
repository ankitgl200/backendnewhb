const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const ScratchCard = require('../models/ScratchCard');
const { protect } = require('../middleware/auth');
const { getShopStatus } = require('./shopRoutes');

// @desc    Place a new order
// @route   POST /api/orders
router.post('/', protect, async (req, res) => {
  try {
    const { items, deliveryAddress, scratchCardId, scratchCardIds } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ success: false, message: 'Please provide a delivery address' });
    }

    // 1. Shop Open/Close Check
    const shopStatus = await getShopStatus();
    if (!shopStatus.isOpen && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Order failed: The shop is currently closed.',
        shopClosed: true,
      });
    }

    // 2. Resolve Items & Calculate Price
    let totalAmount = 0;
    const resolvedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ success: false, message: `Menu item not found: ${item.menuItemId}` });
      }
      if (!menuItem.isAvailable) {
        return res.status(400).json({ success: false, message: `Item is currently unavailable: ${menuItem.name}` });
      }
      if (menuItem.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for: ${menuItem.name} (Only ${menuItem.stock} left in stock)`
        });
      }

      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      resolvedItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
      });
    }

    // Retrieve fresh user instance to handle points accurately
    const user = await User.findById(req.user._id);

    // Calculate Scratch Cards discount if applicable (supports 1 card)
    let totalDiscount = 0;
    const scratchCards = [];
    
    let appliedCardIds = [];
    if (scratchCardIds && Array.isArray(scratchCardIds)) {
      appliedCardIds = scratchCardIds.slice(0, 1);
    } else if (scratchCardId) {
      appliedCardIds = [scratchCardId];
    }

    // Remove duplicate card IDs
    const uniqueCardIds = [...new Set(appliedCardIds)];

    for (const cardId of uniqueCardIds) {
      const scratchCard = await ScratchCard.findById(cardId);
      if (!scratchCard) {
        return res.status(404).json({ success: false, message: `Scratch card not found: ${cardId}` });
      }
      if (scratchCard.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You do not own this scratch card' });
      }
      if (!scratchCard.isScratched) {
        return res.status(400).json({ success: false, message: 'Scratch card has not been scratched yet' });
      }
      if (scratchCard.isUsed) {
        return res.status(400).json({ success: false, message: 'Scratch card has already been used' });
      }
      const isExpired = (new Date() - new Date(scratchCard.createdAt)) > 3 * 24 * 60 * 60 * 1000;
      if (isExpired) {
        return res.status(400).json({ success: false, message: 'Scratch card has expired' });
      }
      if (scratchCard.order) {
        const associatedOrder = await Order.findById(scratchCard.order);
        if (!associatedOrder || associatedOrder.status !== 'Completed') {
          return res.status(400).json({
            success: false,
            message: 'This reward cannot be used yet. It will be activated after the associated order is successfully delivered.'
          });
        }
      }
      if (totalAmount < scratchCard.threshold) {
        return res.status(400).json({
          success: false,
          message: `Order total (Rs. ${totalAmount}) is below the threshold of Rs. ${scratchCard.threshold} for this reward.`
        });
      }

      // Calculate discount value
      let cardDiscount = 0;
      const index = scratchCard.rewardIndex;
      if (index === 0) {
        cardDiscount = 1;
      } else if (index === 1) {
        cardDiscount = 2;
      } else if (index === 2) {
        cardDiscount = 3;
      } else if (index === 3) {
        cardDiscount = Math.floor(totalAmount * 0.05);
      } else if (index === 4) {
        cardDiscount = Math.floor(totalAmount * 0.10);
      } else if (index === 5) {
        const cheapestPrice = Math.min(...resolvedItems.map(item => item.price));
        cardDiscount = cheapestPrice;
      } else if (index === 6) {
        cardDiscount = 0;
      }
      
      totalDiscount += cardDiscount;
      scratchCards.push(scratchCard);
    }

    const amountPaid = Math.max(0, totalAmount - totalDiscount);

    // 3. Cash on Delivery (COD) Payment Logic: no points balance checks or deductions
    const pointsRedeemed = totalDiscount; // Store discount applied (in Rs.)
    const pointsEarned = 0;

    // Automatically remove/delete used scratch cards if applied
    for (const card of scratchCards) {
      await card.deleteOne();
    }

    // 5. Create the Order
    const order = await Order.create({
      user: req.user._id,
      items: resolvedItems,
      totalAmount,
      pointsEarned,
      pointsRedeemed,
      amountPaid,
      deliveryAddress,
      status: 'Pending',
    });

    // Generate a random scratch card immediately for this order
    const rewardIndex = Math.floor(Math.random() * 7); // 0 to 6
    const REWARD_DESCRIPTIONS = [
      '1 Rs off on order above 30',
      '2 Rs off on order above 60',
      '3 Rs off on order above 90',
      '5% off on order above 100',
      '10% off on order above 200',
      'One item free on order above 200',
      'Better luck next time'
    ];
    const description = REWARD_DESCRIPTIONS[rewardIndex];

    const newScratchCard = await ScratchCard.create({
      user: req.user._id,
      order: order._id,
      rewardIndex,
      description,
      isScratched: false,
      isUsed: false
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: order,
      scratchCard: newScratchCard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get logged in user's order history
// @route   GET /api/orders/my-orders
// @access  Private
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    
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

module.exports = router;
