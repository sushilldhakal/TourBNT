/**
 * Shared role groupings — mirrors the frontend's RoleGroups
 * (frontend/lib/utils/roles.ts). Kept here rather than imported across the
 * client/server boundary since the two apps don't share a runtime module.
 */

/** Roles granted via admin approval of a business application (see businessPartnerController). */
export const BUSINESS_PARTNER_ROLES = ['guide', 'hotel', 'guesthouse', 'restaurant', 'transport', 'advertiser'] as const;

/** Every role with dashboard access — admin, seller, and every business-partner type. */
export const DASHBOARD_ROLES = ['admin', 'seller', ...BUSINESS_PARTNER_ROLES] as const;
