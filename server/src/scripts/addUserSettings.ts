import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { db, userSettings } from '../db';
import { eq } from 'drizzle-orm';
import { encrypt } from '../utils/encryption';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.production' : '.env';
dotenvConfig({ path: path.resolve(__dirname, '../../', envFile) });

console.log(`Environment: ${env}`);
console.log(`Loading env from: ${envFile}`);

const addUserSettings = async () => {
    try {
        // Get userId from command line argument
        const userId = process.argv[2];
        if (!userId) {
            console.error('Please provide userId as argument');
            console.log('Usage: npm run add-settings <userId>');
            process.exit(1);
        }

        // Check if settings already exist
        const [existingSettings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
        if (existingSettings) {
            console.log('Settings already exist for this user');
            console.log('Current settings:', {
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
        const openaiApiKey = process.env.OPENAI_API_KEY || '';
        const googleApiKey = process.env.GOOGLE_API_KEY || '';

        console.log('Creating/updating settings with credentials from .env...');
        console.log('OpenAI API Key:', openaiApiKey ? openaiApiKey.substring(0, 5) + '...' : 'Not set');
        console.log('Google API Key:', googleApiKey ? googleApiKey.substring(0, 5) + '...' : 'Not set');

        // Encrypt sensitive data
        const encryptedOpenAI = openaiApiKey ? encrypt(openaiApiKey) : '';
        const encryptedGoogle = googleApiKey ? encrypt(googleApiKey) : '';

        // Create or update settings
        const [settings] = await db
            .insert(userSettings)
            .values({
                userId,
                openaiApiKey: encryptedOpenAI,
                googleApiKey: encryptedGoogle,
            })
            .onConflictDoUpdate({
                target: userSettings.userId,
                set: {
                    openaiApiKey: encryptedOpenAI,
                    googleApiKey: encryptedGoogle,
                    updatedAt: new Date(),
                },
            })
            .returning();

        console.log('Settings saved successfully!');
        console.log('Settings ID:', settings.id);
        console.log('User ID:', settings.userId);

        process.exit(0);
    } catch (error) {
        console.error('Error adding user settings:', error);
        process.exit(1);
    }
};

addUserSettings();
