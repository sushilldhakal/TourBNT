import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get encryption key from environment variable or use a default (in production, always use env variable)
// Using a fixed default key for development - in production, this should ALWAYS be an environment variable
const DEFAULT_KEY = 'this-is-a-32-char-development-key!';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || DEFAULT_KEY; 
const IV_LENGTH = 16; // For AES, this is always 16 bytes

// Create a fixed-length key using a consistent method
const getKey = () => {
  // For AES-256-CBC, we need exactly 32 bytes
  const keyBuffer = Buffer.alloc(32, 0); // Create a buffer filled with zeros
  
  // Copy the encryption key bytes (up to 32 bytes) to the buffer
  Buffer.from(String(ENCRYPTION_KEY)).copy(keyBuffer);
  
  return keyBuffer;
};


/**
 * Encrypts text using AES-256-CBC encryption
 * @param text - The text to encrypt
 * @returns The encrypted text as a base64 string with IV prepended
 */
export const encrypt = (text: string): string => {
  if (!text) return '';
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey(); // Get a fixed-length key
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Store the IV with the encrypted data so we can use it for decryption
    const result = `${iv.toString('hex')}:${encrypted}`;
    
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
};

/**
 * Decrypts text that was encrypted with the encrypt function
 * @param encryptedText - The encrypted text (IV + encrypted data)
 * @returns The decrypted text
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  
  try {
    console.log('🔍 Decrypt input:', { 
      input: encryptedText, 
      length: encryptedText.length, 
      hasColon: encryptedText.includes(':') 
    });
    
    // Check if it's in our encryption format (IV:encryptedData)
    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) {
      console.log('🔍 Not encrypted format, returning as-is');
      return encryptedText;
    }
    
    const ivHex = textParts[0];
    const encryptedData = textParts[1];
    
    console.log('🔍 Decryption parts:', {
      ivHex: ivHex,
      ivLength: ivHex.length,
      encryptedData: encryptedData.substring(0, 20) + '...',
      encryptedDataLength: encryptedData.length
    });
    
    // Validate IV format (should be 32 hex characters for 16 bytes)
    if (ivHex.length !== 32 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
      console.log('🔍 Invalid IV format, returning as-is');
      return encryptedText;
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const key = getKey();
    
    console.log('🔍 Starting decryption with key length:', key.length);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('🔍 Decryption successful:', {
      decryptedLength: decrypted.length,
      decryptedPreview: decrypted.substring(0, 5) + '...'
    });
    
    return decrypted;
  } catch (error) {
    console.error('🔍 Decryption error:', error);
    console.log('🔍 Returning original text due to error');
    return encryptedText; // Return original if decryption fails
  }
};
