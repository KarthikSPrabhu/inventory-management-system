const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');

async function seedAdmin() {
  console.log('=== SEEDING INITIAL ACCOUNTS ===');
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is missing in .env');
    }

    await mongoose.connect(mongoUri);
    console.log('✔ Connected to MongoDB Atlas');

    // Default admin & member credentials
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@inventory.com';
    const adminPass = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@12345';

    const memberEmail = process.env.INITIAL_MEMBER_EMAIL || 'member@inventory.com';
    const memberPass = process.env.INITIAL_MEMBER_PASSWORD || 'Member@12345';

    // Seed Admin
    let admin = await User.findOne({ email: adminEmail.toLowerCase() });
    const adminHash = await User.hashPassword(adminPass);

    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail.toLowerCase(),
        passwordHash: adminHash,
        role: 'admin'
      });
      console.log(`✔ Created Admin account: ${admin.email}`);
    } else {
      admin.passwordHash = adminHash;
      admin.role = 'admin';
      await admin.save();
      console.log(`✔ Updated Admin password & role: ${admin.email}`);
    }

    // Seed Member
    let member = await User.findOne({ email: memberEmail.toLowerCase() });
    const memberHash = await User.hashPassword(memberPass);

    if (!member) {
      member = await User.create({
        name: 'Team Member',
        email: memberEmail.toLowerCase(),
        passwordHash: memberHash,
        role: 'member'
      });
      console.log(`✔ Created Member account: ${member.email}`);
    } else {
      member.passwordHash = memberHash;
      member.role = 'member';
      await member.save();
      console.log(`✔ Updated Member password & role: ${member.email}`);
    }

    console.log('\n=======================================');
    console.log('Default Credentials:');
    console.log(`👑 ADMIN : ${adminEmail} | Password: ${adminPass}`);
    console.log(`👤 MEMBER: ${memberEmail} | Password: ${memberPass}`);
    console.log('=======================================\n');

  } catch (err) {
    console.error('Seed Admin Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB Atlas.');
  }
}

seedAdmin();
