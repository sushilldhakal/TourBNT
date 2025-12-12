import tourModel from '../tourModel';

/**
 * Generate unique tour code utility
 */

/**
 * Generate a random alphanumeric code
 */
const generateRandomCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if a tour code already exists
 */
const codeExists = async (code: string): Promise<boolean> => {
  const existing = await tourModel.findOne({ code }).lean();
  return !!existing;
};

/**
 * Generate a unique tour code
 */
export const generateUniqueCode = async (length: number = 8, maxAttempts: number = 10): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateRandomCode(length);
    const exists = await codeExists(code);
    
    if (!exists) {
      return code;
    }
  }
  
  // If we couldn't generate a unique code after maxAttempts, 
  // try with a longer length
  if (length < 12) {
    return generateUniqueCode(length + 1, maxAttempts);
  }
  
  // Fallback: use timestamp + random
  const timestamp = Date.now().toString(36);
  const random = generateRandomCode(4);
  return `${timestamp}${random}`.toUpperCase();
};
