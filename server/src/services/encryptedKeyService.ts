import UserSettings from '../api/user/userSettingModel';
import { decrypt } from '../utils/encryption';

export interface DecryptedCredentials {
  cloudinaryCloud?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
}

export interface CloudinaryCredentials {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

/**
 * Unified service for handling encrypted API keys with fallback to environment variables
 */
export class EncryptedKeyService {

  /**
   * Get decrypted API key for a specific user and key type
   * @param userId - User ID to get settings for
   * @param keyType - Type of key to decrypt
   * @returns Decrypted key value or empty string if not found
   */
  static async getDecryptedKey(userId: string, keyType: string): Promise<string> {
    try {
      const settings = await UserSettings.findOne({ user: userId });
      if (!settings) {
        console.log(`⚠️ No settings found for user: ${userId}`);
        return '';
      }

      let decryptedKey = '';
      let fallbackKey = '';

      switch (keyType) {
        case 'cloudinary_api_key':
          decryptedKey = decrypt(settings.cloudinaryApiKey || '');
          fallbackKey = process.env.CLOUDINARY_API_KEY || '';
          break;
        case 'cloudinary_api_secret':
          decryptedKey = decrypt(settings.cloudinaryApiSecret || '');
          fallbackKey = process.env.CLOUDINARY_API_SECRET || '';
          break;
        case 'cloudinary_cloud':
          return settings.cloudinaryCloud || process.env.CLOUDINARY_CLOUD_NAME || '';
        case 'openai_api_key':
          decryptedKey = decrypt(settings.openaiApiKey || '');
          fallbackKey = process.env.OPENAI_API_KEY || '';
          break;
        case 'google_api_key':
          decryptedKey = decrypt(settings.googleApiKey || '');
          fallbackKey = process.env.GOOGLE_API_KEY || '';
          break;
        default:
          console.log(`❌ Invalid key type requested: ${keyType}`);
          return '';
      }

      // Use fallback if decryption failed or returned empty string
      const finalKey = decryptedKey || fallbackKey;

      if (!finalKey) {
        console.log(`⚠️ No key found for type: ${keyType}, user: ${userId}`);
      }

      return finalKey;
    } catch (error) {
      console.error(`❌ Error getting decrypted key for ${keyType}:`, error);
      return '';
    }
  }

  /**
   * Get all decrypted credentials for a user
   * @param userId - User ID to get settings for
   * @returns Object with all decrypted credentials
   */
  static async getAllDecryptedCredentials(userId: string): Promise<DecryptedCredentials> {
    try {
      const settings = await UserSettings.findOne({ user: userId });
      if (!settings) {
        console.log(`⚠️ No settings found for user: ${userId}`);
        return {};
      }

      return {
        cloudinaryCloud: settings.cloudinaryCloud || process.env.CLOUDINARY_CLOUD_NAME || '',
        cloudinaryApiKey: decrypt(settings.cloudinaryApiKey || '') || process.env.CLOUDINARY_API_KEY || '',
        cloudinaryApiSecret: decrypt(settings.cloudinaryApiSecret || '') || process.env.CLOUDINARY_API_SECRET || '',
        openaiApiKey: decrypt(settings.openaiApiKey || '') || process.env.OPENAI_API_KEY || '',
        googleApiKey: decrypt(settings.googleApiKey || '') || process.env.GOOGLE_API_KEY || ''
      };
    } catch (error) {
      console.error(`❌ Error getting all decrypted credentials:`, error);
      return {};
    }
  }

  /**
   * Get Cloudinary credentials specifically formatted for cloudinary.config()
   * @param userId - User ID to get settings for
   * @returns Cloudinary credentials object or null if invalid
   */
  static async getCloudinaryCredentials(userId: string): Promise<CloudinaryCredentials | null> {
    try {
      console.log(`🔧 Getting Cloudinary credentials for user: ${userId}`);

      const settings = await UserSettings.findOne({ user: userId });
      console.log('🔧 Raw settings from DB:', {
        found: !!settings,
        cloudinaryCloud: settings?.cloudinaryCloud,
        cloudinaryApiKeyEncrypted: settings?.cloudinaryApiKey?.substring(0, 20) + '...',
        cloudinaryApiSecretEncrypted: settings?.cloudinaryApiSecret?.substring(0, 20) + '...'
      });

      const credentials = await this.getAllDecryptedCredentials(userId);

      console.log('🔧 Decrypted credentials check:', {
        cloudName: credentials.cloudinaryCloud,
        cloudNameValid: !!credentials.cloudinaryCloud && credentials.cloudinaryCloud.length > 0,
        apiKey: credentials.cloudinaryApiKey?.substring(0, 5) + '...',
        apiKeyValid: !!credentials.cloudinaryApiKey && credentials.cloudinaryApiKey.length > 0,
        apiSecret: credentials.cloudinaryApiSecret?.substring(0, 5) + '...',
        apiSecretValid: !!credentials.cloudinaryApiSecret && credentials.cloudinaryApiSecret.length > 0,
        apiKeyLength: credentials.cloudinaryApiKey?.length || 0,
        apiSecretLength: credentials.cloudinaryApiSecret?.length || 0
      });

      if (!credentials.cloudinaryCloud || !credentials.cloudinaryApiKey || !credentials.cloudinaryApiSecret) {
        console.log('❌ Missing required Cloudinary credentials');
        return null;
      }

      return {
        cloud_name: credentials.cloudinaryCloud.trim(),
        api_key: credentials.cloudinaryApiKey.trim(),
        api_secret: credentials.cloudinaryApiSecret.trim()
      };
    } catch (error) {
      console.error(`❌ Error getting Cloudinary credentials:`, error);
      return null;
    }
  }

  /**
   * Validate Cloudinary credentials by attempting to ping the API
   * @param credentials - Cloudinary credentials to validate
   * @returns Promise<boolean> - true if valid, false if invalid
   */
  static async validateCloudinaryCredentials(credentials: CloudinaryCredentials): Promise<boolean> {
    try {
      const cloudinary = require('cloudinary').v2;

      // Configure with the credentials
      cloudinary.config(credentials);

      // Attempt to ping the API
      await cloudinary.api.ping();

      console.log('✅ Cloudinary credentials validation successful');
      return true;
    } catch (error: any) {
      console.log('❌ Cloudinary credentials validation failed:', {
        message: error.message || 'Unknown error',
        http_code: error.http_code || 'Unknown'
      });
      return false;
    }
  }
}
