/**
 * Generate a unique ID with a prefix
 * @param length - Length of the random part (default: 6)
 * @returns A unique ID string in format: BNT-XXXXXX-YYYY
 */
export default function makeId(length: number = 6): string {
    const prefix = 'BNT';
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return `${prefix}-${result}-${Date.now().toString(36).slice(-4)}`;
}
