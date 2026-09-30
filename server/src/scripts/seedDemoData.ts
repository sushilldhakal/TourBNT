/**
 * Full demo dataset for admin/seller/partner/customer testing.
 *
 *   npm run seed:demo --prefix server          # wipe previous demo rows, re-seed
 *   npm run seed:demo --prefix server -- --wipe # only remove demo rows
 *
 * Everything this script creates is tagged so it can be removed again:
 *   - users:          email ends with @demo.tourbnt.test
 *   - tours:          code starts with DEMO-
 *   - subscribers:    email ends with @demo.tourbnt.test
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
import { sql, eq, inArray } from 'drizzle-orm';
import * as S from '@tourbnt/db';

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

async function insertChunked<T extends Record<string, unknown>>(table: any, rows: T[], size = 150) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as any).onConflictDoNothing();
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
const ADVERTISER_NAMES = ['Everest Gear Outfitters', 'Nepal Trekking Supplies', 'TrekLight Headlamps', 'Sherpa Outdoor Apparel', 'Mountain Bites Energy Bars', 'Lakeside Spa & Wellness', 'Himal Travel Insurance', 'NepCab Ride Share', 'Summit Photography Workshops', 'Kathmandu Handicraft Emporium',
  'PeakFit Gyms', 'Cheap Watches Outlet', 'Global SIM Cards Nepal', 'QuickLoan Nepal'];

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

// tour blueprints (seller index refers to the approved-seller list)
interface TourSpec { title: string; dest: string; cat: string; days: number; price: number; sale?: number; seller: number; status: 'Published' | 'Draft' | 'Archived'; schedule: 'multiple' | 'fixed' | 'flexible'; highlights: string[]; max: number }
const TOUR_SPECS: TourSpec[] = [
  { title: 'Annapurna Base Camp Trek', dest: 'Annapurna Region', cat: 'Trekking & Hiking', days: 12, price: 1150, sale: 990, seller: 0, status: 'Published', schedule: 'multiple', max: 12, highlights: ['Ghandruk village', 'Chomrong stone steps', 'Machapuchare Base Camp', 'Annapurna Sanctuary', 'Hot springs at Jhinu'] },
  { title: 'Poon Hill Sunrise Trek', dest: 'Annapurna Region', cat: 'Trekking & Hiking', days: 5, price: 520, seller: 0, status: 'Published', schedule: 'multiple', max: 14, highlights: ['Ulleri stairs', 'Ghorepani rhododendron forest', 'Poon Hill sunrise', 'Tadapani'] },
  { title: 'Pokhara Adventure Weekend', dest: 'Pokhara', cat: 'Adventure Sports', days: 3, price: 340, sale: 299, seller: 1, status: 'Published', schedule: 'flexible', max: 10, highlights: ['Tandem paragliding', 'Phewa Lake boating', 'Zip-line at Sarangkot', 'Ultralight flight'] },
  { title: 'Langtang Valley Trek', dest: 'Langtang Valley', cat: 'Trekking & Hiking', days: 8, price: 780, seller: 1, status: 'Published', schedule: 'multiple', max: 10, highlights: ['Syabrubesi', 'Lama Hotel', 'Kyanjin Gompa', 'Tserko Ri viewpoint'] },
  { title: 'Upper Mustang Expedition', dest: 'Upper Mustang', cat: 'Luxury Escapes', days: 10, price: 2400, sale: 2150, seller: 2, status: 'Published', schedule: 'fixed', max: 8, highlights: ['Kagbeni gateway', 'Chele', 'Lo Manthang walled city', 'Cave monasteries'] },
  { title: 'Lumbini Buddhist Pilgrimage', dest: 'Lumbini', cat: 'Spiritual & Yoga', days: 4, price: 390, seller: 3, status: 'Published', schedule: 'flexible', max: 20, highlights: ['Maya Devi Temple', 'Ashoka Pillar', 'World Peace Pagoda', 'Monastic zone'] },
  { title: 'Bhaktapur & Nagarkot Photography Tour', dest: 'Nagarkot', cat: 'Photography Tours', days: 3, price: 310, seller: 3, status: 'Published', schedule: 'multiple', max: 8, highlights: ['Bhaktapur Durbar Square', 'Pottery Square', 'Nagarkot sunrise', 'Changu Narayan'] },
  { title: 'Bardia Tiger Safari', dest: 'Bardia National Park', cat: 'Wildlife Safari', days: 4, price: 480, seller: 4, status: 'Published', schedule: 'multiple', max: 12, highlights: ['Jeep safari', 'Karnali river canoe', 'Tharu culture night', 'Dawn tiger tracking'] },
  { title: 'Kathmandu Food & Culture Walk', dest: 'Kathmandu Valley', cat: 'Cultural Tours', days: 2, price: 150, seller: 5, status: 'Published', schedule: 'flexible', max: 12, highlights: ['Asan bazaar tasting', 'Patan Durbar Square', 'Momo cooking class', 'Boudhanath kora'] },
  { title: 'Trishuli River Rafting', dest: 'Kathmandu Valley', cat: 'Rafting & Water Sports', days: 2, price: 220, sale: 190, seller: 5, status: 'Published', schedule: 'flexible', max: 16, highlights: ['Safety briefing', 'Grade III rapids', 'Riverside camp', 'Bonfire dinner'] },
  { title: 'Everest Helicopter Day Tour', dest: 'Everest Region', cat: 'Luxury Escapes', days: 1, price: 1450, seller: 6, status: 'Published', schedule: 'multiple', max: 5, highlights: ['Kala Patthar landing', 'Everest View Hotel breakfast', 'Khumbu glacier flyover'] },
  { title: 'Nepal Family Holiday', dest: 'Chitwan National Park', cat: 'Family Holidays', days: 9, price: 1650, seller: 7, status: 'Published', schedule: 'multiple', max: 10, highlights: ['Kathmandu sightseeing', 'Elephant breeding centre', 'Pokhara lakeside', 'Chitwan jungle activities'] },
  { title: 'Yoga & Meditation Retreat Pokhara', dest: 'Pokhara', cat: 'Spiritual & Yoga', days: 7, price: 690, seller: 8, status: 'Published', schedule: 'fixed', max: 14, highlights: ['Sunrise yoga', 'Silent meditation', 'Ayurvedic massage', 'Peace Stupa hike'] },
  { title: 'Mardi Himal Trek', dest: 'Annapurna Region', cat: 'Trekking & Hiking', days: 6, price: 560, seller: 9, status: 'Draft', schedule: 'multiple', max: 10, highlights: ['Forest camp', 'High Camp', 'Mardi Himal Base Camp'] },
  { title: 'Annapurna Circuit Classic', dest: 'Annapurna Region', cat: 'Trekking & Hiking', days: 15, price: 1390, seller: 9, status: 'Archived', schedule: 'multiple', max: 12, highlights: ['Besisahar', 'Manang acclimatisation', 'Thorong La Pass', 'Muktinath temple'] },
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
  const run = (q: any) => db.execute(q);

  await run(sql`delete from review_replies where user_id in ${demoUsers} or review_id in (select id from reviews where tour_id in ${demoTours} or user_id in ${demoUsers})`);
  await run(sql`delete from business_review_replies where user_id in ${demoUsers}`);
  await run(sql`delete from comments where user_id in ${demoUsers} or post_id in (select id from posts where author_id in ${demoUsers})`);
  await run(sql`delete from reviews where tour_id in ${demoTours} or user_id in ${demoUsers}`);
  await run(sql`delete from business_reviews where user_id in ${demoUsers}`);
  await run(sql`delete from bookings where tour_id in ${demoTours} or user_id in ${demoUsers}`);
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
  console.log('Seeding against:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  await wipe();
  if (process.argv.includes('--wipe')) { console.log('Wiped. Done.'); return; }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [admin] = await db.select().from(S.users).where(eq(S.users.role, 'admin')).limit(1);
  if (!admin) throw new Error('No admin user exists — run `npm run create-admin` first.');
  console.log('Admin reference:', admin.email);

  // ------------------------------ users ------------------------------
  const userRows: any[] = [];
  let avatarCounter = 1;
  const mkUser = (o: { email: string; name: string; role: string; group: string; note?: string; verified?: boolean; sellerInfo?: any; createdDaysAgo?: number; mediaFolder?: string }) => {
    const id = uuid();
    const created = daysFromNow(-(o.createdDaysAgo ?? int(5, 240)));
    userRows.push({
      id, name: o.name, email: `${o.email}@${DEMO_DOMAIN}`, password: passwordHash, role: o.role, avatar: avatar(avatarCounter++),
      phone: phone(), verified: o.verified ?? true, mediaFolder: o.mediaFolder ?? null, sellerInfo: o.sellerInfo ?? null, createdAt: created, updatedAt: created,
    });
    accounts.push({ id, name: o.name, email: `${o.email}@${DEMO_DOMAIN}`, role: o.role, group: o.group, note: o.note ?? '' });
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
  const pendingSellers = SELLER_COMPANIES.slice(10, 17).map((company, i) => mkUser({ email: `pending.seller${pad(i + 1)}`, name: personName(i + 11), role: 'user', group: 'Applicants – Sellers (pending)', note: company, sellerInfo: sellerInfoFor(company, i, 'pending', pick(['Kathmandu', 'Pokhara', 'Bhaktapur'])) }));
  const rejectedSellers = SELLER_COMPANIES.slice(17, 20).map((company, i) => mkUser({ email: `rejected.seller${pad(i + 1)}`, name: personName(i + 18), role: 'user', group: 'Applicants – Sellers (rejected)', note: company, sellerInfo: sellerInfoFor(company, i, 'rejected', 'Kathmandu') }));

  // customers: signed up through the site, wanting to book tours
  const customers = Array.from({ length: 60 }, (_, i) =>
    mkUser({ email: `customer${pad(i + 1)}`, name: personName(i + 20), role: 'user', group: 'Customers', verified: i % 9 !== 0, note: i % 9 === 0 ? 'Email not verified yet' : '' }));

  // ---------------------------------------------------------------------
  // business partners — owners + listings
  // ---------------------------------------------------------------------
  // pre-fetch reference data: destinations + categories (create what's missing)
  await insertChunked(S.globalDestinations, DEST_SPECS.map((d) => ({
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
  const partnerDests = allDests.filter((d) => ['Kathmandu Valley', 'Pokhara', 'Annapurna Region', 'Lumbini', 'Chitwan National Park', 'Nagarkot', 'Everest Region', 'Bardia National Park', 'Langtang Valley', 'Bandipur'].includes(d.name));

  interface Partner { id: string; ownerId: string; ownerEmail: string; type: string; name: string; destId: string; status: 'approved' | 'pending' | 'rejected'; slug: string }
  const partners: Partner[] = [];
  const partnerRows: any[] = [];
  const docRows: any[] = [];
  const DOC_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  const detailsFor = (type: string, i: number, extra?: any): Record<string, unknown> => {
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

  const makePartners = (
    type: 'hotel' | 'guesthouse' | 'restaurant' | 'guide' | 'transport' | 'advertiser',
    names: Array<{ name: string; extra?: any }>,
    counts: { approved: number; pending: number; rejected: number },
    groupLabel: string,
  ) => {
    names.forEach((n, i) => {
      const status: 'approved' | 'pending' | 'rejected' = i < counts.approved ? 'approved' : i < counts.approved + counts.pending ? 'pending' : 'rejected';
      const idx = status === 'approved' ? i : status === 'pending' ? i - counts.approved : i - counts.approved - counts.pending;
      const prefix = status === 'approved' ? '' : `${status}.`;
      const dest = partnerDests[(i + type.length) % partnerDests.length];
      const ownerName = type === 'guide' ? n.name.replace(/ Guiding Services$/, '') : personName(i + type.length * 13);
      const owner = mkUser({
        email: `${prefix}${type}${pad(idx + 1)}`, name: ownerName, role: status === 'approved' ? type : 'user',
        group: status === 'approved' ? groupLabel : `Applicants – ${groupLabel} (${status})`, note: n.name,
      });
      const id = uuid();
      const slug = `${slugify(n.name)}-demo`;
      const submitted = daysFromNow(-int(status === 'approved' ? 20 : 1, status === 'approved' ? 200 : 25));
      partnerRows.push({
        id, ownerId: owner.id, type, name: n.name, slug, description: descFor(type, n.name, dest.city ?? dest.name),
        logo: img(`logo-${slug}`, 256, 256), coverImage: img(`cover-${slug}`), email: `info.${slug}@${DEMO_DOMAIN}`, phone: phone(), website: `https://${slug}.example.com`,
        address: { address: `${int(1, 120)} ${pick(['Main Street', 'Lakeside Road', 'Temple Road', 'Bazaar Lane'])}`, city: dest.city ?? dest.name, state: dest.region, postalCode: `${int(33000, 44999)}`, country: 'Nepal' },
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
  makePartners('guesthouse', GUESTHOUSE_A.map((a) => ({ name: `${a} Guest House` })), { approved: 6, pending: 2, rejected: 2 }, 'Guesthouses');
  makePartners('restaurant', RESTAURANTS.map(([name, cuisine]) => ({ name, extra: { cuisine } })), { approved: 30, pending: 5, rejected: 2 }, 'Restaurants');
  makePartners('guide', GUIDE_NAMES.map((g) => ({ name: `${g} Guiding Services` })), { approved: 15, pending: 4, rejected: 2 }, 'Guides');
  makePartners('transport', TRANSPORT_NAMES.map((name) => ({ name })), { approved: 10, pending: 3, rejected: 1 }, 'Transport');
  makePartners('advertiser', ADVERTISER_NAMES.map((name) => ({ name, extra: { industry: pick(['Outdoor gear', 'Insurance', 'Wellness', 'Photography', 'Handicrafts', 'Fitness', 'Telecom']) } })), { approved: 10, pending: 3, rejected: 1 }, 'Advertisers');

  // ---- persist users, then partners (FK order) ----
  await insertChunked(S.users, userRows, 100);
  await insertChunked(S.businessPartners, partnerRows, 50);
  await insertChunked(S.businessDocuments, docRows, 150);
  console.log(`✅ Users: ${userRows.length}   Business partners: ${partnerRows.length}`);

  const approvedPartners = partners.filter((p) => p.status === 'approved');
  const byType = (t: string) => approvedPartners.filter((p) => p.type === t);

  // seller docs / directory targeting
  await insertChunked(S.businessPartnerCategories, approvedPartners.flatMap((p) => shuffle(allCats).slice(0, 2).map((c) => ({ businessPartnerId: p.id, categoryId: c.id }))));
  await insertChunked(S.businessPartnerDestinations, approvedPartners.flatMap((p) => [p.destId, pick(partnerDests).id].filter((v, i, a) => a.indexOf(v) === i).map((d) => ({ businessPartnerId: p.id, destinationId: d }))));

  // ---- capacity, unit types, blocks, overrides, guide availability ----
  const capRows: any[] = [], unitTypeRows: any[] = [], blockRows: any[] = [], overrideRows: any[] = [], availRows: any[] = [];
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
  const factRows: any[] = [], faqRows: any[] = [];
  const sellerFacts = new Map<string, any[]>(), sellerFaqs = new Map<string, any[]>();
  sellers.forEach((s) => {
    const f = [
      { id: uuid(), userId: s.id, name: 'Difficulty', fieldType: 'Single Select', value: [pick(['Easy', 'Moderate', 'Challenging'])], icon: 'fa/FaMountain' },
      { id: uuid(), userId: s.id, name: 'Group Type', fieldType: 'Multi Select', value: ['Solo', 'Family', 'Group'], icon: 'fa/FaUsers' },
      { id: uuid(), userId: s.id, name: 'Best Season', fieldType: 'Multi Select', value: ['Spring', 'Autumn'], icon: 'fa/FaSun' },
    ];
    const q = [
      { id: uuid(), userId: s.id, question: 'What is your cancellation policy?', answer: 'Full refund up to 30 days before departure, 50% up to 14 days, no refund within 14 days.' },
      { id: uuid(), userId: s.id, question: 'Do I need to be very fit?', answer: 'A moderate fitness level is recommended. Regular cardio for a few weeks before departure helps.' },
      { id: uuid(), userId: s.id, question: 'Are permits included?', answer: 'Yes — all entry permits and national park fees are included in the price.' },
    ];
    factRows.push(...f); faqRows.push(...q); sellerFacts.set(s.id, f); sellerFaqs.set(s.id, q);
  });
  await insertChunked(S.facts, factRows); await insertChunked(S.faqs, faqRows);

  await insertChunked(S.sellerSettings, sellers.map((s) => ({ sellerId: s.id, categorySettings: { autoAcceptNewCategories: true, defaultVisibility: true, hideEmptyCategories: false }, destinationSettings: { autoAcceptNewDestinations: true, defaultVisibility: true, groupByCountry: false, showPopularFirst: true } })));
  await insertChunked(S.sellerCategoryPreferences, sellers.flatMap((s) => shuffle(allCats).slice(0, 4).map((c, i) => ({ sellerId: s.id, categoryId: c.id, isFavorite: i === 0, sortOrder: i, lastUsed: daysFromNow(-int(1, 30)) }))));
  await insertChunked(S.sellerDestinationPreferences, sellers.flatMap((s) => shuffle(allDests).slice(0, 4).map((d, i) => ({ sellerId: s.id, destinationId: d.id, isFavorite: i === 0, sortOrder: i, lastUsed: daysFromNow(-int(1, 30)) }))));
  await insertChunked(S.userSettings, sellers.map((s) => ({ userId: s.id, openaiApiKey: '', googleApiKey: '' })));

  await insertChunked(S.mediaAssets, sellers.flatMap((s, si) => [
    ...Array.from({ length: 4 }, (_, k) => ({ userId: s.id, kind: 'image', url: img(`gallery-${si}-${k}`), secureUrl: img(`gallery-${si}-${k}`), originalFilename: `photo-${k + 1}.jpg`, displayName: `Photo ${k + 1}`, publicId: `${s.id}/photo-${k + 1}`, width: 1200, height: 800, format: 'jpg', resourceType: 'image', tags: ['demo', 'tour'], bytes: int(120000, 900000), assetFolder: slugify(s.company) })),
    { userId: s.id, kind: 'pdf', url: DOC_URL, secureUrl: DOC_URL, originalFilename: 'brochure.pdf', displayName: 'Company brochure', publicId: `${s.id}/brochure`, format: 'pdf', resourceType: 'raw', pages: 4, bytes: 52000, tags: ['brochure'] },
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
  // tours
  // ---------------------------------------------------------------------
  interface TourRec { id: string; spec: TourSpec; code: string; sellerId: string; destId: string; departures: Date[]; itinerary: any[]; price: number; title: string }
  const tourRecs: TourRec[] = [];
  const tourRows: any[] = [], tourCatRows: any[] = [], tourAuthRows: any[] = [];

  TOUR_SPECS.forEach((spec, i) => {
    const id = uuid();
    const seller = sellers[spec.seller];
    const dest = destByName.get(spec.dest)!;
    const cat = catByName.get(spec.cat)!;
    const code = `DEMO-${pad(i + 1, 3)}`;
    const itinerary = Array.from({ length: spec.days }, (_, d) => {
      const title = d === 0 ? (spec.days === 1 ? `${spec.title} — full day` : 'Arrival & briefing') : d === spec.days - 1 ? 'Final day & departure' : spec.highlights[(d - 1) % spec.highlights.length];
      return { id: `day-${d + 1}`, day: `Day ${d + 1}`, title, description: d === 0 ? 'Meet your guide, trip briefing and equipment check.' : d === spec.days - 1 ? 'Breakfast, farewell and transfer to the airport or onward destination.' : `Full-day programme: ${spec.highlights[(d - 1) % spec.highlights.length]}. Lunch and refreshments included.`, partners: [] as unknown[] };
    });
    const nights = Math.max(0, spec.days - 1);
    // departures: 4 upcoming dates
    const departures = spec.schedule === 'flexible' ? [] : spec.schedule === 'fixed' ? [daysFromNow(int(25, 50))] : [daysFromNow(int(10, 18)), daysFromNow(int(35, 50)), daysFromNow(int(65, 85)), daysFromNow(int(110, 140))];
    departures.forEach((d) => d.setHours(0, 0, 0, 0));
    const tourDates: any = spec.schedule === 'flexible'
      ? { scheduleType: 'flexible', type: 'flexible', days: spec.days, nights, defaultDateRange: { from: isoDate(daysFromNow(1)), to: isoDate(daysFromNow(270)) }, capacity: spec.max }
      : spec.schedule === 'fixed'
        ? { scheduleType: 'fixed', type: 'fixed', days: spec.days, nights, defaultDateRange: { from: isoDate(departures[0]), to: isoDate(new Date(departures[0].getTime() + (spec.days - 1) * 86400000)) }, capacity: spec.max }
        : { scheduleType: 'multiple', type: 'multiple', days: spec.days, nights, defaultDateRange: { from: isoDate(departures[0]), to: isoDate(departures[departures.length - 1]) }, capacity: spec.max,
            departures: departures.map((d, k) => ({ id: `dep-${k + 1}`, label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }), dateRange: { from: isoDate(d), to: isoDate(new Date(d.getTime() + (spec.days - 1) * 86400000)) }, capacity: spec.max })) };

    const coverImage = img(`tour-${code}`, 1600, 900);
    const sf = sellerFacts.get(seller.id)!, sq = sellerFaqs.get(seller.id)!;
    const onSale = !!spec.sale;
    const created = daysFromNow(-int(30, 200));
    tourRows.push({
      id, title: spec.title, code, description: richDoc(`${spec.title}: ${spec.highlights.join(', ')}. Led by experienced local guides with small groups, full logistics support and flexible pacing. Suitable for travellers who want a well-organised and authentic experience in ${spec.dest}.`),
      excerpt: `${spec.days}-day journey through ${spec.dest} featuring ${spec.highlights.slice(0, 3).join(', ')}.`, tourStatus: spec.status, coverImage, destinationId: dest.id,
      itinerary, include: CONTENT_INCLUDE, exclude: CONTENT_EXCLUDE,
      facts: sf.map((f) => ({ factId: f.id, name: f.name, field_type: f.fieldType, value: f.value, icon: f.icon })),
      faqs: sq.map((f) => ({ faqId: f.id, question: f.question, answer: f.answer })),
      gallery: [0, 1, 2, 3].map((k) => ({ image: k === 0 ? coverImage : img(`tour-${code}-${k}`), alt: `${spec.title} ${k + 1}`, sortOrder: k, isFeatured: k === 0 })),
      location: { city: dest.city ?? dest.name, country: 'Nepal' },
      discount: onSale ? { type: 'percentage', value: Math.round((1 - spec.sale! / spec.price) * 100), dateRange: { from: isoDate(daysFromNow(-20)), to: isoDate(daysFromNow(200)) } } : null,
      pricingOptions: [
        { id: 'opt-adult', name: 'Adult', price: spec.price, category: 'adult', paxRange: { min: 1, max: spec.max }, discountEnabled: onSale, discount: onSale ? { type: 'price', value: spec.price - spec.sale! } : undefined, isActive: true },
        { id: 'opt-child', name: 'Child', price: Math.round(spec.price * 0.6), category: 'child', paxRange: { min: 1, max: spec.max }, discountEnabled: false, isActive: true },
      ],
      tourDates, enquiry: true, isSpecialOffer: onSale, price: spec.price, pricePerPerson: true, minSize: 1, maxSize: spec.max, groupSize: 1,
      saleEnabled: onSale, salePrice: spec.sale ?? null, priceLockDate: daysFromNow(200), pricingOptionsEnabled: true, fixedDeparture: spec.schedule !== 'flexible', multipleDates: spec.schedule === 'multiple',
      views: int(100, 9000), paymentOptions: { fullPaymentEnabled: true, depositEnabled: true, depositPercentage: 30, payOnArrivalEnabled: i % 3 === 0 },
      createdAt: created, updatedAt: created,
    });
    tourCatRows.push({ tourId: id, categoryId: cat.id });
    tourAuthRows.push({ tourId: id, userId: seller.id });
    tourRecs.push({ id, spec, code, sellerId: seller.id, destId: dest.id, departures, itinerary, price: spec.sale ?? spec.price, title: spec.title });
  });
  await insertChunked(S.tours, tourRows, 10);
  await insertChunked(S.tourCategories, tourCatRows);
  await insertChunked(S.tourAuthors, tourAuthRows);
  console.log(`✅ Tours: ${tourRecs.length}`);

  // ---------------------------------------------------------------------
  // bookings
  // ---------------------------------------------------------------------
  const liveTours = tourRecs.filter((t) => t.spec.status !== 'Draft');
  const bookingRows: any[] = [];
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
      const adultPrice = tour.price, childPrice = Math.round(tour.price * 0.6);
      const total = adults * adultPrice + children * childPrice;
      const paymentType = pick(['full_payment', 'full_payment', 'deposit_percentage', 'pay_on_arrival'] as const);
      const dueNow = paymentType === 'full_payment' ? total : paymentType === 'deposit_percentage' ? Math.round(total * 0.3) : 0;
      let paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded' = 'unpaid', paid = 0;
      if (status === 'confirmed' || status === 'completed') { if (paymentType === 'full_payment' || status === 'completed') { paymentStatus = 'paid'; paid = total; } else if (paymentType === 'deposit_percentage') { paymentStatus = 'partial'; paid = dueNow; } }
      if (status === 'cancelled') { if (dueNow > 0 && chance(0.6)) { paymentStatus = 'refunded'; paid = 0; } }
      if (status === 'pending' && paymentType === 'full_payment' && chance(0.3)) { paymentStatus = 'paid'; paid = total; }
      const bookedAt = new Date(departure.getTime() - int(10, 60) * 86400000);
      const guestInfo = isGuest ? { fullName: personName(bkSeq + 5), email: `guest${bkSeq}@${DEMO_DOMAIN}`, phone: phone(), country: pick(COUNTRIES) } : null;
      const contact = isGuest ? guestInfo! : { fullName: cust.name, email: cust.email, phone: phone() };
      const id = uuid();
      bookingRows.push({
        id, tourId: tour.id, tourTitle: tour.title, tourCode: tour.code, userId: isGuest ? null : cust.id, isGuestBooking: isGuest, guestInfo,
        departureDate: departure, participants: { adults, children, infants },
        travelers: Array.from({ length: adults + children + infants }, (_, k) => ({ fullName: k === 0 ? contact.fullName : personName(bkSeq + k + 40), type: k < adults ? 'adult' : k < adults + children ? 'child' : 'infant', nationality: pick(COUNTRIES) })),
        pricingOptionId: 'opt-adult',
        pricing: { basePrice: tour.spec.price, adultPrice, childPrice, infantPrice: 0, totalPrice: total, currency: 'USD', amountDueNow: dueNow, amountDueLater: total - dueNow, ...(paymentType === 'deposit_percentage' ? { depositPercentage: 30 } : {}) },
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
  await insertChunked(S.bookings, bookingRows, 40);
  // tour.bookingCount
  for (const t of tourRecs) {
    const c = bookingRecs.filter((b) => b.tour.id === t.id && b.status !== 'cancelled').length;
    await db.update(S.tours).set({ bookingCount: c }).where(eq(S.tours.id, t.id));
  }
  console.log(`✅ Bookings: ${bookingRows.length}`);

  // ---------------------------------------------------------------------
  // tour reviews (+ replies) and aggregates
  // ---------------------------------------------------------------------
  const tourReviewRows: any[] = [], tourReplyRows: any[] = [];
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
  const bizReviewRows: any[] = [], bizReplyRows: any[] = [], bizLikeRows: any[] = [];
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
    (p as any).agg = { total: reviewers.length, ...agg };
  }
  await insertChunked(S.businessReviews, bizReviewRows);
  await insertChunked(S.businessReviewReplies, bizReplyRows);
  await insertChunked(S.businessReviewLikes, bizLikeRows);
  for (const p of approvedPartners) {
    const a = (p as any).agg; if (!a) continue;
    await db.update(S.businessPartners).set({ reviewCount: a.total, approvedReviewCount: a.approved, averageRating: a.approved ? Math.round((a.sum / a.approved) * 10) / 10 : 0 }).where(eq(S.businessPartners.id, p.id));
  }
  console.log(`✅ Business reviews: ${bizReviewRows.length}`);

  // ---------------------------------------------------------------------
  // itinerary partners + supplier requests (drives /dashboard/operations)
  // ---------------------------------------------------------------------
  const linkRows: any[] = [];
  interface Link { id: string; tour: TourRec; dayIdx: number; role: string; partner: Partner; unitTypeId: string | null; unitType: string | null; units: number }
  const links: Link[] = [];
  const nearest = (type: string | string[], destId: string): Partner => {
    const types = Array.isArray(type) ? type : [type];
    const pool = approvedPartners.filter((p) => types.includes(p.type));
    const local = pool.filter((p) => p.destId === destId);
    return pick(local.length ? local : pool);
  };
  for (const tour of tourRecs) {
    const last = tour.itinerary.length - 1;
    const plan: Array<{ day: number; role: string; types: string[] }> = [
      { day: 0, role: 'transport', types: ['transport'] },
      { day: 0, role: 'accommodation', types: ['hotel', 'guesthouse'] },
      { day: 0, role: 'meals', types: ['restaurant'] },
      { day: Math.min(1, last), role: 'guide', types: ['guide'] },
      ...(last >= 2 ? [{ day: Math.floor(last / 2), role: 'accommodation', types: ['hotel', 'guesthouse'] }] : []),
      ...(last >= 2 ? [{ day: Math.floor(last / 2), role: 'meals', types: ['restaurant'] }] : []),
      { day: last, role: 'transport', types: ['transport'] },
    ];
    plan.forEach((pl, sortOrder) => {
      const partner = nearest(pl.types, tour.destId);
      const uts = unitTypesByPartner.get(partner.id) ?? [];
      const ut = uts.length ? pick(uts) : null;
      const units = pl.role === 'guide' ? 1 : Math.min(ut ? Math.max(1, ut.totalUnits) : tour.spec.max, Math.max(2, Math.ceil(tour.spec.max / (pl.role === 'accommodation' ? 2 : 1))));
      const id = uuid();
      linkRows.push({ id, tourId: tour.id, dayId: `day-${pl.day + 1}`, role: pl.role, businessPartnerId: partner.id, name: partner.name, notes: null, sortOrder, unitsRequested: pl.role === 'guide' ? null : units, unitType: ut?.name ?? null, unitTypeId: ut?.id ?? null });
      links.push({ id, tour, dayIdx: pl.day, role: pl.role, partner, unitTypeId: ut?.id ?? null, unitType: ut?.name ?? null, units });
    });
    // one free-typed (unlinked) partner per tour, like the real editor allows
    linkRows.push({ id: uuid(), tourId: tour.id, dayId: 'day-1', role: 'other', businessPartnerId: null, name: 'Welcome flower garland (local florist)', notes: 'Arranged by the agency directly', sortOrder: 99 });
  }
  await insertChunked(S.tourItineraryPartners, linkRows);

  const reqRows: any[] = [], eventRows: any[] = [], contribRows: any[] = [];
  const reqKey = new Set<string>();
  const STATUS_WEIGHTS: Array<[string, number]> = [['confirmed', 44], ['pending', 20], ['held', 10], ['countered', 8], ['declined', 10], ['expired', 8]];
  const pickStatus = () => { let r = rnd() * 100; for (const [s, w] of STATUS_WEIGHTS) { if ((r -= w) < 0) return s; } return 'pending'; };
  const addRequest = (link: Link, serviceDate: Date, headcount: number, sourceDeparture: Date | null, forcedStatus?: string) => {
    const dateStr = isoDate(serviceDate);
    const time = link.role === 'meals' ? '19:00' : link.role === 'guide' ? '09:00' : null;
    const key = `${link.id}|${dateStr}|${time}`;
    if (reqKey.has(key)) return null;
    reqKey.add(key);
    const status = forcedStatus ?? pickStatus();
    const id = uuid();
    const created = daysFromNow(-int(1, 25));
    const responded = status === 'pending' ? null : new Date(created.getTime() + int(2, 40) * 3600000);
    const row: any = {
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
  // advertisements
  // ---------------------------------------------------------------------
  const SLOTS = ['tour_detail', 'tour_sidebar', 'hotel_page', 'search_results', 'homepage'] as const;
  const adRows: any[] = [], adCatRows: any[] = [], adDestRows: any[] = [], adStatRows: any[] = [];
  const advertisers = partners.filter((p) => p.type === 'advertiser');
  const adOwners = [...advertisers, ...approvedPartners.filter((p) => ['hotel', 'restaurant', 'transport'].includes(p.type)).slice(0, 6)];
  const adPitch = ['Gear up for the trail — 15% off for TourBNT travellers', 'Stay hydrated, stay safe: lightweight trekking essentials', 'Relax after your trek with a mountain spa package', 'Travel insurance that covers high-altitude trekking', 'Book your airport ride in advance and save', 'Hand-made Nepali souvenirs shipped worldwide', 'Learn mountain photography from the pros', 'Stay connected — tourist SIM with 30GB data', 'Try our famous dal bhat set — unlimited refills', 'Comfort vans for groups of 6 to 12'];
  adOwners.forEach((p, pi) => {
    const nAds = p.status === 'approved' ? int(1, 3) : 1;
    for (let k = 0; k < nAds; k++) {
      const id = uuid();
      const r = rnd();
      const approval = p.status !== 'approved' ? 'pending' : r < 0.65 ? 'approved' : r < 0.85 ? 'pending' : 'rejected';
      const campaign = approval !== 'approved' ? 'draft' : pick(['active', 'active', 'active', 'paused', 'ended'] as const);
      const slot = SLOTS[(pi + k) % SLOTS.length];
      const impressions = campaign === 'draft' ? 0 : int(800, 60000);
      const clicks = Math.floor(impressions * (0.01 + rnd() * 0.05));
      const submitted = daysFromNow(-int(5, 60));
      adRows.push({
        id, businessPartnerId: p.id, title: `${p.name} — ${pick(['Autumn offer', 'Spring campaign', 'Trek season special', 'Festival promo'])}`, description: pick(adPitch), imageUrl: img(`ad-${id}`, 800, 450),
        ctaLabel: pick(['Learn more', 'Book now', 'Shop now', 'Get a quote']), ctaUrl: `https://${p.slug}.example.com/promo`, placementSlot: slot, campaignStatus: campaign,
        startDate: campaign === 'ended' ? daysFromNow(-60) : daysFromNow(-int(1, 30)), endDate: campaign === 'ended' ? daysFromNow(-5) : daysFromNow(int(20, 120)),
        isApproved: approval === 'approved', approvalStatus: approval, approvedBy: approval === 'approved' ? admin.id : null, approvedAt: approval === 'approved' ? new Date(submitted.getTime() + 86400000) : null,
        rejectedBy: approval === 'rejected' ? admin.id : null, rejectedAt: approval === 'rejected' ? daysFromNow(-3) : null, rejectionReason: approval === 'rejected' ? 'Creative does not meet advertising guidelines (low-resolution image).' : null,
        submittedAt: submitted, impressionCount: impressions, clickCount: clicks, isPaid: approval === 'approved' && chance(0.7), createdAt: submitted, updatedAt: submitted,
      });
      shuffle(allCats).slice(0, 2).forEach((c) => adCatRows.push({ adId: id, categoryId: c.id }));
      shuffle(partnerDests).slice(0, 2).forEach((d) => adDestRows.push({ adId: id, destinationId: d.id }));
      if (impressions > 0) for (let d = 0; d < 14; d++) { const imp = Math.floor(impressions / 14 * (0.5 + rnd())); adStatRows.push({ id: uuid(), adId: id, date: isoDate(daysFromNow(-d)), impressions: imp, clicks: Math.floor(imp * (0.01 + rnd() * 0.05)) }); }
    }
  });
  await insertChunked(S.advertisements, adRows, 40);
  await insertChunked(S.adCategoryTargets, adCatRows);
  await insertChunked(S.adDestinationTargets, adDestRows);
  await insertChunked(S.adDailyStats, adStatRows, 200);
  console.log(`✅ Ads: ${adRows.length}`);

  // ---------------------------------------------------------------------
  // messaging
  // ---------------------------------------------------------------------
  const convRows: any[] = [], partRows: any[] = [], msgRows: any[] = [];
  const ENQ_Q = ['Is {t} suitable for a beginner? I have only done day hikes before.', 'Can you arrange a private departure of {t} for 6 people next month?', 'Do you offer a group discount on {t}?', 'What happens if my flight is delayed and I miss the start of {t}?', 'Is vegetarian food available throughout {t}?', 'Can we add an extra night in Pokhara before {t}?', 'What is the best month to do {t}, and what gear should I bring?'];
  const ENQ_A = ['Thanks for your interest! Yes, it is suitable for beginners — we keep a moderate pace with a support crew.', 'Absolutely, we can set up a private departure. I will send a quote shortly.', 'Groups of 8+ receive 10% off. Shall I prepare a proposal?', 'Please message us as soon as you know — we will rebook you on the next departure at no cost.', 'Yes, every meal has vegetarian options.', 'Of course — I can add hotel nights for you. Which dates?'];
  const ENQ_F = ['That sounds great, please send more details.', 'Thank you! We will confirm by the end of the week.', 'Perfect, we would like to go ahead.'];
  let msgClock = 0;
  const addConv = (c: { type: string; subject: string; status: string; fromUserId?: string | null; guestName?: string; guestEmail?: string; tourId?: string | null; assignedTo?: string | null; broadcastAudience?: string; allowReplies?: boolean; groupName?: string; participants: Array<{ userId: string; read?: boolean; archived?: boolean }>; messages: Array<{ sender: string | null; role: 'customer' | 'support'; text: string }>; startedDaysAgo: number }) => {
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
   [byType('transport')[0], 'Vehicle request declined — please review', 'We saw you declined a vehicle request for next week. Is there anything we can do to help?', 'Sorry, both vans are in the workshop. We can do it the following week.']].forEach((row: any, i) => {
    const target = row[0].ownerId ?? row[0].id;
    addConv({ type: 'direct', subject: row[1], status: pick(['open', 'replied'] as const), fromUserId: admin.id, assignedTo: admin.id, participants: [{ userId: target, read: i % 2 === 0 }], startedDaysAgo: int(1, 14),
      messages: [{ sender: admin.id, role: 'customer', text: row[2] }, { sender: target, role: 'support', text: row[3] }] });
  });
  // group threads
  addConv({ type: 'group', groupName: 'Kathmandu Ops Team', subject: 'Kathmandu Ops Team', status: 'open', fromUserId: admin.id, assignedTo: admin.id,
    participants: [sellers[4], sellers[5], byType('transport')[0], byType('hotel')[1], byType('guide')[1]].map((x: any, i) => ({ userId: x.ownerId ?? x.id, read: i < 2 })), startedDaysAgo: 9,
    messages: [{ sender: admin.id, role: 'customer', text: 'Welcome to the ops group for the upcoming Kathmandu cultural departures. Please post blockers here.' }, { sender: sellers[4].id, role: 'support', text: 'Group of 12 arriving Monday — we need a coach from the airport at 09:30.' }, { sender: byType('transport')[0].ownerId, role: 'support', text: 'Confirmed, a 45-seater will be there.' }] });
  addConv({ type: 'group', groupName: 'Trek Leaders', subject: 'Trek Leaders', status: 'replied', fromUserId: admin.id, assignedTo: admin.id,
    participants: [sellers[0], sellers[1], sellers[9], byType('guide')[2], byType('guide')[3]].map((x: any) => ({ userId: x.ownerId ?? x.id, read: true })), startedDaysAgo: 18,
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
  console.log(`✅ Subscribers: ${subRows.length}`);

  // ---------------------------------------------------------------------
  // posts, comments, wishlists
  // ---------------------------------------------------------------------
  const POSTS = [
    ['10 Tips for Trekking in the Annapurna Region', ['trekking', 'annapurna', 'tips']], ['A Food Lover’s Guide to Kathmandu', ['food', 'kathmandu']], ['Best Time to Visit Nepal', ['planning', 'weather']],
    ['Packing List for a First Himalayan Trek', ['gear', 'packing']], ['Responsible Tourism in the Mountains', ['sustainability']], ['Why Bardia Beats Chitwan for Tigers', ['wildlife', 'bardia']],
  ] as const;
  const postRows = POSTS.map(([title, tags], i) => ({ id: uuid(), title, content: richDoc(`${title}. ${'Nepal rewards travellers who plan ahead and travel slowly. '.repeat(4)}`), authorId: sellers[i].id, tags: [...tags], image: img(`post-${i}`), status: i === 5 ? 'Draft' : 'Published', likes: int(0, 60), views: int(20, 2000), enableComments: true, createdAt: daysFromNow(-int(5, 100)), updatedAt: new Date() }));
  await insertChunked(S.posts, postRows);
  const commentRows: any[] = [];
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
  const notifRows: any[] = [];
  const addNotif = (recipientId: string, type: string, title: string, message: string, data?: any) => notifRows.push({ id: uuid(), recipientId, senderId: admin.id, type, title, message, data: data ?? null, isRead: chance(0.4), createdAt: daysFromNow(-int(0, 30)), updatedAt: new Date() });
  approvedPartners.forEach((p) => {
    addNotif(p.ownerId, 'business_partner_approved', 'Your business was approved', `${p.name} is now live on TourBNT.`, { businessPartnerId: p.id });
    if (chance(0.6)) addNotif(p.ownerId, 'business_review_received', 'New review received', `A traveller left a review for ${p.name}.`, { businessPartnerId: p.id });
  });
  partners.filter((p) => p.status === 'rejected').forEach((p) => addNotif(p.ownerId, 'business_partner_rejected', 'Your application was rejected', `${p.name}: please review the reason and reapply.`, { businessPartnerId: p.id }));
  adRows.forEach((a) => { const owner = partners.find((p) => p.id === a.businessPartnerId)!; if (a.approvalStatus === 'approved') addNotif(owner.ownerId, 'ad_approved', 'Your ad was approved', `"${a.title}" is now eligible to run.`, { adId: a.id }); if (a.approvalStatus === 'rejected') addNotif(owner.ownerId, 'ad_rejected', 'Your ad was rejected', a.rejectionReason, { adId: a.id }); });
  reqRows.slice(0, 120).forEach((r) => { const p = partners.find((x) => x.id === r.businessPartnerId)!; const map: Record<string, string> = { pending: 'itinerary_request_created', confirmed: 'itinerary_request_confirmed', declined: 'itinerary_request_declined', held: 'itinerary_request_held', countered: 'itinerary_request_countered', expired: 'itinerary_request_expired' }; addNotif(r.status === 'pending' ? p.ownerId : tourRecs.find((t) => t.id === r.tourId)!.sellerId, map[r.status], `Service request ${r.status}`, `Request for ${r.serviceDate} is ${r.status}.`, { requestId: r.id, tourId: r.tourId }); });
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
    'Remove all demo data again with `npm run seed:demo --prefix server -- --wipe`.',
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
