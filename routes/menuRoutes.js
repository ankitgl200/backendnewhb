const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { protect, admin } = require('../middleware/auth');

// @desc    Get all menu items
// @route   GET /api/menu
// @access  Public
router.get('/', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({});
    res.json({ success: true, count: menuItems.length, data: menuItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a menu item
// @route   POST /api/menu
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, price, category, image, description, isAvailable, stock } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ success: false, message: 'Please include name, price, and category' });
    }

    const itemExists = await MenuItem.findOne({ name });
    if (itemExists) {
      return res.status(400).json({ success: false, message: 'An item with this name already exists' });
    }

    const menuItem = await MenuItem.create({
      name,
      price,
      category,
      image,
      description,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      stock: stock !== undefined ? stock : 50,
    });

    res.status(201).json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update a menu item
// @route   PUT /api/menu/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, price, category, image, description, isAvailable, stock } = req.body;

    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    menuItem.name = name !== undefined ? name : menuItem.name;
    menuItem.price = price !== undefined ? price : menuItem.price;
    menuItem.category = category !== undefined ? category : menuItem.category;
    menuItem.image = image !== undefined ? image : menuItem.image;
    menuItem.description = description !== undefined ? description : menuItem.description;
    menuItem.isAvailable = isAvailable !== undefined ? isAvailable : menuItem.isAvailable;
    menuItem.stock = stock !== undefined ? stock : menuItem.stock;

    const updatedItem = await menuItem.save();
    res.json({ success: true, data: updatedItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a menu item
// @route   DELETE /api/menu/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    await MenuItem.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
