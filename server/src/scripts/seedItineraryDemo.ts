/**
 * Full itinerary demo for one tour: 15 days, every day linked to a registered
 * hotel/guesthouse (stay), restaurant (dinner), guide and — on travel days —
 * transport, plus one free-typed supplier. Then the app's own request
 * generator creates the supplier requests for each departure, and a mix of
 * statuses is applied so every state shows up in the dashboards.
 *
 *   DATABASE_URL=... npx tsx src/scripts/seedItineraryDemo.ts [tourId]
 *
 * Idempotent: re-running rebuilds the itinerary links and re-applies the demo
 * statuses (pending requests for departures are recreated by the generator).
 */
import { db, tours, businessPartners, businessPartnerUnitTypes, itineraryPartnerRequests, itineraryRequestEvents, tourItineraryPartners } from '../db';
import { eq, and, inArray } from 'drizzle-orm';
import { processItineraryData } from '../api/tours/utils/dataProcessors';
import { randomUUID } from 'crypto';

const TOUR_ID = process.argv[2] || '52f4fcc5-2289-4b21-8780-3105423d4605';

type Role = 'transport' | 'accommodation' | 'guide' | 'meals';
interface P { role: Role; partner: string; unit?: string; units?: number; time?: string; endTime?: string; notes?: string }

const DAYS: Array<{ title: string; description: string; destination: string; partners: P[] }> = [
  { title: 'Arrival in Kathmandu & trip briefing', description: 'Airport pickup, hotel check-in and a full trek briefing with your guide. Gear check and welcome dinner.', destination: 'Kathmandu',
    partners: [
      { role: 'transport', partner: 'Annapurna Jeep Safari Co.', unit: 'Hiace Van (12 seats)', units: 1, notes: 'Airport pickup' },
      { role: 'accommodation', partner: 'Himalayan Grand Hotel', unit: 'Deluxe Room', units: 6 },
      { role: 'meals', partner: 'Momo Hub', unit: 'Dinner', units: 12, time: '19:00', notes: 'Welcome dinner' },
      { role: 'guide', partner: 'Pasang Sherpa Guiding Services', time: '15:00', endTime: '17:00', notes: 'Trek briefing' },
    ] },
  { title: 'Drive to Besisahar', description: 'Scenic 7-hour drive along the Marsyangdi river to Besisahar, the gateway to the Annapurna Circuit.', destination: 'Besisahar',
    partners: [
      { role: 'transport', partner: 'Sherpa 4x4 Rentals', unit: 'Hiace Van (12 seats)', units: 1 },
      { role: 'accommodation', partner: 'Dragon Guest House', unit: 'Twin Room', units: 6 },
      { role: 'meals', partner: 'Bamboo Garden', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Pasang Sherpa Guiding Services', time: '08:00', endTime: '17:00' },
    ] },
  { title: 'Besisahar to Bahundanda', description: 'First trekking day through rice terraces and small villages. About 5 hours of walking.', destination: 'Bahundanda',
    partners: [
      { role: 'accommodation', partner: 'Dragon Guest House', unit: 'Twin Room', units: 6 },
      { role: 'meals', partner: 'Green Organic Cafe', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Pasang Sherpa Guiding Services', time: '08:00', endTime: '17:00' },
    ] },
  { title: 'Bahundanda to Chamje', description: 'Follow the river gorge past waterfalls and suspension bridges.', destination: 'Chamje',
    partners: [
      { role: 'accommodation', partner: 'Cloud Residency', unit: 'Standard Room', units: 6 },
      { role: 'meals', partner: 'Momo Hub', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Pasang Sherpa Guiding Services', time: '08:00', endTime: '17:00' },
    ] },
  { title: 'Chamje to Pisang', description: 'Climb into the upper Marsyangdi valley with the first big views of Annapurna II.', destination: 'Pisang',
    partners: [
      { role: 'accommodation', partner: 'Cloud Residency', unit: 'Standard Room', units: 6 },
      { role: 'meals', partner: 'Bamboo Garden', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Pasang Sherpa Guiding Services', time: '08:00', endTime: '17:00' },
    ] },
  { title: 'Pisang to Manang', description: 'Walk through Ngawal and Braga monastery into the Tibetan-style village of Manang.', destination: 'Manang',
    partners: [
      { role: 'accommodation', partner: 'Dragon Guest House', unit: 'Twin Room', units: 6 },
      { role: 'meals', partner: 'Green Organic Cafe', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Pasang Sherpa Guiding Services', time: '08:00', endTime: '17:00' },
    ] },
  { title: 'Manang acclimatisation day', description: 'Rest day with a short hike to Gangapurna lake and an altitude talk. Essential for the pass ahead.', destination: 'Manang',
    partners: [
      { role: 'accommodation', partner: 'Dragon Guest House', unit: 'Twin Room', units: 6 },
      { role: 'meals', partner: 'Momo Hub', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Mingma Tamang Guiding Services', time: '09:00', endTime: '15:00' },
    ] },
  { title: 'Manang to Yak Kharka', description: 'Gentle climb above the tree line with yak pastures and wide views.', destination: 'Yak Kharka',
    partners: [
      { role: 'accommodation', partner: 'Tashi Guest House', unit: 'Twin Room', units: 6, notes: 'Small lodge — confirm early' },
      { role: 'meals', partner: 'Bamboo Garden', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Mingma Tamang Guiding Services', time: '08:00', endTime: '16:00' },
    ] },
  { title: 'Yak Kharka to Thorong Phedi', description: 'Short, steep day to base camp below the pass. Early night before the big crossing.', destination: 'Thorong Phedi',
    partners: [
      { role: 'accommodation', partner: 'Tashi Guest House', unit: 'Twin Room', units: 6 },
      { role: 'meals', partner: 'Green Organic Cafe', unit: 'Dinner', units: 12, time: '18:30' },
      { role: 'guide', partner: 'Mingma Tamang Guiding Services', time: '08:00', endTime: '15:00' },
    ] },
  { title: 'Thorong La Pass (5,416 m) to Muktinath', description: 'Pre-dawn start for the highest point of the circuit, then a long descent to the holy temple of Muktinath.', destination: 'Muktinath',
    partners: [
      { role: 'accommodation', partner: 'Cloud Residency', unit: 'Deluxe Room', units: 6 },
      { role: 'meals', partner: 'Momo Hub', unit: 'Dinner', units: 12, time: '19:00', notes: 'Celebration dinner' },
      { role: 'guide', partner: 'Mingma Tamang Guiding Services', time: '04:30', endTime: '17:00', notes: 'Pass crossing' },
    ] },
  { title: 'Muktinath to Jomsom', description: 'Visit the Muktinath temple, then travel down the Kali Gandaki valley to Jomsom.', destination: 'Jomsom',
    partners: [
      { role: 'transport', partner: 'Terai Travels & Transport', unit: 'Hiace Van (12 seats)', units: 1 },
      { role: 'accommodation', partner: 'Pokhara Retreat', unit: 'Standard Room', units: 6 },
      { role: 'meals', partner: 'Bamboo Garden', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Sunita Shrestha Guiding Services', time: '08:00', endTime: '17:00' },
    ] },
  { title: 'Jomsom to Tatopani', description: 'Drive through the world\'s deepest gorge to the natural hot springs at Tatopani.', destination: 'Tatopani',
    partners: [
      { role: 'transport', partner: 'Sherpa 4x4 Rentals', unit: 'Hiace Van (12 seats)', units: 1 },
      { role: 'accommodation', partner: 'Pokhara Retreat', unit: 'Standard Room', units: 6 },
      { role: 'meals', partner: 'Green Organic Cafe', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Sunita Shrestha Guiding Services', time: '08:00', endTime: '17:00' },
    ] },
  { title: 'Tatopani to Pokhara', description: 'Drive to Pokhara and relax by Phewa Lake after two weeks on the trail.', destination: 'Pokhara',
    partners: [
      { role: 'transport', partner: 'Pokhara Tourist Coaches', unit: 'Tourist Bus (45 seats)', units: 1 },
      { role: 'accommodation', partner: 'Himalayan Grand Hotel', unit: 'Deluxe Room', units: 6 },
      { role: 'meals', partner: 'Momo Hub', unit: 'Dinner', units: 12, time: '19:30', notes: 'Farewell dinner' },
      { role: 'guide', partner: 'Sunita Shrestha Guiding Services', time: '09:00', endTime: '16:00' },
    ] },
  { title: 'Pokhara sightseeing & rest', description: 'Boat ride on Phewa Lake, World Peace Pagoda and free time.', destination: 'Pokhara',
    partners: [
      { role: 'accommodation', partner: 'Himalayan Grand Hotel', unit: 'Deluxe Room', units: 6 },
      { role: 'meals', partner: 'Bamboo Garden', unit: 'Dinner', units: 12, time: '19:00' },
      { role: 'guide', partner: 'Sunita Shrestha Guiding Services', time: '09:00', endTime: '15:00' },
    ] },
  { title: 'Final day & departure', description: 'Breakfast, farewell and transfer to the airport or onward destination.', destination: 'Kathmandu',
    partners: [
      { role: 'transport', partner: 'Kathmandu Airport Shuttle', unit: 'Hiace Van (12 seats)', units: 1, notes: 'Airport drop-off' },
      { role: 'meals', partner: 'Momo Hub', unit: 'Lunch', units: 12, time: '12:30' },
    ] },
];

const daysFromNow = (n: number) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return d; };
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const [tour] = await db.select().from(tours).where(eq(tours.id, TOUR_ID)).limit(1);
  if (!tour) throw new Error(`Tour ${TOUR_ID} not found`);

  // Resolve every referenced partner + unit type up front.
  const names = [...new Set(DAYS.flatMap((d) => d.partners.map((p) => p.partner)))];
  const bps = await db.select().from(businessPartners).where(and(inArray(businessPartners.name, names), eq(businessPartners.approvalStatus, 'approved')));
  const bpByName = new Map(bps.map((b) => [b.name, b]));
  const missing = names.filter((n) => !bpByName.has(n));
  if (missing.length) throw new Error(`Approved partners not found: ${missing.join(', ')}`);
  const uts = await db.select().from(businessPartnerUnitTypes).where(inArray(businessPartnerUnitTypes.businessPartnerId, bps.map((b) => b.id)));
  const utKey = (bpId: string, name: string) => uts.find((u) => u.businessPartnerId === bpId && u.name === name);

  const itinerary = DAYS.map((d, i) => ({
    id: `day-${i + 1}`,
    day: `Day ${i + 1}`,
    title: d.title,
    description: d.description,
    destination: d.destination,
    partners: [
      ...d.partners.map((p) => {
        const bp = bpByName.get(p.partner)!;
        const ut = p.unit ? utKey(bp.id, p.unit) : undefined;
        if (p.unit && !ut) console.warn(`  ! ${p.partner} has no unit type "${p.unit}" — linking without it`);
        return {
          role: p.role, businessPartnerId: bp.id, name: bp.name,
          ...(p.notes && { notes: p.notes }), ...(p.time && { time: p.time }), ...(p.endTime && { endTime: p.endTime }),
          ...(p.units && { unitsRequested: p.units }), ...(ut && { unitType: ut.name, unitTypeId: ut.id }),
        };
      }),
      ...(i === 0 ? [{ role: 'other', name: 'Welcome flower garland (local florist)', notes: 'Arranged by the agency directly' }] : []),
    ],
  }));

  const departures = [21, 49, 84, 140].map((n) => daysFromNow(n));
  const tourDates = {
    scheduleType: 'multiple', type: 'multiple', days: 15, nights: 14, capacity: 12,
    defaultDateRange: { from: iso(departures[0]), to: iso(departures[3]) },
    departures: departures.map((d, k) => ({
      id: `dep-${k + 1}`, label: d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      dateRange: { from: iso(d), to: iso(new Date(d.getTime() + 14 * 86400000)) }, capacity: 12,
    })),
  };

  const gallery = [0, 1, 2, 3].map((k) => ({ image: `https://picsum.photos/seed/tour-${tour.code}${k ? `-${k}` : ''}/1600/900`, alt: `${tour.title} ${k + 1}`, sortOrder: k, isFeatured: k === 0 }));
  const outline = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Fifteen days around the Annapurna massif: lowland villages, the Manang acclimatisation stop, the Thorong La crossing and the Kali Gandaki valley. Every night, meal, guide and transfer below is booked with a TourBNT partner.' }] }] });

  const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
  const chunk = <T,>(a: T[], n = 100) => Array.from({ length: Math.ceil(a.length / n) }, (_, k) => a.slice(k * n, k * n + n));
  const processed = processItineraryData(itinerary) as Array<any>;

  // 1. The tour row.
  log('Updating tour…');
  await db.update(tours).set({
    tourStatus: 'Published', itinerary: processed as any, tourDates: tourDates as any, outline, gallery: gallery as any,
    enquiry: true, pricePerPerson: true, discount: null, fixedDeparture: true, multipleDates: true,
    pricingOptions: [
      { id: 'opt-adult', name: 'Adult', price: tour.price ?? 1390, category: 'adult', paxRange: { min: 1, max: 12 }, discountEnabled: false, isActive: true },
      { id: 'opt-child', name: 'Child', price: Math.round((tour.price ?? 1390) * 0.6), category: 'child', paxRange: { min: 1, max: 12 }, discountEnabled: false, isActive: true },
    ] as any,
    updatedAt: new Date(),
  }).where(eq(tours.id, TOUR_ID));

  // 2. Itinerary partner links (what the dashboards and the request generator read).
  log('Linking partners…');
  await db.delete(itineraryPartnerRequests).where(eq(itineraryPartnerRequests.tourId, TOUR_ID));
  await db.delete(tourItineraryPartners).where(eq(tourItineraryPartners.tourId, TOUR_ID));
  const linkRows: Array<typeof tourItineraryPartners.$inferInsert & { id: string }> = [];
  processed.forEach((day) => {
    (day.partners as any[]).forEach((p, idx) => {
      linkRows.push({
        id: randomUUID(), tourId: TOUR_ID, dayId: day.id, role: p.role, businessPartnerId: p.businessPartnerId ?? null, name: p.name,
        notes: p.notes ?? null, sortOrder: idx, unitsRequested: typeof p.unitsRequested === 'number' ? p.unitsRequested : null,
        unitType: p.unitType ?? null, unitTypeId: p.unitTypeId ?? null,
      });
    });
  });
  for (const part of chunk(linkRows)) await db.insert(tourItineraryPartners).values(part);
  log(`Linked ${linkRows.length} itinerary partners (${linkRows.filter((l) => l.businessPartnerId).length} registered).`);

  // 3. Supplier requests: one per registered link x departure, in bulk, with a realistic status spread.
  log('Creating supplier requests…');
  const owners = new Map(bps.map((b) => [b.id, b.ownerId]));
  const tashiId = bpByName.get('Tashi Guest House')!.id;
  const now = Date.now();
  const reqRows: Array<typeof itineraryPartnerRequests.$inferInsert> = [];
  const eventRows: Array<typeof itineraryRequestEvents.$inferInsert> = [];
  let n = 0;
  departures.forEach((dep, di) => {
    linkRows.forEach((l) => {
      if (!l.businessPartnerId) return;
      const dayIdx = processed.findIndex((d) => d.id === l.dayId);
      const day = processed[dayIdx];
      const pj = (day.partners as any[]).find((x) => x.role === l.role);
      n++;
      let status: 'pending' | 'confirmed' | 'held' | 'countered' | 'declined' | 'expired' = 'pending';
      if (di === 0) status = l.businessPartnerId === tashiId ? 'countered' : n % 11 === 0 ? 'declined' : n % 7 === 0 ? 'held' : n % 13 === 0 ? 'pending' : 'confirmed';
      else if (di === 1) status = n % 5 === 0 ? 'confirmed' : n % 9 === 0 ? 'held' : n % 17 === 0 ? 'expired' : 'pending';
      const id = randomUUID();
      const owner = owners.get(l.businessPartnerId) ?? null;
      const created = new Date(now - (1 + (n % 20)) * 86400000);
      const responded = status === 'pending' || status === 'expired' ? null : new Date(created.getTime() + (2 + (n % 30)) * 3600000);
      const units = l.unitsRequested ?? 12;
      const serviceDate = iso(new Date(dep.getTime() + dayIdx * 86400000));
      reqRows.push({
        id, tourId: TOUR_ID, tourItineraryPartnerId: l.id, businessPartnerId: l.businessPartnerId, role: l.role, serviceDate,
        serviceTime: pj?.time ?? null, serviceEndTime: pj?.endTime ?? null, headcount: 12, unitsRequested: units, unitTypeId: l.unitTypeId ?? null, status,
        capacityConfirmed: status === 'confirmed' || status === 'held' ? units : null,
        responseNotes: status === 'declined' ? 'Fully booked on that date — sorry!' : status === 'confirmed' ? 'Confirmed — looking forward to hosting your group.' : null,
        respondedAt: responded, respondedBy: responded ? owner : null,
        holdExpiresAt: status === 'held' ? new Date(now + (12 + (n % 30)) * 3600000) : null,
        respondByAt: status === 'pending' ? new Date(now + (6 + (n % 60)) * 3600000) : status === 'expired' ? new Date(now - 6 * 3600000) : null,
        counterUnits: status === 'countered' ? Math.max(1, Math.floor(units / 2)) : null,
        counterDate: status === 'countered' ? serviceDate : null,
        counterNotes: status === 'countered' ? 'We only have part of that capacity free — can offer fewer rooms for the same night.' : null,
        version: status === 'pending' ? 1 : 2, sourceDepartureDate: dep, createdAt: created, updatedAt: responded ?? created,
      } as any);
      eventRows.push({ id: randomUUID(), requestId: id, fromStatus: null, toStatus: 'pending', actorId: tour.createdAt ? null : null, actorRole: 'agency', unitsAtEvent: units, notes: 'Request created', createdAt: created } as any);
      if (status !== 'pending') {
        eventRows.push({
          id: randomUUID(), requestId: id, fromStatus: 'pending', toStatus: status, actorId: status === 'expired' ? null : owner,
          actorRole: status === 'expired' ? 'system' : 'partner', unitsAtEvent: units,
          notes: status === 'expired' ? 'No response before deadline' : status === 'declined' ? 'Fully booked on that date — sorry!' : status === 'countered' ? 'Offered fewer rooms' : 'Responded',
          createdAt: responded ?? new Date(now - 6 * 3600000),
        } as any);
      }
    });
  });
  for (const part of chunk(reqRows, 100)) { await db.insert(itineraryPartnerRequests).values(part); log(`  requests… ${Math.min(reqRows.length, reqRows.indexOf(part[part.length - 1]) + 1)}/${reqRows.length}`); }
  for (const part of chunk(eventRows, 200)) await db.insert(itineraryRequestEvents).values(part);

  const counts: Record<string, number> = {};
  reqRows.forEach((r) => { counts[r.status as string] = (counts[r.status as string] ?? 0) + 1; });
  log(`Done. ${reqRows.length} supplier requests by status: ${JSON.stringify(counts)}`);
  log('Tip: restart the API server (or wait for the 60s tour cache) before reloading the edit page.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
