const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');
const ShopConfig = require('./models/ShopConfig');

dotenv.config();

const sampleMenuItems = [
  // Snacks
  {
    name: 'Crispy French Fries',
    price: 40, // 40 points
    stock: 25, // 25 items left
    category: 'Snacks',
    description: 'Golden, crispy potatoes lightly salted, served with hot garlic dip.',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  {
    name: 'Grilled Paneer Tikka',
    price: 70, // 70 points
    stock: 15,
    category: 'Snacks',
    description: 'Spiced cottage cheese cubes grilled to perfection with bell peppers.',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  {
    name: 'Spicy Buffalo Wings',
    price: 80, // 80 points
    stock: 15,
    category: 'Snacks',
    description: 'Juicy chicken wings glazed in spicy hot buffalo sauce and blue cheese dip.',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  
  // Meals
  {
    name: 'Double Cheese Veg Burger',
    price: 90, // 90 points
    stock: 30,
    category: 'Meals',
    description: 'Thick veggie patty, double cheddar, lettuce, tomato, and house burger sauce.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  {
    name: 'Butter Chicken & Butter Naan',
    price: 120, // 120 points
    stock: 10,
    category: 'Meals',
    description: 'Rich, creamy tomato gravy chicken served with two pieces of soft butter naan.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  {
    name: 'Schezwan Hakka Noodles',
    price: 95, // 95 points
    stock: 20,
    category: 'Meals',
    description: 'Wok-tossed noodles with fresh seasonal greens and fiery schezwan sauce.',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  {
    name: 'Classic Club Sandwich',
    price: 65, // 65 points
    stock: 20,
    category: 'Meals',
    description: 'Triple-decker bread stuffed with lettuce, grilled chicken, egg, and mayonnaise.',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  
  // Drinks
  {
    name: 'Creamy Cold Coffee',
    price: 30, // 30 points
    stock: 50, // 50 items left
    category: 'Drinks',
    description: 'Rich, blended espresso with cold milk and a generous scoop of vanilla ice cream.',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  {
    name: 'Lemon Iced Tea',
    price: 20, // 20 points
    stock: 40,
    category: 'Drinks',
    description: 'Brewed black tea infused with fresh lemon and served chilled with ice.',
    image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  {
    name: 'Oreo Milkshake',
    price: 45, // 45 points
    stock: 30,
    category: 'Drinks',
    description: 'Thick, creamy milkshake blended with chocolate cookies and topped with whipped cream.',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  },
  
  // Desserts
  {
    name: 'Choco Lava Cake',
    price: 50, // 50 points
    stock: 20,
    category: 'Desserts',
    description: 'Warm chocolate cake with a rich liquid chocolate center.',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60',
    isAvailable: true
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_bites');
    
    console.log('Connected to MongoDB. Wiping database...');
    
    // Wipe database to clear duplicate index key issues (such as email unique index)
    await mongoose.connection.db.dropDatabase();
    
    console.log('Database wiped.');

    // 1. Seed Menu Items
    const menuItems = await MenuItem.insertMany(sampleMenuItems);
    console.log(`${menuItems.length} menu items seeded with stock values.`);

    // 2. Seed Super Admin (Permanent)
    const superAdmin = await User.create({
      name: 'Super Admin',
      phone: '8218325600',
      password: 'ankit@2004',
      role: 'admin',
      hostelBlock: 'X',
      roomNo: 1,
      isAdminApproved: true,
      rewards: 1000
    });
    console.log(`Super Admin seeded: ${superAdmin.phone} (Password: ankit@2004, Approved: true)`);

    // 3. Seed standard active Admin
    const activeAdmin = await User.create({
      name: 'Hostel Bites Admin',
      phone: '9999999999',
      password: 'admin123',
      role: 'admin',
      hostelBlock: 'Y',
      roomNo: 2,
      isAdminApproved: true,
      rewards: 1000
    });
    console.log(`Active Admin user seeded: ${activeAdmin.phone} (Password: admin123, Approved: true)`);

    // 4. Seed pending Admin
    const pendingAdmin = await User.create({
      name: 'Pending Admin',
      phone: '7777777777',
      password: 'admin777',
      role: 'admin',
      hostelBlock: 'Z',
      roomNo: 15,
      isAdminApproved: false,
      rewards: 100
    });
    console.log(`Pending Admin user seeded: ${pendingAdmin.phone} (Password: admin777, Approved: false)`);

    // 5. Seed test Customer
    const testUser = await User.create({
      name: 'John Doe',
      phone: '8888888888',
      password: 'user123',
      role: 'customer',
      hostelBlock: 'Y',
      roomNo: 10,
      isAdminApproved: true,
      rewards: 250
    });
    console.log(`Test Customer user seeded: ${testUser.phone} (Password: user123, Approved: true)`);

    // 6. Seed ShopConfig
    const shopConfig = await ShopConfig.create({
      isManuallyClosed: false,
      isManuallyOpened: false,
      openHour: 8,
      closeHour: 23,
    });
    console.log(`Shop config seeded: Open 8 AM to 11 PM.`);

    console.log('Database seeding completed successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDB();
