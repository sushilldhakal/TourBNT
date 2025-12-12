import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import userModel from '../api/user/userModel';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.production' : '.env';
dotenvConfig({ path: path.resolve(__dirname, '../../', envFile) });

console.log(`🌍 Environment: ${env}`);
console.log(`📁 Loading env from: ${envFile}`);

const createAdminUser = async () => {
    try {
        const dbUrl = process.env.MONGO_CONNECTION_STRING;

        if (!dbUrl) {
            throw new Error('MONGO_CONNECTION_STRING not found in environment variables');
        }

        // Connect to MongoDB
        console.log(`🔗 Connecting to database...`);
        await mongoose.connect(dbUrl);
        console.log('✅ Connected to database');
        console.log("dbUrl", dbUrl)
        console.log(`📊 Database: ${mongoose.connection.name}`);
        // Check if admin already exists
        const existingAdmin = await userModel.findOne({ roles: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists:', existingAdmin.email);
            process.exit(0);
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('30354380@Atmc', 10); // Change this password!

        const adminUser = await userModel.create({
            name: 'Admin User',
            email: 'info@tourbnt.com', // Change this email!
            password: hashedPassword,
            phone: '0433926079',
            roles: 'admin',
            verified: true,
        });

        console.log('✅ Admin user created successfully!');
        console.log('Email:', adminUser.email);
        console.log('Password: admin123'); // Remember to change this!
        console.log('⚠️  Please change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdminUser();
