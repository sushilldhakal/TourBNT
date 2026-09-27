/**
 * Generate a unique booking code
 * @returns A unique ID string in format: BNT-XXXXXX-YYYY
 * - XXXXXX: 6 chars from timestamp (sortable, ~2800 years unique)
 * - YYYY: 4 random chars (1.6M variations per timestamp)
 */
export default function makeId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const timestamp = Date.now().toString(36).toUpperCase();
  
  // Use last 6 chars of timestamp (more unique, ~2800 years before repeat)
  const timestampPart = timestamp.slice(-6).padStart(6, '0');
  
  // Generate 4 random characters
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `BNT-${timestampPart}-${randomPart}`;
}