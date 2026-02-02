/**
 * Generate a unique ID with a prefix
 * @param length - Length of the random part (default: 6)
 * @returns A unique ID string in format: BNT-XXXXXX-YYYY
 */
export default function makeId(length: number = 4): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const timestamp = Date.now().toString(36).toUpperCase(); // Add timestamp
    let result = 'BNT-';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Add last 4 chars of timestamp for uniqueness
    result += '-' + timestamp.slice(-4);
    return result;
}
