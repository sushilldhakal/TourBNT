import { db, tours } from '../../../db';
import { eq } from 'drizzle-orm';

/**
 * Generate unique tour code utility
 */

const generateRandomCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const codeExists = async (code: string): Promise<boolean> => {
  const [existing] = await db.select({ id: tours.id }).from(tours).where(eq(tours.code, code)).limit(1);
  return !!existing;
};

export const generateUniqueCode = async (length: number = 8, maxAttempts: number = 10): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRandomCode(length);
    const exists = await codeExists(code);

    if (!exists) {
      return code;
    }
  }

  if (length < 12) {
    return generateUniqueCode(length + 1, maxAttempts);
  }

  const timestamp = Date.now().toString(36);
  const random = generateRandomCode(4);
  return `${timestamp}${random}`.toUpperCase();
};
