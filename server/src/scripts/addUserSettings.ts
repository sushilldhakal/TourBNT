import mongoose from 'mongoose';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import UserSettings from '../api/user/userSettingModel';
import { encrypt } from '../utils/encryption';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.production' : '.env';
dotenvConfig({ path: path.resolve(__dirname, '../../', envFile) });

console.log(`🌍 Environment: ${env}`);
console.log(`📁 Loading env from: ${envFile}`);

const addUserSettings = async () => {
    try {
        const dbUrl = process.env.MONGO_CONNECTION_STRING;

        if (!dbUrl) {
            throw new Error('MONGO_CONNECTION_STRING not found in environment variables');
        }

        // Get userId from command line argument
        const userId = process.argv[2];
        if (!userId) {
            console.error('❌ Please provide userId as argument');
            console.log('Usage: npm run add-settings <userId>');
            process.exit(1);
        }

        // Connect to MongoDB
        console.log(`🔗 Connecting to database...`);
        await mongoose.connect(dbUrl);
        console.log('✅ Connected to database');
        console.log(`📊 Database: ${mongoose.connection.name}`);

        // Check if settings already exist
        const existingSettings = await UserSettings.findOne({ user: userId });
        if (existingSettings) {
            console.log('⚠️  Settings already exist for this user');
            console.log('Current settings:', {
                cloudinaryCloud: existingSettings.cloudinaryCloud,
                hasApiKey: !!existingSettings.cloudinaryApiKey,
                hasApiSecret: !!existingSettings.cloudinaryApiSecret,
                hasOpenAI: !!existingSettings.openaiApiKey,
                hasGoogle: !!existingSettings.googleApiKey
            });

            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise<string>((resolve) => {
                readline.question('Do you want to update? (yes/no): ', resolve);
            });
            readline.close();

            if (answer.toLowerCase() !== 'yes') {
                console.log('Cancelled');
                process.exit(0);
            }
        }

        // Get credentials from environment variables
        const cloudinaryCloud = process.env.CLOUDINARY_CLOUD || '';
        const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || '';
        const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || '';
        const openaiApiKey = process.env.OPENAI_API_KEY || '';
        const googleApiKey = process.env.GOOGLE_API_KEY || '';

        console.log('📝 Creating/updating settings with credentials from .env...');
        console.log('Cloudinary Cloud:', cloudinaryCloud);
        console.log('Cloudinary API Key:', cloudinaryApiKey ? cloudinaryApiKey.substring(0, 5) + '...' : 'Not set');
        console.log('Cloudinary API Secret:', cloudinaryApiSecret ? '***' : 'Not set');
        console.log('OpenAI API Key:', openaiApiKey ? openaiApiKey.substring(0, 5) + '...' : 'Not set');
        console.log('Google API Key:', googleApiKey ? googleApiKey.substring(0, 5) + '...' : 'Not set');

        // Encrypt sensitive data
        const encryptedApiKey = cloudinaryApiKey ? encrypt(cloudinaryApiKey) : '';
        const encryptedApiSecret = cloudinaryApiSecret ? encrypt(cloudinaryApiSecret) : '';
        const encryptedOpenAI = openaiApiKey ? encrypt(openaiApiKey) : '';
        const encryptedGoogle = googleApiKey ? encrypt(googleApiKey) : '';

        // Create or update settings
        const settings = await UserSettings.findOneAndUpdate(
            { user: userId },
            {
                cloudinaryCloud,
                cloudinaryApiKey: encryptedApiKey,
                cloudinaryApiSecret: encryptedApiSecret,
                openaiApiKey: encryptedOpenAI,
                googleApiKey: encryptedGoogle,
            },
            { upsert: true, new: true }
        );

        console.log('✅ Settings saved successfully!');
        console.log('Settings ID:', settings._id);
        console.log('User ID:', settings.user);

        process.exit(0);
    } catch (error) {
        console.error('Error adding user settings:', error);
        process.exit(1);
    }
};

addUserSettings();
