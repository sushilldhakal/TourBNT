/** @jest-environment node */
import { canAccessDashboardPath } from './dashboardAccess';

describe('operations timeline access', () => {
    const timeline = '/dashboard/operations/timeline';

    it.each(['admin', 'seller', 'hotel', 'guesthouse', 'restaurant', 'guide', 'transport'])('lets %s open the timeline', (role) => {
        expect(canAccessDashboardPath(timeline, role)).toBe(true);
    });

    it.each(['advertiser', 'user', 'subscriber'])('keeps %s out of the timeline', (role) => {
        expect(canAccessDashboardPath(timeline, role)).toBe(false);
    });

    it('keeps the supplier follow-up board for admins and sellers only', () => {
        expect(canAccessDashboardPath('/dashboard/operations', 'seller')).toBe(true);
        expect(canAccessDashboardPath('/dashboard/operations', 'hotel')).toBe(false);
        expect(canAccessDashboardPath('/dashboard/operations', 'guide')).toBe(false);
    });
});
