const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Wednesday, Oct 7, 2026" from a YYYY-MM-DD calendar date. Pure calendar maths, so no timezone can shift it. */
export function longDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return `${weekday}, ${MONTHS[m - 1]} ${d}, ${y}`;
}
