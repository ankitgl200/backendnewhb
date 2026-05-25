const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 5,
      select: false, // Don't return password by default
    },
    hostelBlock: {
      type: String,
      required: [true, 'Please add a hostel block'],
      enum: ['X', 'Y', 'Z'],
    },
    roomNo: {
      type: Number,
      required: [true, 'Please add a room number'],
      min: 1,
      max: 20,
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    isAdminApproved: {
      type: Boolean,
      default: false,
    },
    rewards: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
