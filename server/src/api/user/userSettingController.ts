import { Request, Response, NextFunction } from 'express';
import { db, userSettings } from '@tourbnt/db';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../../utils/encryption';
import createHttpError from 'http-errors';
import { HTTP_STATUS, sendAuthError, sendError, sendNotFoundError, sendSuccess, sendValidationError } from '../../utils/apiResponse';

export const addOrUpdateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(createHttpError(401, 'Not authenticated'));
    }
    const { OPENAI_API_KEY, GOOGLE_API_KEY } = req.body;

    const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

    let settings;
    if (!existing) {
      [settings] = await db
        .insert(userSettings)
        .values({
          userId,
          openaiApiKey: OPENAI_API_KEY ? encrypt(OPENAI_API_KEY) : '',
          googleApiKey: GOOGLE_API_KEY ? encrypt(GOOGLE_API_KEY) : '',
        })
        .returning();
    } else {
      const updates: Partial<typeof userSettings.$inferInsert> = { updatedAt: new Date() };
      if (OPENAI_API_KEY !== undefined) updates.openaiApiKey = encrypt(OPENAI_API_KEY);
      if (GOOGLE_API_KEY !== undefined) updates.googleApiKey = encrypt(GOOGLE_API_KEY);

      [settings] = await db.update(userSettings).set(updates).where(eq(userSettings.userId, userId)).returning();
    }

    const responseSettings = {
      ...settings,
      openaiApiKey: OPENAI_API_KEY || (settings.openaiApiKey ? '••••••••' : ''),
      googleApiKey: GOOGLE_API_KEY || (settings.googleApiKey ? '••••••••' : ''),
    };

    sendSuccess(res, responseSettings, 'Settings saved successfully');
  } catch (error) {
    next(error);
  }
};

export const getUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendAuthError(res, 'User ID is required');
    }

    let [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

    if (!settings) {
      [settings] = await db
        .insert(userSettings)
        .values({ userId, openaiApiKey: '', googleApiKey: '' })
        .returning();
    }

    const responseSettings = {
      ...settings,
      openaiApiKey: settings.openaiApiKey ? '••••••••' : '',
      googleApiKey: settings.googleApiKey ? '••••••••' : '',
    };

    sendSuccess(res, responseSettings, 'Settings retrieved successfully');
  } catch (error) {
    return sendError(res, 'Error retrieving user settings', HTTP_STATUS.INTERNAL_SERVER_ERROR, 'SERVER_ERROR', error);
  }
};

// Get decrypted API keys when needed
export const getDecryptedApiKey = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || !req.user) {
      return sendAuthError(res, 'User ID is required');
    }
    const { keyType } = req.query;

    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    if (!settings) {
      return sendNotFoundError(res, 'Settings not found');
    }

    let decryptedKey = '';
    let fallbackKey = '';
    let updates: Partial<typeof userSettings.$inferInsert> | undefined;

    switch (keyType) {
      case 'openai_api_key':
        decryptedKey = decrypt(settings.openaiApiKey || '');
        fallbackKey = process.env.OPENAI_API_KEY || '';
        break;
      case 'google_api_key':
        decryptedKey = decrypt(settings.googleApiKey || '');
        fallbackKey = process.env.GOOGLE_API_KEY || '';
        break;
      default:
        return sendValidationError(res, 'Invalid key type requested');
    }

    if (!decryptedKey && fallbackKey) {
      decryptedKey = fallbackKey;

      switch (keyType) {
        case 'openai_api_key':
          updates = { openaiApiKey: encrypt(fallbackKey) };
          break;
        case 'google_api_key':
          updates = { googleApiKey: encrypt(fallbackKey) };
          break;
      }

      if (updates) {
        await db.update(userSettings).set({ ...updates, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
      }
    }

    sendSuccess(res, { key: decryptedKey }, 'Decrypted API key retrieved successfully');
  } catch (error) {
    return sendError(res, 'Error retrieving decrypted API key', HTTP_STATUS.INTERNAL_SERVER_ERROR, 'SERVER_ERROR', error);
  }
};
