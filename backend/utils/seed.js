// Seed script to create the first Super Admin
// Run: node utils/seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const existing = await User.findOne({ role: 'SuperAdmin' });
        if (existing) {
            console.log('Super Admin already exists:', existing.email);
            process.exit(0);
        }

        const superAdmin = new User({
            name: 'Super Admin',
            email: 'superadmin@example.com',
            password: 'admin123',
            role: 'SuperAdmin',
            isEmailVerified: true,
            emailVerifiedAt: new Date()
        });

        await superAdmin.save();
        console.log('Super Admin created successfully!');
        console.log('Email: superadmin@example.com');
        console.log('Password: admin123');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error.message);
        process.exit(1);
    }
};

seedSuperAdmin();
