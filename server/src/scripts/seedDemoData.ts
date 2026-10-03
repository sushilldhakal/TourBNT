/**
 * Full demo dataset for admin/seller/partner/customer testing.
 *
 *   SEED_DEMO_CONFIRM=<db host> npm run seed:demo --prefix server   # wipe previous demo rows, re-seed
 *   npm run demo:wipe --prefix server                                 # only remove demo rows
 *
 * Seeding refuses to run unless SEED_DEMO_CONFIRM equals the DATABASE_URL host, so it can't
 * be pointed at a real database by accident. Never seed production.
 *
 * Everything this script creates is tagged so it can be removed again:
 *   - users:          email ends with @demo.tourbnt.test
 *   - tours:          code starts with DEMO-
 *   - subscribers:    email ends with @demo.tourbnt.test
 *   - promo codes:    code starts with DEMO-
 * Every other row (partners, bookings, reviews, conversations, ads, ...) hangs
 * off those users/tours and is removed with them. Real users/tours are never touched.
 *
 * All demo accounts share one password (see DEMO_PASSWORD). A credentials file
 * is written to docs/demo-accounts.md.
 */
import bcrypt from 'bcrypt';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { sql, eq, inArray, type SQL } from 'drizzle-orm';
import type { PgInsertValue, PgTable } from 'drizzle-orm/pg-core';
import * as S from '../db';
import { TOUR_CATALOG, MASTER_FACTS, CANCELLATION, INSURANCE, type DiscountSpec, type DaySpec } from './seedData/tourCatalog';
import { AD_CAMPAIGNS, ADVERTISER_SPECS, type AdCampaign } from './seedData/adCatalog';
import { tourDescription, bulletDoc } from './seedData/richText';
import { processPricingOptions, processTourDatesData, processItineraryData, processFaqsData, processLocationData, processPaymentOptions, type ItineraryDayInput, type ItineraryPartnerInput } from '../api/tours/utils/dataProcessors';
import { isItineraryRole } from '../api/tours/tourTypes';
import { calculateBookingPricing } from '../api/bookings/utils/pricingCalculator';
import { getDefaultCommissionRate, splitBooking } from '../services/payouts';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

const { db } = S;
const DEMO_DOMAIN = 'demo.tourbnt.test';
const DEMO_PASSWORD = 'Demo@1234';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
let seedState = 20260930;
const rnd = () => {
  // mulberry32 — deterministic so re-runs produce the same dataset
  seedState |= 0; seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;
const shuffle = <T,>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const uuid = () => randomUUID();
const NOW = new Date();
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86400000);
const hoursFromNow = (n: number) => new Date(NOW.getTime() + n * 3600000);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const img = (seed: string, w = 1200, h = 800) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
const avatar = (i: number) => `https://i.pravatar.cc/256?img=${(i % 70) + 1}`;
const phone = () => `+977-98${int(10000000, 99999999)}`;
const richDoc = (text: string) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

/** A row as `table` accepts it on insert. */
type Insert<T extends PgTable> = T['$inferInsert'];

async function insertChunked<T extends PgTable>(table: T, rows: Array<Insert<T>>, size = 150) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as PgInsertValue<T>[]).onConflictDoNothing();
  }
}

// ---------------------------------------------------------------------------
// name pools
// ---------------------------------------------------------------------------
const FIRST = ['Aarav', 'Sita', 'Pasang', 'Maya', 'Bikash', 'Anita', 'Tenzing', 'Sunita', 'Rohan', 'Priya', 'Dawa', 'Kamala', 'Nima', 'Laxmi', 'Suresh', 'Pema', 'Ramesh', 'Gita', 'Kiran', 'Mina',
  'James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'Lucas', 'Mia', 'Ethan', 'Isabella', 'Hiroshi', 'Yuki', 'Sven', 'Ingrid', 'Pierre', 'Camille', 'Carlos', 'Lucia', 'Ahmed', 'Fatima'];
const LAST = ['Sherpa', 'Gurung', 'Thapa', 'Shrestha', 'Tamang', 'Rai', 'Magar', 'Adhikari', 'Basnet', 'Karki', 'Smith', 'Johnson', 'Brown', 'Taylor', 'Wilson', 'Anderson', 'Tanaka', 'Muller', 'Dubois', 'Garcia', 'Khan', 'Lee', 'Patel', 'Novak', 'Rossi'];
const COUNTRIES = ['Nepal', 'India', 'United States', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'Canada', 'Netherlands', 'Spain', 'Singapore'];
const personName = (i: number) => `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length]}`;

const SELLER_COMPANIES = [
  'Alpine Horizons Treks', 'Everest Summit Expeditions', 'Annapurna Trail Makers', 'Nepal Wild Safari Co.', 'Kathmandu Heritage Tours',
  'Pokhara Adventure Hub', 'Himal Explorers', 'Yeti Trails & Travel', 'Sacred Valley Journeys', 'Lumbini Pilgrim Tours',
  // pending applicants
  'Mardi Peak Adventures', 'Langtang Legends', 'Mustang Gate Treks', 'Terai Jungle Escapes', 'Rara Lake Expeditions', 'Gosainkunda Guides', 'Kanchenjunga Quest',
  // rejected applicants
  'Quick Buck Tours', 'Fly By Night Travel', 'Unverified Trekking Pvt.',
];

const HOTEL_A = ['Himalayan', 'Lakeside', 'Royal', 'Annapurna', 'Kathmandu', 'Sherpa', 'Everest', 'Pokhara', 'Temple', 'Mountain', 'Heritage', 'Garden', 'Valley', 'Cloud', 'Sunrise', 'Golden', 'Lotus', 'Yeti', 'Buddha', 'Serene', 'Peaceful', 'Jade', 'Snowview', 'Riverside', 'Orchid', 'Pagoda'];
const HOTEL_B = ['Grand Hotel', 'Palace Hotel', 'Boutique Hotel', 'Resort & Spa', 'Mountain Lodge', 'Residency', 'Inn & Suites', 'Retreat'];
const GUESTHOUSE_A = ['Namaste', 'Tashi', 'Dragon', 'Friendship', 'Green Leaf', 'Peace', 'Mount View', 'Blue Sheep', 'Rhododendron', 'Lakeview'];
const RESTAURANTS: Array<[string, string[]]> = [
  ['Newari Kitchen', ['Newari']], ['Thakali Bhansa Ghar', ['Thakali', 'Nepali']], ['Momo Hub', ['Momo', 'Tibetan']], ['Dal Bhat Power', ['Nepali']], ['Lakeside Grill', ['Continental', 'BBQ']],
  ['Himalayan Java Cafe', ['Cafe', 'Bakery']], ['Sherpa Stew House', ['Sherpa', 'Nepali']], ['Tandoori Nights', ['Indian']], ['Bhaktapur Juju Dhau Corner', ['Newari', 'Desserts']], ['Pizza Everest', ['Italian']],
  ['Yak & Yeti Diner', ['Continental', 'Nepali']], ['Garden of Dreams Bistro', ['Continental']], ['Sakura Sushi Pokhara', ['Japanese']], ['Tibetan Kitchen', ['Tibetan']], ['Rooftop Thakali', ['Thakali']],
  ['Spice Route', ['Indian', 'Nepali']], ['Chitwan Jungle Kitchen', ['Nepali', 'Tharu']], ['Mountain Bakery & Cafe', ['Bakery']], ['Sunrise Breakfast Club', ['Breakfast']], ['Green Organic Cafe', ['Vegan', 'Organic']],
  ['Kebab Corner', ['Middle Eastern']], ['Noodle Bar Thamel', ['Chinese', 'Noodles']], ['Fish Tail Lakeside', ['Seafood', 'Nepali']], ['Annapurna View Dining', ['Nepali', 'Continental']], ['Temple Tiger Restaurant', ['Nepali']],
  ['Khukuri Steakhouse', ['Steak', 'Continental']], ['Bamboo Garden', ['Thai', 'Chinese']], ['Patan Durbar Cafe', ['Newari', 'Cafe']], ['Lumbini Monastery Kitchen', ['Vegetarian']], ['Bardia Safari Mess', ['Nepali']],
  ['Nagarkot Sunrise Dining', ['Nepali', 'Continental']], ['Mustang Apple Cafe', ['Cafe', 'Bakery']], ['Langtang Yak Cheese House', ['Sherpa', 'Dairy']], ['Gorkha Spice Hut', ['Nepali']], ['Basantapur Chiya Ghar', ['Tea', 'Snacks']],
  ['Olive Terrace', ['Mediterranean']], ['Hungry Sherpa', ['Nepali', 'Continental']],
];
const GUIDE_NAMES = ['Pasang Sherpa', 'Tenzing Gurung', 'Dawa Tamang', 'Nima Lama', 'Bikash Thapa', 'Kiran Rai', 'Anita Magar', 'Sunita Shrestha', 'Ramesh Karki', 'Pema Sherpa', 'Suresh Basnet', 'Maya Gurung', 'Lhakpa Sherpa', 'Mingma Tamang', 'Sonam Bhutia',
  'Ang Dorje', 'Rita Adhikari', 'Gopal Poudel', 'Kabita Rai', 'Tashi Wangdi', 'Binod Khadka'];
const TRANSPORT_NAMES = ['Himalayan Express Transport', 'Kathmandu Airport Shuttle', 'Pokhara Tourist Coaches', 'Sherpa 4x4 Rentals', 'Yeti Mountain Flights Agency', 'Lumbini Link Bus Service', 'Everest Cab Services', 'Valley Van Hire', 'Annapurna Jeep Safari Co.', 'Terai Travels & Transport',
  'Nepal Rapid Shuttle', 'Mountain Wheels Rental', 'Express Bus Nepal', 'Midnight Cabs'];

// ---------------------------------------------------------------------------
// reference data
// ---------------------------------------------------------------------------
const DEST_SPECS = [
  { name: 'Pokhara', city: 'Pokhara', region: 'Gandaki', lat: 28.2096, lng: 83.9856, desc: 'Lakeside city beneath the Annapurna range — paragliding, boating and mountain views.' },
  { name: 'Annapurna Region', city: 'Ghandruk', region: 'Gandaki', lat: 28.3949, lng: 83.8189, desc: 'Home of the Annapurna Circuit, Poon Hill and Annapurna Base Camp treks.' },
  { name: 'Lumbini', city: 'Lumbini', region: 'Lumbini', lat: 27.4833, lng: 83.2763, desc: 'The birthplace of Lord Buddha — a UNESCO World Heritage pilgrimage site.' },
  { name: 'Langtang Valley', city: 'Syabrubesi', region: 'Bagmati', lat: 28.2139, lng: 85.5189, desc: 'Glacial valley close to Kathmandu, known for yak pastures and Tamang culture.' },
  { name: 'Upper Mustang', city: 'Lo Manthang', region: 'Gandaki', lat: 29.1833, lng: 83.9667, desc: 'The hidden Kingdom of Lo — a high-desert Tibetan-style walled city.' },
  { name: 'Bardia National Park', city: 'Thakurdwara', region: 'Lumbini', lat: 28.3833, lng: 81.5, desc: 'Nepal’s largest lowland park, the best place for Bengal tiger sightings.' },
  { name: 'Nagarkot', city: 'Nagarkot', region: 'Bagmati', lat: 27.7172, lng: 85.5203, desc: 'Hill station with sweeping sunrise views of the Himalayan panorama.' },
  { name: 'Bandipur', city: 'Bandipur', region: 'Gandaki', lat: 27.9333, lng: 84.4167, desc: 'A preserved Newari hill town with quiet streets and cave walks.' },
];
const CAT_SPECS = [
  { name: 'Adventure Sports', desc: 'Paragliding, bungee, zip-lining and other adrenaline activities.' },
  { name: 'Spiritual & Yoga', desc: 'Retreats, meditation, and pilgrimage tours.' },
  { name: 'Photography Tours', desc: 'Guided photo walks and sunrise/sunset shoots.' },
  { name: 'Family Holidays', desc: 'Relaxed itineraries designed for travelling with children.' },
  { name: 'Luxury Escapes', desc: 'Premium lodges, private guides and helicopter tours.' },
  { name: 'Rafting & Water Sports', desc: 'White-water rafting, kayaking and canoe trips.' },
];

const REVIEW_TEXTS: Record<number, string[]> = {
  5: ['Absolutely incredible — our guide was knowledgeable and the views were beyond what I imagined. Highly recommend!', 'Best trip of my life. The team took great care of us and the pacing was perfect.', 'Flawless organisation from pickup to drop-off. Would book again in a heartbeat.', 'Everything was exactly as described. Friendly staff, great food, unforgettable scenery.'],
  4: ['Great trip overall and well organised. Food was good and the rooms were comfortable for the price.', 'Loved it. Only small complaint: one morning start was later than promised.', 'Very good value. The guide was excellent, transport could have been a bit newer.'],
  3: ['Decent experience. Itinerary was fine but the group size felt larger than advertised.', 'Good scenery, average logistics. Communication before the trip could be better.'],
  2: ['Not quite what we expected — a few itinerary changes were made without notice.', 'Guide was nice but the accommodation was below the standard described.'],
  1: ['Very disappointed. Pickup was late and we missed the first activity.'],
};

const CONTENT_INCLUDE = ['Airport/hotel transfers', 'Accommodation as per itinerary', 'Meals as mentioned', 'Licensed English-speaking guide', 'All permits and entry fees'];
const CONTENT_EXCLUDE = ['International airfare', 'Nepal visa fees', 'Travel insurance', 'Personal expenses and tips', 'Alcoholic beverages'];

// ---------------------------------------------------------------------------
// wipe
// ---------------------------------------------------------------------------
async function wipe() {
  console.log('Removing previous demo rows…');
  const demoUsers = sql`(select id from users where email like ${'%@' + DEMO_DOMAIN})`;
  const demoTours = sql`(select id from tours where code like 'DEMO-%')`;
  const run = (q: SQL) => db.execute(q);

  await run(sql`delete from review_replies where user_id in ${demoUsers} or review_id in (select id from reviews where tour_id in ${demoTours} or user_id in ${demoUsers})`);
  await run(sql`delete from business_review_replies where user_id in ${demoUsers}`);
  await run(sql`delete from comments where user_id in ${demoUsers} or post_id in (select id from posts where author_id in ${demoUsers})`);
  await run(sql`delete from reviews where tour_id in ${demoTours} or user_id in ${demoUsers}`);
  await run(sql`delete from business_reviews where user_id in ${demoUsers}`);
  await run(sql`delete from bookings where tour_id in ${demoTours} or user_id in ${demoUsers}`);
  // payouts reference their seller with ON DELETE RESTRICT, so they must go before the demo sellers do
  await run(sql`delete from payouts where seller_id in ${demoUsers}`);
  await run(sql`delete from promo_codes where code like 'DEMO-%' or owner_id in ${demoUsers}`);
  await run(sql`delete from newsletters where sent_by in ${demoUsers}`);
  await run(sql`delete from tours where code like 'DEMO-%'`);
  await run(sql`delete from posts where author_id in ${demoUsers}`);
  await run(sql`delete from conversations where from_user_id in ${demoUsers} or assigned_to in ${demoUsers} or guest_email like ${'%@' + DEMO_DOMAIN}
    or id in (select conversation_id from conversation_participants where user_id in ${demoUsers})`);
  await run(sql`delete from subscribers where email like ${'%@' + DEMO_DOMAIN}`);
  await run(sql`delete from notifications where recipient_id in ${demoUsers} or sender_id in ${demoUsers}`);
  await run(sql`delete from users where email like ${'%@' + DEMO_DOMAIN}`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
type Acct = { id: string; name: string; email: string; role: string; group: string; note: string };
const accounts: Acct[] = [];

async function seed() {
  const wipeOnly = process.argv.includes('--wipe');
  const dbHost = (() => { try { return new URL(process.env.DATABASE_URL ?? '').hostname; } catch { return ''; } })();
  console.log('Database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));

  // Seeding writes hundreds of fake users, tours, businesses and LIVE-looking ads with fake
  // links. It must never hit a real site by accident, so it only runs when you name the exact
  // database host you mean. Wiping (removing demo rows only) needs no confirmation.
  if (!wipeOnly && process.env.SEED_DEMO_CONFIRM !== dbHost) {
    console.error(
      `\nRefusing to seed demo data into ${dbHost || '(DATABASE_URL not set)'}.\n` +
      `This creates fake users, tours, businesses and ads. Never run it against production.\n` +
      `If this really is a throwaway/dev database, run:\n\n  SEED_DEMO_CONFIRM=${dbHost} npm run seed:demo\n`
    );
    process.exit(1);
  }

  await wipe();
  if (wipeOnly) { console.log('Demo data removed. Real users, tours and businesses were not touched.'); return; }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [admin] = await db.select().from(S.users).where(eq(S.users.role, 'admin')).limit(1);
  if (!admin) throw new Error('No admin user exists — run `npm run create-admin` first.');
  console.log('Admin reference:', admin.email);

  // ------------------------------ users ------------------------------
  const userRows: Array<Insert<typeof S.users>> = [];
  let avatarCounter = 1;
  const mkUser = (o: { email: string; name: string; role: Insert<typeof S.users>['role']; group: string; note?: string; verified?: boolean; sellerInfo?: Record<string, unknown>; createdDaysAgo?: number; mediaFolder?: string }) => {
    const id = uuid();
    const created = daysFromNow(-(o.createdDaysAgo ?? int(5, 240)));
    userRows.push({
      id, name: o.name, email: `${o.email}@${DEMO_DOMAIN}`, password: passwordHash, role: o.role, avatar: avatar(avatarCounter++),
      phone: phone(), verified: o.verified ?? true, mediaFolder: o.mediaFolder ?? null, sellerInfo: o.sellerInfo ?? null, createdAt: created, updatedAt: created,
    });
    accounts.push({ id, name: o.name, email: `${o.email}@${DEMO_DOMAIN}`, role: o.role ?? 'user', group: o.group, note: o.note ?? '' });
    return { id, name: o.name, email: `${o.email}@${DEMO_DOMAIN}`, created };
  };

  // extra admins
  const adminUsers = [1, 2].map((n) => mkUser({ email: `admin${pad(n)}`, name: n === 1 ? 'Demo Admin One' : 'Demo Support Admin', role: 'admin', group: 'Admin', note: 'Full admin access' }));

  const sellerInfoFor = (company: string, i: number, status: 'approved' | 'pending' | 'rejected', city: string) => ({
    companyName: company,
    companyRegistrationNumber: `REG-${int(100000, 999999)}`,
    companyType: pick(['Private Limited', 'Partnership', 'Sole Proprietor']),
    registrationDate: isoDate(daysFromNow(-int(400, 3000))),
    taxId: `PAN-${int(100000000, 999999999)}`,
    website: `https://${slugify(company)}.example.com`,
    businessAddress: { address: `${int(1, 99)} ${pick(['Lakeside Rd', 'Thamel Marg', 'Durbar Marg', 'Jyatha Chowk', 'Baneshwor Path'])}`, city, state: 'Bagmati', postalCode: `${int(44000, 44999)}`, country: 'Nepal' },
    bankDetails: { bankName: pick(['Nabil Bank', 'Global IME Bank', 'Nepal Investment Mega Bank', 'Standard Chartered Nepal']), accountNumber: `${int(10000000, 99999999)}${int(1000, 9999)}`, accountHolderName: company, branchCode: `BR-${int(100, 999)}` },
    businessDescription: `${company} is a licensed Nepal operator running guided tours, treks and cultural experiences with ${int(3, 20)} years of experience.`,
    sellerType: pick(['tour_operator', 'travel_agency', 'trekking_agency']),
    isApproved: status === 'approved',
    appliedAt: daysFromNow(-int(10, 120)),
    ...(status === 'approved' ? { approvedAt: daysFromNow(-int(1, 9)) } : {}),
    ...(status === 'rejected' ? { rejectionReason: pick(['Business registration document is unreadable.', 'Tax ID could not be verified.', 'Incomplete company information — please reapply with a valid licence.']), rejectedAt: daysFromNow(-int(1, 20)), reapplicationCount: int(0, 2) } : {}),
    documents: [{ type: 'business_license', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }, { type: 'tax_certificate', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }],
    contactPerson: personName(i + 3),
    phone: phone(),
  });

  // 10 approved sellers
  const sellers = SELLER_COMPANIES.slice(0, 10).map((company, i) => {
    const u = mkUser({ email: `seller${pad(i + 1)}`, name: personName(i), role: 'seller', group: 'Sellers', note: company, mediaFolder: `${slugify(company)}-demo`, sellerInfo: sellerInfoFor(company, i, 'approved', pick(['Kathmandu', 'Pokhara'])) });
    return { ...u, company };
  });
  // pending + rejected seller applicants (role stays 'user' until admin approves)
  // Applicants: created for their accounts only (nothing else refers to them).
  SELLER_COMPANIES.slice(10, 17).forEach((company, i) => mkUser({ email: `pending.seller${pad(i + 1)}`, name: personName(i + 11), role: 'user', group: 'Applicants – Sellers (pending)', note: company, sellerInfo: sellerInfoFor(company, i, 'pending', pick(['Kathmandu', 'Pokhara', 'Bhaktapur'])) }));
  SELLER_COMPANIES.slice(17, 20).forEach((company, i) => mkUser({ email: `rejected.seller${pad(i + 1)}`, name: personName(i + 18), role: 'user', group: 'Applicants – Sellers (rejected)', note: company, sellerInfo: sellerInfoFor(company, i, 'rejected', 'Kathmandu') }));

  // customers: signed up through the site, wanting to book tours
  const customers = Array.from({ length: 60 }, (_, i) =>
    mkUser({ email: `customer${pad(i + 1)}`, name: personName(i + 20), role: 'user', group: 'Customers', verified: i % 9 !== 0, note: i % 9 === 0 ? 'Email not verified yet' : '' }));

  // ---------------------------------------------------------------------
  // business partners — owners + listings
  // ---------------------------------------------------------------------
  // pre-fetch reference data: destinations + categories (create what's missing)
  // Destination names have no unique constraint, so only add the ones that don't exist yet —
  // otherwise every re-run duplicated them (three "Pokhara"s, ...).
  const existingDestNames = new Set((await db.select({ name: S.globalDestinations.name }).from(S.globalDestinations)).map((d) => d.name));
  await insertChunked(S.globalDestinations, DEST_SPECS.filter((d) => !existingDestNames.has(d.name)).map((d) => ({
    name: d.name, description: d.desc, coverImage: img(`dest-${d.name}`), country: 'Nepal', region: d.region, city: d.city, latitude: d.lat, longitude: d.lng,
    isActive: true, isApproved: true, approvalStatus: 'approved', createdBy: admin.id, approvedBy: admin.id, approvedAt: new Date(), popularity: int(30, 95),
    metadata: { timezone: 'Asia/Kathmandu', currency: 'NPR', bestTimeToVisit: ['Mar-May', 'Oct-Nov'] },
  })));
  await insertChunked(S.globalCategories, CAT_SPECS.map((c) => ({
    name: c.name, description: c.desc, imageUrl: img(`cat-${c.name}`, 800, 600), slug: slugify(c.name), isApproved: true, approvalStatus: 'approved',
    createdBy: admin.id, approvedBy: admin.id, approvedAt: new Date(), popularity: int(30, 95), metadata: { keywords: slugify(c.name).split('-') },
  })));
  const allDests = await db.select().from(S.globalDestinations).where(eq(S.globalDestinations.approvalStatus, 'approved'));
  const allCats = await db.select().from(S.globalCategories).where(eq(S.globalCategories.approvalStatus, 'approved'));
  const destByName = new Map(allDests.map((d) => [d.name, d]));
  const catByName = new Map(allCats.map((c) => [c.name, c]));
  const partnerDests = allDests.filter((d) => ['Kathmandu Valley', 'Pokhara', 'Annapurna Region', 'Lumbini', 'Chitwan National Park', 'Nagarkot', 'Everest Region', 'Bardia National Park', 'Langtang Valley', 'Bandipur', 'Upper Mustang'].includes(d.name));

  interface Partner { id: string; ownerId: string; ownerEmail: string; type: string; name: string; destId: string; status: 'approved' | 'pending' | 'rejected'; slug: string }
  const partners: Partner[] = [];
  const partnerRows: Array<Insert<typeof S.businessPartners>> = [];
  const docRows: Array<Insert<typeof S.businessDocuments>> = [];
  const DOC_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  const detailsFor = (type: string, i: number, extra?: Record<string, unknown>): Record<string, unknown> => {
    switch (type) {
      case 'hotel': return { starRating: int(3, 5), roomCount: int(20, 120), amenities: shuffle(['WiFi', 'Breakfast', 'Airport pickup', 'Spa', 'Restaurant', 'Rooftop bar', 'Gym', 'Laundry']).slice(0, 5), checkInTime: '14:00', checkOutTime: '11:00', priceFromUSD: int(35, 220) };
      case 'guesthouse': return { roomCount: int(6, 20), amenities: shuffle(['WiFi', 'Hot shower', 'Garden', 'Breakfast', 'Laundry', 'Trekking info desk']).slice(0, 4), breakfastIncluded: chance(0.6), priceFromUSD: int(12, 40) };
      case 'restaurant': return { cuisine: extra?.cuisine ?? ['Nepali'], seatingCapacity: int(30, 160), priceRange: pick(['$', '$$', '$$$']), openingHours: '07:00-22:00', acceptsGroups: chance(0.8) };
      case 'guide': return { languages: shuffle(['English', 'Nepali', 'Hindi', 'Japanese', 'German', 'French', 'Spanish']).slice(0, int(2, 4)), certifications: ['NMA Trekking Guide Licence', 'Wilderness First Aid'], yearsOfExperience: int(3, 25), licenseNumber: `NTB-${int(10000, 99999)}`, specialties: shuffle(['Everest region', 'Annapurna', 'Cultural tours', 'Wildlife', 'Photography']).slice(0, 2), dailyRateUSD: int(30, 90) };
      case 'transport': return { vehicleTypes: ['Tourist Bus', 'Hiace Van', 'SUV 4x4'], fleetSize: int(8, 60), licenseNumber: `TRN-${int(10000, 99999)}`, airportPickup: true };
      default: return { industry: extra?.industry ?? 'Travel & Outdoors', companyRegistration: `AD-${int(10000, 99999)}`, monthlyBudgetUSD: int(200, 3000) };
    }
  };

  const descFor = (type: string, name: string, city: string) => ({
    hotel: `${name} offers comfortable rooms, attentive service and easy access to the main sights of ${city}. A favourite with trekking groups and families.`,
    guesthouse: `${name} is a friendly family-run guest house in ${city} with clean rooms, home-cooked breakfast and plenty of local tips.`,
    restaurant: `${name} serves freshly cooked dishes in a relaxed setting in ${city}. Group bookings and vegetarian options available.`,
    guide: `${name} is a government-licensed guide in ${city} with years of experience leading small groups safely and respectfully.`,
    transport: `${name} provides reliable tourist transport in and around ${city} — airport transfers, private vehicles and long-distance coaches.`,
    advertiser: `${name} promotes products and services to travellers exploring Nepal, with campaigns across TourBNT tour and search pages.`,
  } as Record<string, string>)[type];

  // A business named after a place belongs there ("Pokhara Palace Hotel" is not in Chitwan); the rest are spread evenly.
  const NAME_REGION: Array<[string, string]> = [['kathmandu', 'Kathmandu Valley'], ['patan', 'Kathmandu Valley'], ['bhaktapur', 'Kathmandu Valley'], ['thamel', 'Kathmandu Valley'], ['pokhara', 'Pokhara'], ['lakeside', 'Pokhara'], ['annapurna', 'Annapurna Region'], ['lumbini', 'Lumbini'], ['buddha', 'Lumbini'], ['chitwan', 'Chitwan National Park'], ['bardia', 'Bardia National Park'], ['nagarkot', 'Nagarkot'], ['everest', 'Everest Region'], ['langtang', 'Langtang Valley'], ['mustang', 'Upper Mustang'], ['bandipur', 'Bandipur']];
  const regionOfName = (name: string): string | null => { const n = name.toLowerCase(); return NAME_REGION.find(([k]) => n.includes(k))?.[1] ?? null; };

  const makePartners = (
    type: 'hotel' | 'guesthouse' | 'restaurant' | 'guide' | 'transport' | 'advertiser',
    names: Array<{ name: string; extra?: Record<string, unknown>; destName?: string; description?: string }>,
    counts: { approved: number; pending: number; rejected: number },
    groupLabel: string,
  ) => {
    let rotation = 0;
    names.forEach((n, i) => {
      const status: 'approved' | 'pending' | 'rejected' = i < counts.approved ? 'approved' : i < counts.approved + counts.pending ? 'pending' : 'rejected';
      const idx = status === 'approved' ? i : status === 'pending' ? i - counts.approved : i - counts.approved - counts.pending;
      const prefix = status === 'approved' ? '' : `${status}.`;
      const dest = destByName.get(n.destName ?? regionOfName(n.name) ?? '') || partnerDests[(rotation++ + type.length) % partnerDests.length];
      const ownerName = type === 'guide' ? n.name.replace(/ Guiding Services$/, '') : personName(i + type.length * 13);
      const owner = mkUser({
        email: `${prefix}${type}${pad(idx + 1)}`, name: ownerName, role: status === 'approved' ? type : 'user',
        group: status === 'approved' ? groupLabel : `Applicants – ${groupLabel} (${status})`, note: n.name,
      });
      const id = uuid();
      const slug = `${slugify(n.name)}-demo`;
      const submitted = daysFromNow(-int(status === 'approved' ? 20 : 1, status === 'approved' ? 200 : 25));
      partnerRows.push({
        id, ownerId: owner.id, type, name: n.name, slug, description: n.description ?? descFor(type, n.name, dest.city ?? dest.name),
        logo: img(`logo-${slug}`, 256, 256), coverImage: img(`cover-${slug}`), email: `info.${slug}@${DEMO_DOMAIN}`, phone: phone(), website: `https://${slug}.example.com`,
        address: { address: `${int(1, 120)} ${pick(['Main Street', 'Lakeside Road', 'Temple Road', 'Bazaar Lane'])}`, city: dest.city ?? dest.name, state: dest.region ?? undefined, postalCode: `${int(33000, 44999)}`, country: 'Nepal' },
        destinationId: dest.id, details: detailsFor(type, i, n.extra),
        isApproved: status === 'approved', approvalStatus: status,
        approvedBy: status === 'approved' ? admin.id : null, approvedAt: status === 'approved' ? new Date(submitted.getTime() + 86400000) : null,
        rejectedBy: status === 'rejected' ? admin.id : null, rejectedAt: status === 'rejected' ? daysFromNow(-int(1, 10)) : null,
        rejectionReason: status === 'rejected' ? pick(['Licence document expired.', 'Could not verify business address.', 'Photos submitted do not match the listing.']) : null,
        submittedAt: submitted, isActive: true, views: status === 'approved' ? int(20, 3000) : 0, createdAt: submitted, updatedAt: submitted,
      });
      partners.push({ id, ownerId: owner.id, ownerEmail: owner.email, type, name: n.name, destId: dest.id, status, slug });
      const docTypes = type === 'guide' ? ['guide_licence', 'id_proof'] : ['business_license', 'tax_certificate', 'id_proof'];
      docTypes.forEach((dt) => docRows.push({ id: uuid(), businessPartnerId: id, docType: dt, url: DOC_URL, publicId: `demo/${slug}/${dt}`, originalFilename: `${dt}.pdf` }));
    });
  };

  makePartners('hotel', Array.from({ length: 26 }, (_, i) => ({ name: `${HOTEL_A[i]} ${HOTEL_B[i % HOTEL_B.length]}` })), { approved: 20, pending: 4, rejected: 2 }, 'Hotels');
  // Trail teahouses sit where the treks do; tours pick the guesthouse in the village they sleep in.
  const GUESTHOUSE_DESTS = ['Annapurna Region', 'Annapurna Region', 'Langtang Valley', 'Upper Mustang', 'Everest Region', 'Pokhara', 'Nagarkot', 'Bandipur', 'Annapurna Region', 'Langtang Valley'];
  makePartners('guesthouse', GUESTHOUSE_A.map((a, gi) => ({ name: `${a} Guest House`, destName: GUESTHOUSE_DESTS[gi] })), { approved: 6, pending: 2, rejected: 2 }, 'Guesthouses');
  makePartners('restaurant', RESTAURANTS.map(([name, cuisine]) => ({ name, extra: { cuisine } })), { approved: 30, pending: 5, rejected: 2 }, 'Restaurants');
  makePartners('guide', GUIDE_NAMES.map((g) => ({ name: `${g} Guiding Services` })), { approved: 15, pending: 4, rejected: 2 }, 'Guides');
  const TRANSPORT_DESTS = ['Kathmandu Valley', 'Kathmandu Valley', 'Pokhara', 'Upper Mustang', 'Everest Region', 'Lumbini', 'Kathmandu Valley', 'Chitwan National Park', 'Annapurna Region', 'Bardia National Park', 'Kathmandu Valley', 'Pokhara', 'Kathmandu Valley', 'Kathmandu Valley'];
  makePartners('transport', TRANSPORT_NAMES.map((name, ti) => ({ name, destName: TRANSPORT_DESTS[ti] })), { approved: 10, pending: 3, rejected: 1 }, 'Transport');
  makePartners('advertiser', ADVERTISER_SPECS.map((a) => ({ name: a.name, destName: a.home, description: a.description, extra: { industry: a.industry } })), { approved: 10, pending: 3, rejected: 1 }, 'Advertisers');

  // ---- persist users, then partners (FK order) ----
  await insertChunked(S.users, userRows, 100);
  await insertChunked(S.businessPartners, partnerRows, 50);
  await insertChunked(S.businessDocuments, docRows, 150);
  console.log(`✅ Users: ${userRows.length}   Business partners: ${partnerRows.length}`);

  const approvedPartners = partners.filter((p) => p.status === 'approved');
  const byType = (t: string) => approvedPartners.filter((p) => p.type === t);

  // seller docs / directory targeting
  await insertChunked(S.businessPartnerCategories, approvedPartners.flatMap((p) => shuffle(allCats).slice(0, 2).map((c) => ({ businessPartnerId: p.id, categoryId: c.id }))));
  // Listed in its own town plus the nearest neighbouring destination — a business serves the area around it, and a
  // random second place made e.g. a Pokhara spa show up in Langtang.
  const nearestOther = (destId: string): string => {
    const me = allDests.find((d) => d.id === destId);
    const others = partnerDests.filter((d) => d.id !== destId && d.latitude != null && d.longitude != null);
    if (!me || me.latitude == null || me.longitude == null || others.length === 0) return destId;
    const dist = (d: { latitude: number | null; longitude: number | null }) => Math.hypot(d.latitude! - me.latitude!, (d.longitude! - me.longitude!) * Math.cos((me.latitude! * Math.PI) / 180));
    return others.reduce((best, d) => (dist(d) < dist(best) ? d : best)).id;
  };
  await insertChunked(S.businessPartnerDestinations, approvedPartners.flatMap((p) => [p.destId, nearestOther(p.destId)].filter((v, i, arr) => arr.indexOf(v) === i).map((d) => ({ businessPartnerId: p.id, destinationId: d }))));

  // ---- capacity, unit types, blocks, overrides, guide availability ----
  const capRows: Array<Insert<typeof S.businessPartnerCapacity>> = [], unitTypeRows: Array<Insert<typeof S.businessPartnerUnitTypes>> = [], blockRows: Array<Insert<typeof S.businessPartnerUnitTypeBlocks>> = [], overrideRows: Array<Insert<typeof S.businessPartnerCapacityOverrides>> = [], availRows: Array<Insert<typeof S.businessPartnerAvailabilityBlocks>> = [];
  const unitTypesByPartner = new Map<string, Array<{ id: string; name: string; totalUnits: number }>>();
  for (const p of approvedPartners) {
    if (p.type === 'advertiser') continue;
    const label = ({ hotel: 'room', guesthouse: 'room', restaurant: 'seat', guide: 'slot', transport: 'vehicle' } as Record<string, string>)[p.type];
    const types: Array<{ name: string; total: number; time?: string; desc?: string }> =
      p.type === 'hotel' ? [{ name: 'Standard Room', total: int(15, 50) }, { name: 'Deluxe Room', total: int(8, 30) }, { name: 'Suite', total: int(2, 10) }] :
      p.type === 'guesthouse' ? [{ name: 'Twin Room', total: int(4, 10) }, { name: 'Dormitory Bed', total: int(6, 16) }] :
      p.type === 'restaurant' ? [{ name: 'Lunch', total: int(30, 90), time: '12:30' }, { name: 'Dinner', total: int(40, 120), time: '19:00' }] :
      p.type === 'transport' ? [{ name: 'Tourist Bus (45 seats)', total: int(2, 8) }, { name: 'Hiace Van (12 seats)', total: int(4, 15) }, { name: 'SUV 4x4', total: int(3, 12) }] : [];
    const total = types.reduce((s, t) => s + t.total, 0) || 1;
    capRows.push({ businessPartnerId: p.id, unitLabel: label, defaultDailyCapacity: p.type === 'guide' ? 1 : total });
    const list: Array<{ id: string; name: string; totalUnits: number }> = [];
    types.forEach((t, si) => {
      const id = uuid();
      unitTypeRows.push({ id, businessPartnerId: p.id, name: t.name, totalUnits: t.total, description: t.desc ?? null, defaultTime: t.time ?? null, sortOrder: si, isActive: true });
      list.push({ id, name: t.name, totalUnits: t.total });
      for (let k = 0; k < 3; k++) blockRows.push({ id: uuid(), unitTypeId: id, date: isoDate(daysFromNow(int(3, 90))), channel: pick(['direct', 'private', 'other', 'maintenance']), blockedCount: Math.max(1, Math.floor(t.total * (0.1 + rnd() * 0.4))), notes: pick(['Walk-in bookings', 'Private event', 'Repairs', null]) });
    });
    unitTypesByPartner.set(p.id, list);
    for (let k = 0; k < 2; k++) overrideRows.push({ id: uuid(), businessPartnerId: p.id, date: isoDate(daysFromNow(int(5, 120) + k * 1000)), capacity: int(0, Math.max(1, Math.floor(total / 2))) });
    if (p.type === 'guide') for (let k = 0; k < 3; k++) availRows.push({ id: uuid(), businessPartnerId: p.id, date: isoDate(daysFromNow(int(2, 100) + k * 7)), startTime: '09:00', endTime: pick(['13:00', '17:00', '18:00']), reason: pick(['Personal leave', 'Another client', 'Medical appointment']) });
  }
  // dedupe unique (partner,date)/(unit,date,channel) collisions silently handled by onConflictDoNothing
  await insertChunked(S.businessPartnerCapacity, capRows);
  await insertChunked(S.businessPartnerUnitTypes, unitTypeRows);
  await insertChunked(S.businessPartnerUnitTypeBlocks, blockRows);
  await insertChunked(S.businessPartnerCapacityOverrides, overrideRows);
  await insertChunked(S.businessPartnerAvailabilityBlocks, availRows);
  console.log('✅ Capacity / unit types / blocks');

  // ---------------------------------------------------------------------
  // seller extras: facts, faqs, preferences, presets, media, settings
  // ---------------------------------------------------------------------
  const factRows: Array<Insert<typeof S.facts>> = [], faqRows: Array<Insert<typeof S.faqs>> = [];
  const sellerFacts = new Map<string, Array<Insert<typeof S.facts>>>(), sellerFaqs = new Map<string, Array<Insert<typeof S.faqs>>>();
  sellers.forEach((s) => {
    // The full master fact list — tours pick their own value for each (see seedData/tourCatalog.ts).
    const f = MASTER_FACTS.map((m) => ({ id: uuid(), userId: s.id, name: m.name, fieldType: m.fieldType, value: m.options, icon: m.icon }));
    const q = [
      { id: uuid(), userId: s.id, question: CANCELLATION.q, answer: CANCELLATION.a },
      { id: uuid(), userId: s.id, question: INSURANCE.q, answer: INSURANCE.a },
      { id: uuid(), userId: s.id, question: 'Do I need to be very fit?', answer: 'A moderate fitness level is recommended for treks. Regular cardio for a few weeks before departure helps.' },
      { id: uuid(), userId: s.id, question: 'Are permits included?', answer: 'Where a permit is required, it is arranged and included in the price unless the tour page says otherwise.' },
    ];
    factRows.push(...f); faqRows.push(...q); sellerFacts.set(s.id, f); sellerFaqs.set(s.id, q);
  });
  await insertChunked(S.facts, factRows); await insertChunked(S.faqs, faqRows);

  await insertChunked(S.sellerSettings, sellers.map((s) => ({ sellerId: s.id, categorySettings: { autoAcceptNewCategories: true, defaultVisibility: true, hideEmptyCategories: false }, destinationSettings: { autoAcceptNewDestinations: true, defaultVisibility: true, groupByCountry: false, showPopularFirst: true } })));
  await insertChunked(S.sellerCategoryPreferences, sellers.flatMap((s) => shuffle(allCats).slice(0, 4).map((c, i) => ({ sellerId: s.id, categoryId: c.id, isFavorite: i === 0, sortOrder: i, lastUsed: daysFromNow(-int(1, 30)) }))));
  await insertChunked(S.sellerDestinationPreferences, sellers.flatMap((s) => shuffle(allDests).slice(0, 4).map((d, i) => ({ sellerId: s.id, destinationId: d.id, isFavorite: i === 0, sortOrder: i, lastUsed: daysFromNow(-int(1, 30)) }))));
  await insertChunked(S.userSettings, sellers.map((s) => ({ userId: s.id, openaiApiKey: '', googleApiKey: '' })));

  await insertChunked(S.mediaAssets, sellers.flatMap((s, si) => [
    ...Array.from({ length: 4 }, (_, k) => ({ userId: s.id, kind: 'image' as const, url: img(`gallery-${si}-${k}`), secureUrl: img(`gallery-${si}-${k}`), originalFilename: `photo-${k + 1}.jpg`, displayName: `Photo ${k + 1}`, publicId: `${s.id}/photo-${k + 1}`, width: 1200, height: 800, format: 'jpg', resourceType: 'image', tags: ['demo', 'tour'], bytes: int(120000, 900000), assetFolder: slugify(s.company) })),
    { userId: s.id, kind: 'pdf' as const, url: DOC_URL, secureUrl: DOC_URL, originalFilename: 'brochure.pdf', displayName: 'Company brochure', publicId: `${s.id}/brochure`, format: 'pdf', resourceType: 'raw', pages: 4, bytes: 52000, tags: ['brochure'] },
  ]));

  await insertChunked(S.paxPresets, sellers.map((s) => ({ userId: s.id, name: 'Small group (2–10)', minSize: 2, maxSize: 10, pricePerPerson: true, tags: ['demo'] })));
  await insertChunked(S.discountPresets, sellers.map((s) => ({ userId: s.id, name: 'Early bird 10%', type: 'percentage', value: 10, dateRange: { from: isoDate(daysFromNow(-10)), to: isoDate(daysFromNow(120)) }, timezone: 'Asia/Kathmandu', tags: ['demo'] })));
  await insertChunked(S.pricingOptionPresets, sellers.map((s) => ({ userId: s.id, name: 'Adult / Child', options: [{ name: 'Adult', category: 'adult', discountEnabled: false, paxRange: { min: 1, max: 10 }, isActive: true }, { name: 'Child', category: 'child', discountEnabled: false, paxRange: { min: 1, max: 10 }, isActive: true }], tags: ['demo'] })));
  await insertChunked(S.datePresets, sellers.map((s) => ({ userId: s.id, name: 'Autumn departures', type: 'multiple', config: { departures: [{ from: isoDate(daysFromNow(30)), to: isoDate(daysFromNow(40)) }] }, recurrence: { enabled: false }, tags: ['demo'] })));
  await insertChunked(S.contentPresets, sellers.flatMap((s) => [
    { userId: s.id, name: 'Standard inclusions', contentType: 'include', content: CONTENT_INCLUDE.join('\n'), tags: ['demo'] },
    { userId: s.id, name: 'Standard exclusions', contentType: 'exclude', content: CONTENT_EXCLUDE.join('\n'), tags: ['demo'] },
  ]));
  await insertChunked(S.itineraryPresets, sellers.map((s) => ({ userId: s.id, name: '3-day starter', description: 'Simple 3-day itinerary', days: 3, nights: 2, itinerary: [{ day: 'Day 1', title: 'Arrival', description: 'Arrive and settle in.' }, { day: 'Day 2', title: 'Main activity', description: 'Full day activity.' }, { day: 'Day 3', title: 'Departure', description: 'Transfer out.' }], tags: ['demo'] })));
  await insertChunked(S.tourTemplatePresets, sellers.map((s) => ({ userId: s.id, name: 'Standard small-group tour', description: 'Reusable template', thumbnail: img(`tpl-${s.id}`, 400, 300), tourDefaults: { enquiry: true, pricePerPerson: true }, tags: ['demo'] })));
  console.log('✅ Seller extras (facts, faqs, prefs, media, presets)');

  // ---------------------------------------------------------------------
  // tours — every one fully authored (seedData/tourCatalog.ts), then pushed through the same
  // processors the real tour editor's save path uses, so each field has exactly the shape the
  // editor / tour page read back (pricing options, discounts, dates, facts, itinerary, ...).
  // ---------------------------------------------------------------------
  interface Link { id: string; tour: TourRec; dayIdx: number; role: Insert<typeof S.itineraryPartnerRequests>['role']; partner: Partner; unitTypeId: string | null; unitType: string | null; units: number }
  interface TourRec { id: string; spec: { status: 'Published' | 'Draft' | 'Archived'; max: number; price: number }; code: string; sellerId: string; destId: string; departures: Date[]; itinerary: ItineraryDayInput[]; price: number; title: string; row: Insert<typeof S.tours> }
  const tourRecs: TourRec[] = [];
  const tourRows: Array<Insert<typeof S.tours>> = [], tourCatRows: Array<Insert<typeof S.tourCategories>> = [], tourAuthRows: Array<Insert<typeof S.tourAuthors>> = [];
  const linkRows: Array<Insert<typeof S.tourItineraryPartners>> = [];
  const links: Link[] = [];

  const quiet = <T,>(fn: () => T): T => { const log = console.log; console.log = () => undefined; try { return fn(); } finally { console.log = log; } };
  const startOfDay = (offsetDays: number) => { const d = daysFromNow(offsetDays); d.setHours(0, 0, 0, 0); return d; };
  const dateRangeOf = (ds: DiscountSpec) => ({ from: startOfDay(ds.fromDays), to: startOfDay(ds.toDays) });
  const discountFields = (ds?: DiscountSpec) => ({
    discountEnabled: !!ds,
    percentageOrPrice: ds?.type === 'percent',
    discountPercentage: ds?.type === 'percent' ? ds.value : 0,
    discountPrice: ds?.type === 'amount' ? ds.value : 0,
    ...(ds ? { discountDateRange: dateRangeOf(ds) } : {}),
  });
  const isActiveNow = (ds?: DiscountSpec) => !!ds && ds.fromDays <= 0 && ds.toDays >= 0;

  // Nearest approved partner of a type: in the first region that has one, else any. `salt` spreads choices.
  const pickPartner = (types: string[], regions: string[], salt: number): Partner => {
    const pool = approvedPartners.filter((p) => types.includes(p.type));
    for (const r of regions) {
      const rid = destByName.get(r)?.id;
      const local = pool.filter((p) => p.destId === rid);
      if (local.length) return local[salt % local.length];
    }
    return pool[salt % pool.length];
  };
  const pickUnitType = (partner: Partner, role: string, time: string | null, maxSize: number) => {
    const uts = unitTypesByPartner.get(partner.id) ?? [];
    if (!uts.length) return null;
    const find = (re: RegExp) => uts.find((u) => re.test(u.name));
    if (role === 'meals') return (time && time >= '17:00' ? find(/dinner/i) : find(/lunch/i)) ?? uts[0];
    if (role === 'transport') return (maxSize <= 6 ? find(/suv/i) : maxSize <= 24 ? find(/van/i) : find(/bus/i)) ?? uts[0];
    if (role === 'accommodation') return find(/twin|standard/i) ?? uts[0];
    return uts[0];
  };

  TOUR_CATALOG.forEach((e, ti) => {
    const id = uuid();
    const seller = sellers[e.seller];
    const dest = destByName.get(e.region);
    if (!dest) throw new Error(`Destination "${e.region}" is missing (tour ${e.code}).`);
    const cats = e.categories.map((c) => { const row = catByName.get(c); if (!row) throw new Error(`Category "${c}" is missing (tour ${e.code}).`); return row; });
    const maxSize = e.maxSize;
    const days = e.days.length;
    const leadGuide = pickPartner(['guide'], [e.region], ti);

    // ---- itinerary: each day names its place and links a real guide / transport / hotel / restaurant ----
    const itineraryIn = e.days.map((day: DaySpec, di: number) => {
      const salt = ti * 7 + di;
      const regions = [day.region, e.region, 'Kathmandu Valley'];
      const partnersForDay: ItineraryPartnerInput[] = [];
      const add = (role: string, partner: Partner, time: string | null, endTime: string | null, withUnits: boolean) => {
        const ut = withUnits ? pickUnitType(partner, role, time, maxSize) : null;
        const units = role === 'accommodation' ? Math.ceil(maxSize / 2) : role === 'meals' ? maxSize : role === 'transport' ? Math.max(1, Math.ceil(maxSize / (maxSize <= 6 ? 4 : 12))) : null;
        partnersForDay.push({
          role, businessPartnerId: partner.id, name: partner.name, notes: day.notes?.[role as 'transport' | 'accommodation' | 'meals' | 'guide'],
          ...(time ? { time } : {}), ...(endTime ? { endTime } : {}),
          ...(units ? { unitsRequested: units } : {}), ...(ut ? { unitType: ut.name, unitTypeId: ut.id } : {}),
        });
      };
      if (day.drive) add('transport', pickPartner(['transport'], regions, salt), '08:00', null, true);
      if (day.stay) add('accommodation', pickPartner(day.stay === 'hotel' ? ['hotel'] : ['guesthouse'], regions, salt), '14:00', '11:00', true);
      if (day.meal) add('meals', pickPartner(['restaurant'], regions, salt), /lunch/i.test(day.notes?.meals ?? '') && !/dinner/i.test(day.notes?.meals ?? '') ? '12:30' : '19:00', null, true);
      if (day.guide !== false) add('guide', leadGuide, '09:00', '17:00', false);
      if (di === 0) partnersForDay.push({ role: 'other', name: 'Welcome flower garland (local florist)', notes: 'Arranged by the agency directly' });
      return { id: `day-${di + 1}`, day: `Day ${di + 1}`, title: day.title, description: day.desc, destination: day.place, partners: partnersForDay };
    });
    const itinerary = processItineraryData(itineraryIn);

    // ---- pricing ----
    const pr = e.pricing;
    const optionIds = (pr.options ?? []).map((_, k) => `${e.code.toLowerCase()}-price-${k + 1}`);
    const pricingOptions = pr.options?.length
      ? processPricingOptions(pr.options.map((o, k) => ({
          id: optionIds[k], name: o.name, category: o.category, customCategory: o.customCategory, price: o.price,
          paxRange: { minPax: o.minPax, maxPax: o.maxPax }, discount: discountFields(o.discount),
        })))
      : [];
    const tourDiscount = { ...discountFields(pr.discount), discountCode: pr.discount?.code ?? '', description: pr.discount?.description ?? '' };
    const saleActive = isActiveNow(pr.discount);
    const salePrice = saleActive ? Math.round(pr.discount!.type === 'percent' ? pr.price * (1 - pr.discount!.value / 100) : pr.price - pr.discount!.value) : null;
    const paymentOptions = processPaymentOptions({ fullPaymentEnabled: pr.payment.full, depositEnabled: pr.payment.deposit, depositPercentage: pr.payment.pct, payOnArrivalEnabled: pr.payment.arrival });

    // ---- dates / departures ----
    const nights = Math.max(0, days - 1);
    const spanEnd = (start: Date) => new Date(start.getTime() + (days - 1) * 86400000);
    const sch = e.schedule;
    let departures: Date[] = [];
    let datesIn: Record<string, unknown>;
    if (sch.type === 'flexible') {
      datesIn = { scheduleType: 'flexible', days, nights, dateRange: { from: startOfDay(sch.fromDays), to: startOfDay(sch.toDays) }, pricingCategory: optionIds };
    } else if (sch.type === 'fixed') {
      const start = startOfDay(sch.startDays);
      departures = [start];
      datesIn = { scheduleType: 'fixed', days, nights, dateRange: { from: start, to: spanEnd(start) }, pricingCategory: optionIds };
    } else {
      datesIn = {
        scheduleType: 'multiple', days, nights,
        departures: sch.departures.map((dep, k) => {
          const start = startOfDay(dep.startDays);
          departures.push(start);
          const selected = dep.optionNames ? (pr.options ?? []).map((o, oi) => (dep.optionNames!.includes(o.name) ? optionIds[oi] : null)).filter((x): x is string => !!x) : optionIds;
          return {
            id: `${e.code.toLowerCase()}-dep-${k + 1}`, label: dep.label, dateRange: { from: start, to: spanEnd(start) }, capacity: dep.capacity,
            isRecurring: !!dep.recurring, ...(dep.recurring ? { recurrencePattern: dep.recurring.pattern, recurrenceInterval: dep.recurring.interval, recurrenceEndDate: startOfDay(dep.recurring.endDays) } : {}),
            selectedPricingOptions: selected, pricingCategory: selected,
          };
        }),
      };
    }
    const tourDates = quiet(() => processTourDatesData(datesIn));

    // ---- content ----
    const sFacts = sellerFacts.get(seller.id)!;
    const factsIn = MASTER_FACTS.map((m) => {
      const master = sFacts.find((r) => r.name === m.name)!;
      const v = e.facts[m.name];
      // Every type is a list of strings: that is what the editor's inputs read (value[0] for text / single,
      // the whole list for multi), what its zod schema accepts, and what the public page renders.
      const value = Array.isArray(v) ? v : [String(v ?? '')];
      return { factId: master.id, title: m.name, field_type: m.fieldType, value, icon: m.icon };
    });
    const sFaqs = sellerFaqs.get(seller.id)!;
    const faqsIn = e.faqs.map((f) => ({ faqId: sFaqs.find((m) => m.question === f.q)?.id, question: f.q, answer: f.a }));
    const coverImage = img(`tour-${e.code}`, 1600, 900);
    const created = daysFromNow(-int(30, 200));
    const priceLockDate = pr.lockDays !== undefined ? startOfDay(pr.lockDays) : null;

    const row = {
      id, title: e.title, code: e.code, tourStatus: e.status, coverImage, file: DOC_URL, destinationId: dest.id,
      description: tourDescription({ intro: e.intro, highlights: e.highlights, who: e.who }),
      excerpt: e.excerpt, outline: e.outline,
      itinerary, include: bulletDoc(e.include), exclude: bulletDoc(e.exclude),
      facts: factsIn, faqs: processFaqsData(faqsIn),
      gallery: e.gallery.map((caption, k) => ({ image: k === 0 ? coverImage : img(`tour-${e.code}-${k}`, 1200, 800), caption })),
      location: processLocationData({ ...e.location, country: 'Nepal', map: `https://www.google.com/maps?q=${e.location.lat},${e.location.lng}` }),
      discount: tourDiscount, pricingOptions, pricingGroups: [], tourDates,
      enquiry: e.enquiry, isSpecialOffer: !!e.specialOffer, price: pr.price, pricePerPerson: pr.perPerson,
      minSize: e.minSize, maxSize, groupSize: pr.perPerson ? null : (pr.groupSize ?? 1),
      saleEnabled: saleActive, salePrice, priceLockDate, pricingOptionsEnabled: pricingOptions.length > 0,
      fixedDeparture: sch.type !== 'flexible', multipleDates: sch.type === 'multiple',
      views: int(100, 9000), paymentOptions, createdAt: created, updatedAt: created,
    };
    tourRows.push(row);
    cats.forEach((c) => tourCatRows.push({ tourId: id, categoryId: c.id }));
    tourAuthRows.push({ tourId: id, userId: seller.id });
    const rec: TourRec = { id, spec: { status: e.status, max: maxSize, price: pr.price }, code: e.code, sellerId: seller.id, destId: dest.id, departures, itinerary, price: salePrice ?? pr.price, title: e.title, row };
    tourRecs.push(rec);

    // ---- one tour_itinerary_partners row per linked entry (what the editor's save would create) ----
    itinerary.forEach((day, di) => {
      day.partners.forEach((p, order) => {
        if (!isItineraryRole(p.role)) return;
        const linkId = uuid();
        const partner = p.businessPartnerId ? approvedPartners.find((x) => x.id === p.businessPartnerId) : undefined;
        linkRows.push({ id: linkId, tourId: id, dayId: day.id, role: p.role, businessPartnerId: p.businessPartnerId ?? null, name: p.name, notes: p.notes ?? null, sortOrder: order, unitsRequested: p.unitsRequested ?? null, unitType: p.unitType ?? null, unitTypeId: p.unitTypeId ?? null });
        if (partner) links.push({ id: linkId, tour: rec, dayIdx: di, role: p.role, partner, unitTypeId: p.unitTypeId ?? null, unitType: p.unitType ?? null, units: p.unitsRequested ?? 1 });
      });
    });
  });
  await insertChunked(S.tours, tourRows, 10);
  await insertChunked(S.tourCategories, tourCatRows);
  await insertChunked(S.tourAuthors, tourAuthRows);
  await insertChunked(S.tourItineraryPartners, linkRows);
  console.log(`✅ Tours: ${tourRecs.length}   Itinerary partner links: ${linkRows.length}`);

  // ---------------------------------------------------------------------
  // commission rates + promo codes
  // ---------------------------------------------------------------------
  // Two sellers have negotiated their own rate; everyone else pays the platform default.
  const defaultRate = await getDefaultCommissionRate();
  const sellerRate = new Map<string, number>([[sellers[0].id, 8], [sellers[1].id, 12]]);
  for (const [id, rate] of sellerRate) await db.update(S.users).set({ commissionRate: rate }).where(eq(S.users.id, id));
  const rateFor = (sellerId: string) => sellerRate.get(sellerId) ?? defaultRate;
  // Rows below belong to the demo admin (not the real one) so demo:wipe removes them.
  const demoAdmin = adminUsers[0];

  interface PromoRec { id: string; code: string; ownerId: string; isAdmin: boolean; discountType: 'percentage' | 'fixed'; discountValue: number; maxDiscountAmount: number | null; minBookingAmount: number | null; startsAt: Date | null; expiresAt: Date | null; isActive: boolean; tourIds: string[] | null; maxUses: number | null; usedCount: number; description: string }
  const promoRecs: PromoRec[] = [];
  const addPromo = (p: Omit<PromoRec, 'id' | 'usedCount' | 'maxDiscountAmount' | 'minBookingAmount' | 'startsAt' | 'expiresAt' | 'isActive' | 'tourIds' | 'maxUses'> & Partial<PromoRec>) =>
    promoRecs.push({ id: uuid(), usedCount: 0, maxDiscountAmount: null, minBookingAmount: null, startsAt: null, expiresAt: null, isActive: true, tourIds: null, maxUses: null, ...p });
  // site-wide (admin) codes
  addPromo({ code: 'DEMO-WELCOME10', ownerId: demoAdmin.id, isAdmin: true, discountType: 'percentage', discountValue: 10, maxDiscountAmount: 150, description: 'Newsletter welcome offer' });
  addPromo({ code: 'DEMO-FLAT50', ownerId: demoAdmin.id, isAdmin: true, discountType: 'fixed', discountValue: 50, minBookingAmount: 500, maxUses: 40, description: 'Partner referral, $50 off bookings over $500' });
  addPromo({ code: 'DEMO-SUMMER25', ownerId: demoAdmin.id, isAdmin: true, discountType: 'percentage', discountValue: 25, maxDiscountAmount: 300, startsAt: daysFromNow(-150), expiresAt: daysFromNow(-60), description: 'Summer sale (ended)' });
  addPromo({ code: 'DEMO-SPRING15', ownerId: demoAdmin.id, isAdmin: true, discountType: 'percentage', discountValue: 15, startsAt: daysFromNow(120), description: 'Spring campaign (scheduled)' });
  // seller codes: one general code each for the first five, a code limited to two tours, and one switched off
  sellers.slice(0, 5).forEach((sl, i) => addPromo({ code: `DEMO-SELLER${pad(i + 1)}-10`, ownerId: sl.id, isAdmin: false, discountType: 'percentage', discountValue: 10, maxUses: i % 2 ? 25 : null, description: `${sl.company} early-bird` }));
  const s2Tours = tourRecs.filter((t) => t.sellerId === sellers[1].id && t.spec.status === 'Published').slice(0, 2).map((t) => t.id);
  if (s2Tours.length) addPromo({ code: 'DEMO-TREK75', ownerId: sellers[1].id, isAdmin: false, discountType: 'fixed', discountValue: 75, tourIds: s2Tours, description: 'Only on two selected treks' });
  addPromo({ code: 'DEMO-OLDCODE', ownerId: sellers[2].id, isAdmin: false, discountType: 'percentage', discountValue: 20, isActive: false, description: 'Retired code' });

  /** The same checks and sizing as the promo service, against the booking date instead of now. */
  const promoAmount = (p: PromoRec, tour: TourRec, subtotal: number, at: Date): number => {
    if (!p.isActive || (p.startsAt && at < p.startsAt) || (p.expiresAt && at > p.expiresAt)) return 0;
    if (p.maxUses != null && p.usedCount >= p.maxUses) return 0;
    if (p.tourIds && !p.tourIds.includes(tour.id)) return 0;
    if (!p.isAdmin && p.ownerId !== tour.sellerId) return 0;
    if (p.minBookingAmount != null && subtotal < p.minBookingAmount) return 0;
    let amount = p.discountType === 'percentage' ? (subtotal * p.discountValue) / 100 : p.discountValue;
    if (p.maxDiscountAmount != null) amount = Math.min(amount, p.maxDiscountAmount);
    return Math.round(Math.min(amount, subtotal) * 100) / 100;
  };

  // ---------------------------------------------------------------------
  // bookings
  // ---------------------------------------------------------------------
  const liveTours = tourRecs.filter((t) => t.spec.status !== 'Draft');
  const bookingRows: Array<Insert<typeof S.bookings>> = [];
  interface BookingRec { id: string; tour: TourRec; departure: Date; pax: number; status: string }
  const bookingRecs: BookingRec[] = [];
  let bkSeq = 1;
  liveTours.forEach((tour) => {
    const n = tour.spec.status === 'Archived' ? 3 : int(6, 9);
    for (let b = 0; b < n; b++) {
      const r = rnd();
      const status = r < 0.2 ? 'pending' : r < 0.6 ? 'confirmed' : r < 0.85 ? 'completed' : 'cancelled';
      const past = status === 'completed' || (status === 'cancelled' && chance(0.4));
      const departure = past ? daysFromNow(-int(5, 90))
        : tour.departures.length ? pick(tour.departures) : daysFromNow(int(8, 160));
      departure.setHours(0, 0, 0, 0);
      const adults = int(1, 4), children = chance(0.3) ? int(1, 2) : 0, infants = chance(0.1) ? 1 : 0;
      const isGuest = chance(0.15);
      const cust = pick(customers);
      // Priced by the same calculator the booking API uses, from the tour's own stored pricing, and only
      // with a payment policy the tour actually offers.
      const po = tour.row.paymentOptions as { fullPaymentEnabled: boolean; depositEnabled: boolean; payOnArrivalEnabled: boolean };
      const offered = [...(po.fullPaymentEnabled ? ['full_payment', 'full_payment'] : []), ...(po.depositEnabled ? ['deposit_percentage'] : []), ...(po.payOnArrivalEnabled ? ['pay_on_arrival'] : [])] as Array<'full_payment' | 'deposit_percentage' | 'pay_on_arrival'>;
      const paymentType = pick(offered);
      const optionRows = (tour.row.pricingOptions ?? []) as Array<{ id: string; category: string }>;
      const optId = tour.row.pricingOptionsEnabled ? (optionRows.find((o) => o.category === 'adult') ?? optionRows[0])?.id ?? null : null;
      const bookedAt = new Date(departure.getTime() - int(10, 60) * 86400000);
      // The pricing calculator reads a stored tour; the insert row carries every field it uses.
      let calc = calculateBookingPricing(tour.row as typeof S.tours.$inferSelect, { adults, children, infants }, paymentType, optId);
      // About one booking in six used a promo code.
      let promo: PromoRec | null = null;
      if (chance(0.17)) {
        for (const p of shuffle(promoRecs)) {
          const amount = promoAmount(p, tour, calc.totalPrice, bookedAt);
          if (amount > 0) { promo = p; calc = calculateBookingPricing(tour.row as typeof S.tours.$inferSelect, { adults, children, infants }, paymentType, optId, { code: p.code, amount }); break; }
        }
      }
      // A cancelled booking gives its redemption back, as the booking service does.
      if (promo && status !== 'cancelled') promo.usedCount++;
      const total = calc.totalPrice, dueNow = calc.amountDueNow;
      let paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded' = 'unpaid', paid = 0;
      if (status === 'confirmed' || status === 'completed') { if (paymentType === 'full_payment' || status === 'completed') { paymentStatus = 'paid'; paid = total; } else if (paymentType === 'deposit_percentage') { paymentStatus = 'partial'; paid = dueNow; } }
      if (status === 'cancelled') { if (dueNow > 0 && chance(0.6)) { paymentStatus = 'refunded'; paid = 0; } }
      if (status === 'pending' && paymentType === 'full_payment' && chance(0.3)) { paymentStatus = 'paid'; paid = total; }
      const guestInfo = isGuest ? { fullName: personName(bkSeq + 5), email: `guest${bkSeq}@${DEMO_DOMAIN}`, phone: phone(), country: pick(COUNTRIES) } : null;
      const contact = isGuest ? guestInfo! : { fullName: cust.name, email: cust.email, phone: phone() };
      const id = uuid();
      bookingRows.push({
        id, tourId: tour.id, tourTitle: tour.title, tourCode: tour.code, userId: isGuest ? null : cust.id, isGuestBooking: isGuest, guestInfo,
        departureDate: departure, participants: { adults, children, infants },
        travelers: Array.from({ length: adults + children + infants }, (_, k) => ({ fullName: k === 0 ? contact.fullName : personName(bkSeq + k + 40), type: k < adults ? 'adult' : k < adults + children ? 'child' : 'infant', nationality: pick(COUNTRIES) })),
        pricingOptionId: optId,
        pricing: calc,
        promoCode: promo?.code ?? null,
        // Seller and commission frozen at booking time, as BookingService.createBooking does.
        sellerId: tour.sellerId, commissionRate: rateFor(tour.sellerId), ...splitBooking(total, rateFor(tour.sellerId)), payoutId: null as string | null,
        paymentType, contactName: contact.fullName, contactEmail: contact.email!, contactPhone: contact.phone!,
        specialRequests: chance(0.3) ? pick(['Vegetarian meals please', 'Celebrating an anniversary', 'One traveller has a knee injury', 'Early airport pickup needed']) : null,
        status, paymentStatus, paymentMethod: paid > 0 ? pick(['card', 'bank_transfer', 'esewa']) : null, transactionId: paid > 0 ? `TXN${int(10000000, 99999999)}` : null, paidAmount: paid,
        paymentDetails: paid > 0 ? { method: 'card', transactionId: `TXN${int(10000000, 99999999)}`, paidAt: bookedAt.toISOString() } : null,
        bookingDate: bookedAt, confirmedAt: status === 'confirmed' || status === 'completed' ? new Date(bookedAt.getTime() + 86400000) : null,
        cancelledAt: status === 'cancelled' ? new Date(bookedAt.getTime() + 2 * 86400000) : null, cancellationReason: status === 'cancelled' ? pick(['Change of plans', 'Flight cancelled', 'Health reasons', 'Found another date']) : null,
        bookingReference: `BK-DEMO-${pad(bkSeq++, 4)}`, notes: status === 'pending' ? 'Awaiting payment confirmation' : null, createdAt: bookedAt, updatedAt: bookedAt,
      });
      bookingRecs.push({ id, tour, departure, pax: adults + children + infants, status });
    }
  });

  // Payouts: per seller, bookings that are paid, confirmed/completed and whose trip ended over a day ago are
  // payable (see services/payouts.ts). The oldest half is in a paid payout; for every other seller the next
  // few are in a payout waiting for the transfer; the rest are left payable so "Create payout" has work to do.
  const payoutRows: Array<Insert<typeof S.payouts>> = [];
  const payableCutoff = hoursFromNow(-24);
  sellers.forEach((sl, si) => {
    const payable = bookingRows
      .filter((b) => b.sellerId === sl.id && b.paymentStatus === 'paid' && (b.status === 'confirmed' || b.status === 'completed') && b.departureDate < payableCutoff && (b.sellerEarning ?? 0) > 0)
      .sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime());
    if (payable.length < 2) return;
    const groups: Array<{ rows: typeof payable; paid: boolean }> = [{ rows: payable.slice(0, Math.ceil(payable.length / 2)), paid: true }];
    if (si % 2 === 0) groups.push({ rows: payable.slice(Math.ceil(payable.length / 2), Math.ceil(payable.length / 2) + 2), paid: false });
    for (const g of groups) {
      if (!g.rows.length) continue;
      const id = uuid();
      const lastTrip = new Date(g.rows[g.rows.length - 1].departureDate);
      const createdAt = g.paid ? new Date(Math.min(lastTrip.getTime() + 3 * 86400000, NOW.getTime() - 86400000)) : hoursFromNow(-int(2, 48));
      const paidAt = g.paid ? new Date(Math.min(createdAt.getTime() + 2 * 86400000, NOW.getTime())) : null;
      payoutRows.push({
        id, sellerId: sl.id, amount: Math.round(g.rows.reduce((n, b) => n + (b.sellerEarning ?? 0), 0) * 100) / 100, currency: 'USD', bookingCount: g.rows.length,
        status: g.paid ? 'paid' : 'pending', reference: g.paid ? `DEMO-TRF-${int(100000, 999999)}` : null, notes: g.paid ? 'Bank transfer' : null,
        createdBy: demoAdmin.id, paidAt, createdAt, updatedAt: paidAt ?? createdAt,
      });
      for (const b of g.rows) b.payoutId = id;
    }
  });
  await insertChunked(S.payouts, payoutRows);
  await insertChunked(S.bookings, bookingRows, 40);
  await insertChunked(S.promoCodes, promoRecs.map(({ isAdmin: _a, ...p }) => ({ ...p, createdAt: daysFromNow(-int(60, 200)), updatedAt: new Date() })));
  // tour.bookingCount
  for (const t of tourRecs) {
    const c = bookingRecs.filter((b) => b.tour.id === t.id && b.status !== 'cancelled').length;
    await db.update(S.tours).set({ bookingCount: c }).where(eq(S.tours.id, t.id));
  }
  console.log(`✅ Bookings: ${bookingRows.length}   with a promo code: ${bookingRows.filter((b) => b.promoCode).length}`);
  console.log(`✅ Promo codes: ${promoRecs.length}   Payouts: ${payoutRows.length} (${payoutRows.filter((p) => p.status === 'paid').length} paid)`);

  // ---------------------------------------------------------------------
  // tour reviews (+ replies) and aggregates
  // ---------------------------------------------------------------------
  const tourReviewRows: Array<Insert<typeof S.reviews>> = [], tourReplyRows: Array<Insert<typeof S.reviewReplies>> = [];
  for (const t of liveTours) {
    const reviewers = shuffle(customers).slice(0, t.spec.status === 'Archived' ? 4 : int(6, 10));
    const agg = { sum: 0, approved: 0 };
    reviewers.forEach((u) => {
      const rating = pick([5, 5, 5, 4, 4, 4, 3, 2, 1]);
      const r = rnd();
      const status = r < 0.62 ? 'approved' : r < 0.88 ? 'pending' : 'rejected';
      const id = uuid();
      const created = daysFromNow(-int(2, 120));
      tourReviewRows.push({ id, tourId: t.id, userId: u.id, rating, comment: pick(REVIEW_TEXTS[rating]), status, likes: int(0, 14), views: int(2, 120), createdAt: created, updatedAt: created });
      if (status === 'approved') { agg.sum += rating; agg.approved++; if (chance(0.45)) tourReplyRows.push({ id: uuid(), reviewId: id, userId: t.sellerId, comment: pick(['Thank you for your kind words — hope to welcome you back!', 'We appreciate the honest feedback and have shared it with our team.', 'So glad you enjoyed it! Safe travels.']), likes: int(0, 4), createdAt: new Date(created.getTime() + 86400000) }); }
    });
    await db.update(S.tours).set({ reviewCount: reviewers.length, approvedReviewCount: agg.approved, averageRating: agg.approved ? Math.round((agg.sum / agg.approved) * 10) / 10 : 0 }).where(eq(S.tours.id, t.id));
  }
  await insertChunked(S.reviews, tourReviewRows);
  await insertChunked(S.reviewReplies, tourReplyRows);
  console.log(`✅ Tour reviews: ${tourReviewRows.length}`);

  // ---------------------------------------------------------------------
  // business reviews + likes
  // ---------------------------------------------------------------------
  const reviewTotals = new Map<string, { total: number; sum: number; approved: number }>();
  const bizReviewRows: Array<Insert<typeof S.businessReviews>> = [], bizReplyRows: Array<Insert<typeof S.businessReviewReplies>> = [], bizLikeRows: Array<Insert<typeof S.businessReviewLikes>> = [];
  for (const p of approvedPartners.filter((x) => x.type !== 'advertiser')) {
    const reviewers = shuffle(customers).slice(0, int(2, 5));
    const agg = { sum: 0, approved: 0 };
    reviewers.forEach((u) => {
      const rating = pick([5, 5, 4, 4, 4, 3, 2]);
      const status = pick(['approved', 'approved', 'approved', 'pending', 'rejected'] as const);
      const id = uuid();
      bizReviewRows.push({ id, businessPartnerId: p.id, userId: u.id, rating, comment: pick(REVIEW_TEXTS[rating]), status, likes: 0, views: int(1, 60), createdAt: daysFromNow(-int(2, 100)), updatedAt: new Date() });
      if (status === 'approved') {
        agg.sum += rating; agg.approved++;
        if (chance(0.4)) bizReplyRows.push({ id: uuid(), reviewId: id, userId: p.ownerId, comment: 'Thank you for staying with us!', createdAt: daysFromNow(-int(1, 50)) });
        if (chance(0.5)) bizLikeRows.push({ id: uuid(), reviewId: id, userId: pick(customers).id });
      }
    });
    reviewTotals.set(p.id, { total: reviewers.length, ...agg });
  }
  await insertChunked(S.businessReviews, bizReviewRows);
  await insertChunked(S.businessReviewReplies, bizReplyRows);
  await insertChunked(S.businessReviewLikes, bizLikeRows);
  for (const p of approvedPartners) {
    const a = reviewTotals.get(p.id); if (!a) continue;
    await db.update(S.businessPartners).set({ reviewCount: a.total, approvedReviewCount: a.approved, averageRating: a.approved ? Math.round((a.sum / a.approved) * 10) / 10 : 0 }).where(eq(S.businessPartners.id, p.id));
  }
  console.log(`✅ Business reviews: ${bizReviewRows.length}`);

  // ---------------------------------------------------------------------
  // itinerary partners + supplier requests (drives /dashboard/operations)
  // ---------------------------------------------------------------------

  const reqRows: Array<Insert<typeof S.itineraryPartnerRequests>> = [], eventRows: Array<Insert<typeof S.itineraryRequestEvents>> = [], contribRows: Array<Insert<typeof S.itineraryRequestBookingContributions>> = [];
  const reqKey = new Set<string>();
  type RequestStatus = NonNullable<Insert<typeof S.itineraryPartnerRequests>['status']>;
  const STATUS_WEIGHTS: Array<[RequestStatus, number]> = [['confirmed', 44], ['pending', 20], ['held', 10], ['countered', 8], ['declined', 10], ['expired', 8]];
  const pickStatus = (): RequestStatus => { let r = rnd() * 100; for (const [s, w] of STATUS_WEIGHTS) { if ((r -= w) < 0) return s; } return 'pending'; };
  const addRequest = (link: Link, serviceDate: Date, headcount: number, sourceDeparture: Date | null, forcedStatus?: RequestStatus) => {
    const dateStr = isoDate(serviceDate);
    const time = link.role === 'meals' ? '19:00' : link.role === 'guide' ? '09:00' : null;
    const key = `${link.id}|${dateStr}|${time}`;
    if (reqKey.has(key)) return null;
    reqKey.add(key);
    const status = forcedStatus ?? pickStatus();
    const id = uuid();
    const created = daysFromNow(-int(1, 25));
    const responded = status === 'pending' ? null : new Date(created.getTime() + int(2, 40) * 3600000);
    const row: Insert<typeof S.itineraryPartnerRequests> = {
      id, tourId: link.tour.id, tourItineraryPartnerId: link.id, businessPartnerId: link.partner.id, role: link.role, serviceDate: dateStr, serviceTime: time,
      serviceEndTime: link.role === 'guide' ? '17:00' : null, headcount, unitsRequested: link.units, unitTypeId: link.unitTypeId, status,
      capacityConfirmed: ['confirmed', 'held'].includes(status) ? link.units : status === 'countered' ? null : null,
      responseNotes: status === 'declined' ? pick(['Fully booked that night.', 'Vehicle under maintenance.', 'Guide on another assignment.']) : status === 'confirmed' ? pick(['Confirmed — looking forward to hosting.', 'All set on our side.', null]) : null,
      respondedAt: responded, respondedBy: responded ? link.partner.ownerId : null,
      holdExpiresAt: status === 'held' ? hoursFromNow(int(6, 60)) : null,
      respondByAt: status === 'pending' ? hoursFromNow(int(2, 70)) : status === 'expired' ? hoursFromNow(-int(2, 48)) : null,
      counterUnits: status === 'countered' ? Math.max(1, Math.floor(link.units / 2)) : null,
      counterDate: status === 'countered' ? isoDate(new Date(serviceDate.getTime() + 86400000)) : null,
      counterTime: status === 'countered' && time ? '20:00' : null,
      counterNotes: status === 'countered' ? 'We can only offer part of the requested capacity, and on the following day.' : null,
      version: status === 'pending' ? 1 : 2, sourceDepartureDate: sourceDeparture, createdAt: created, updatedAt: responded ?? created,
    };
    reqRows.push(row);
    eventRows.push({ id: uuid(), requestId: id, fromStatus: null, toStatus: 'pending', actorId: link.tour.sellerId, actorRole: 'agency', unitsAtEvent: link.units, notes: 'Request created', createdAt: created });
    if (status !== 'pending') {
      const actorRole = status === 'expired' ? 'system' : 'partner';
      eventRows.push({ id: uuid(), requestId: id, fromStatus: 'pending', toStatus: status, actorId: actorRole === 'system' ? null : link.partner.ownerId, actorRole, unitsAtEvent: row.capacityConfirmed ?? row.counterUnits ?? link.units, notes: row.responseNotes ?? row.counterNotes ?? (status === 'expired' ? 'No response before deadline' : null), createdAt: responded! });
      if (status === 'confirmed' && chance(0.3)) eventRows.push({ id: uuid(), requestId: id, fromStatus: 'confirmed', toStatus: 'confirmed', actorId: link.tour.sellerId, actorRole: 'agency', unitsAtEvent: link.units, notes: 'Agency re-confirmed headcount', createdAt: new Date(responded!.getTime() + 3600000) });
    }
    return id;
  };

  for (const link of links) {
    const t = link.tour;
    if (t.spec.status === 'Draft') continue;
    if (t.departures.length) {
      // fixed-departure sourced: one request per upcoming departure × link
      t.departures.slice(0, 3).forEach((dep, di) => {
        const serviceDate = new Date(dep.getTime() + link.dayIdx * 86400000);
        // make the first departure mostly healthy, later ones more mixed
        const forced = di === 0 && chance(0.65) ? 'confirmed' : undefined;
        addRequest(link, serviceDate, t.spec.max, dep, forced);
      });
    } else {
      // flexible tour: per-booking sourced requests with contribution ledger
      bookingRecs.filter((b) => b.tour.id === t.id && ['pending', 'confirmed'].includes(b.status) && b.departure > NOW).forEach((b) => {
        const serviceDate = new Date(b.departure.getTime() + link.dayIdx * 86400000);
        const reqId = addRequest(link, serviceDate, b.pax, null);
        if (reqId) contribRows.push({ id: uuid(), requestId: reqId, bookingId: b.id, headcount: b.pax });
      });
    }
  }
  await insertChunked(S.itineraryPartnerRequests, reqRows, 60);
  await insertChunked(S.itineraryRequestEvents, eventRows, 150);
  await insertChunked(S.itineraryRequestBookingContributions, contribRows);
  console.log(`✅ Itinerary links: ${linkRows.length}   Requests: ${reqRows.length}   Events: ${eventRows.length}`);

  // ---------------------------------------------------------------------
  // advertisements — coherent campaigns from seedData/adCatalog.ts, targeted so they really show
  // ---------------------------------------------------------------------
  // The link is the business's own profile page on this site, so a click always lands on a page that
  // exists. Override the host for another environment with SEED_SITE_URL.
  const SITE_URL = (process.env.SEED_SITE_URL || 'https://tourbnt.com').replace(/\/+$/, '');
  const PRICE_PER_MONTH = 5000;       // Rs — default price list
  const PRICE_PER_100_VIEWS = 50;     // Rs
  const adRows: Array<Insert<typeof S.advertisements>> = [], adCatRows: Array<Insert<typeof S.adCategoryTargets>> = [], adDestRows: Array<Insert<typeof S.adDestinationTargets>> = [], adStatRows: Array<Insert<typeof S.adDailyStats>> = [];
  const partnerByName = new Map(partners.map((p) => [p.name, p]));
  const partnerRowById = new Map(partnerRows.map((r) => [r.id, r]));
  const placeId = (name: string) => { const d = destByName.get(name); if (!d) throw new Error(`Ad target destination "${name}" is missing.`); return d.id; };
  const typeId = (name: string) => { const c = catByName.get(name); if (!c) throw new Error(`Ad target category "${name}" is missing.`); return c.id; };

  // Sit-down restaurants advertise on hotel pages ("Nearby places to eat"): one per town, copy built from their own cuisine.
  const restaurantCampaigns: AdCampaign[] = (['Kathmandu Valley', 'Pokhara', 'Annapurna Region', 'Lumbini', 'Chitwan National Park', 'Nagarkot', 'Everest Region', 'Bardia National Park', 'Langtang Valley', 'Bandipur', 'Upper Mustang'] as const).flatMap((region) => {
    const p = approvedPartners.find((x) => x.type === 'restaurant' && x.destId === destByName.get(region)?.id);
    if (!p) return [];
    const cuisine = ((partnerRowById.get(p.id)?.details as { cuisine?: string[] } | undefined)?.cuisine ?? ['Nepali']);
    const town = destByName.get(region)?.city ?? region;
    return [{
      owner: p.name, title: `${cuisine[0]} dinner a short walk from your hotel`,
      description: `${p.name} serves ${cuisine.join(' & ')} cooking in ${town}. Groups welcome, vegetarian options on the menu — mention TourBNT when you book a table.`,
      cta: 'Reserve a table', slot: 'hotel_page' as const, places: [region], tourTypes: [], state: 'live' as const, billing: 'monthly' as const, months: 2,
    }];
  });

  // Hotels advertise rooms where tours stay (place-only, so they also show on destination pages) — this
  // keeps towns like Lumbini, Chitwan and Bandipur from having no local business at all.
  const stayCampaigns: AdCampaign[] = (['Lumbini', 'Chitwan National Park', 'Bandipur', 'Bardia National Park', 'Nagarkot', 'Everest Region', 'Langtang Valley', 'Upper Mustang'] as const).flatMap((region) => {
    const p = approvedPartners.find((x) => x.type === 'hotel' && x.destId === destByName.get(region)?.id);
    if (!p) return [];
    const d = (partnerRowById.get(p.id)?.details ?? {}) as { starRating?: number; amenities?: string[]; priceFromUSD?: number };
    const town = destByName.get(region)?.city ?? region;
    return [{
      owner: p.name, title: `${d.starRating ?? 3}-star stay in ${town} from US$ ${d.priceFromUSD ?? 60} a night`,
      description: `${p.name} offers rooms with ${(d.amenities ?? ['WiFi', 'Breakfast']).slice(0, 3).join(', ')} and easy access to the main sights of ${town}. Book direct for the best rate.`,
      cta: 'See rooms', slot: 'tour_sidebar' as const, places: [region], tourTypes: [], state: 'live' as const, billing: 'monthly' as const, months: 3,
    }];
  });

  const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
  [...AD_CAMPAIGNS, ...restaurantCampaigns, ...stayCampaigns].forEach((c, ai) => {
    const owner = partnerByName.get(c.owner);
    if (!owner) throw new Error(`Ad "${c.title}": business "${c.owner}" is not in the seeded partners.`);
    const id = uuid();
    const approved = ['live', 'unpaid', 'paused', 'ended'].includes(c.state);
    const paid = ['live', 'paused', 'ended'].includes(c.state);
    const rejected = c.state === 'rejected';
    const campaignStatus = c.state === 'live' ? 'active' : c.state === 'paused' ? 'paused' : c.state === 'ended' ? 'ended' : 'draft';
    const viewQuota = c.billing === 'per_view' ? c.views ?? 3000 : null;
    const priceAmount = c.billing === 'per_view' ? (viewQuota! / 100) * PRICE_PER_100_VIEWS : c.months * PRICE_PER_MONTH;
    const submitted = daysFromNow(-int(22, 70));
    const startDate = c.state === 'live' || c.state === 'paused' ? daysFromNow(-int(4, 18)) : c.state === 'ended' ? daysFromNow(-70) : null;
    const endDate = c.state === 'live' || c.state === 'paused' ? new Date(startDate!.getTime() + c.months * 30 * 86400000) : c.state === 'ended' ? daysFromNow(-12) : null;

    // Delivery history: 14 daily rows; totals on the ad are the sum, so dashboards add up.
    const daily: Array<{ date: string; impressions: number; clicks: number }> = [];
    if (campaignStatus !== 'draft') {
      const lastDay = c.state === 'ended' ? 13 : c.state === 'paused' ? 6 : 0;   // days ago of the most recent row
      const target = viewQuota ? Math.floor(viewQuota * (0.2 + rnd() * 0.45)) : int(2400, 9000);
      const perDay = target / 14;
      for (let k = 0; k < 14; k++) {
        const imp = Math.max(1, Math.floor(perDay * (0.6 + rnd() * 0.8)));
        daily.push({ date: isoDate(daysFromNow(-(lastDay + k))), impressions: imp, clicks: Math.floor(imp * (0.012 + rnd() * 0.04)) });
      }
    }
    const impressions = daily.reduce((n, r) => n + r.impressions, 0);
    const clicks = daily.reduce((n, r) => n + r.clicks, 0);
    // A live per-view campaign must still have views left, or the site would end it on the next sweep.
    const liveImpressions = viewQuota && c.state === 'live' ? Math.min(impressions, viewQuota - 100) : impressions;
    daily.forEach((r) => adStatRows.push({ id: uuid(), adId: id, date: r.date, impressions: r.impressions, clicks: r.clicks }));

    adRows.push({
      id, businessPartnerId: owner.id, title: c.title, description: c.description, imageUrl: img(`ad-${slugify(c.owner)}-${ai}`, 800, 450),
      ctaLabel: c.cta, ctaUrl: `${SITE_URL}/partners/${owner.type}/${owner.slug}`, placementSlot: c.slot, campaignStatus,
      startDate, endDate,
      isApproved: approved, approvalStatus: approved ? 'approved' : rejected ? 'rejected' : 'pending',
      approvedBy: approved ? admin.id : null, approvedAt: approved ? new Date(submitted.getTime() + 86400000) : null,
      rejectedBy: rejected ? admin.id : null, rejectedAt: rejected ? daysFromNow(-int(2, 9)) : null, rejectionReason: rejected ? c.rejectionReason ?? 'Does not meet advertising guidelines.' : null,
      submittedAt: submitted, impressionCount: clamp(liveImpressions, 0, viewQuota ?? Infinity), clickCount: clicks, isPaid: paid, paidAt: paid ? new Date(submitted.getTime() + 2 * 86400000) : null,
      billingModel: c.billing, durationMonths: c.months, viewQuota, priceAmount, currency: 'NPR', createdAt: submitted, updatedAt: submitted,
    });
    [...new Set(c.tourTypes)].forEach((t) => adCatRows.push({ adId: id, categoryId: typeId(t) }));
    [...new Set(c.places)].forEach((pl) => adDestRows.push({ adId: id, destinationId: placeId(pl) }));
  });
  await insertChunked(S.advertisements, adRows, 40);
  await insertChunked(S.adCategoryTargets, adCatRows);
  await insertChunked(S.adDestinationTargets, adDestRows);
  await insertChunked(S.adDailyStats, adStatRows, 200);
  console.log(`✅ Ads: ${adRows.length}  (live: ${adRows.filter((a) => a.campaignStatus === 'active').length})`);

  // ---------------------------------------------------------------------
  // messaging
  // ---------------------------------------------------------------------
  const convRows: Array<Insert<typeof S.conversations>> = [], partRows: Array<Insert<typeof S.conversationParticipants>> = [], msgRows: Array<Insert<typeof S.conversationMessages>> = [];
  const ENQ_Q = ['Is {t} suitable for a beginner? I have only done day hikes before.', 'Can you arrange a private departure of {t} for 6 people next month?', 'Do you offer a group discount on {t}?', 'What happens if my flight is delayed and I miss the start of {t}?', 'Is vegetarian food available throughout {t}?', 'Can we add an extra night in Pokhara before {t}?', 'What is the best month to do {t}, and what gear should I bring?'];
  const ENQ_A = ['Thanks for your interest! Yes, it is suitable for beginners — we keep a moderate pace with a support crew.', 'Absolutely, we can set up a private departure. I will send a quote shortly.', 'Groups of 8+ receive 10% off. Shall I prepare a proposal?', 'Please message us as soon as you know — we will rebook you on the next departure at no cost.', 'Yes, every meal has vegetarian options.', 'Of course — I can add hotel nights for you. Which dates?'];
  const ENQ_F = ['That sounds great, please send more details.', 'Thank you! We will confirm by the end of the week.', 'Perfect, we would like to go ahead.'];
  let msgClock = 0;
  const addConv = (c: { type: Insert<typeof S.conversations>['type']; subject: string; status: Insert<typeof S.conversations>['status']; fromUserId?: string | null; guestName?: string; guestEmail?: string; tourId?: string | null; assignedTo?: string | null; broadcastAudience?: Insert<typeof S.conversations>['broadcastAudience']; allowReplies?: boolean; groupName?: string; participants: Array<{ userId: string; read?: boolean; archived?: boolean }>; messages: Array<{ sender: string | null; role: 'customer' | 'support'; text: string }>; startedDaysAgo: number }) => {
    const id = uuid();
    const start = daysFromNow(-c.startedDaysAgo).getTime();
    let last = start;
    c.messages.forEach((m, i) => { last = start + i * int(20, 240) * 60000 + (msgClock++ % 7) * 1000; msgRows.push({ id: uuid(), conversationId: id, senderId: m.sender, role: m.role, content: m.text, createdAt: new Date(last) }); });
    convRows.push({ id, type: c.type, subject: c.subject, status: c.status, fromUserId: c.fromUserId ?? null, guestName: c.guestName ?? null, guestEmail: c.guestEmail ?? null, tourId: c.tourId ?? null, assignedTo: c.assignedTo ?? null, isBroadcast: c.type === 'broadcast', broadcastAudience: c.broadcastAudience ?? null, allowParticipantReplies: c.allowReplies ?? true, groupName: c.groupName ?? null, lastMessageAt: new Date(last), createdAt: new Date(start), updatedAt: new Date(last) });
    c.participants.forEach((p) => partRows.push({ id: uuid(), conversationId: id, userId: p.userId, isArchived: p.archived ?? false, lastReadAt: p.read ? new Date(last + 60000) : null, joinedAt: new Date(start) }));
  };

  // enquiries: logged-in customers → tour seller
  for (let i = 0; i < 16; i++) {
    const t = pick(liveTours.filter((x) => x.spec.status === 'Published'));
    const cust = pick(customers);
    const status = pick(['open', 'replied', 'replied', 'closed'] as const);
    const msgs: Array<{ sender: string | null; role: 'customer' | 'support'; text: string }> = [{ sender: cust.id, role: 'customer', text: pick(ENQ_Q).replace('{t}', t.title) }];
    if (status !== 'open') { msgs.push({ sender: t.sellerId, role: 'support', text: pick(ENQ_A) }); if (chance(0.7)) msgs.push({ sender: cust.id, role: 'customer', text: pick(ENQ_F) }); if (status === 'closed') msgs.push({ sender: t.sellerId, role: 'support', text: 'Glad we could help — this conversation is now closed. Feel free to reach out any time.' }); }
    addConv({ type: 'enquiry', subject: `Enquiry: ${t.title}`, status, fromUserId: cust.id, tourId: t.id, assignedTo: t.sellerId, participants: [{ userId: t.sellerId, read: status !== 'open', archived: status === 'closed' && chance(0.5) }], messages: msgs, startedDaysAgo: int(1, 45) });
  }
  // enquiries: guests (not signed up)
  for (let i = 0; i < 6; i++) {
    const t = pick(liveTours.filter((x) => x.spec.status === 'Published'));
    const status = pick(['open', 'open', 'replied'] as const);
    const name = personName(i + 70);
    const msgs: Array<{ sender: string | null; role: 'customer' | 'support'; text: string }> = [{ sender: null, role: 'customer', text: pick(ENQ_Q).replace('{t}', t.title) }];
    if (status === 'replied') msgs.push({ sender: t.sellerId, role: 'support', text: pick(ENQ_A) });
    addConv({ type: 'enquiry', subject: `Enquiry: ${t.title}`, status, guestName: name, guestEmail: `guest.enquiry${i + 1}@${DEMO_DOMAIN}`, tourId: t.id, assignedTo: t.sellerId, participants: [{ userId: t.sellerId }], messages: msgs, startedDaysAgo: int(0, 20) });
  }
  // contact page → admin (some unassigned, some assigned to a seller/partner)
  const CONTACTS: Array<[string, string, string]> = [
    ['Payment not received after booking', 'Hi, I paid for my trek yesterday but my booking still shows unpaid. Can you check?', 'Thanks for flagging this — we have located the payment and updated your booking.'],
    ['How do I become a tour operator?', 'We run a small trekking agency in Pokhara. How can we list our tours on your platform?', 'Welcome! Please apply through the seller application in your dashboard and upload your licence.'],
    ['Refund status for cancelled booking', 'I cancelled my booking two weeks ago and have not received the refund yet.', 'Refunds take 7–10 working days. I can see yours was processed today.'],
    ['Partnership inquiry – travel blogger', 'I write a travel blog with 50k monthly readers and would love to partner.', 'Thanks for reaching out! I will pass this to our marketing lead.'],
    ['Website login issue', 'I cannot log in — the page keeps saying my email is not verified.', 'We have re-sent the verification link. Please check your spam folder too.'],
    ['Request for custom itinerary', 'We are a family of five looking for a 10-day trip mixing culture and nature. Can you help?', 'Absolutely — I am assigning a specialist who will send a draft itinerary.'],
    ['Invoice needed for company reimbursement', 'Please send a formal invoice for booking reference BK-DEMO-0003.', 'Invoice attached to your booking page; let us know if you need company details added.'],
    ['Complaint about guide punctuality', 'Our guide arrived 45 minutes late on day 2 of our trek. Not acceptable.', 'We are very sorry. We have spoken with the operator and will share our findings with you.'],
  ];
  CONTACTS.forEach(([subject, q, a], i) => {
    const fromUser = i % 3 === 0 ? null : pick(customers);
    const assigned = i % 2 === 0 ? pick(sellers).id : null;
    const status = pick(['open', 'replied', 'closed'] as const);
    const msgs: Array<{ sender: string | null; role: 'customer' | 'support'; text: string }> = [{ sender: fromUser?.id ?? null, role: 'customer', text: q }];
    if (status !== 'open') msgs.push({ sender: assigned ?? admin.id, role: 'support', text: a });
    addConv({ type: 'contact', subject, status, fromUserId: fromUser?.id ?? null, guestName: fromUser ? undefined : personName(i + 55), guestEmail: fromUser ? undefined : `guest.contact${i + 1}@${DEMO_DOMAIN}`, assignedTo: assigned, participants: assigned ? [{ userId: assigned, read: status !== 'open' }] : [], messages: msgs, startedDaysAgo: int(0, 30) });
  });
  // broadcasts from admin
  const internalIds = [...sellers, ...approvedPartners.map((p) => ({ id: p.ownerId }))].map((x) => x.id);
  addConv({ type: 'broadcast', subject: 'Monsoon season safety update for all operators', status: 'open', fromUserId: admin.id, broadcastAudience: 'sellers', allowReplies: true, assignedTo: admin.id,
    participants: internalIds.map((id, i) => ({ userId: id, read: i % 3 === 0 })), startedDaysAgo: 12,
    messages: [{ sender: admin.id, role: 'customer', text: 'Dear partners, please review updated trail closure guidance for the monsoon season and adjust itineraries accordingly.' }, { sender: sellers[0].id, role: 'support', text: 'Noted — we have moved two departures to October.' }, { sender: sellers[3].id, role: 'support', text: 'Thanks, will share with our guides.' }] });
  addConv({ type: 'broadcast', subject: 'Autumn festival offers — up to 15% off selected tours', status: 'open', fromUserId: admin.id, broadcastAudience: 'users', allowReplies: false, assignedTo: admin.id,
    participants: customers.map((u, i) => ({ userId: u.id, read: i % 4 === 0 })), startedDaysAgo: 6,
    messages: [{ sender: admin.id, role: 'customer', text: 'Dashain & Tihar are here! Enjoy up to 15% off on selected departures this autumn. Book before the end of the month.' }] });
  addConv({ type: 'broadcast', subject: 'Scheduled maintenance this Sunday 02:00 UTC', status: 'closed', fromUserId: admin.id, broadcastAudience: 'all', allowReplies: false, assignedTo: admin.id,
    participants: [...internalIds, ...customers.slice(0, 20).map((u) => u.id)].map((id, i) => ({ userId: id, read: i % 2 === 0 })), startedDaysAgo: 25,
    messages: [{ sender: admin.id, role: 'customer', text: 'The platform will be briefly unavailable on Sunday 02:00–02:30 UTC for maintenance. No action needed.' }] });
  // direct messages admin → one person
  [[sellers[0], 'Your tour listing needs an updated itinerary', 'Hi, the Annapurna Base Camp Trek itinerary is missing Day 6 details. Could you update it?', 'Thanks, updating it today!'],
   [byType('hotel')[0], 'Please confirm room availability for October', 'We have several groups arriving in October. Can you confirm your allocation?', 'We can offer 20 rooms across both weeks — confirming in the dashboard now.'],
   [byType('guide')[0], 'Welcome to TourBNT', 'Your guide profile is approved — welcome aboard! Please set your availability calendar.', 'Thank you! I have blocked out my leave dates.'],
   [byType('transport')[0], 'Vehicle request declined — please review', 'We saw you declined a vehicle request for next week. Is there anything we can do to help?', 'Sorry, both vans are in the workshop. We can do it the following week.']].forEach((entry, i) => {
    const row = entry as [{ id: string; ownerId?: string }, string, string, string];
    const target = row[0].ownerId ?? row[0].id;
    addConv({ type: 'direct', subject: row[1], status: pick(['open', 'replied'] as const), fromUserId: admin.id, assignedTo: admin.id, participants: [{ userId: target, read: i % 2 === 0 }], startedDaysAgo: int(1, 14),
      messages: [{ sender: admin.id, role: 'customer', text: row[2] }, { sender: target, role: 'support', text: row[3] }] });
  });
  // group threads
  addConv({ type: 'group', groupName: 'Kathmandu Ops Team', subject: 'Kathmandu Ops Team', status: 'open', fromUserId: admin.id, assignedTo: admin.id,
    participants: [sellers[4], sellers[5], byType('transport')[0], byType('hotel')[1], byType('guide')[1]].map((x: { id: string; ownerId?: string }, i) => ({ userId: x.ownerId ?? x.id, read: i < 2 })), startedDaysAgo: 9,
    messages: [{ sender: admin.id, role: 'customer', text: 'Welcome to the ops group for the upcoming Kathmandu cultural departures. Please post blockers here.' }, { sender: sellers[4].id, role: 'support', text: 'Group of 12 arriving Monday — we need a coach from the airport at 09:30.' }, { sender: byType('transport')[0].ownerId, role: 'support', text: 'Confirmed, a 45-seater will be there.' }] });
  addConv({ type: 'group', groupName: 'Trek Leaders', subject: 'Trek Leaders', status: 'replied', fromUserId: admin.id, assignedTo: admin.id,
    participants: [sellers[0], sellers[1], sellers[9], byType('guide')[2], byType('guide')[3]].map((x: { id: string; ownerId?: string }) => ({ userId: x.ownerId ?? x.id, read: true })), startedDaysAgo: 18,
    messages: [{ sender: admin.id, role: 'customer', text: 'Sharing the new altitude-sickness protocol for all treks above 3,500m.' }, { sender: sellers[0].id, role: 'support', text: 'We already follow this — happy to share our checklist.' }] });
  addConv({ type: 'group', groupName: 'Advertiser Onboarding', subject: 'Advertiser Onboarding', status: 'open', fromUserId: admin.id, assignedTo: admin.id,
    participants: byType('advertiser').slice(0, 4).map((x, i) => ({ userId: x.ownerId, read: i === 0 })), startedDaysAgo: 4,
    messages: [{ sender: admin.id, role: 'customer', text: 'Quick guide: ads need 1200x675 creatives and a clear CTA link. Ask here if unsure.' }] });

  await insertChunked(S.conversations, convRows, 40);
  await insertChunked(S.conversationParticipants, partRows, 200);
  await insertChunked(S.conversationMessages, msgRows, 150);
  console.log(`✅ Conversations: ${convRows.length}   Messages: ${msgRows.length}`);

  // ---------------------------------------------------------------------
  // subscribers (newsletter) — separate from users
  // ---------------------------------------------------------------------
  // Newsletter subscribers are just email addresses — deliberately NOT users.
  const subRows = [
    ...Array.from({ length: 50 }, (_, i) => ({ email: `newsletter${pad(i + 1)}@${DEMO_DOMAIN}`, subscribedAt: daysFromNow(-int(0, 200)) })),
  ].map((s) => ({ id: uuid(), ...s, createdAt: s.subscribedAt, updatedAt: s.subscribedAt }));
  await insertChunked(S.subscribers, subRows);
  // A few have unsubscribed, and two newsletters went out, so the admin newsletter screens have something to show.
  await db.update(S.subscribers).set({ unsubscribedAt: daysFromNow(-int(1, 20)) }).where(inArray(S.subscribers.id, subRows.slice(0, 4).map((r) => r.id)));
  await insertChunked(S.newsletters, [
    { subject: 'New autumn treks are open', body: 'Our autumn departures for Everest Base Camp, Annapurna and Langtang are now open.\n\nBook before the end of the month for the best dates.', sentAt: daysFromNow(-40) },
    { subject: 'Festival season in Kathmandu', body: 'Dashain and Tihar are the best time to see the valley at its most colourful.\n\nHere are three short tours that fit around the festivals.', sentAt: daysFromNow(-12) },
  ].map((n) => ({ id: uuid(), ...n, sentBy: demoAdmin.id, status: 'sent', recipientCount: subRows.length, sentCount: subRows.length - 1, failedCount: 1, createdAt: n.sentAt, updatedAt: n.sentAt })));
  console.log(`✅ Subscribers: ${subRows.length} (4 unsubscribed)   Newsletters: 2`);

  // ---------------------------------------------------------------------
  // posts, comments, wishlists
  // ---------------------------------------------------------------------
  const POSTS = [
    ['10 Tips for Trekking in the Annapurna Region', ['trekking', 'annapurna', 'tips']], ['A Food Lover’s Guide to Kathmandu', ['food', 'kathmandu']], ['Best Time to Visit Nepal', ['planning', 'weather']],
    ['Packing List for a First Himalayan Trek', ['gear', 'packing']], ['Responsible Tourism in the Mountains', ['sustainability']], ['Why Bardia Beats Chitwan for Tigers', ['wildlife', 'bardia']],
  ] as const;
  const postRows = POSTS.map(([title, tags], i) => ({ id: uuid(), title, content: richDoc(`${title}. ${'Nepal rewards travellers who plan ahead and travel slowly. '.repeat(4)}`), authorId: sellers[i].id, tags: [...tags], image: img(`post-${i}`), status: i === 5 ? ('Draft' as const) : ('Published' as const), likes: int(0, 60), views: int(20, 2000), enableComments: true, createdAt: daysFromNow(-int(5, 100)), updatedAt: new Date() }));
  await insertChunked(S.posts, postRows);
  const commentRows: Array<Insert<typeof S.comments>> = [];
  postRows.filter((p) => p.status === 'Published').forEach((p) => {
    for (let k = 0; k < 3; k++) {
      const cid = uuid();
      commentRows.push({ id: cid, postId: p.id, userId: pick(customers).id, parentId: null, text: pick(['Such a helpful post, thank you!', 'Doing this next spring — any more tips?', 'Great read, bookmarked.']), approve: k !== 2, likes: int(0, 8), views: int(1, 30) });
      if (k === 0) commentRows.push({ id: uuid(), postId: p.id, userId: p.authorId, parentId: cid, text: 'Glad it helped! Message us any time.', approve: true, likes: int(0, 3), views: 2 });
    }
  });
  await insertChunked(S.comments, commentRows);
  await insertChunked(S.userWishlists, customers.flatMap((c) => shuffle(liveTours.filter((t) => t.spec.status === 'Published')).slice(0, int(0, 3)).map((t) => ({ userId: c.id, tourId: t.id }))));
  console.log('✅ Posts, comments, wishlists');

  // ---------------------------------------------------------------------
  // notifications
  // ---------------------------------------------------------------------
  const notifRows: Array<Insert<typeof S.notifications>> = [];
  const addNotif = (recipientId: string, type: Insert<typeof S.notifications>['type'], title: string, message: string, data?: Record<string, unknown>) => notifRows.push({ id: uuid(), recipientId, senderId: admin.id, type, title, message, data: data ?? null, isRead: chance(0.4), createdAt: daysFromNow(-int(0, 30)), updatedAt: new Date() });
  approvedPartners.forEach((p) => {
    addNotif(p.ownerId, 'business_partner_approved', 'Your business was approved', `${p.name} is now live on TourBNT.`, { businessPartnerId: p.id });
    if (chance(0.6)) addNotif(p.ownerId, 'business_review_received', 'New review received', `A traveller left a review for ${p.name}.`, { businessPartnerId: p.id });
  });
  partners.filter((p) => p.status === 'rejected').forEach((p) => addNotif(p.ownerId, 'business_partner_rejected', 'Your application was rejected', `${p.name}: please review the reason and reapply.`, { businessPartnerId: p.id }));
  adRows.forEach((a) => { const owner = partners.find((p) => p.id === a.businessPartnerId)!; if (a.approvalStatus === 'approved') addNotif(owner.ownerId, 'ad_approved', 'Your ad was approved', `"${a.title}" is now eligible to run.`, { adId: a.id }); if (a.approvalStatus === 'rejected') addNotif(owner.ownerId, 'ad_rejected', 'Your ad was rejected', a.rejectionReason ?? 'Your ad did not meet our guidelines.', { adId: a.id }); });
  reqRows.slice(0, 120).forEach((r) => { const p = partners.find((x) => x.id === r.businessPartnerId)!; const map: Record<RequestStatus, Insert<typeof S.notifications>['type']> = { pending: 'itinerary_request_created', confirmed: 'itinerary_request_confirmed', declined: 'itinerary_request_declined', held: 'itinerary_request_held', countered: 'itinerary_request_countered', expired: 'itinerary_request_expired' }; addNotif(r.status === 'pending' ? p.ownerId : tourRecs.find((t) => t.id === r.tourId)!.sellerId, map[r.status ?? 'pending'], `Service request ${r.status}`, `Request for ${r.serviceDate} is ${r.status}.`, { requestId: r.id, tourId: r.tourId }); });
  sellers.forEach((s) => { addNotif(s.id, 'destination_approved', 'Destination approved', 'Your destination request was approved.'); addNotif(s.id, 'general', 'Welcome to TourBNT', 'Your seller account is ready — start adding tours!'); });
  await insertChunked(S.notifications, notifRows, 150);
  console.log(`✅ Notifications: ${notifRows.length}`);

  // counters
  await db.execute(sql`update global_destinations d set usage_count = (select count(*) from tours t where t.destination_id = d.id), seller_count = greatest(seller_count, 1) where d.id in (select destination_id from tours where code like 'DEMO-%')`);
  await db.execute(sql`update global_categories c set usage_count = (select count(*) from tour_categories tc where tc.category_id = c.id)`);

  writeCredentials();
  console.log(`\nDone. Password for every demo account: ${DEMO_PASSWORD}\nCredentials written to docs/demo-accounts.md`);
}

function writeCredentials() {
  const groups = new Map<string, Acct[]>();
  accounts.forEach((a) => { if (!groups.has(a.group)) groups.set(a.group, []); groups.get(a.group)!.push(a); });
  const lines: string[] = [
    '# Demo accounts',
    '',
    `Generated by \`server/src/scripts/seedDemoData.ts\`. **Password for every account: \`${DEMO_PASSWORD}\`**`,
    '',
    'Remove all demo data again with `npm run demo:wipe --prefix server`.',
    '',
    '| Group | Count |', '|---|---|',
    ...[...groups.entries()].map(([g, a]) => `| ${g} | ${a.length} |`),
    '',
    '> The pre-existing admin (`sus.hill.dhakal@gmail.com`) and the older `*@example.com` seed users are untouched.',
    '',
  ];
  for (const [g, list] of groups) {
    lines.push(`## ${g} (${list.length})`, '', '| Email | Name | Role | Note |', '|---|---|---|---|');
    list.forEach((a) => lines.push(`| ${a.email} | ${a.name} | ${a.role} | ${a.note} |`));
    lines.push('');
  }
  const out = path.resolve(__dirname, '../../../docs/demo-accounts.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, lines.join('\n'));
  const csv = ['group,email,password,name,role,note', ...accounts.map((a) => [a.group, a.email, DEMO_PASSWORD, a.name, a.role, a.note].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))];
  fs.writeFileSync(path.resolve(__dirname, '../../../docs/demo-accounts.csv'), csv.join('\n'));
}

seed()
  .then(() => process.exit(0))
  .catch((err) => { console.error('Seeding failed:', err); process.exit(1); });
