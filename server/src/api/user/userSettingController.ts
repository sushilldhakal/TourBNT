import { Request, Response, NextFunction } from 'express';
import UserSettings from './userSettingModel';
import { encrypt, decrypt } from '../../utils/encryption';
import createHttpError from 'http-errors';

export const addOrUpdateSettings = async (req: Request
, res: Response, next: NextFunction) => {
  try {
    console.log('Request body:', req.body);

    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID is required');
       return next(createHttpError(401, 'Not authenticated'));
    }
    const { CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, OPENAI_API_KEY, GOOGLE_API_KEY } = req.body;

    let settings = await UserSettings.findOne({ user: userId });

    if (!settings) {
      settings = await UserSettings.create({
        user: userId,
        cloudinaryCloud: CLOUDINARY_CLOUD || '',
        cloudinaryApiKey: CLOUDINARY_API_KEY ? encrypt(CLOUDINARY_API_KEY) : '',
        cloudinaryApiSecret: CLOUDINARY_API_SECRET ? encrypt(CLOUDINARY_API_SECRET) : '',
        openaiApiKey: OPENAI_API_KEY ? encrypt(OPENAI_API_KEY) : '',
        googleApiKey: GOOGLE_API_KEY ? encrypt(GOOGLE_API_KEY) : '',
      });
    } else {
      if (CLOUDINARY_CLOUD !== undefined) settings.cloudinaryCloud = CLOUDINARY_CLOUD;
      if (CLOUDINARY_API_KEY !== undefined) settings.cloudinaryApiKey = encrypt(CLOUDINARY_API_KEY);
      if (CLOUDINARY_API_SECRET !== undefined) settings.cloudinaryApiSecret = encrypt(CLOUDINARY_API_SECRET);
      if (OPENAI_API_KEY !== undefined) settings.openaiApiKey = encrypt(OPENAI_API_KEY);
      if (GOOGLE_API_KEY !== undefined) settings.googleApiKey = encrypt(GOOGLE_API_KEY);
    }

    await settings.save();

    // Return settings with decrypted values for immediate use
    const responseSettings = {
      ...settings.toObject(),
      cloudinaryApiKey: CLOUDINARY_API_KEY || (settings.cloudinaryApiKey ? '••••••••' : ''),
      cloudinaryApiSecret: CLOUDINARY_API_SECRET || (settings.cloudinaryApiSecret ? '••••••••' : ''),
      openaiApiKey: OPENAI_API_KEY || (settings.openaiApiKey ? '••••••••' : ''),
      googleApiKey: GOOGLE_API_KEY || (settings.googleApiKey ? '••••••••' : '')
    };

    res.status(200).json({ message: 'Settings saved successfully', settings: responseSettings });
  } catch (error) {
    next(error);
  }
};


export const getUserSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID is required');
       return next(createHttpError(401, 'Not authenticated'));
    }

    let settings = await UserSettings.findOne({ user: userId });

    // If settings don't exist, create empty settings for the user
    if (!settings) {
      settings = await UserSettings.create({
        user: userId,
        cloudinaryCloud: '',
        cloudinaryApiKey: '',
        cloudinaryApiSecret: '',
        openaiApiKey: '',
        googleApiKey: '',
      });
    }

    // Mask sensitive data in the response
    const responseSettings = {
      ...settings.toObject(),
      cloudinaryApiKey: settings.cloudinaryApiKey ? '••••••••' : '',
      cloudinaryApiSecret: settings.cloudinaryApiSecret ? '••••••••' : '',
      openaiApiKey: settings.openaiApiKey ? '••••••••' : '',
      googleApiKey: settings.googleApiKey ? '••••••••' : ''
    };

    res.status(200).json({ settings: responseSettings });
  } catch (error) {
    next(error);
  }
};

// New method to get decrypted API keys when needed
export const getDecryptedApiKey = async (req: Request
, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID is required');
       return next(createHttpError(401, 'Not authenticated'));
    }
    const { keyType } = req.query;
    // Ensure the requesting user has permission (either admin or the user themselves)
    if (!req.user) {
      throw createHttpError(401, "Not authenticated");
    }

    const settings = await UserSettings.findOne({ user: userId });
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
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
      case 'openai_api_key':
        decryptedKey = decrypt(settings.openaiApiKey || '');
        fallbackKey = process.env.OPENAI_API_KEY || '';
        break;
      case 'google_api_key':
        decryptedKey = decrypt(settings.googleApiKey || '');
        fallbackKey = process.env.GOOGLE_API_KEY || '';
        break;
      default:
        return res.status(400).json({ message: 'Invalid key type requested' });
    }

    // If decryption failed or returned an empty string, use the fallback from environment variables
    if (!decryptedKey && fallbackKey) {
      decryptedKey = fallbackKey;

      // Optionally, re-encrypt and save the environment variable to fix the database
      if (fallbackKey && settings) {
        switch (keyType) {
          case 'cloudinary_api_key':
            settings.cloudinaryApiKey = encrypt(fallbackKey);
            break;
          case 'cloudinary_api_secret':
            settings.cloudinaryApiSecret = encrypt(fallbackKey);
            break;
          case 'openai_api_key':
            settings.openaiApiKey = encrypt(fallbackKey);
            break;
          case 'google_api_key':
            settings.googleApiKey = encrypt(fallbackKey);
            break;
        }

        await settings.save();
      }
    }
    res.status(200).json({ key: decryptedKey });
  } catch (error) {
    next(error);
  }
};