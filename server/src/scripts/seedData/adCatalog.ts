/**
 * Demo ad campaigns. Every campaign is written for the business that runs it (a headlamp brand
 * advertises headlamps, an insurer advertises cover), and its targets are chosen so it really
 * appears on the demo tours / destination pages / search results it is relevant to.
 *
 * How the site decides (server/src/api/ads/adTargeting.ts): an ad is shown only if it is approved,
 * paid, active and in date, AND the page shares one of its places AND (if it targets tour types)
 * one of its tour types. A business's own destination always counts as one of its places.
 * Pages: tour detail (tour_sidebar), tours search / destination pages (search_results),
 * hotel profile pages (hotel_page — places only, no tour types).
 *
 * Link: the business's own profile page on this site (/partners/<type>/<slug>) — a real page
 * for every business, so a click always lands somewhere that exists.
 */
import type { Region } from './tourCatalog';

export type AdSlot = 'tour_sidebar' | 'tour_detail' | 'search_results' | 'hotel_page';
export type AdState = 'live' | 'pending' | 'unpaid' | 'paused' | 'ended' | 'rejected';

export interface AdvertiserSpec {
  name: string;
  industry: string;
  /** The town the business is based in (also one of the places its ads match). */
  home: Region;
  description: string;
}

export interface AdCampaign {
  /** Business name, exactly as in ADVERTISER_SPECS / the partner list. */
  owner: string;
  title: string;
  description: string;
  cta: string;
  slot: AdSlot;
  places: Region[];
  tourTypes: string[];
  state: AdState;
  billing: 'monthly' | 'per_view';
  /** Monthly: months bought. Per-view: months allowed to deliver. */
  months: number;
  /** Per-view only: views bought. */
  views?: number;
  rejectionReason?: string;
}

/**
 * Place-only campaigns (tourTypes: []) show on destination pages as well as tour pages — destination
 * pages send places but no tour types, and the site skips an ad that targets tour types the page lacks.
 */
/** Approved advertisers first (10), then 3 pending applicants and 1 rejected. */
export const ADVERTISER_SPECS: AdvertiserSpec[] = [
  { name: 'Everest Gear Outfitters', industry: 'Outdoor gear', home: 'Kathmandu Valley', description: 'Trekking gear rental and sales in Thamel: sleeping bags, down jackets, poles, boots and daypacks, with free fitting and repair.' },
  { name: 'Nepal Trekking Supplies', industry: 'Outdoor gear', home: 'Pokhara', description: 'Lakeside supplier of trail maps, water purification, first-aid kits and pre-packed trekking essentials for the Annapurna and Mustang routes.' },
  { name: 'TrekLight Headlamps', industry: 'Outdoor gear', home: 'Kathmandu Valley', description: 'Lightweight, rechargeable headlamps and lanterns built for pre-dawn summit pushes and long teahouse evenings.' },
  { name: 'Sherpa Outdoor Apparel', industry: 'Outdoor gear', home: 'Kathmandu Valley', description: 'Hand-finished down jackets, fleeces and base layers made in Kathmandu and tested on the Khumbu trail.' },
  { name: 'Mountain Bites Energy Bars', industry: 'Food & beverage', home: 'Pokhara', description: 'Nepal-made energy bars with local nuts, seeds, honey and dried apricots — light, high-calorie trail fuel.' },
  { name: 'Lakeside Spa & Wellness', industry: 'Wellness', home: 'Pokhara', description: 'Lake-view spa offering Ayurvedic massage, hot-stone therapy and recovery sessions for trekkers and adventure travellers.' },
  { name: 'Himal Travel Insurance', industry: 'Insurance', home: 'Kathmandu Valley', description: 'Travel insurance for trekkers and adventure travellers, with helicopter evacuation cover up to 6,000 m.' },
  { name: 'NepCab Ride Share', industry: 'Transport', home: 'Kathmandu Valley', description: 'Pre-bookable airport pickups and city rides with fixed fares, licensed drivers and English support in Kathmandu and Pokhara.' },
  { name: 'Summit Photography Workshops', industry: 'Photography', home: 'Nagarkot', description: 'Small-group photography workshops led by working photographers — landscape, portrait and travel — in the Kathmandu valley and the Himalaya.' },
  { name: 'Kathmandu Handicraft Emporium', industry: 'Handicrafts', home: 'Kathmandu Valley', description: 'Fair-trade Nepali handicrafts: thangka paintings, singing bowls, pashmina and hand-knit wool, with worldwide shipping.' },
  // pending applicants
  { name: 'PeakFit Gyms', industry: 'Fitness', home: 'Kathmandu Valley', description: 'Gyms offering pre-trek conditioning programs and guest day passes.' },
  { name: 'Cheap Watches Outlet', industry: 'Retail', home: 'Kathmandu Valley', description: 'Discount watches and accessories.' },
  { name: 'Global SIM Cards Nepal', industry: 'Telecom', home: 'Kathmandu Valley', description: 'Tourist SIM cards and data packs with airport pickup.' },
  // rejected applicant
  { name: 'QuickLoan Nepal', industry: 'Finance', home: 'Kathmandu Valley', description: 'Fast personal loans.' },
];

const TREK: string[] = ['Trekking & Hiking'];
const TREK_PLACES: Region[] = ['Annapurna Region', 'Everest Region', 'Langtang Valley', 'Upper Mustang'];

export const AD_CAMPAIGNS: AdCampaign[] = [
  // ---- Everest Gear Outfitters -------------------------------------------------------------
  { owner: 'Everest Gear Outfitters', title: 'Rent your trek gear in Thamel — 15% off with TourBNT', description: 'Down jackets, sleeping bags rated to −15 °C and trekking poles, fitted by trekkers who have used them. Show your TourBNT booking for 15% off rentals.', cta: 'See rental gear', slot: 'tour_sidebar', places: [...TREK_PLACES, 'Kathmandu Valley'], tourTypes: TREK, state: 'live', billing: 'monthly', months: 3 },
  { owner: 'Everest Gear Outfitters', title: 'Pre-trek gear check: free boot fitting this month', description: 'Bring your boots and we will check the fit and waterproofing for free before you head to the trailhead.', cta: 'Book a fitting', slot: 'search_results', places: ['Kathmandu Valley', 'Annapurna Region', 'Everest Region'], tourTypes: TREK, state: 'pending', billing: 'per_view', months: 1, views: 4000 },
  // ---- Nepal Trekking Supplies -------------------------------------------------------------
  { owner: 'Nepal Trekking Supplies', title: 'Maps, filters and first-aid kits for the Annapurna trails', description: 'Detailed trail maps, water-purification tablets and ready-made first-aid kits — everything you forgot to pack, five minutes from Lakeside.', cta: 'See trekking supplies', slot: 'tour_sidebar', places: ['Pokhara', 'Annapurna Region', 'Upper Mustang', 'Langtang Valley'], tourTypes: TREK, state: 'live', billing: 'per_view', months: 2, views: 6000 },
  // ---- TrekLight Headlamps -----------------------------------------------------------------
  { owner: 'TrekLight Headlamps', title: 'Headlamps that last the whole trek — 400 lumens, USB-C', description: 'Rechargeable, 80-hour battery, waterproof to IPX6. Ideal for pre-dawn summit climbs like Poon Hill and Tserko Ri.', cta: 'Shop headlamps', slot: 'tour_sidebar', places: ['Annapurna Region', 'Langtang Valley', 'Everest Region'], tourTypes: ['Trekking & Hiking', 'Adventure Sports'], state: 'live', billing: 'monthly', months: 2 },
  { owner: 'TrekLight Headlamps', title: 'Ultralight lantern for camp and teahouse evenings', description: 'A 90-gram lantern that charges your phone — handy when teahouse power is limited.', cta: 'Shop lanterns', slot: 'search_results', places: ['Annapurna Region', 'Langtang Valley'], tourTypes: TREK, state: 'paused', billing: 'monthly', months: 1 },
  // ---- Sherpa Outdoor Apparel --------------------------------------------------------------
  { owner: 'Sherpa Outdoor Apparel', title: 'Down jackets handmade in Kathmandu', description: '800-fill down, hand-finished and tested on the Khumbu trail. Try one on before your trek and keep it for life.', cta: 'Browse jackets', slot: 'tour_sidebar', places: ['Everest Region', 'Annapurna Region', 'Upper Mustang', 'Langtang Valley'], tourTypes: ['Trekking & Hiking', 'Luxury Escapes'], state: 'live', billing: 'monthly', months: 1 },
  // ---- Mountain Bites Energy Bars ----------------------------------------------------------
  { owner: 'Mountain Bites Energy Bars', title: 'Trail fuel made with Nepali honey and walnuts', description: 'Chewy, 220-calorie bars with no preservatives. Buy a box of 12 for your trek and save 20%.', cta: 'Order a trek box', slot: 'search_results', places: ['Pokhara', 'Annapurna Region', 'Langtang Valley', 'Everest Region'], tourTypes: ['Trekking & Hiking', 'Adventure Sports'], state: 'live', billing: 'per_view', months: 1, views: 3000 },
  // ---- Lakeside Spa & Wellness -------------------------------------------------------------
  { owner: 'Lakeside Spa & Wellness', title: 'Recover after the trail with a 90-minute Ayurvedic massage', description: 'Tired legs after Poon Hill or ABC? Our therapists specialise in trekker recovery, with a lake-view room and herbal tea afterwards.', cta: 'Book a massage', slot: 'tour_sidebar', places: ['Pokhara', 'Annapurna Region'], tourTypes: [], state: 'live', billing: 'monthly', months: 3 },
  { owner: 'Lakeside Spa & Wellness', title: 'Couples spa afternoon above Phewa Lake', description: 'Two treatments, a herbal steam and a lake-view terrace — pairs well with a Pokhara weekend.', cta: 'See spa packages', slot: 'search_results', places: ['Pokhara'], tourTypes: ['Family Holidays', 'Luxury Escapes', 'Adventure Sports', 'Spiritual & Yoga'], state: 'unpaid', billing: 'monthly', months: 1 },
  // ---- Himal Travel Insurance --------------------------------------------------------------
  { owner: 'Himal Travel Insurance', title: 'Trek insured: helicopter rescue to 6,000 m included', description: 'Cover for medical care, emergency evacuation and trip cancellation for Nepal trekkers — buy online in five minutes, valid for trips already booked.', cta: 'Get a quote', slot: 'tour_sidebar', places: ['Kathmandu Valley', 'Annapurna Region', 'Everest Region', 'Langtang Valley', 'Upper Mustang'], tourTypes: [], state: 'live', billing: 'monthly', months: 1 },
  { owner: 'Himal Travel Insurance', title: 'Cover for adventure sports: paragliding, rafting, zip-line', description: 'Standard travel insurance often excludes adventure activities. Ours covers them from day one.', cta: 'Check my activity', slot: 'search_results', places: ['Pokhara', 'Kathmandu Valley'], tourTypes: ['Adventure Sports', 'Rafting & Water Sports'], state: 'ended', billing: 'monthly', months: 1 },
  // ---- NepCab Ride Share -------------------------------------------------------------------
  { owner: 'NepCab Ride Share', title: 'Book your airport ride in advance and save', description: 'Fixed-fare pickups from Tribhuvan and Pokhara airports with a driver waiting at arrivals — no haggling after a long flight.', cta: 'Book a ride', slot: 'tour_sidebar', places: ['Kathmandu Valley', 'Pokhara'], tourTypes: [], state: 'live', billing: 'per_view', months: 2, views: 5000 },
  // ---- Summit Photography Workshops --------------------------------------------------------
  { owner: 'Summit Photography Workshops', title: 'Learn Himalayan photography from working photographers', description: 'Small-group workshops in Bhaktapur and Nagarkot covering golden-hour landscapes, portraits and editing. Cameras and tripods provided.', cta: 'See workshop dates', slot: 'tour_sidebar', places: ['Nagarkot', 'Kathmandu Valley', 'Everest Region', 'Upper Mustang', 'Annapurna Region'], tourTypes: ['Photography Tours', 'Cultural Tours'], state: 'live', billing: 'monthly', months: 2 },
  { owner: 'Summit Photography Workshops', title: 'Sunrise workshop at Nagarkot — limited seats', description: 'A four-hour pre-dawn workshop above the clouds, with breakfast and a printed photo.', cta: 'Reserve a seat', slot: 'search_results', places: ['Nagarkot', 'Kathmandu Valley'], tourTypes: ['Photography Tours'], state: 'rejected', billing: 'per_view', months: 1, views: 2000, rejectionReason: 'The advertised "limited seats" claim could not be verified. Please add an exact seat count and resubmit.' },
  // ---- Kathmandu Handicraft Emporium -------------------------------------------------------
  { owner: 'Kathmandu Handicraft Emporium', title: 'Take home real Nepali craft: thangka, singing bowls, pashmina', description: 'A fair-trade showroom near Boudhanath with artists at work. Free packing and worldwide shipping on purchases over US$ 100.', cta: 'Visit the emporium', slot: 'search_results', places: ['Kathmandu Valley', 'Nagarkot'], tourTypes: [], state: 'live', billing: 'monthly', months: 1 },
  { owner: 'Kathmandu Handicraft Emporium', title: 'Hand-knit wool for the trek: hats, gloves and socks', description: 'Warm, locally knitted wool that is gentler than synthetic layers on cold mornings.', cta: 'See wool collection', slot: 'tour_sidebar', places: ['Kathmandu Valley', 'Annapurna Region', 'Langtang Valley'], tourTypes: TREK, state: 'pending', billing: 'monthly', months: 1 },
  // ---- pending / rejected applicants (their ads wait for admin) ----------------------------
  { owner: 'PeakFit Gyms', title: 'Train for your trek: 4-week pre-trek conditioning plan', description: 'Cardio and leg-strength plans designed by guides for Poon Hill and Annapurna Base Camp.', cta: 'Start training', slot: 'search_results', places: ['Kathmandu Valley', 'Annapurna Region'], tourTypes: TREK, state: 'pending', billing: 'monthly', months: 1 },
  { owner: 'Cheap Watches Outlet', title: 'Branded watches at unbelievable prices', description: 'Up to 90% off premium watches.', cta: 'Shop watches', slot: 'search_results', places: ['Kathmandu Valley'], tourTypes: ['Cultural Tours'], state: 'pending', billing: 'monthly', months: 1 },
  { owner: 'Global SIM Cards Nepal', title: 'Tourist SIM with 30 GB of data, picked up at the airport', description: 'Stay connected on the trail with coverage on all main Nepal trekking routes.', cta: 'Reserve a SIM', slot: 'tour_sidebar', places: ['Kathmandu Valley', 'Pokhara'], tourTypes: TREK, state: 'pending', billing: 'per_view', months: 1, views: 2500 },
  { owner: 'QuickLoan Nepal', title: 'Cash in minutes — no questions asked', description: 'Instant personal loans.', cta: 'Apply now', slot: 'search_results', places: ['Kathmandu Valley'], tourTypes: ['Cultural Tours'], state: 'rejected', billing: 'monthly', months: 1, rejectionReason: 'Consumer lending is not an allowed advertising category on TourBNT.' },
];
