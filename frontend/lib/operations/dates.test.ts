/** @jest-environment node */
import { longDate } from './dates';

describe('longDate', () => {
    it('names the weekday of a calendar date', () => {
        expect(longDate('2026-10-07')).toBe('Wednesday, Oct 7, 2026');
        expect(longDate('2026-10-05')).toBe('Monday, Oct 5, 2026');
    });

    it('does not depend on the machine timezone around month and year edges', () => {
        expect(longDate('2027-01-01')).toBe('Friday, Jan 1, 2027');
        expect(longDate('2028-02-29')).toBe('Tuesday, Feb 29, 2028');
    });
});
