require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Dedicated Admin Seed — creates ONLY the Super Admin account.
// Receptionists & other staff must be added by the admin from the admin panel.
const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🌱 Connected to MongoDB for admin seeding...');

    const existingAdmin = await User.findOne({ email: 'admin@ftimumbai.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@ftimumbai.com',
        password: 'admin123',
        role: 'admin',
        mobile: '9876543210'
      });
      console.log('✅ Super Admin created: admin@ftimumbai.com / admin123');
    } else {
      console.log('ℹ️  Super Admin already exists. Skipping.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Admin seeding error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
