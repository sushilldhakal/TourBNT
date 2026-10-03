import { Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { sendSuccess } from '../../utils/apiResponse';

/**
 * Role-aware dashboard home data. One endpoint, and the server decides which
 * numbers the caller may see — an admin gets platform-wide figures, a seller
 * only their own tours/bookings/reviews, a business partner only their own
 * listings (requests, inventory, reviews, ads). GET /api/v1/dashboard/summary
 */

const rows = async (q: ReturnType<typeof sql>) => Array.from(await db.execute<Record<string, unknown>>(q));
const one = async (q: ReturnType<typeof sql>) => (await rows(q))[0] ?? {};
const n = (v: unknown) => Number(v ?? 0);

async function adminSummary() {
  const [users, applications, tours, bookings, reviews, ads, requests, subscribers, recentBookings, pendingApplications] = await Promise.all([
    one(sql`select count(*)::int total, count(*) filter (where role = 'seller')::int sellers, count(*) filter (where role = 'user')::int customers,
      count(*) filter (where role in ('guide','hotel','guesthouse','restaurant','transport','advertiser'))::int partners from users`),
    one(sql`select
      (select count(*) from business_partners where approval_status = 'pending')::int partners,
      (select count(*) from users where seller_info is not null and (seller_info->>'isApproved')::boolean is not true and (seller_info->>'rejectionReason') is null)::int sellers`),
    one(sql`select count(*)::int total, count(*) filter (where tour_status = 'Published')::int published, count(*) filter (where tour_status = 'Draft')::int draft from tours`),
    one(sql`select count(*)::int total, count(*) filter (where status = 'pending')::int pending, count(*) filter (where status = 'confirmed')::int confirmed,
      coalesce(sum((pricing->>'totalPrice')::float) filter (where status <> 'cancelled'), 0) revenue, coalesce(sum(paid_amount), 0) collected,
      count(*) filter (where status in ('pending','confirmed') and departure_date >= now() and departure_date < now() + interval '30 days')::int upcoming from bookings`),
    one(sql`select count(*) filter (where status = 'pending')::int pending from reviews`),
    one(sql`select count(*) filter (where approval_status = 'pending')::int pending, count(*) filter (where campaign_status = 'active' and approval_status = 'approved')::int active from advertisements`),
    one(sql`select count(*) filter (where status in ('pending','held','countered'))::int open, count(*) filter (where status in ('declined','expired'))::int problems from itinerary_partner_requests`),
    one(sql`select count(*)::int total from subscribers`),
    rows(sql`select id, booking_reference as "reference", tour_title as "tourTitle", contact_name as "contactName", status, payment_status as "paymentStatus", departure_date as "departureDate", (pricing->>'totalPrice')::float as total
      from bookings order by created_at desc limit 5`),
    rows(sql`select * from (
      select bp.id, bp.name, bp.type::text as type, bp.submitted_at as "submittedAt" from business_partners bp where bp.approval_status = 'pending'
      union all
      select u.id, coalesce(u.seller_info->>'companyName', u.name), 'seller'::text, coalesce((u.seller_info->>'appliedAt')::timestamptz, u.created_at) from users u
        where u.seller_info is not null and (u.seller_info->>'isApproved')::boolean is not true and (u.seller_info->>'rejectionReason') is null
    ) a order by "submittedAt" desc limit 5`),
  ]);
  return {
    kind: 'admin',
    users: { total: n(users.total), sellers: n(users.sellers), customers: n(users.customers), partners: n(users.partners) },
    pendingApplications: { sellers: n(applications.sellers), partners: n(applications.partners), total: n(applications.sellers) + n(applications.partners) },
    tours: { total: n(tours.total), published: n(tours.published), draft: n(tours.draft) },
    bookings: { total: n(bookings.total), pending: n(bookings.pending), confirmed: n(bookings.confirmed), upcoming: n(bookings.upcoming), revenue: n(bookings.revenue), collected: n(bookings.collected) },
    pendingReviews: n(reviews.pending),
    ads: { pending: n(ads.pending), active: n(ads.active) },
    supplierRequests: { open: n(requests.open), problems: n(requests.problems) },
    subscribers: n(subscribers.total),
    recentBookings,
    latestApplications: pendingApplications,
  };
}

async function sellerSummary(userId: string) {
  const owned = sql`(select tour_id from tour_authors where user_id = ${userId})`;
  const [tours, bookings, reviews, enquiries, upcoming, recentBookings] = await Promise.all([
    one(sql`select count(*)::int total, count(*) filter (where tour_status = 'Published')::int published, count(*) filter (where tour_status = 'Draft')::int draft,
      count(*) filter (where tour_status = 'Archived')::int archived, coalesce(sum(views), 0)::int views from tours where id in ${owned}`),
    one(sql`select count(*)::int total, count(*) filter (where status = 'pending')::int pending, count(*) filter (where status = 'confirmed')::int confirmed,
      coalesce(sum((pricing->>'totalPrice')::float) filter (where status <> 'cancelled'), 0) revenue, coalesce(sum(paid_amount), 0) collected,
      count(*) filter (where status in ('pending','confirmed') and departure_date >= now() and departure_date < now() + interval '30 days')::int upcoming
      from bookings where tour_id in ${owned}`),
    one(sql`select count(*) filter (where status = 'pending')::int pending, count(*) filter (where status = 'approved')::int approved,
      coalesce(avg(rating) filter (where status = 'approved'), 0) average from reviews where tour_id in ${owned}`),
    one(sql`select count(*)::int open from conversations c where c.type = 'enquiry' and c.status = 'open' and c.tour_id in ${owned}`),
    rows(sql`select b.tour_id as "tourId", t.title, b.departure_date::date::text as departure, count(*)::int bookings,
      sum((b.participants->>'adults')::int + (b.participants->>'children')::int + (b.participants->>'infants')::int)::int pax
      from bookings b join tours t on t.id = b.tour_id
      where b.tour_id in ${owned} and b.status in ('pending','confirmed') and b.departure_date >= now()
      group by b.tour_id, t.title, b.departure_date::date order by b.departure_date::date asc limit 5`),
    rows(sql`select id, booking_reference as "reference", tour_title as "tourTitle", contact_name as "contactName", status, payment_status as "paymentStatus", departure_date as "departureDate", (pricing->>'totalPrice')::float as total
      from bookings where tour_id in ${owned} order by created_at desc limit 5`),
  ]);
  return {
    kind: 'seller',
    tours: { total: n(tours.total), published: n(tours.published), draft: n(tours.draft), archived: n(tours.archived), views: n(tours.views) },
    bookings: { total: n(bookings.total), pending: n(bookings.pending), confirmed: n(bookings.confirmed), upcoming: n(bookings.upcoming), revenue: n(bookings.revenue), collected: n(bookings.collected) },
    reviews: { pending: n(reviews.pending), approved: n(reviews.approved), average: Math.round(n(reviews.average) * 10) / 10 },
    openEnquiries: n(enquiries.open),
    upcomingDepartures: upcoming,
    recentBookings,
  };
}

/** Business listings the user owns, each with its own workload/inventory/reviews/ads. */
async function partnerListings(userId: string) {
  const listings = await rows(sql`select id, name, type, approval_status as "approvalStatus", rejection_reason as "rejectionReason", is_active as "isActive",
    average_rating as "averageRating", approved_review_count as "reviewCount", views, logo from business_partners where owner_id = ${userId} order by created_at asc`);

  return Promise.all(listings.map(async (l) => {
    const [req, inventory, nextRequests, reviews, ads] = await Promise.all([
      one(sql`select count(*) filter (where status = 'pending')::int pending, count(*) filter (where status = 'held')::int held, count(*) filter (where status = 'countered')::int countered,
        count(*) filter (where status = 'confirmed')::int confirmed, count(*) filter (where status = 'declined')::int declined, count(*) filter (where status = 'expired')::int expired,
        count(*) filter (where status = 'confirmed' and service_date >= current_date and service_date < current_date + 30)::int "upcomingConfirmed"
        from itinerary_partner_requests where business_partner_id = ${l.id}`),
      one(sql`select coalesce(sum(total_units), 0)::int "totalUnits", count(*)::int types,
        coalesce((select unit_label from business_partner_capacity where business_partner_id = ${l.id}), 'unit') as "unitLabel"
        from business_partner_unit_types where business_partner_id = ${l.id} and is_active`),
      rows(sql`select r.id, t.title as "tourTitle", r.role, r.service_date::text as "serviceDate", r.service_time as "serviceTime", r.units_requested as "unitsRequested", r.status,
        r.respond_by_at as "respondByAt", r.hold_expires_at as "holdExpiresAt"
        from itinerary_partner_requests r join tours t on t.id = r.tour_id
        where r.business_partner_id = ${l.id} and r.status in ('pending','held','countered') order by r.service_date asc limit 5`),
      one(sql`select count(*) filter (where status = 'pending')::int pending from business_reviews where business_partner_id = ${l.id}`),
      one(sql`select count(*)::int total, count(*) filter (where campaign_status = 'active' and approval_status = 'approved')::int active,
        count(*) filter (where approval_status = 'pending')::int pending, coalesce(sum(impression_count), 0)::int impressions, coalesce(sum(click_count), 0)::int clicks
        from advertisements where business_partner_id = ${l.id}`),
    ]);
    const impressions = n(ads.impressions);
    return {
      ...l,
      averageRating: n(l.averageRating),
      requests: { pending: n(req.pending), held: n(req.held), countered: n(req.countered), confirmed: n(req.confirmed), declined: n(req.declined), expired: n(req.expired), upcomingConfirmed: n(req.upcomingConfirmed) },
      inventory: { totalUnits: n(inventory.totalUnits), types: n(inventory.types), unitLabel: inventory.unitLabel },
      nextRequests,
      pendingReviews: n(reviews.pending),
      ads: { total: n(ads.total), active: n(ads.active), pending: n(ads.pending), impressions, clicks: n(ads.clicks), ctr: impressions ? Math.round((n(ads.clicks) / impressions) * 1000) / 10 : 0 },
    };
  }));
}

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const isAdmin = user.roles.includes('admin');
    const isSeller = user.roles.includes('seller');

    if (isAdmin) return sendSuccess(res, await adminSummary(), 'Dashboard summary retrieved successfully');

    const [seller, partners] = await Promise.all([isSeller ? sellerSummary(user.id) : null, partnerListings(user.id)]);
    if (seller) return sendSuccess(res, { ...seller, partners }, 'Dashboard summary retrieved successfully');
    return sendSuccess(res, { kind: 'partner', partners }, 'Dashboard summary retrieved successfully');
  } catch (error) {
    next(error);
  }
};
