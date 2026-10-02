/**
 * Demo tour catalog — every tour is authored end to end, the way a seller would fill the tour editor:
 * overview, location, a day-by-day itinerary with a destination and linked guide / transport / hotel /
 * restaurant for each day, pricing (options, discounts, payment policy), departures, facts, FAQs,
 * gallery captions, and inclusions / exclusions.
 *
 * Pricing and discount states are deliberately varied so every branch of the site can be exercised:
 * per-person vs per-group, pricing options on/off, % vs fixed-amount discounts, discounts that are
 * active now / not started yet / already expired, and every payment-policy combination.
 */

export type Region =
  | 'Kathmandu Valley' | 'Pokhara' | 'Annapurna Region' | 'Lumbini' | 'Chitwan National Park' | 'Nagarkot'
  | 'Everest Region' | 'Bardia National Park' | 'Langtang Valley' | 'Upper Mustang' | 'Bandipur';

export interface DaySpec {
  title: string;
  /** Free-text place, as typed in the editor's "Destination" field. Always ends "<Region>, Nepal" so ads can match it. */
  place: string;
  region: Region;
  desc: string;
  /** Where the group sleeps that night (omit on the last day). */
  stay?: 'hotel' | 'guesthouse';
  /** A sit-down restaurant meal in a town (trail meals are covered by the stay). */
  meal?: boolean;
  /** A vehicle is needed that day. */
  drive?: boolean;
  /** Set false on days with no guide (default: guided). */
  guide?: boolean;
  notes?: { transport?: string; accommodation?: string; meals?: string; guide?: string };
}

export interface DiscountSpec {
  type: 'percent' | 'amount';
  value: number;
  /** Offset in days from the day the seed runs. Negative = already started. */
  fromDays: number;
  toDays: number;
  code?: string;
  description?: string;
}

export interface OptionSpec {
  name: string;
  category: 'adult' | 'child' | 'senior' | 'student' | 'custom';
  customCategory?: string;
  price: number;
  minPax: number;
  maxPax: number;
  discount?: DiscountSpec;
}

export interface DepartureSpec {
  label: string;
  startDays: number;
  capacity: number;
  /** Which pricing options (by name) can be booked on this departure; all when omitted. */
  optionNames?: string[];
  recurring?: { pattern: 'weekly' | 'biweekly' | 'monthly'; interval: number; endDays: number };
}

export type ScheduleSpec =
  | { type: 'flexible'; fromDays: number; toDays: number }
  | { type: 'fixed'; startDays: number }
  | { type: 'multiple'; departures: DepartureSpec[] };

export interface TourCatalogEntry {
  code: string;
  title: string;
  status: 'Published' | 'Draft' | 'Archived';
  /** Index into the approved-seller list. */
  seller: number;
  region: Region;
  categories: string[];
  days: DaySpec[];
  excerpt: string;
  intro: string[];
  highlights: string[];
  who: string;
  outline: string;
  include: string[];
  exclude: string[];
  /** Value per master fact, by fact name. Plain Text → string; Single / Multi Select → string[]. */
  facts: Record<string, string | string[]>;
  faqs: Array<{ q: string; a: string }>;
  /** One caption per gallery image. */
  gallery: string[];
  location: { street: string; city: string; state: string; zip: string; lat: number; lng: number };
  pricing: {
    perPerson: boolean;
    groupSize?: number;
    price: number;
    options?: OptionSpec[];
    discount?: DiscountSpec;
    payment: { full: boolean; deposit: boolean; pct: number; arrival: boolean };
    lockDays?: number;
  };
  minSize: number;
  maxSize: number;
  schedule: ScheduleSpec;
  enquiry: boolean;
  specialOffer?: boolean;
}

// ---------------------------------------------------------------------------
// shared building blocks
// ---------------------------------------------------------------------------
const STD_EXCLUDE = ['International flights to and from Nepal', 'Nepal entry visa (US$ 30–50 on arrival)', 'Travel and medical insurance (mandatory for trekking)', 'Personal expenses, laundry, phone and WiFi charges', 'Tips for guide, porters and driver', 'Alcoholic and bottled drinks'];

const d = (title: string, place: string, region: Region, desc: string, o: Partial<DaySpec> = {}): DaySpec => ({ title, place: `${place}, ${region}, Nepal`, region, desc, ...o });

export const CANCELLATION = { q: 'What is the cancellation policy?', a: 'Free cancellation up to 30 days before departure. 50% refund 29–14 days before, and no refund within 14 days of departure. Weather or safety cancellations by us are refunded in full or rebooked at no cost.' };
export const INSURANCE = { q: 'Do I need travel insurance?', a: 'Yes. Comprehensive travel insurance covering medical care and emergency evacuation is mandatory. For any trek above 3,000 m it must explicitly cover high-altitude trekking and helicopter rescue.' };

// ---------------------------------------------------------------------------
// the catalog
// ---------------------------------------------------------------------------
export const TOUR_CATALOG: TourCatalogEntry[] = [
  // 1 ---------------------------------------------------------------------
  {
    code: 'DEMO-001', title: 'Annapurna Base Camp Trek', status: 'Published', seller: 0, region: 'Annapurna Region',
    categories: ['Trekking & Hiking', 'Photography Tours'],
    excerpt: '10 days from Kathmandu to the Annapurna Sanctuary — Gurung villages, rhododendron forest, the Machapuchare Base Camp glow and a soak in the Jhinu hot springs.',
    intro: [
      'The Annapurna Base Camp trek climbs from subtropical terraces to a glacial amphitheatre ringed by seven peaks above 7,000 m. It is the most rewarding teahouse trek in Nepal for the time it takes, with comfortable lodges every few hours and no technical climbing.',
      'You walk with a licensed guide and a porter for every two trekkers, in a small group capped at 12, at a pace that leaves a full rest day-equivalent for acclimatisation. Altitude is gained gradually, with a sleep at 2,170 m, 3,200 m and 3,700 m before the final push to 4,130 m.',
    ],
    highlights: ['Sunrise over Annapurna South from the Ghandruk viewpoint', 'The 2,000-step stone staircase to Chomrong', 'Machapuchare (Fishtail) Base Camp at 3,700 m', 'Annapurna Sanctuary at 4,130 m with 360° views', 'Soak tired legs in the natural hot springs at Jhinu Danda', 'Gurung hospitality: home-cooked dal bhat and village homestays'],
    who: 'Reasonably fit walkers who can hike 5–7 hours a day for a week. No previous trekking experience is required, but a few weeks of cardio training makes a big difference at altitude.',
    outline: '10 days: Kathmandu → Pokhara → Ghandruk → Chomrong → Himalaya → Annapurna Base Camp → Bamboo → Jhinu Danda → Pokhara → Kathmandu.',
    include: ['Airport pickup and drop-off by private vehicle', '2 nights hotel in Kathmandu and 1 night hotel in Pokhara (twin share, breakfast)', '6 nights teahouse accommodation on the trail (twin share)', 'All meals on the trek (breakfast, lunch, dinner) with tea and coffee', 'Tourist bus Kathmandu–Pokhara and private jeep to Nayapul', 'Licensed English-speaking trekking guide and one porter per two trekkers', 'Annapurna Conservation Area permit and TIMS card', 'Sleeping bag and down jacket for the duration of the trek', 'First-aid kit and pulse oximeter checks every evening', 'All guide, porter and staff wages, insurance and equipment'],
    exclude: STD_EXCLUDE,
    facts: { Duration: '10 days / 9 nights', Difficulty: ['Moderate'], 'Max Altitude': '4,130 m (Annapurna Base Camp)', 'Best Season': ['Spring', 'Autumn'], 'Group Size': '2–12 trekkers', Accommodation: ['Hotel', 'Teahouse'], Meals: 'All meals on trek, breakfast in cities', Transport: ['Tourist bus', 'Private vehicle', 'On foot'], Languages: ['English', 'Nepali'], 'Starting Point': 'Kathmandu (Thamel)', 'Ending Point': 'Kathmandu (Thamel)', 'Minimum Age': '12 years', 'Fitness Level': ['Good'], 'Activity Type': ['Trekking', 'Photography'] },
    faqs: [
      { q: 'How difficult is the Annapurna Base Camp trek?', a: 'It is a moderate trek. Days are 5–7 hours of walking, with long stone staircases on the way to Chomrong and a steady climb above Bamboo. You do not need climbing skills, but you should be comfortable walking uphill for several hours on consecutive days.' },
      { q: 'What is the risk of altitude sickness?', a: 'Base camp is at 4,130 m, so mild symptoms are possible. Our itinerary gains height gradually and your guide checks oxygen saturation every evening. Never continue climbing with worsening symptoms — your guide will arrange descent or evacuation.' },
      { q: 'Are the lodges heated and is there hot water?', a: 'Teahouse rooms are unheated twin rooms with warm blankets. Hot showers (usually gas-heated, for a small fee) are available up to Himalaya; above that expect basic washing. Dining rooms have a stove in the evening.' },
      { q: 'Can I charge devices and get WiFi?', a: 'Most teahouses charge for charging and WiFi, and prices rise with altitude. A power bank is the practical solution; bring one with at least 10,000 mAh.' },
      { q: 'What should I pack?', a: 'We send a detailed packing list after booking. The essentials are broken-in waterproof boots, layers for -5 °C nights, rain shell, sun protection and a refillable bottle with purification tablets.' },
      CANCELLATION, INSURANCE,
    ],
    gallery: ['Gurung village of Ghandruk with Annapurna South behind', 'Stone staircase up to Chomrong', 'Rhododendron forest in spring bloom', 'Crossing the Modi Khola suspension bridge', 'Machapuchare glowing at sunrise', 'Annapurna Base Camp prayer flags', 'Natural hot springs at Jhinu Danda'],
    location: { street: 'Trek starts at Nayapul, Baglung Highway', city: 'Pokhara', state: 'Gandaki', zip: '33700', lat: 28.3949, lng: 83.8189 },
    pricing: {
      perPerson: true, price: 1150, lockDays: 60,
      payment: { full: true, deposit: true, pct: 30, arrival: false },
      discount: { type: 'percent', value: 14, fromDays: -20, toDays: 75, code: 'EARLYABC', description: 'Early-bird saving for the autumn season — applied automatically at checkout.' },
      options: [
        { name: 'Adult', category: 'adult', price: 1150, minPax: 2, maxPax: 12, discount: { type: 'percent', value: 10, fromDays: -20, toDays: 75 } },
        { name: 'Child (under 12)', category: 'child', price: 790, minPax: 1, maxPax: 4 },
        { name: 'Senior (60+)', category: 'senior', price: 1020, minPax: 1, maxPax: 4, discount: { type: 'amount', value: 100, fromDays: -20, toDays: 75 } },
        { name: 'Student with ID', category: 'student', price: 980, minPax: 1, maxPax: 6 },
        { name: 'Solo traveller (private room)', category: 'custom', customCategory: 'Solo supplement', price: 1390, minPax: 1, maxPax: 1 },
      ],
    },
    minSize: 2, maxSize: 12, enquiry: true, specialOffer: true,
    schedule: { type: 'multiple', departures: [
      { label: 'Early October departure', startDays: 14, capacity: 12 },
      { label: 'Late October departure', startDays: 42, capacity: 12 },
      { label: 'November departure (no student fares)', startDays: 78, capacity: 10, optionNames: ['Adult', 'Child (under 12)', 'Senior (60+)', 'Solo traveller (private room)'] },
      { label: 'March spring bloom departure', startDays: 150, capacity: 12 },
    ] },
    days: [
      d('Arrive in Kathmandu', 'Kathmandu', 'Kathmandu Valley', 'Meet your guide at Tribhuvan International Airport and transfer to your Thamel hotel. Evening trek briefing, gear check, and a welcome dinner of Newari and Nepali dishes.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Airport pickup — driver waits with a TourBNT sign', accommodation: 'Twin room, breakfast included', meals: 'Welcome dinner, vegetarian options available', guide: 'Trek briefing and gear check at 18:00' } }),
      d('Tourist bus to Pokhara', 'Pokhara', 'Pokhara', 'A scenic 7-hour drive along the Trishuli and Marsyangdi rivers to Pokhara. Afternoon stroll on Phewa Lake and last-minute trek shopping in Lakeside.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Tourist coach with reclining seats, lunch stop at Mugling', accommodation: 'Lakeside hotel, lake-view rooms on request', meals: 'Dinner at a lakeside restaurant' } }),
      d('Drive to Nayapul, trek to Ghandruk', 'Ghandruk', 'Annapurna Region', 'A 1.5-hour jeep ride to Nayapul, then 5–6 hours up through Birethanti and Kimche to the Gurung village of Ghandruk (1,940 m), with Annapurna South and Hiunchuli filling the skyline.', { stay: 'guesthouse', drive: true, notes: { transport: 'Shared 4x4 jeep Pokhara–Nayapul', accommodation: 'Family-run teahouse with mountain-view terrace', guide: 'Pace: 5–6 hours walking, 1,100 m ascent' } }),
      d('Ghandruk to Chomrong', 'Chomrong', 'Annapurna Region', 'Cross the Kyumnu Khola and climb the famous stone staircase to Chomrong (2,170 m). The last Gurung settlement before the sanctuary, with the best view of Machapuchare yet.', { stay: 'guesthouse', notes: { accommodation: 'Teahouse with hot shower (extra charge)', guide: '6 hours walking; last chance for supplies and cash' } }),
      d('Chomrong to Himalaya Hotel', 'Himalaya Hotel', 'Annapurna Region', 'Descend to Sinuwa, then climb through dense bamboo and rhododendron forest to Dovan and Himalaya (2,920 m). Look out for langur monkeys and Himalayan thar.', { stay: 'guesthouse', notes: { accommodation: 'Simple lodge, shared bathroom', guide: '6–7 hours walking in forest, steady climb' } }),
      d('Himalaya to Machapuchare Base Camp', 'Machapuchare Base Camp', 'Annapurna Region', 'Through Hinku Cave and Deurali the valley opens into a glacial gorge. Reach MBC (3,700 m) by early afternoon for acclimatisation and sunset on the Fishtail.', { stay: 'guesthouse', guide: true, notes: { accommodation: 'Dormitory-style rooms, cold nights below 0 °C', guide: 'Pulse-oximeter checks; walk slowly and hydrate' } }),
      d('Annapurna Base Camp and back to Bamboo', 'Annapurna Base Camp', 'Annapurna Region', 'Pre-dawn walk to Annapurna Base Camp (4,130 m) for sunrise on Annapurna I, South, Gangapurna and Machapuchare. Breakfast at the base, then retrace your steps down to Bamboo (2,310 m).', { stay: 'guesthouse', notes: { accommodation: 'Lodge in Bamboo', guide: 'Longest day: 8 hours total, 1,800 m descent' } }),
      d('Bamboo to Jhinu Danda hot springs', 'Jhinu Danda', 'Annapurna Region', 'A steady downhill day through forest to Jhinu (1,780 m). Walk 20 minutes down to the natural hot springs on the Modi Khola and soak your legs after the climb.', { stay: 'guesthouse', notes: { accommodation: 'Teahouse above the hot springs', guide: '5 hours walking; entrance fee to hot springs included' } }),
      d('Trek to Nayapul and drive to Pokhara', 'Pokhara', 'Pokhara', 'A final easy walk past Landruk to Nayapul, then a jeep back to Pokhara. Celebrate with a farewell dinner by the lake and a long hot shower.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private jeep from Nayapul', accommodation: 'Lakeside hotel', meals: 'Farewell dinner with live music' } }),
      d('Return to Kathmandu and departure', 'Kathmandu', 'Kathmandu Valley', 'Tourist bus (or optional 25-minute flight) back to Kathmandu. Transfer to the airport or your next hotel.', { drive: true, guide: false, notes: { transport: 'Tourist bus to Kathmandu, drop-off at hotel or airport' } }),
    ],
  },
  // 2 ---------------------------------------------------------------------
  {
    code: 'DEMO-002', title: 'Poon Hill Sunrise Trek', status: 'Published', seller: 0, region: 'Annapurna Region',
    categories: ['Trekking & Hiking', 'Family Holidays'],
    excerpt: 'The classic short trek: 5 days through rhododendron forests to the Poon Hill sunrise, with Dhaulagiri and Annapurna glowing gold.',
    intro: [
      'If you have only a week, Poon Hill is the trek to choose. A gentle itinerary of 4–6 hour days takes you from Pokhara through Magar and Gurung villages to a 3,210 m viewpoint where, at dawn, 8,000 m peaks catch the first light.',
      'Departures run every Saturday through the season, so you can pick any weekend that suits you. Accommodation is in friendly teahouses, and the pace is relaxed enough for first-time trekkers and active families.',
    ],
    highlights: ['Ulleri staircase — 3,300 steps through terraced fields', 'Ghorepani rhododendron forest, spectacular in March–April', 'Sunrise from Poon Hill with Dhaulagiri, Annapurna and Machapuchare', 'Overnight in Tadapani with close views of Annapurna South', 'Traditional Gurung villages and local tea houses'],
    who: 'First-time trekkers, families with teenagers, and anyone who wants Himalayan views without a long expedition. Moderate fitness is enough.',
    outline: '5 days: Pokhara → Nayapul → Ulleri → Ghorepani → Poon Hill sunrise → Tadapani → Ghandruk → Pokhara.',
    include: ['Private transfers Pokhara–Nayapul–Pokhara', '1 night hotel in Pokhara and 3 nights teahouse (twin share)', 'Breakfast, lunch and dinner during the trek', 'Licensed trekking guide and porter service (1 porter per 2 trekkers)', 'ACAP permit and TIMS registration', 'Complimentary trekking poles and duffel bag', 'Fresh seasonal fruit every evening'],
    exclude: STD_EXCLUDE,
    facts: { Duration: '5 days / 4 nights', Difficulty: ['Easy'], 'Max Altitude': '3,210 m (Poon Hill)', 'Best Season': ['Spring', 'Autumn', 'Winter'], 'Group Size': '2–14 trekkers', Accommodation: ['Hotel', 'Teahouse'], Meals: 'Full board on trek', Transport: ['Private vehicle', 'On foot'], Languages: ['English', 'Nepali', 'Hindi'], 'Starting Point': 'Pokhara (Lakeside)', 'Ending Point': 'Pokhara (Lakeside)', 'Minimum Age': '8 years', 'Fitness Level': ['Beginner'], 'Activity Type': ['Trekking', 'Photography'] },
    faqs: [
      { q: 'Can children do the Poon Hill trek?', a: 'Yes — children from 8 years old who enjoy walking do well. Days are short and the altitude never exceeds 3,210 m. We provide a child fare and a lighter itinerary on request.' },
      { q: 'Is a weekly departure really guaranteed?', a: 'Every Saturday departure runs with a minimum of 2 trekkers. If numbers are lower we offer a private departure at the same per-person price or a free move to another week.' },
      { q: 'What is the weather like at sunrise?', a: 'Clear mornings are common between October–December and March–April. It is cold (–3 °C to 3 °C), so bring a warm hat and gloves. Cloud can occasionally block views; we always try the viewpoint on both mornings when the schedule allows.' },
      { q: 'Do I need trekking boots?', a: 'Sturdy walking shoes with grip are essential, but heavy mountaineering boots are not. Poles are provided.' },
      CANCELLATION, INSURANCE,
    ],
    gallery: ['Ulleri stone steps in morning mist', 'Ghorepani teahouse courtyard', 'Poon Hill sunrise panorama', 'Rhododendron blossoms near Banthanti', 'Local Gurung dance in Ghandruk', 'Trekkers on the Tadapani ridge'],
    location: { street: 'Starting at Nayapul Bazaar', city: 'Nayapul', state: 'Gandaki', zip: '33200', lat: 28.3949, lng: 83.7208 },
    pricing: {
      perPerson: true, price: 520,
      payment: { full: true, deposit: true, pct: 20, arrival: true },
      options: [
        { name: 'Adult', category: 'adult', price: 520, minPax: 1, maxPax: 14 },
        { name: 'Child (8–15)', category: 'child', price: 390, minPax: 1, maxPax: 6 },
        { name: 'Student with ID', category: 'student', price: 450, minPax: 1, maxPax: 8, discount: { type: 'percent', value: 5, fromDays: -10, toDays: 200 } },
      ],
    },
    minSize: 2, maxSize: 14, enquiry: true,
    schedule: { type: 'multiple', departures: [
      { label: 'Every Saturday (Oct–Dec)', startDays: 12, capacity: 14, recurring: { pattern: 'weekly', interval: 1, endDays: 90 } },
      { label: 'Spring bloom special', startDays: 160, capacity: 14 },
    ] },
    days: [
      d('Drive to Nayapul, trek to Ulleri', 'Ulleri', 'Annapurna Region', 'An hour-and-a-half jeep ride from Pokhara to Nayapul, then up the 3,300 steps of Ulleri (2,070 m) with long views over the Bhurungdi valley.', { stay: 'guesthouse', drive: true, notes: { transport: 'Private jeep from your Pokhara hotel at 7:30', accommodation: 'Teahouse, twin share', guide: '6 hours walking' } }),
      d('Ulleri to Ghorepani', 'Ghorepani', 'Annapurna Region', 'Climb through a magical rhododendron and oak forest to Ghorepani (2,860 m), a lively teahouse village where trails meet.', { stay: 'guesthouse', notes: { accommodation: 'Lodge with common dining stove', guide: '5–6 hours walking, gentle climb' } }),
      d('Poon Hill sunrise and trek to Tadapani', 'Tadapani', 'Annapurna Region', 'Wake at 4:30 for the 45-minute climb to Poon Hill (3,210 m). Watch the sunrise over Dhaulagiri and Annapurna, return for breakfast, then trek via Deurali to Tadapani.', { stay: 'guesthouse', notes: { accommodation: 'Lodge with Annapurna South views', guide: 'Early start; 6 hours walking in total' } }),
      d('Tadapani to Ghandruk', 'Ghandruk', 'Annapurna Region', 'Descend through forest to the large Gurung village of Ghandruk (1,940 m). Visit the museum and meet a local family over tea.', { stay: 'guesthouse', notes: { accommodation: 'Gurung family homestay-style teahouse', guide: '4–5 hours; afternoon free to explore' } }),
      d('Trek to Nayapul, drive to Pokhara', 'Pokhara', 'Pokhara', 'A last walk down to Nayapul and the drive back to Pokhara for a farewell dinner by Phewa Lake.', { meal: true, drive: true, notes: { transport: 'Private jeep, arrival around 15:00', meals: 'Farewell lunch included' } }),
    ],
  },
  // 3 ---------------------------------------------------------------------
  {
    code: 'DEMO-003', title: 'Pokhara Adventure Weekend', status: 'Published', seller: 1, region: 'Pokhara',
    categories: ['Adventure Sports', 'Family Holidays'],
    excerpt: 'A packed 3 days of paragliding, boating, zip-lining and an ultralight flight over Phewa Lake — start any day, book any group size.',
    intro: [
      'Pokhara is Nepal\'s adventure capital, and this weekend gets you the best of it with none of the planning. You will glide over the lake on a tandem paraglider, fly a microlight over the Annapurna range, and zip-line from a 600 m drop.',
      'Everything is handled with certified pilots and instructors. Equipment, transfers and a relaxed lakeside hotel are included, so you can focus on the adrenaline.',
    ],
    highlights: ['Tandem paragliding from Sarangkot with a certified pilot', 'Phewa Lake boat ride to the Tal Barahi temple', 'Zip-line across the Pokhara valley, 1.8 km at 120 km/h', '15-minute ultralight flight over the Himalaya', 'World Peace Pagoda sunset hike', 'Free time for Lakeside cafes and live music'],
    who: 'Thrill-seekers and groups of friends. Participants must weigh between 30 kg and 100 kg for flights; no experience is required.',
    outline: '3 days in Pokhara: paragliding & lake day, zip-line & peace pagoda day, ultralight flight & departure.',
    include: ['2 nights in a 3-star Lakeside hotel (breakfast)', 'Tandem paragliding (about 25 minutes) with photos and video', 'Zip-line ticket and transfers', 'Ultralight flight (15 minutes)', 'Boating on Phewa Lake with an English-speaking guide', 'All airport and activity transfers by private van', 'Insurance for all adventure activities'],
    exclude: [...STD_EXCLUDE.slice(0, 2), 'Lunches and dinners (recommended venues provided)', 'Personal expenses and tips', 'Weather-dependent flights rescheduled after the trip end are not refundable'],
    facts: { Duration: '3 days / 2 nights', Difficulty: ['Easy'], 'Max Altitude': '1,600 m (Sarangkot take-off)', 'Best Season': ['Autumn', 'Winter', 'Spring'], 'Group Size': '1–10 guests', Accommodation: ['Hotel'], Meals: 'Breakfast included', Transport: ['Private vehicle', 'Boat'], Languages: ['English', 'Nepali', 'Hindi'], 'Starting Point': 'Pokhara Airport / Lakeside hotel', 'Ending Point': 'Pokhara Lakeside', 'Minimum Age': '8 years', 'Fitness Level': ['Beginner'], 'Activity Type': ['Adventure', 'Sightseeing'] },
    faqs: [
      { q: 'What happens if the weather cancels the paragliding?', a: 'Flights depend on wind and cloud. If conditions stop a flight on your scheduled day we move it to the next morning at no cost. If it cannot be flown at all you receive a full refund for that activity.' },
      { q: 'Are there weight or health limits?', a: 'Paragliding and ultralight flights need a weight between 30 and 100 kg. Please tell us about heart conditions, pregnancy or back problems when booking.' },
      { q: 'Can I start on any day?', a: 'Yes, this is a flexible tour. Choose any start date in the season and we confirm all activities within 24 hours.' },
      { q: 'Is it suitable for kids?', a: 'Children from 8 years can do the boat, zip-line (minimum 25 kg) and tandem flight with a parent. The ultralight flight needs a minimum age of 12.' },
      CANCELLATION,
    ],
    gallery: ['Tandem paraglider above Phewa Lake', 'Zip-line over the valley', 'Ultralight with Machapuchare behind', 'Boat on Phewa Lake', 'World Peace Pagoda at sunset', 'Lakeside street food evening'],
    location: { street: 'Lakeside Marg, Baidam', city: 'Pokhara', state: 'Gandaki', zip: '33700', lat: 28.2096, lng: 83.9856 },
    pricing: {
      perPerson: true, price: 340, lockDays: 30,
      payment: { full: true, deposit: false, pct: 20, arrival: false },
      discount: { type: 'amount', value: 41, fromDays: -15, toDays: 100, code: 'WEEKEND41', description: 'US$ 41 off per person for bookings made this season.' },
    },
    minSize: 1, maxSize: 10, enquiry: true, specialOffer: true,
    schedule: { type: 'flexible', fromDays: 1, toDays: 270 },
    days: [
      d('Arrival, Phewa Lake and temple boat ride', 'Pokhara', 'Pokhara', 'Check in at your Lakeside hotel and head out for a guided boat ride to the island temple of Tal Barahi. Sunset walk on the lake promenade and a relaxed welcome dinner.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Airport or bus-station pickup', accommodation: '3-star Lakeside hotel, breakfast included', meals: 'Welcome dinner — Nepali tasting menu', guide: 'Local guide for the boat trip' } }),
      d('Tandem paragliding and zip-line', 'Sarangkot', 'Pokhara', 'Morning thermals launch you from Sarangkot (1,600 m) for a 25-minute tandem flight down to the lake. After lunch, ride the zip-line — the world\'s steepest and longest.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Van to Sarangkot take-off and to the zip-line site', accommodation: 'Same Lakeside hotel', meals: 'Lunch at the landing site cafe', guide: 'Certified tandem pilot with GoPro footage' } }),
      d('Ultralight flight and World Peace Pagoda', 'World Peace Pagoda', 'Pokhara', 'A 15-minute ultralight flight over Phewa Lake and the Annapurna range, then a short hike up to the World Peace Pagoda for a final view. Transfer to the airport or bus station.', { meal: true, drive: true, notes: { transport: 'Van to the airfield and onward to your departure point', meals: 'Farewell lunch with lake views', guide: 'Hike guide to the pagoda' } }),
    ],
  },
  // 4 ---------------------------------------------------------------------
  {
    code: 'DEMO-004', title: 'Langtang Valley Trek', status: 'Published', seller: 1, region: 'Langtang Valley',
    categories: ['Trekking & Hiking', 'Cultural Tours'],
    excerpt: 'Eight days in the "valley of glaciers" close to Kathmandu — Tamang villages, yak cheese, Kyanjin Gompa and the Tserko Ri summit.',
    intro: [
      'Langtang rebuilt itself after the 2015 earthquake and is now one of Nepal\'s most welcoming trekking regions. The trail climbs from subtropical forest to alpine meadows beneath Langtang Lirung (7,227 m), with Tamang culture at every stop.',
      'There is no domestic flight and no long drive: it is a day\'s ride from Kathmandu to the trailhead, which makes it ideal for a compact two-week Nepal trip.',
    ],
    highlights: ['Scenic jeep ride to Syabrubesi along the Trishuli river', 'Rhododendron forest and red-panda territory near Lama Hotel', 'Kyanjin Gompa and a visit to the local cheese factory', 'Sunrise on Tserko Ri (4,984 m) — the best viewpoint in the valley', 'Tamang hospitality and the memorial for the 2015 landslide'],
    who: 'Active walkers with some hill-walking experience who want a quiet, cultural trek away from the larger circuits.',
    outline: '8 days: Kathmandu → Syabrubesi → Lama Hotel → Langtang Village → Kyanjin Gompa (+Tserko Ri) → Lama Hotel → Syabrubesi → Kathmandu.',
    include: ['Private jeep Kathmandu–Syabrubesi–Kathmandu', '1 night hotel in Kathmandu and 6 nights teahouse (twin share)', 'Full board on the trek', 'Experienced trekking guide and porters', 'Langtang National Park entrance and TIMS cards', 'Emergency oxygen and first-aid kit', 'Sleeping bag and down jacket loan'],
    exclude: STD_EXCLUDE,
    facts: { Duration: '8 days / 7 nights', Difficulty: ['Moderate'], 'Max Altitude': '4,984 m (Tserko Ri)', 'Best Season': ['Spring', 'Autumn'], 'Group Size': '2–10 trekkers', Accommodation: ['Hotel', 'Teahouse'], Meals: 'Full board on trek, breakfast in Kathmandu', Transport: ['Private vehicle', 'On foot'], Languages: ['English', 'Nepali'], 'Starting Point': 'Kathmandu (Thamel)', 'Ending Point': 'Kathmandu (Thamel)', 'Minimum Age': '14 years', 'Fitness Level': ['Good'], 'Activity Type': ['Trekking', 'Cultural'] },
    faqs: [
      { q: 'Is Langtang safe after the earthquake?', a: 'Yes. The valley has been fully rebuilt, trails are well maintained and the lodges are modern. The 2015 landslide site is respectfully marked at Langtang village.' },
      { q: 'How cold does it get at Kyanjin Gompa?', a: 'Nights at 3,870 m drop to around –8 °C in November and –3 °C in April. Your sleeping bag and down jacket are provided, and rooms have thick blankets.' },
      { q: 'Is the Tserko Ri climb mandatory?', a: 'No. It is optional and depends on weather and how you feel. The valley floor hike to Kyanjin gives wonderful views on its own.' },
      CANCELLATION, INSURANCE,
    ],
    gallery: ['Trishuli river road to Syabrubesi', 'Lama Hotel forest trail', 'Langtang village with Langtang Lirung', 'Kyanjin Gompa and glacier', 'Yak herder near Kyanjin', 'Sunrise on Tserko Ri'],
    location: { street: 'Trailhead at Syabrubesi Bazaar', city: 'Syabrubesi', state: 'Bagmati', zip: '45000', lat: 28.1618, lng: 85.3492 },
    pricing: {
      perPerson: true, price: 780,
      payment: { full: true, deposit: true, pct: 25, arrival: true },
    },
    minSize: 2, maxSize: 10, enquiry: true,
    schedule: { type: 'multiple', departures: [
      { label: 'October departure', startDays: 20, capacity: 10 },
      { label: 'November departure', startDays: 55, capacity: 10 },
      { label: 'April departure', startDays: 190, capacity: 10 },
    ] },
    days: [
      d('Drive Kathmandu to Syabrubesi', 'Syabrubesi', 'Langtang Valley', 'An 8-hour drive along the Trishuli river and up through terraced hills to Syabrubesi (1,550 m), the gateway to Langtang. Check in at your lodge and meet the porters.', { stay: 'guesthouse', drive: true, notes: { transport: 'Private 4x4, departure 6:30 from Thamel', accommodation: 'Teahouse by the Bhote Koshi river', guide: 'Briefing and permit check' } }),
      d('Syabrubesi to Lama Hotel', 'Lama Hotel', 'Langtang Valley', 'Cross the Langtang Khola and climb through oak and rhododendron forest to Lama Hotel (2,470 m). Look out for langur monkeys and, with luck, a red panda.', { stay: 'guesthouse', notes: { accommodation: 'Forest lodge with a wood-fired dining room', guide: '6 hours walking, steady climb' } }),
      d('Lama Hotel to Langtang Village', 'Langtang Village', 'Langtang Valley', 'The forest opens into wide yak pastures. Walk through Ghoda Tabela to Langtang village (3,430 m) beneath Langtang Lirung and visit the memorial to the 2015 landslide.', { stay: 'guesthouse', notes: { accommodation: 'Tamang-run teahouse', guide: '6 hours walking, 1,000 m ascent' } }),
      d('Langtang Village to Kyanjin Gompa', 'Kyanjin Gompa', 'Langtang Valley', 'A short morning walk through mani-wall villages brings you to Kyanjin Gompa (3,870 m). Afternoon visit to the cheese factory and a gentle acclimatisation hike.', { stay: 'guesthouse', notes: { accommodation: 'Lodge with glacier views', guide: '4 hours walking; afternoon at leisure' } }),
      d('Tserko Ri sunrise', 'Tserko Ri', 'Langtang Valley', 'Start at 4:00 for the climb to Tserko Ri (4,984 m). Watch the sun rise over Langtang Lirung, Yala Peak and Shishapangma, then return to Kyanjin for a late breakfast.', { stay: 'guesthouse', notes: { accommodation: 'Same lodge as the previous night', guide: 'Strenuous 7-hour round trip, optional for those who prefer rest' } }),
      d('Kyanjin Gompa to Lama Hotel', 'Lama Hotel', 'Langtang Valley', 'Retrace the valley downhill — about 7 hours with long views back toward the glaciers.', { stay: 'guesthouse', notes: { accommodation: 'Forest lodge', guide: '7 hours walking, long descent' } }),
      d('Lama Hotel to Syabrubesi', 'Syabrubesi', 'Langtang Valley', 'The final descent along the Langtang Khola to Syabrubesi. Soak in the nearby hot springs in the afternoon.', { stay: 'guesthouse', notes: { accommodation: 'Teahouse, hot shower', guide: '5 hours walking' } }),
      d('Drive back to Kathmandu', 'Kathmandu', 'Kathmandu Valley', 'Drive back to Kathmandu via Dhunche. Arrive in the early evening for a farewell dinner (optional) and transfer to your hotel.', { meal: true, drive: true, guide: false, notes: { transport: 'Private 4x4 to Thamel', meals: 'Optional farewell dinner included' } }),
    ],
  },
  // 5 ---------------------------------------------------------------------
  {
    code: 'DEMO-005', title: 'Upper Mustang Expedition', status: 'Published', seller: 2, region: 'Upper Mustang',
    categories: ['Luxury Escapes', 'Cultural Tours', 'Photography Tours'],
    excerpt: 'Nine days into the forbidden Kingdom of Lo — painted cliffs, cave monasteries, the walled city of Lo Manthang and a private-guide premium itinerary.',
    intro: [
      'Upper Mustang was closed to outsiders until 1992 and still feels like another century. A Tibetan Buddhist kingdom on the high-altitude desert plateau, it is a land of eroded cliffs in red, ochre and yellow, hilltop gompas and sky caves carved into the rock.',
      'This premium departure uses boutique lodges, a private jeep and a small group of up to eight guests so you can spend your energy on photography and conversation rather than logistics. A restricted-area permit (US$ 500) is included.',
    ],
    highlights: ['Fly Pokhara–Jomsom with Himalayan views over Dhaulagiri and Nilgiri', 'Walled medieval city of Lo Manthang and the King\'s palace', 'Chhoser sky caves and the cave monastery of Garphu', 'Painted cliffs at Ghar Khola and Tangbe\'s chortens', 'Tiji Festival access where dates allow', 'Private 4x4 jeep with picnic stops'],
    who: 'Photographers, culture seekers and travellers who prefer boutique comfort over teahouses. Moderate fitness is needed for the walks at 3,500–4,000 m.',
    outline: '9 days: Kathmandu → Pokhara → Jomsom → Kagbeni → Chele → Ghami → Lo Manthang (2 nights) → Yara/Chhoser → Jomsom → Pokhara.',
    include: ['Restricted Area Permit for Upper Mustang (US$ 500)', 'Return flights Pokhara–Jomsom', 'All internal transfers by private 4x4 jeep with driver', 'Boutique lodges and hotels throughout (twin share)', 'All meals on the tour with a hot picnic lunch on trail days', 'Licensed English-speaking guide and assistant', 'Entrance fees to gompas and the King\'s palace', 'Oxygen, first-aid kit, and satellite phone for emergencies'],
    exclude: [...STD_EXCLUDE, 'Single room supplement (available as an option)'],
    facts: { Duration: '9 days / 8 nights', Difficulty: ['Moderate'], 'Max Altitude': '3,840 m (Lo Manthang)', 'Best Season': ['Spring', 'Summer', 'Autumn'], 'Group Size': '2–8 guests', Accommodation: ['Hotel', 'Lodge', 'Guesthouse'], Meals: 'All meals included', Transport: ['Flight', 'Jeep'], Languages: ['English', 'Nepali'], 'Starting Point': 'Pokhara Airport', 'Ending Point': 'Pokhara Airport', 'Minimum Age': '10 years', 'Fitness Level': ['Average'], 'Activity Type': ['Cultural', 'Photography', 'Sightseeing'] },
    faqs: [
      { q: 'Why does Upper Mustang need a special permit?', a: 'It is a Restricted Area. Foreign visitors need a US$ 500 permit for 10 days, valid only with a licensed agency and two or more travellers. We arrange the paperwork — we need your passport scan 21 days before departure.' },
      { q: 'What happens if the Jomsom flight is cancelled?', a: 'Flights depend on weather and often depart early in the morning. We include one spare day in the itinerary and, if needed, arrange a private jeep from Pokhara at no extra cost.' },
      { q: 'How cold and windy is it?', a: 'Strong afternoon winds blow every day. Days are warm in sunshine but nights can be below zero. Bring a windproof shell and sun protection.' },
      CANCELLATION, INSURANCE,
    ],
    gallery: ['Kagbeni gateway at dawn', 'Painted cliffs of Ghar Khola', 'Chele chorten with Nilgiri behind', 'Lo Manthang walled city', 'Chhoser sky caves', 'Local woman spinning wool', 'Tashi Palace lodge courtyard'],
    location: { street: 'Gateway: Jomsom Airport Road', city: 'Jomsom', state: 'Gandaki', zip: '33100', lat: 28.7800, lng: 83.7233 },
    pricing: {
      perPerson: true, price: 2400, lockDays: 90,
      payment: { full: true, deposit: true, pct: 40, arrival: false },
      discount: { type: 'amount', value: 250, fromDays: -10, toDays: 55, code: 'LO250', description: 'US$ 250 off for the first departure of the season.' },
      options: [
        { name: 'Adult', category: 'adult', price: 2400, minPax: 2, maxPax: 8, discount: { type: 'percent', value: 10, fromDays: -10, toDays: 55 } },
        { name: 'Child (10–15)', category: 'child', price: 1800, minPax: 1, maxPax: 2 },
        { name: 'Single room supplement', category: 'custom', customCategory: 'Single room', price: 2950, minPax: 1, maxPax: 1 },
      ],
    },
    minSize: 2, maxSize: 8, enquiry: true, specialOffer: true,
    schedule: { type: 'fixed', startDays: 38 },
    days: [
      d('Arrive in Kathmandu', 'Kathmandu', 'Kathmandu Valley', 'Private transfer to a heritage boutique hotel in Patan. Afternoon briefing with your guide over Nepali tea, followed by a welcome dinner.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private car airport pickup', accommodation: 'Heritage boutique hotel in Patan, breakfast', meals: 'Welcome dinner at a Newari restaurant', guide: 'Expedition briefing and permit hand-over' } }),
      d('Fly to Pokhara', 'Pokhara', 'Pokhara', 'A 25-minute flight to Pokhara with Himalayan views and an afternoon at leisure on Phewa Lake, resting before the high-altitude days ahead.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Domestic flight and private transfer', accommodation: 'Lakeside resort, lake-view room', meals: 'Dinner at the hotel' } }),
      d('Fly to Jomsom and jeep to Kagbeni', 'Kagbeni', 'Upper Mustang', 'A 20-minute morning flight to Jomsom (2,720 m) through the world\'s deepest gorge, then a jeep along the Kali Gandaki to the medieval village of Kagbeni (2,810 m) at the border of Upper Mustang.', { stay: 'guesthouse', drive: true, notes: { transport: 'Flight and private 4x4', accommodation: 'Stone lodge with garden', guide: 'Visit to Kagbeni\'s gompa and red monastery' } }),
      d('Kagbeni to Chele and Syangboche', 'Chele', 'Upper Mustang', 'Enter Upper Mustang beyond the checkpoint. Drive and walk to Chele and across the high Chele pass to Syangboche (3,800 m), past ancient chortens and cliff-side caves.', { stay: 'guesthouse', drive: true, notes: { transport: '4x4 jeep with picnic stops', accommodation: 'Lodge with desert views', guide: 'Short walks; photography stops' } }),
      d('Syangboche to Ghami and Charang', 'Ghami', 'Upper Mustang', 'Cross the Nyi La pass (4,010 m) and visit Ghami, home to the world\'s longest mani wall. Continue to Charang and its 16th-century palace.', { stay: 'guesthouse', drive: true, notes: { transport: 'Private jeep', accommodation: 'Family-run lodge in Charang', guide: 'Guided visit of Charang Gompa' } }),
      d('Drive to Lo Manthang', 'Lo Manthang', 'Upper Mustang', 'The road finally opens onto Lo Manthang (3,840 m), the walled capital of the Kingdom of Lo. Afternoon walk through the four monasteries and the King\'s palace.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private jeep', accommodation: 'Traditional boutique inn inside the walls', meals: 'Dinner of local buckwheat and yak dishes', guide: 'Guided tour of Thubchen and Jampa Gompas' } }),
      d('Chhoser sky caves and Garphu', 'Chhoser', 'Upper Mustang', 'A day trip by jeep and on foot to the 6,000-cave complex at Chhoser and the Garphu cave monastery, a spiritual retreat of Guru Rinpoche.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Jeep to Chhoser and back', accommodation: 'Second night in Lo Manthang', meals: 'Hot picnic lunch', guide: 'Lamas explain the meditation caves' } }),
      d('Lo Manthang to Jomsom', 'Jomsom', 'Upper Mustang', 'A long jeep day back down the Kali Gandaki valley to Jomsom with stops in Samar and Kagbeni. Afternoon visit to the Mustang Eco Museum.', { stay: 'hotel', drive: true, meal: true, notes: { transport: '4x4 jeep, 9 hours with stops', accommodation: 'Jomsom hotel', meals: 'Farewell dinner' } }),
      d('Fly to Pokhara and Kathmandu', 'Kathmandu', 'Kathmandu Valley', 'Morning flight to Pokhara and an onward connection to Kathmandu. Transfer to your hotel or to Tribhuvan Airport.', { drive: true, guide: false, notes: { transport: 'Flights and private transfers' } }),
    ],
  },
  // 6 ---------------------------------------------------------------------
  {
    code: 'DEMO-006', title: 'Lumbini Buddhist Pilgrimage', status: 'Published', seller: 3, region: 'Lumbini',
    categories: ['Spiritual & Yoga', 'Cultural Tours', 'Family Holidays'],
    excerpt: 'Four days in the birthplace of the Buddha — Maya Devi Temple, Ashoka Pillar, monastic zone and meditation with resident monks.',
    intro: [
      'Lumbini is where Siddhartha Gautama was born around 623 BCE and today a UNESCO World Heritage Site. This pilgrimage combines the sacred Maya Devi Temple with the surrounding monastic zone, where temples built by countries from Thailand to Germany stand in a landscape of lakes and trees.',
      'You travel with a guide who explains the history and the teachings, and each day includes time for quiet reflection and guided meditation. Flexible dates mean you can choose the week that suits your group.',
    ],
    highlights: ['Maya Devi Temple and the Marker Stone of the Buddha\'s birth', 'Ashoka Pillar (249 BCE) and the sacred Pushkarni pond', 'Monastic zone: Thai, Chinese, Myanmar and German temples', 'World Peace Pagoda at sunset', 'Guided meditation and Dhamma talk with a resident monk', 'Day trip to the ruins of Tilaurakot (Kapilavastu)'],
    who: 'Pilgrims, families, Buddhist travel groups and anyone interested in the history and living tradition of Buddhism. Gentle pace, suitable for all ages.',
    outline: '4 days: Bhairahawa/Lumbini → sacred garden → monastic zone → Kapilavastu → departure.',
    include: ['Airport pickup in Bhairahawa (Gautam Buddha Airport)', '3 nights in a 4-star hotel near the Sacred Garden (breakfast)', 'All entrance fees to temples and archaeological sites', 'Private vehicle for the whole tour', 'English-speaking Buddhist-studies guide', 'Guided meditation sessions and monk\'s Dhamma talk', 'Daily lunch (vegetarian) at the monastic zone', 'Bottled water on every day'],
    exclude: STD_EXCLUDE,
    facts: { Duration: '4 days / 3 nights', Difficulty: ['Easy'], 'Max Altitude': '150 m (Lumbini plains)', 'Best Season': ['Autumn', 'Winter', 'Spring'], 'Group Size': '2–20 guests', Accommodation: ['Hotel'], Meals: 'Breakfast and vegetarian lunch included', Transport: ['Private vehicle'], Languages: ['English', 'Nepali', 'Hindi', 'Japanese'], 'Starting Point': 'Gautam Buddha Airport, Bhairahawa', 'Ending Point': 'Gautam Buddha Airport, Bhairahawa', 'Minimum Age': 'All ages', 'Fitness Level': ['Beginner'], 'Activity Type': ['Spiritual', 'Cultural', 'Sightseeing'] },
    faqs: [
      { q: 'What should I wear at the temples?', a: 'Modest clothing that covers shoulders and knees. Remove shoes before entering temples, and avoid pointing your feet at statues. A light shawl is handy for women entering the Maya Devi Temple.' },
      { q: 'Is the tour vegetarian?', a: 'Lunches at the monastic zone are vegetarian. Breakfast and dinner have both vegetarian and non-vegetarian options; tell us about dietary restrictions when booking.' },
      { q: 'What is the best time to visit?', a: 'October to March has pleasant days. April to June is very hot (40 °C+), and the monsoon lasts June to September. Buddha Jayanti (May) is a special time but crowded.' },
      CANCELLATION,
    ],
    gallery: ['Maya Devi Temple in morning light', 'Ashoka Pillar and the sacred pond', 'Monastic zone temples', 'Monks chanting at dawn', 'World Peace Pagoda', 'Meditation garden'],
    location: { street: 'Lumbini Sanskritik, Sacred Garden Road', city: 'Lumbini', state: 'Lumbini', zip: '32900', lat: 27.4833, lng: 83.2763 },
    pricing: {
      perPerson: true, price: 390,
      payment: { full: true, deposit: true, pct: 25, arrival: true },
      discount: { type: 'percent', value: 8, fromDays: -30, toDays: 140, code: 'PEACE8', description: 'Pilgrim\'s discount, valid on all departures this season.' },
      options: [
        { name: 'Adult', category: 'adult', price: 390, minPax: 1, maxPax: 20 },
        { name: 'Child (under 12)', category: 'child', price: 250, minPax: 1, maxPax: 8 },
        { name: 'Senior pilgrim (60+)', category: 'senior', price: 330, minPax: 1, maxPax: 10, discount: { type: 'amount', value: 20, fromDays: -30, toDays: 140 } },
        { name: 'Student / monk', category: 'student', price: 300, minPax: 1, maxPax: 10 },
      ],
    },
    minSize: 2, maxSize: 20, enquiry: false,
    schedule: { type: 'flexible', fromDays: 3, toDays: 300 },
    days: [
      d('Arrive in Bhairahawa and transfer to Lumbini', 'Lumbini', 'Lumbini', 'Welcome by your guide at Gautam Buddha Airport and a 40-minute transfer to Lumbini. Evening orientation walk to the Sacred Garden gate and a quiet dinner.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private minibus from the airport', accommodation: '4-star hotel near the Sacred Garden', meals: 'Vegetarian dinner', guide: 'Introduction to the Buddha\'s life story' } }),
      d('Maya Devi Temple and Sacred Garden', 'Sacred Garden', 'Lumbini', 'At dawn, join pilgrims at the Maya Devi Temple and the Marker Stone. Visit the Ashoka Pillar, the Puskarini Pond, and the Nepal Buddhist Temple before lunch at the monastic zone.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Cycle rickshaw or private van between sites', accommodation: 'Same hotel', meals: 'Vegetarian lunch at the monastic zone', guide: 'Guided meditation at the Bodhi tree' } }),
      d('Monastic zone and World Peace Pagoda', 'Monastic Zone', 'Lumbini', 'Cycle or ride through the East and West monastic zones, visiting the Thai, Chinese, Myanmar, Vietnamese and German temples. Sunset at the World Peace Pagoda and a talk with a resident monk.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Bicycles or private van', accommodation: 'Same hotel', meals: 'Vegetarian lunch at a monastery', guide: 'Dhamma talk and Q&A with a resident monk' } }),
      d('Tilaurakot and departure', 'Tilaurakot', 'Lumbini', 'A half-day excursion to the archaeological ruins of Tilaurakot, believed to be the site of Kapilavastu where the Buddha spent 29 years. Transfer to the airport for your flight.', { drive: true, meal: true, notes: { transport: 'Private minibus to Bhairahawa Airport', meals: 'Packed lunch', guide: 'Archaeological commentary' } }),
    ],
  },
  // 7 ---------------------------------------------------------------------
  {
    code: 'DEMO-007', title: 'Bhaktapur & Nagarkot Photography Tour', status: 'Published', seller: 3, region: 'Nagarkot',
    categories: ['Photography Tours', 'Cultural Tours'],
    excerpt: 'A private 3-day photography tour: Bhaktapur\'s medieval squares, pottery courtyards and a Himalayan sunrise above Nagarkot — priced per group of up to four.',
    intro: [
      'Designed with a professional Nepali photographer, this private tour puts you in the right place at the right light. You will shoot golden-hour life in Bhaktapur\'s Taumadhi and Pottery Squares, Changu Narayan temple, and wake at 4:30 for the Himalayan sunrise above Nagarkot.',
      'The price is per private group of up to four people, so you get a dedicated vehicle, guide-photographer, and the flexibility to linger as long as the light holds.',
    ],
    highlights: ['Golden-hour portraits at Bhaktapur Durbar Square', 'Pottery Square: clay-throwing and drying fields at sunrise', 'Changu Narayan temple, a UNESCO site with 5th-century carvings', 'Nagarkot sunrise: Everest, Langtang and Ganesh Himal', 'Post-processing tips from the photographer-guide', 'Visit to a thanka painting studio'],
    who: 'Photography enthusiasts of any level, and small groups or couples who want a private, flexible day. A camera with a standard zoom lens is sufficient.',
    outline: '3 days: Bhaktapur → Changu Narayan → Nagarkot (overnight, sunrise) → Panauti/Namobuddha.',
    include: ['Private vehicle with driver for the whole tour', '2 nights hotel (1 Bhaktapur heritage inn, 1 Nagarkot view hotel, breakfast)', 'Photographer-guide who also gives editing tips', 'Entrance fees to Bhaktapur and Changu Narayan', 'Pottery workshop and thanka studio visits', 'Dinner in Nagarkot and Newari lunch in Bhaktapur', 'Printed portfolio of 10 of your photographs (delivered by post)'],
    exclude: [...STD_EXCLUDE, 'Camera equipment rental (available on request)'],
    facts: { Duration: '3 days / 2 nights', Difficulty: ['Easy'], 'Max Altitude': '2,175 m (Nagarkot)', 'Best Season': ['Spring', 'Autumn', 'Winter'], 'Group Size': 'Private group of up to 4', Accommodation: ['Hotel', 'Resort'], Meals: 'Breakfast, one lunch and one dinner included', Transport: ['Private vehicle'], Languages: ['English', 'Nepali', 'Japanese'], 'Starting Point': 'Kathmandu hotel pickup', 'Ending Point': 'Kathmandu hotel drop-off', 'Minimum Age': '12 years', 'Fitness Level': ['Beginner'], 'Activity Type': ['Photography', 'Cultural', 'Sightseeing'] },
    faqs: [
      { q: 'Is the price per person or per group?', a: 'This is a private tour priced per group of up to four people. Extra travellers beyond four need a second vehicle — message us for a quote.' },
      { q: 'Do I need a professional camera?', a: 'No. Smartphone shooters and DSLR owners are equally welcome. Your guide helps with composition for any equipment.' },
      { q: 'What if the morning is cloudy at Nagarkot?', a: 'We check the forecast the evening before. If the view is blocked we reschedule sunrise to the following morning, adding one night at cost price.' },
      CANCELLATION,
    ],
    gallery: ['Taumadhi Square at dawn', 'Pottery Square drying courtyard', 'Changu Narayan carved temple', 'Nagarkot sunrise over Langtang', 'Shopkeeper portrait in Bhaktapur', 'Photographers at work'],
    location: { street: 'Taumadhi Tole, Bhaktapur Durbar Square', city: 'Bhaktapur', state: 'Bagmati', zip: '44800', lat: 27.6710, lng: 85.4298 },
    pricing: {
      perPerson: false, groupSize: 4, price: 1240, lockDays: 20,
      payment: { full: true, deposit: true, pct: 30, arrival: false },
      // Starts later — shows the "discount not active yet" state.
      discount: { type: 'percent', value: 12, fromDays: 12, toDays: 80, code: 'LIGHT12', description: 'Autumn-light offer, starts soon.' },
    },
    minSize: 1, maxSize: 4, enquiry: true,
    schedule: { type: 'multiple', departures: [
      { label: 'Weekend of full moon', startDays: 16, capacity: 4 },
      { label: 'Mid-November clear-sky weekend', startDays: 50, capacity: 4 },
      { label: 'Cherry blossom weekend (March)', startDays: 160, capacity: 4 },
    ] },
    days: [
      d('Bhaktapur golden-hour walk', 'Bhaktapur', 'Kathmandu Valley', 'Hotel pickup at 14:00 and a 40-minute drive to Bhaktapur. Photograph Taumadhi Square and the Nyatapola Temple in late light, with a Newari dinner of bara and juju dhau.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private car, pickup from Thamel', accommodation: 'Heritage inn inside the old town', meals: 'Newari dinner', guide: 'Photographer-guide walk; light and composition tips' } }),
      d('Pottery Square, Changu Narayan and Nagarkot', 'Changu Narayan', 'Nagarkot', 'Sunrise at the Pottery Square, then Changu Narayan temple. In the afternoon drive up to Nagarkot (2,175 m) for a golden-hour hike and sunset above the valley.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private car, 1-hour drive to Nagarkot', accommodation: 'Hotel with a panoramic roof terrace', meals: 'Dinner at the hotel', guide: 'Pottery workshop and thanka studio visit' } }),
      d('Himalayan sunrise and Panauti', 'Nagarkot', 'Nagarkot', 'A 4:30 start for the sunrise over the Himalaya from the viewpoint tower, Everest visible on a clear day. Breakfast, then a drive to Panauti for its ancient Newari town and the sacred river confluence before returning to Kathmandu.', { meal: true, drive: true, notes: { transport: 'Private car back to Thamel', meals: 'Newari lunch in Panauti', guide: 'Photo critique session over lunch' } }),
    ],
  },
  // 8 ---------------------------------------------------------------------
  {
    code: 'DEMO-008', title: 'Bardia Tiger Safari', status: 'Published', seller: 4, region: 'Bardia National Park',
    categories: ['Wildlife Safari', 'Family Holidays', 'Photography Tours'],
    excerpt: 'Four days in Nepal\'s largest lowland national park: jeep and foot safaris, Karnali river canoeing, Tharu culture and the best odds for Bengal tiger.',
    intro: [
      'Bardia is the wild west of Nepal\'s Terai. With fewer visitors than Chitwan and a thriving tiger population, it offers some of the best wildlife viewing in South Asia, along with one-horned rhinos, wild elephants, gharial crocodiles and more than 400 bird species.',
      'Your safaris are led by naturalists from the local community. Dawn and dusk are the best times, and in between you canoe the Karnali river, visit a Tharu village and relax at the lodge.',
    ],
    highlights: ['Dawn jeep and foot safari with a licensed naturalist', 'Tiger-tracking drive through the Babai valley', 'Canoe trip on the Karnali with gharial and dolphin watching', 'Evening Tharu stick-dance in the village', 'Bird-watching walk in the riverine forest', 'Elephant-breeding centre visit'],
    who: 'Families with children over 6, wildlife photographers and nature lovers. Easy physical level.',
    outline: '4 days: Kathmandu/Nepalgunj → Thakurdwara → safaris → canoe → return.',
    include: ['Transfers from Nepalgunj Airport to Bardia and back', '3 nights in a jungle lodge (full board)', 'Four safari activities: 2 jeep, 1 foot, 1 canoe', 'Park entrance fees and a licensed naturalist guide', 'Tharu cultural program', 'Binoculars hire for the duration', 'Jungle drinking water and tea/coffee'],
    exclude: [...STD_EXCLUDE.slice(0, 3), 'Flights to Nepalgunj (can be arranged)', 'Camera fees and tips'],
    facts: { Duration: '4 days / 3 nights', Difficulty: ['Easy'], 'Max Altitude': '200 m', 'Best Season': ['Autumn', 'Winter', 'Spring'], 'Group Size': '2–12 guests', Accommodation: ['Lodge', 'Resort'], Meals: 'Full board', Transport: ['Jeep', 'Private vehicle', 'Boat'], Languages: ['English', 'Nepali', 'Hindi'], 'Starting Point': 'Nepalgunj Airport', 'Ending Point': 'Nepalgunj Airport', 'Minimum Age': '6 years', 'Fitness Level': ['Beginner'], 'Activity Type': ['Wildlife', 'Photography', 'Adventure'] },
    faqs: [
      { q: 'What are my chances of seeing a tiger?', a: 'Bardia has about 125 wild tigers. Sightings are never guaranteed, but experienced naturalists make most groups\' chances reasonable — roughly one in three trips sees a tiger, and many more spot fresh tracks.' },
      { q: 'Is it safe on foot?', a: 'Foot safaris are carried out with two armed guides and strict safety rules. Rhinos and elephants are the more common encounters.' },
      { q: 'Are the lodges air-conditioned?', a: 'Rooms have fans and screened windows. Peak summer is hot, so October–March is the recommended season.' },
      CANCELLATION,
    ],
    gallery: ['Jeep safari at dawn', 'Bengal tiger fresh pugmarks', 'Karnali river canoe', 'One-horned rhino in the grassland', 'Tharu stick dance', 'Gharial basking on a sandbank'],
    location: { street: 'Thakurdwara, near the park gate', city: 'Thakurdwara', state: 'Lumbini', zip: '21800', lat: 28.3833, lng: 81.5 },
    pricing: {
      perPerson: true, price: 480,
      payment: { full: true, deposit: true, pct: 30, arrival: false },
      discount: { type: 'amount', value: 40, fromDays: -25, toDays: 120, code: 'TIGER40', description: 'US$ 40 off for the Terai season.' },
      options: [
        { name: 'Adult', category: 'adult', price: 480, minPax: 2, maxPax: 12, discount: { type: 'amount', value: 40, fromDays: -25, toDays: 120 } },
        { name: 'Child (6–12)', category: 'child', price: 360, minPax: 1, maxPax: 6 },
        { name: 'Non-safari companion', category: 'custom', customCategory: 'Non-participant', price: 260, minPax: 1, maxPax: 4 },
      ],
    },
    minSize: 2, maxSize: 12, enquiry: true,
    schedule: { type: 'multiple', departures: [
      { label: 'November departure', startDays: 33, capacity: 12 },
      { label: 'December departure', startDays: 62, capacity: 12 },
      { label: 'February departure', startDays: 120, capacity: 12 },
      { label: 'April departure', startDays: 175, capacity: 12 },
    ] },
    days: [
      d('Arrive in Nepalgunj and drive to Bardia', 'Thakurdwara', 'Bardia National Park', 'Pick up from Nepalgunj Airport, then a 2.5-hour drive to Bardia. Check in at the lodge, rest, and take a short sunset walk along the park boundary.', { stay: 'guesthouse', meal: true, drive: true, notes: { transport: 'Private jeep from the airport', accommodation: 'Jungle lodge in a safari cottage', meals: 'Welcome dinner with local Tharu dishes', guide: 'Safety briefing and wildlife overview' } }),
      d('Jeep safari and foot patrol', 'Babai Valley', 'Bardia National Park', 'Dawn jeep safari into the Babai valley and Karnali floodplain. After lunch, a guided jungle walk with two naturalists looking for tracks, birds and deer.', { stay: 'guesthouse', meal: true, drive: true, notes: { transport: 'Open safari jeep', accommodation: 'Same lodge', meals: 'Packed breakfast and hot lunch', guide: 'Licensed naturalist, 2 armed rangers on the foot walk' } }),
      d('Karnali canoe trip and Tharu village', 'Karnali River', 'Bardia National Park', 'Paddle a dugout canoe along the Karnali river to spot gharial and freshwater dolphins. Afternoon visit to a Tharu village, with an evening stick-dance performance around the fire.', { stay: 'guesthouse', meal: true, notes: { accommodation: 'Same lodge', meals: 'Dinner with the village program', guide: 'River naturalist and local boatman' } }),
      d('Final dawn safari and departure', 'Thakurdwara', 'Bardia National Park', 'A last early-morning drive for tigers, then breakfast and the transfer back to Nepalgunj Airport for your onward flight.', { meal: true, drive: true, notes: { transport: 'Private jeep to Nepalgunj Airport', meals: 'Breakfast at the lodge', guide: 'Final tracking drive' } }),
    ],
  },
  // 9 ---------------------------------------------------------------------
  {
    code: 'DEMO-009', title: 'Kathmandu Food & Culture Walk', status: 'Published', seller: 5, region: 'Kathmandu Valley',
    categories: ['Cultural Tours', 'Family Holidays'],
    excerpt: 'Two days eating your way through Kathmandu and Patan — Asan bazaar tastings, a momo-making class, Durbar Squares and a Boudhanath kora.',
    intro: [
      'Kathmandu is best experienced through its food. This two-day walk threads through spice markets, temple courtyards and family kitchens, with around twenty tastings from dal bhat to juju dhau and chatamari.',
      'You spend half a day with a local family learning to fold momos, and the rest at the valley\'s UNESCO World Heritage squares with a guide who knows the stories behind every carving.',
    ],
    highlights: ['Asan bazaar spice and snack tasting', 'Momo cooking class in a family kitchen', 'Patan Durbar Square and the Golden Temple', 'Newari feast in a heritage courtyard', 'Boudhanath stupa at dusk with a kora walk', 'Chai and sweets on a rooftop café'],
    who: 'Food lovers, families and first-time visitors. All dietary requirements (vegetarian, vegan, gluten-free) are covered with notice.',
    outline: '2 days: Thamel → Asan → Patan → Boudhanath → family kitchen class.',
    include: ['Hotel pickup and drop-off by tuk-tuk or taxi', 'All tastings and two full meals', 'Momo cooking class and recipe card', 'Entry to Patan Durbar Square and Patan Museum', 'Boudhanath stupa entrance', 'English-speaking local food guide'],
    exclude: ['Hotel accommodation', 'Drinks other than tea and water', 'Personal shopping and tips', 'Travel insurance'],
    facts: { Duration: '2 days / 1 night (optional hotel)', Difficulty: ['Easy'], 'Max Altitude': '1,400 m', 'Best Season': ['Autumn', 'Winter', 'Spring', 'Summer'], 'Group Size': '2–12 guests', Accommodation: ['Hotel'], Meals: 'Tastings plus lunch and dinner', Transport: ['Private vehicle', 'On foot'], Languages: ['English', 'Nepali', 'Hindi', 'French'], 'Starting Point': 'Thamel, Kathmandu', 'Ending Point': 'Thamel, Kathmandu', 'Minimum Age': 'All ages', 'Fitness Level': ['Beginner'], 'Activity Type': ['Cultural', 'Sightseeing'] },
    faqs: [
      { q: 'Is the food spicy?', a: 'Dishes are seasoned but rarely very hot. Tell your guide your preference and they will pick milder dishes.' },
      { q: 'Can you handle food allergies?', a: 'Yes, with notice at booking. We share your allergen list with each stall and the cooking-class family.' },
      { q: 'Is it OK for older travellers?', a: 'The walks are slow and short with plenty of seating, and we can use a vehicle between stops.' },
      CANCELLATION,
    ],
    gallery: ['Asan bazaar spice stall', 'Folding momos in a family kitchen', 'Patan Durbar Square at dusk', 'Newari feast on a banana leaf', 'Boudhanath prayer wheels', 'Rooftop chai'],
    location: { street: 'Starting at Garden of Dreams entrance, Thamel', city: 'Kathmandu', state: 'Bagmati', zip: '44600', lat: 27.7172, lng: 85.3240 },
    pricing: {
      perPerson: true, price: 150,
      payment: { full: true, deposit: false, pct: 20, arrival: true },
      // Already expired — shows the "discount ended" state.
      discount: { type: 'percent', value: 10, fromDays: -70, toDays: -8, code: 'TASTE10', description: 'Festival season offer — ended.' },
      options: [
        { name: 'Adult', category: 'adult', price: 150, minPax: 1, maxPax: 12, discount: { type: 'percent', value: 10, fromDays: -70, toDays: -8 } },
        { name: 'Child (under 12)', category: 'child', price: 90, minPax: 1, maxPax: 6 },
        { name: 'Student with ID', category: 'student', price: 120, minPax: 1, maxPax: 8, discount: { type: 'amount', value: 10, fromDays: -70, toDays: -8 } },
      ],
    },
    minSize: 1, maxSize: 12, enquiry: true,
    schedule: { type: 'flexible', fromDays: 1, toDays: 300 },
    days: [
      d('Asan bazaar tastings and Patan Durbar Square', 'Kathmandu', 'Kathmandu Valley', 'Meet at Thamel and walk to Asan, where you sample samosas, sel roti and spices. Continue by vehicle to Patan Durbar Square, the Golden Temple, and a lunch of Newari specialities.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private tuk-tuk between stops', accommodation: 'Optional night in a Thamel hotel (add-on)', meals: 'Newari set lunch at a heritage courtyard', guide: 'Local food and heritage guide' } }),
      d('Momo class and Boudhanath at dusk', 'Boudhanath', 'Kathmandu Valley', 'Cook momos, dal bhat and chutney with a local family in the morning, eat your creations for lunch, then circle the Boudhanath stupa at golden hour with butter-lamp lighting.', { meal: true, drive: true, notes: { transport: 'Private taxi to the family home and Boudhanath', meals: 'Cooking-class lunch and rooftop dinner', guide: 'Host family cook and guide' } }),
    ],
  },
  // 10 --------------------------------------------------------------------
  {
    code: 'DEMO-010', title: 'Trishuli River Rafting', status: 'Published', seller: 5, region: 'Kathmandu Valley',
    categories: ['Rafting & Water Sports', 'Adventure Sports'],
    excerpt: 'Two days of Grade II–III white water on the Trishuli with a riverside camp, bonfire dinner and a certified guide in every raft.',
    intro: [
      'The Trishuli is the most popular rafting river in Nepal for good reason: warm water, forgiving rapids and scenic gorges only three hours from Kathmandu. This overnight trip combines a full day on the water with a night in a riverside camp.',
      'A certified guide leads every raft, with a safety kayaker alongside, and all gear is provided. No experience is needed — just a willingness to get wet.',
    ],
    highlights: ['Grade II–III rapids with names like "Ladies Delight" and "House Rock"', 'Overnight riverside camp with a bonfire dinner', 'Optional cliff-jumping and swim stops', 'Wildlife: monitor lizards, kingfishers and river otters', 'Hot lunch on a sandy beach'],
    who: 'Anyone aged 12 and up who can swim. Great for friends and school groups.',
    outline: '2 days: Kathmandu → Charaudi put-in → Trishuli rapids → riverside camp → Narayanghat take-out.',
    include: ['Return transfers from Kathmandu or Pokhara', '1 night riverside tented camp (twin tents, mattresses)', 'All meals from lunch day 1 to lunch day 2', 'Rafting gear: helmet, life jacket, wetsuit, paddle', 'Certified rafting guide and safety kayaker', 'Camp staff, bonfire and drinking water', 'Group photos from the river'],
    exclude: STD_EXCLUDE,
    facts: { Duration: '2 days / 1 night', Difficulty: ['Easy'], 'Max Altitude': '600 m', 'Best Season': ['Autumn', 'Spring'], 'Group Size': '2–16 guests', Accommodation: ['Camp'], Meals: 'Lunch, dinner, breakfast and lunch', Transport: ['Private vehicle', 'Boat'], Languages: ['English', 'Nepali', 'Hindi'], 'Starting Point': 'Kathmandu (Thamel)', 'Ending Point': 'Kathmandu or Pokhara', 'Minimum Age': '12 years', 'Fitness Level': ['Average'], 'Activity Type': ['Adventure'] },
    faqs: [
      { q: 'Do I need to be a strong swimmer?', a: 'You should be comfortable in water, but life jackets are provided. Non-swimmers can join the gentle parts of the river on request.' },
      { q: 'What should I bring?', a: 'Swimsuit, quick-dry clothes, a warm layer for the evening, sunscreen and a dry bag. We give you waterproof bags for valuables.' },
      { q: 'What is the water level like?', a: 'It varies by season. October–November has a medium flow (Grade II–III); during the monsoon the river is high and we use only the safest sections.' },
      CANCELLATION,
    ],
    gallery: ['Raft in the rapids', 'Riverside camp at sunset', 'Group cheer after a big drop', 'Cliff-jump swim stop', 'Bonfire dinner', 'Gorge views from the river'],
    location: { street: 'Charaudi River Put-in, Prithvi Highway', city: 'Charaudi', state: 'Bagmati', zip: '44200', lat: 27.9086, lng: 84.7497 },
    pricing: {
      perPerson: true, price: 220,
      payment: { full: true, deposit: false, pct: 20, arrival: true },
      discount: { type: 'amount', value: 30, fromDays: -12, toDays: 60, description: 'Early-season price drop — no code needed.' },
    },
    minSize: 2, maxSize: 16, enquiry: false, specialOffer: true,
    schedule: { type: 'flexible', fromDays: 1, toDays: 330 },
    days: [
      d('Drive to the river and the first rapids', 'Charaudi', 'Kathmandu Valley', 'Depart Kathmandu at 7:00 for the 3-hour drive to the Trishuli put-in. After a paddle-and-safety briefing, raft the first rapids, stopping for a beach picnic lunch.', { stay: 'guesthouse', meal: true, drive: true, notes: { transport: 'Tourist van with rafting gear on the roof', accommodation: 'Riverside tented camp, twin share', meals: 'Beach lunch, bonfire dinner', guide: 'Certified rafting guide and safety kayaker' } }),
      d('Final rapids and return to Kathmandu', 'Narayanghat', 'Chitwan National Park', 'A final stretch of rapids to Narayanghat, with an optional cliff jump. Change, eat lunch, and drive back to Kathmandu (or on to Pokhara).', { meal: true, drive: true, notes: { transport: 'Van back to Kathmandu or Pokhara', meals: 'Breakfast at camp, lunch at the take-out', guide: 'Rafting guide' } }),
    ],
  },
  // 11 --------------------------------------------------------------------
  {
    code: 'DEMO-011', title: 'Everest Helicopter Day Tour', status: 'Published', seller: 6, region: 'Everest Region',
    categories: ['Luxury Escapes', 'Photography Tours'],
    excerpt: 'A one-day helicopter journey to the Khumbu: land at Kala Patthar, breakfast at Everest View Hotel and a flyover of the Khumbu glacier.',
    intro: [
      'See Mount Everest in a morning, without a two-week trek. A 5-seat helicopter leaves Kathmandu at dawn, follows the Dudh Kosi valley past Namche Bazaar, lands at Kala Patthar for the closest views of Everest, and stops at the Everest View Hotel for breakfast.',
      'Spaces are limited to five guests per flight. The itinerary depends on weather, and your guide stays in contact with the pilot to select the best window.',
    ],
    highlights: ['Landing on Kala Patthar (5,550 m) for 360° Himalayan views', 'Breakfast on the terrace at the Everest View Hotel (3,880 m)', 'Fly over Khumbu glacier and Everest Base Camp', 'Views of Lhotse, Nuptse, Ama Dablam and Cho Oyu', 'Return flight over Namche Bazaar and Tengboche'],
    who: 'Travellers short on time, anyone who cannot trek, and photographers. No altitude acclimatisation is needed because the stay at altitude is short.',
    outline: '1 day: Kathmandu → Lukla → Kala Patthar → Syangboche (Everest View Hotel) → Kathmandu.',
    include: ['Charter helicopter flights from Kathmandu, 5 seats per aircraft', 'Hotel pickup and drop-off in Kathmandu', 'Breakfast at the Everest View Hotel', 'Sagarmatha National Park fee and local area fee', 'Guide who joins the flight', 'Oxygen on board for emergencies', 'Souvenir flight certificate'],
    exclude: ['Flight cancellation due to weather beyond rebooking (refund of unflown portion)', ...STD_EXCLUDE.slice(2)],
    facts: { Duration: '1 day (about 4 hours)', Difficulty: ['Easy'], 'Max Altitude': '5,550 m (Kala Patthar)', 'Best Season': ['Spring', 'Autumn'], 'Group Size': '1–5 guests', Accommodation: ['Hotel'], Meals: 'Breakfast at Everest View Hotel', Transport: ['Helicopter'], Languages: ['English', 'Nepali', 'Japanese'], 'Starting Point': 'Tribhuvan Airport domestic terminal', 'Ending Point': 'Tribhuvan Airport domestic terminal', 'Minimum Age': '5 years', 'Fitness Level': ['Beginner'], 'Activity Type': ['Sightseeing', 'Photography'] },
    faqs: [
      { q: 'What if weather blocks the flight?', a: 'Mountain flights are very weather-dependent. If we cannot fly on your day we move you to the next available date at no cost, and refund any portion we could not operate.' },
      { q: 'Is altitude sickness a risk?', a: 'The stay at 5,550 m is about 10 minutes. Mild symptoms are possible for sensitive travellers; oxygen is on board and the pilot descends if needed.' },
      { q: 'Can I take photos from the helicopter?', a: 'Yes — window seats are assigned in advance. Avoid reflective clothing and bring a polarising filter if you have one.' },
      CANCELLATION,
    ],
    gallery: ['Helicopter over the Khumbu valley', 'Everest from Kala Patthar', 'Everest View Hotel terrace', 'Ama Dablam at sunrise', 'Khumbu glacier from above', 'Namche Bazaar from the air'],
    location: { street: 'Tribhuvan International Airport, Domestic Terminal', city: 'Kathmandu', state: 'Bagmati', zip: '44600', lat: 27.6966, lng: 85.3591 },
    pricing: {
      perPerson: true, price: 1450,
      payment: { full: true, deposit: false, pct: 20, arrival: false },
      options: [
        { name: 'Adult', category: 'adult', price: 1450, minPax: 1, maxPax: 5 },
        { name: 'Child (5–15)', category: 'child', price: 1100, minPax: 1, maxPax: 3 },
      ],
    },
    minSize: 1, maxSize: 5, enquiry: true,
    schedule: { type: 'multiple', departures: [
      { label: 'Autumn morning flight (Oct)', startDays: 9, capacity: 5 },
      { label: 'Autumn morning flight (Nov)', startDays: 40, capacity: 5 },
      { label: 'Spring morning flight (Mar)', startDays: 150, capacity: 5 },
      { label: 'Spring morning flight (Apr)', startDays: 185, capacity: 5 },
    ] },
    days: [
      d('Everest by helicopter', 'Kala Patthar', 'Everest Region', 'Pickup at 5:30 from your hotel, flight at dawn via Lukla and Namche to Kala Patthar for the best views of Everest. After 10 minutes of photos, fly to Syangboche for breakfast at the Everest View Hotel, then return to Kathmandu by 10:30.', { meal: true, drive: true, notes: { transport: 'Charter helicopter, 5 seats, window seats assigned', meals: 'Breakfast at the Everest View Hotel', guide: 'On-board guide and flight briefing' } }),
    ],
  },
  // 12 --------------------------------------------------------------------
  {
    code: 'DEMO-012', title: 'Nepal Family Holiday', status: 'Published', seller: 7, region: 'Chitwan National Park',
    categories: ['Family Holidays', 'Wildlife Safari', 'Cultural Tours'],
    excerpt: 'Eight days built around children: Kathmandu sightseeing, Chitwan jungle activities, an elephant breeding centre and Pokhara boat rides.',
    intro: [
      'Nepal for families does not have to mean long hikes. This eight-day itinerary pairs short, hands-on activities — cooking, canoeing, elephant-bathing alternatives and a mountain flight — with comfortable hotels and a guide who speaks both child and adult.',
      'Days are short, there is a pool at every stay, and the family room is booked for you. Kids under 12 receive a reduced fare and a junior explorer booklet with activities.',
    ],
    highlights: ['Swayambhunath monkey temple with a scavenger hunt for kids', 'Chitwan jungle safari, canoe and bird watching', 'Elephant breeding centre and tharu village', 'Phewa Lake boating and a simple paragliding option for teens', 'Mountain flight over the Himalaya (optional)', 'Cooking and pottery workshops'],
    who: 'Families with children aged 4 and above, multi-generational groups, and anyone who wants comfort and variety.',
    outline: '8 days: Kathmandu → Chitwan → Pokhara → Kathmandu with family-friendly activities each day.',
    include: ['Airport transfers and all internal transport by private vehicle', '7 nights in family-friendly hotels and a jungle resort', 'Breakfast daily, plus 5 dinners and 3 lunches', 'Chitwan National Park fees and three jungle activities', 'Pokhara boat ride and Peace Pagoda excursion', 'Family guide and Junior Explorer activity pack', 'Pottery and cooking workshop'],
    exclude: STD_EXCLUDE,
    facts: { Duration: '8 days / 7 nights', Difficulty: ['Easy'], 'Max Altitude': '1,400 m', 'Best Season': ['Autumn', 'Winter', 'Spring'], 'Group Size': '2–10 guests (families)', Accommodation: ['Hotel', 'Resort', 'Lodge'], Meals: 'Breakfast daily plus 5 dinners and 3 lunches', Transport: ['Private vehicle', 'Tourist bus', 'Boat'], Languages: ['English', 'Nepali', 'German', 'French'], 'Starting Point': 'Kathmandu Airport', 'Ending Point': 'Kathmandu Airport', 'Minimum Age': '4 years', 'Fitness Level': ['Beginner'], 'Activity Type': ['Wildlife', 'Cultural', 'Sightseeing', 'Relaxation'] },
    faqs: [
      { q: 'Are the activities safe for young kids?', a: 'Yes. Every activity has a minimum age listed and children are always with a parent and guide. Jungle walks are only taken with children over 8.' },
      { q: 'Do you provide car seats?', a: 'Child seats are available on request for the private vehicle; please tell us your child\'s age and weight when booking.' },
      { q: 'Can we adjust the pace?', a: 'Absolutely. Itinerary days are flexible and your guide can swap activities for a rest day at the pool.' },
      CANCELLATION,
    ],
    gallery: ['Family at Swayambhunath', 'Child feeding a deer at Chitwan', 'Canoe on the Rapti river', 'Phewa Lake boat with the Annapurna view', 'Pottery workshop', 'Jungle resort pool'],
    location: { street: 'Sauraha Chowk, Chitwan', city: 'Sauraha', state: 'Bagmati', zip: '44200', lat: 27.5766, lng: 84.4980 },
    pricing: {
      perPerson: true, price: 1650, lockDays: 45,
      payment: { full: true, deposit: true, pct: 30, arrival: false },
      discount: { type: 'percent', value: 15, fromDays: -18, toDays: 90, code: 'FAMILY15', description: '15% family saving, valid when two adults travel with one or more children.' },
      options: [
        { name: 'Adult', category: 'adult', price: 1650, minPax: 1, maxPax: 6, discount: { type: 'percent', value: 15, fromDays: -18, toDays: 90 } },
        { name: 'Child (4–12)', category: 'child', price: 1100, minPax: 1, maxPax: 5, discount: { type: 'percent', value: 15, fromDays: -18, toDays: 90 } },
        { name: 'Teen (13–17)', category: 'custom', customCategory: 'Teen', price: 1400, minPax: 1, maxPax: 4 },
        { name: 'Grandparent (65+)', category: 'senior', price: 1480, minPax: 1, maxPax: 3 },
      ],
    },
    minSize: 2, maxSize: 10, enquiry: true, specialOffer: true,
    schedule: { type: 'multiple', departures: [
      { label: 'October school-break departure', startDays: 21, capacity: 10 },
      { label: 'Christmas holiday departure', startDays: 75, capacity: 10 },
      { label: 'February half-term departure', startDays: 130, capacity: 10 },
      { label: 'Easter holiday departure', startDays: 190, capacity: 10 },
    ] },
    days: [
      d('Arrive in Kathmandu', 'Kathmandu', 'Kathmandu Valley', 'Meet your family guide at the airport, transfer to a hotel with a pool and enjoy a gentle afternoon walk around Thamel. Welcome dinner with a kids\' menu.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private vehicle with child seats on request', accommodation: 'Family room at a garden hotel with a pool', meals: 'Welcome dinner, kids\' menu', guide: 'Meet-and-greet, schedule for the week' } }),
      d('Swayambhunath and Patan', 'Swayambhunath', 'Kathmandu Valley', 'Climb the steps to the monkey temple with a scavenger hunt, then drive to Patan Durbar Square for a pottery workshop, where children make their own clay souvenir.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private vehicle', accommodation: 'Same hotel', meals: 'Lunch at a family-run café', guide: 'Family guide with junior explorer pack' } }),
      d('Drive to Chitwan', 'Sauraha', 'Chitwan National Park', 'A 5-hour scenic drive to Chitwan with a stop at a riverside café. Afternoon sunset walk in the village, then a Tharu dance evening.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private vehicle, rest stops for kids', accommodation: 'Jungle resort with a pool and cottages', meals: 'Dinner with Tharu dance' } }),
      d('Jungle safari and canoe', 'Chitwan National Park', 'Chitwan National Park', 'Morning canoe trip on the Rapti river, then a jeep safari for rhinos and deer. Evening visit to the elephant breeding centre.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Safari jeep and dugout canoe', accommodation: 'Same resort', meals: 'Lunch at the resort, dinner included', guide: 'Naturalist guide who speaks to kids' } }),
      d('Chitwan village and drive to Pokhara', 'Sauraha', 'Chitwan National Park', 'A bicycle ride through Tharu villages, then a 5-hour drive to Pokhara and a lakeside dinner.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private vehicle', accommodation: 'Lakeside hotel with lake-view family room', meals: 'Dinner by Phewa Lake', guide: 'Village cycling guide' } }),
      d('Phewa Lake and Peace Pagoda', 'Pokhara', 'Pokhara', 'Boat to Tal Barahi temple, a picnic on the shore and a drive up to the World Peace Pagoda with views of Machapuchare. Teens can try a tandem paraglide.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Private vehicle and rowing boat', accommodation: 'Same lakeside hotel', meals: 'Picnic lunch on the lake', guide: 'Local lake guide' } }),
      d('Mountain flight and free afternoon', 'Pokhara', 'Pokhara', 'Optional morning mountain flight over Annapurna, then a free afternoon in the hotel pool or café. Evening flight or bus back to Kathmandu.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Domestic flight Pokhara–Kathmandu', accommodation: 'Kathmandu garden hotel', meals: 'Dinner at a family restaurant' } }),
      d('Farewell and departure', 'Kathmandu', 'Kathmandu Valley', 'Morning free for last-minute shopping. Transfer to the airport.', { drive: true, guide: false, notes: { transport: 'Private vehicle to Tribhuvan Airport' } }),
    ],
  },
  // 13 --------------------------------------------------------------------
  {
    code: 'DEMO-013', title: 'Yoga & Meditation Retreat Pokhara', status: 'Published', seller: 8, region: 'Pokhara',
    categories: ['Spiritual & Yoga', 'Luxury Escapes'],
    excerpt: 'Seven days of sunrise yoga, silent meditation, Ayurvedic massage and mindful hikes beside Phewa Lake.',
    intro: [
      'Pokhara\'s lake and the Annapurna range are the setting for a seven-day reset. Mornings begin with hatha yoga on a lake-view deck, afternoons with guided meditation and Ayurvedic treatment, and evenings with vegetarian, locally grown meals.',
      'A fixed departure keeps the group together: twelve to fourteen participants share the same teachers, schedule and silent day. Rooms are shared or private.',
    ],
    highlights: ['Daily sunrise hatha & vinyasa yoga with a certified teacher', 'One day of noble silence and walking meditation', 'Two Ayurvedic massages and a herbal steam session', 'Guided hike to the World Peace Pagoda for sunrise meditation', 'Sattvic vegetarian meals from the retreat garden', 'Evening kirtan with local musicians'],
    who: 'Beginners and experienced practitioners alike. Classes are adapted to every level.',
    outline: '7 days: arrival → yoga days → silent day → pagoda hike → closing circle.',
    include: ['6 nights lakeside retreat accommodation (shared or private room)', 'Daily yoga, meditation and pranayama classes', 'All vegetarian meals, herbal teas and fresh juices', 'Two Ayurvedic massages and a steam session', 'Guided hike to the World Peace Pagoda', 'Airport transfers in Pokhara', 'Yoga mat and meditation cushion loan'],
    exclude: ['Flights to Pokhara', 'Travel insurance', 'Additional spa treatments', 'Personal expenses'],
    facts: { Duration: '7 days / 6 nights', Difficulty: ['Easy'], 'Max Altitude': '1,100 m', 'Best Season': ['Autumn', 'Spring'], 'Group Size': '6–14 participants', Accommodation: ['Resort'], Meals: 'Three vegetarian meals daily', Transport: ['Private vehicle'], Languages: ['English'], 'Starting Point': 'Pokhara Airport', 'Ending Point': 'Pokhara Airport', 'Minimum Age': '16 years', 'Fitness Level': ['Beginner'], 'Activity Type': ['Spiritual', 'Relaxation'] },
    faqs: [
      { q: 'Do I need yoga experience?', a: 'No. Classes cater to complete beginners through to long-term practitioners, with alternatives offered for every pose.' },
      { q: 'What does a day look like?', a: 'Sunrise yoga 6:00, breakfast 8:00, meditation or workshop 10:00, lunch 12:30, free time and treatments, evening yoga 17:00, dinner 19:00, and a quiet evening practice.' },
      { q: 'Is the silent day mandatory?', a: 'It is part of the retreat but optional. You may choose to continue with the normal schedule.' },
      CANCELLATION,
    ],
    gallery: ['Lakeside yoga deck at sunrise', 'Silent meditation hall', 'Ayurvedic massage room', 'Hike to the Peace Pagoda', 'Sattvic lunch', 'Evening kirtan'],
    location: { street: 'Khahare, Lakeside Pokhara', city: 'Pokhara', state: 'Gandaki', zip: '33700', lat: 28.2096, lng: 83.9856 },
    pricing: {
      perPerson: true, price: 690, lockDays: 30,
      payment: { full: true, deposit: true, pct: 50, arrival: false },
      discount: { type: 'amount', value: 60, fromDays: -5, toDays: 30, code: 'ZEN60', description: 'Early registration discount, ends 30 days from now.' },
      options: [
        { name: 'Shared room', category: 'custom', customCategory: 'Shared room', price: 690, minPax: 1, maxPax: 8, discount: { type: 'amount', value: 60, fromDays: -5, toDays: 30 } },
        { name: 'Private room', category: 'custom', customCategory: 'Private room', price: 890, minPax: 1, maxPax: 6 },
        { name: 'Student shared room', category: 'student', price: 590, minPax: 1, maxPax: 4 },
      ],
    },
    minSize: 6, maxSize: 14, enquiry: true,
    schedule: { type: 'fixed', startDays: 46 },
    days: [
      d('Arrival and opening circle', 'Pokhara', 'Pokhara', 'Settle into your lakeside room, join the opening circle and gentle evening stretch. Welcome dinner with herbal tea.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Airport pickup in Pokhara', accommodation: 'Lakeside retreat; shared or private room', meals: 'Vegetarian welcome dinner', guide: 'Retreat lead teacher' } }),
      d('Hatha yoga and pranayama', 'Pokhara', 'Pokhara', 'Sunrise hatha class, breathwork workshop and a first Ayurvedic massage. Evening restorative yoga.', { stay: 'hotel', meal: true, notes: { accommodation: 'Retreat rooms', meals: 'Sattvic meals from the retreat garden', guide: 'Yoga teacher, 200-hr certified' } }),
      d('Vinyasa flow and a mindful lake walk', 'Pokhara', 'Pokhara', 'Dynamic vinyasa class, a silent lake walk and a workshop on mindfulness practice. Sunset meditation on the deck.', { stay: 'hotel', meal: true, notes: { accommodation: 'Retreat rooms', meals: 'Vegetarian meals', guide: 'Meditation teacher' } }),
      d('Day of noble silence', 'Pokhara', 'Pokhara', 'A full day of silence with sitting and walking meditation, journaling and a herbal steam. Optional private chat with a teacher at the end of the day.', { stay: 'hotel', meal: true, notes: { accommodation: 'Retreat rooms', meals: 'Meals eaten in silence', guide: 'Teacher available for questions' } }),
      d('Sunrise hike to the World Peace Pagoda', 'World Peace Pagoda', 'Pokhara', 'A guided pre-dawn hike for sunrise meditation at the pagoda, then breakfast at the retreat and a second Ayurvedic massage.', { stay: 'hotel', meal: true, drive: true, notes: { transport: 'Boat across Phewa Lake to the trailhead', accommodation: 'Retreat rooms', meals: 'Breakfast picnic at the pagoda', guide: 'Hike leader' } }),
      d('Closing circle, kirtan and farewell', 'Pokhara', 'Pokhara', 'A final morning practice, closing circle and an evening kirtan with local musicians. Farewell dinner under the stars.', { stay: 'hotel', meal: true, notes: { accommodation: 'Retreat rooms', meals: 'Farewell vegetarian feast', guide: 'Teachers and local musicians' } }),
      d('Departure', 'Pokhara', 'Pokhara', 'A relaxed morning practice and breakfast, then transfers to the airport or bus station.', { drive: true, guide: false, notes: { transport: 'Private transfer in Pokhara' } }),
    ],
  },
  // 14 --------------------------------------------------------------------
  {
    code: 'DEMO-014', title: 'Mardi Himal Trek', status: 'Draft', seller: 9, region: 'Annapurna Region',
    categories: ['Trekking & Hiking'],
    excerpt: 'A quiet, high-ridge trek close to Pokhara with views of Machapuchare at arm\'s length (draft — pricing and dates under review).',
    intro: [
      'Mardi Himal is the secret ridge of the Annapurnas: a spine of rhododendron forest and open grassland leading to a viewpoint directly under the Fishtail peak. It is quieter than the classic circuits and offers superb sunrise views.',
      'This route is still being finalised, so some details and dates may change before publishing.',
    ],
    highlights: ['Forest camp at 2,500 m in rhododendron forest', 'High Camp (3,580 m) with Machapuchare at arm\'s length', 'Mardi Himal Base Camp (4,500 m)', 'Fewer trekkers than other Annapurna routes', 'Sunrise from the Mardi Himal ridge'],
    who: 'Trekkers with a good fitness level looking for a short but dramatic alternative to Annapurna Base Camp.',
    outline: '6 days: Pokhara → Kande → Forest Camp → Low Camp → High Camp → Base Camp → Siding → Pokhara.',
    include: ['Private transfers from Pokhara', '5 nights teahouse accommodation (twin share)', 'Breakfast, lunch and dinner on the trek', 'Licensed guide and porter', 'ACAP permit and TIMS card', 'First-aid kit'],
    exclude: STD_EXCLUDE,
    facts: { Duration: '6 days / 5 nights', Difficulty: ['Moderate'], 'Max Altitude': '4,500 m (Mardi Himal Base Camp)', 'Best Season': ['Spring', 'Autumn'], 'Group Size': '2–10 trekkers', Accommodation: ['Teahouse'], Meals: 'Full board', Transport: ['Private vehicle', 'On foot'], Languages: ['English', 'Nepali'], 'Starting Point': 'Pokhara (Lakeside)', 'Ending Point': 'Pokhara (Lakeside)', 'Minimum Age': '14 years', 'Fitness Level': ['Good'], 'Activity Type': ['Trekking', 'Photography'] },
    faqs: [
      { q: 'Why is this tour still a draft?', a: 'We are finalising departure dates and the lodge contracts for the new season. Enquire now and we will hold a place for you.' },
      { q: 'How hard is the climb to High Camp?', a: 'It is steady climbing for 5–6 hours with a steep final section. A reasonable fitness level is sufficient.' },
      CANCELLATION,
    ],
    gallery: ['Forest Camp rhododendrons', 'High Camp sunrise', 'Machapuchare from the ridge', 'Mardi Himal Base Camp', 'Trail above the clouds', 'Teahouse dinner'],
    location: { street: 'Trailhead at Kande', city: 'Kande', state: 'Gandaki', zip: '33700', lat: 28.2896, lng: 83.8761 },
    pricing: {
      perPerson: true, price: 560,
      payment: { full: true, deposit: true, pct: 20, arrival: false },
      discount: { type: 'percent', value: 10, fromDays: 20, toDays: 120, code: 'MARDI10', description: 'Launch offer — begins when the tour goes live.' },
    },
    minSize: 2, maxSize: 10, enquiry: true,
    schedule: { type: 'flexible', fromDays: 30, toDays: 280 },
    days: [
      d('Drive to Kande and trek to Forest Camp', 'Forest Camp', 'Annapurna Region', 'Drive 1 hour to Kande (1,770 m) and climb through lush forest to Forest Camp (2,520 m) with the first views of Machapuchare.', { stay: 'guesthouse', drive: true, notes: { transport: 'Private jeep from Pokhara', accommodation: 'Forest Camp teahouse', guide: '6 hours walking' } }),
      d('Forest Camp to Low Camp', 'Low Camp', 'Annapurna Region', 'Climb through rhododendron and high forest to Low Camp (3,000 m), a small settlement with lodges overlooking the valley.', { stay: 'guesthouse', notes: { accommodation: 'Teahouse', guide: '5 hours walking' } }),
      d('Low Camp to High Camp', 'High Camp', 'Annapurna Region', 'Leave the treeline and walk the ridge to High Camp (3,580 m) with close views of Machapuchare and the Annapurna range.', { stay: 'guesthouse', notes: { accommodation: 'Teahouse', guide: '5 hours, steady climb' } }),
      d('High Camp to Mardi Himal Base Camp and back', 'Mardi Himal Base Camp', 'Annapurna Region', 'Start at 4:00 for the ridge to Mardi Himal Base Camp (4,500 m). Sunrise views then descend to High Camp and on to Low Camp.', { stay: 'guesthouse', notes: { accommodation: 'Teahouse at Low Camp', guide: '9 hours, strenuous day' } }),
      d('Descend to Siding', 'Siding', 'Annapurna Region', 'A long descent through bamboo and rhododendron to the village of Siding, and a jeep to Pokhara.', { stay: 'hotel', drive: true, meal: true, notes: { transport: 'Private jeep to Pokhara', accommodation: 'Lakeside hotel', meals: 'Farewell dinner' } }),
      d('Departure from Pokhara', 'Pokhara', 'Pokhara', 'Transfer to the airport or bus station for onward travel.', { drive: true, guide: false, notes: { transport: 'Private transfer' } }),
    ],
  },
  // 15 --------------------------------------------------------------------
  {
    code: 'DEMO-015', title: 'Annapurna Circuit Classic', status: 'Archived', seller: 9, region: 'Annapurna Region',
    categories: ['Trekking & Hiking', 'Cultural Tours'],
    excerpt: 'The legendary 12-day circuit crossing the 5,416 m Thorong La pass — retired from the catalogue but kept for past-booking history.',
    intro: [
      'The Annapurna Circuit was one of the world\'s great treks: a journey through rice terraces, alpine forest, high-desert Tibetan culture and over the Thorong La pass at 5,416 m. Much of the route is now roaded, so this itinerary has been retired in favour of newer routes.',
      'This tour is archived and remains visible only to sellers and in booking history.',
    ],
    highlights: ['Thorong La pass, 5,416 m', 'Manang acclimatisation and Tilicho Lake side trip', 'Muktinath temple pilgrimage site', 'Kali Gandaki gorge, the deepest in the world', 'Tibetan-style villages and monasteries'],
    who: 'Experienced trekkers looking for an extended high-altitude route.',
    outline: '12 days: Besisahar → Chame → Manang → Thorong La → Muktinath → Jomsom → Pokhara.',
    include: ['Private transfers Kathmandu–Besisahar and Jomsom–Pokhara', 'All lodging and meals on trek', 'Guide and porter', 'Annapurna and TIMS permits', 'Emergency oxygen'],
    exclude: STD_EXCLUDE,
    facts: { Duration: '12 days / 11 nights', Difficulty: ['Challenging'], 'Max Altitude': '5,416 m (Thorong La Pass)', 'Best Season': ['Spring', 'Autumn'], 'Group Size': '2–12 trekkers', Accommodation: ['Hotel', 'Teahouse'], Meals: 'Full board on trek', Transport: ['Private vehicle', 'Flight', 'On foot'], Languages: ['English', 'Nepali'], 'Starting Point': 'Besisahar', 'Ending Point': 'Pokhara', 'Minimum Age': '16 years', 'Fitness Level': ['Excellent'], 'Activity Type': ['Trekking', 'Cultural'] },
    faqs: [
      { q: 'Why is this tour archived?', a: 'Road construction has changed the character of the lower sections. We now offer the Poon Hill and Annapurna Base Camp treks as more rewarding alternatives.' },
      INSURANCE, CANCELLATION,
    ],
    gallery: ['Manang village', 'Thorong La pass at dawn', 'Muktinath temple', 'Kali Gandaki gorge', 'Annapurna II from Pisang', 'Tilicho Lake'],
    location: { street: 'Trailhead at Besisahar', city: 'Besisahar', state: 'Gandaki', zip: '33600', lat: 28.2300, lng: 84.3770 },
    pricing: {
      perPerson: true, price: 1390,
      payment: { full: true, deposit: true, pct: 30, arrival: false },
      options: [
        { name: 'Adult', category: 'adult', price: 1390, minPax: 2, maxPax: 12 },
        { name: 'Senior (60+)', category: 'senior', price: 1290, minPax: 1, maxPax: 4 },
      ],
    },
    minSize: 2, maxSize: 12, enquiry: false,
    schedule: { type: 'multiple', departures: [
      { label: 'Autumn 2026 (retired)', startDays: 25, capacity: 12 },
      { label: 'Spring 2027 (retired)', startDays: 170, capacity: 12 },
    ] },
    days: [
      d('Kathmandu to Besisahar', 'Besisahar', 'Annapurna Region', 'A 6-hour drive from Kathmandu to Besisahar, the start of the circuit. Check in, briefing and early dinner.', { stay: 'guesthouse', drive: true, notes: { transport: 'Private vehicle', accommodation: 'Hotel in Besisahar' } }),
      d('Besisahar to Syange', 'Syange', 'Annapurna Region', 'Jeep or walk through terraced fields along the Marsyangdi river to Syange.', { stay: 'guesthouse', drive: true, notes: { transport: 'Jeep to Syange', accommodation: 'Teahouse' } }),
      d('Syange to Chame', 'Chame', 'Annapurna Region', 'A long day through the Marsyangdi gorge to Chame (2,710 m), the district headquarters of Manang.', { stay: 'guesthouse', notes: { accommodation: 'Teahouse with hot springs nearby' } }),
      d('Chame to Pisang', 'Pisang', 'Annapurna Region', 'Climb to Pisang (3,300 m) with views of Annapurna II and a visit to a monastery.', { stay: 'guesthouse', notes: { accommodation: 'Teahouse' } }),
      d('Pisang to Manang', 'Manang', 'Annapurna Region', 'Walk along the upper trail through Ghyaru and Ngawal to Manang (3,540 m) with breathtaking views.', { stay: 'guesthouse', notes: { accommodation: 'Lodge in Manang' } }),
      d('Acclimatisation in Manang', 'Manang', 'Annapurna Region', 'A rest day with a side trip to the Gangapurna lake and the ice lake viewpoint.', { stay: 'guesthouse', notes: { accommodation: 'Lodge in Manang' } }),
      d('Manang to Yak Kharka', 'Yak Kharka', 'Annapurna Region', 'Climb gently to Yak Kharka (4,018 m) for further acclimatisation.', { stay: 'guesthouse', notes: { accommodation: 'Teahouse' } }),
      d('Yak Kharka to Thorong Phedi', 'Thorong Phedi', 'Annapurna Region', 'Short walk to Thorong Phedi (4,450 m) and an early night before the pass.', { stay: 'guesthouse', notes: { accommodation: 'Basic lodge' } }),
      d('Crossing Thorong La to Muktinath', 'Muktinath', 'Annapurna Region', 'Start at 4:00 for the climb to Thorong La (5,416 m), then a 1,600 m descent to Muktinath, a sacred site for Hindus and Buddhists.', { stay: 'guesthouse', notes: { accommodation: 'Lodge in Muktinath', guide: 'Summit day — 10 hours' } }),
      d('Muktinath to Jomsom', 'Jomsom', 'Annapurna Region', 'A day of walking through the Kali Gandaki valley to Jomsom, with the wind at your back.', { stay: 'hotel', meal: true, notes: { accommodation: 'Jomsom hotel', meals: 'Farewell dinner' } }),
      d('Fly to Pokhara', 'Pokhara', 'Pokhara', 'A morning flight to Pokhara and a free afternoon.', { stay: 'hotel', drive: true, meal: true, notes: { transport: 'Domestic flight', accommodation: 'Lakeside hotel' } }),
      d('Return to Kathmandu', 'Kathmandu', 'Kathmandu Valley', 'Tourist bus or flight back to Kathmandu.', { drive: true, guide: false, notes: { transport: 'Tourist bus' } }),
    ],
  },
];

/** Master facts every seller owns; tours pick their value for each (see TourCatalogEntry.facts). */
export const MASTER_FACTS: Array<{ name: string; fieldType: 'Plain Text' | 'Single Select' | 'Multi Select'; options: string[]; icon: string }> = [
  { name: 'Duration', fieldType: 'Plain Text', options: [], icon: 'fa/FaClock' },
  { name: 'Difficulty', fieldType: 'Single Select', options: ['Easy', 'Moderate', 'Challenging', 'Strenuous'], icon: 'fa/FaMountain' },
  { name: 'Max Altitude', fieldType: 'Plain Text', options: [], icon: 'fa/FaArrowUp' },
  { name: 'Best Season', fieldType: 'Multi Select', options: ['Spring', 'Summer', 'Autumn', 'Winter'], icon: 'fa/FaSun' },
  { name: 'Group Size', fieldType: 'Plain Text', options: [], icon: 'fa/FaUsers' },
  { name: 'Accommodation', fieldType: 'Multi Select', options: ['Hotel', 'Guesthouse', 'Teahouse', 'Camp', 'Lodge', 'Resort'], icon: 'fa/FaBed' },
  { name: 'Meals', fieldType: 'Plain Text', options: [], icon: 'fa/FaUtensils' },
  { name: 'Transport', fieldType: 'Multi Select', options: ['Private vehicle', 'Tourist bus', 'Flight', 'Jeep', 'Helicopter', 'Boat', 'On foot'], icon: 'fa/FaBus' },
  { name: 'Languages', fieldType: 'Multi Select', options: ['English', 'Nepali', 'Hindi', 'Japanese', 'German', 'French', 'Spanish'], icon: 'fa/FaLanguage' },
  { name: 'Starting Point', fieldType: 'Plain Text', options: [], icon: 'fa/FaMapMarkerAlt' },
  { name: 'Ending Point', fieldType: 'Plain Text', options: [], icon: 'fa/FaFlag' },
  { name: 'Minimum Age', fieldType: 'Plain Text', options: [], icon: 'fa/FaChild' },
  { name: 'Fitness Level', fieldType: 'Single Select', options: ['Beginner', 'Average', 'Good', 'Excellent'], icon: 'fa/FaHeartbeat' },
  { name: 'Activity Type', fieldType: 'Multi Select', options: ['Trekking', 'Cultural', 'Wildlife', 'Adventure', 'Spiritual', 'Photography', 'Sightseeing', 'Relaxation'], icon: 'fa/FaHiking' },
];
