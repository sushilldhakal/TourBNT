/**
 * Merges duplicate global destinations (same name + country + city) into the oldest one.
 *
 *   npx ts-node -T src/scripts/mergeDuplicateDestinations.ts          # dry run
 *   npx ts-node -T src/scripts/mergeDuplicateDestinations.ts --apply  # merge
 *
 * For every duplicate: repoints tours / business partners, moves link rows (seller prefs,
 * partner destinations, ad targets) onto the survivor, rewrites each seller's
 * sellerInfo.destination list, sums the usage counters, then deletes the duplicate.
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { sql, asc } from 'drizzle-orm';
import { db, globalDestinations, users } from '../db';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const apply = process.argv.includes('--apply');
  const rows = await db.select().from(globalDestinations).orderBy(asc(globalDestinations.submittedAt), asc(globalDestinations.id));

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = [r.name, r.country, r.city ?? ''].map((s) => s.trim().toLowerCase()).join('|');
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const remap = new Map<string, string>(); // duplicate id -> survivor id
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const [keep, ...dupes] = list;
    console.log(`${key}: keep ${keep.id.slice(0, 6)}, merge ${dupes.map((d) => d.id.slice(0, 6)).join(', ')}`);
    dupes.forEach((d) => remap.set(d.id, keep.id));
  }
  if (!apply || remap.size === 0) {
    console.log(apply ? 'Nothing to merge.' : `Dry run: ${remap.size} duplicate rows would be merged. Pass --apply.`);
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    for (const [dupId, keepId] of remap) {
      await tx.execute(sql`UPDATE tours SET destination_id = ${keepId} WHERE destination_id = ${dupId}`);
      await tx.execute(sql`UPDATE business_partners SET destination_id = ${keepId} WHERE destination_id = ${dupId}`);

      await tx.execute(sql`INSERT INTO seller_destination_preferences (id, seller_id, destination_id, is_visible, is_enabled)
        SELECT gen_random_uuid()::text, seller_id, ${keepId}, is_visible, is_enabled FROM seller_destination_preferences WHERE destination_id = ${dupId}
        ON CONFLICT (seller_id, destination_id) DO NOTHING`);
      await tx.execute(sql`INSERT INTO business_partner_destinations (business_partner_id, destination_id)
        SELECT business_partner_id, ${keepId} FROM business_partner_destinations WHERE destination_id = ${dupId}
        ON CONFLICT DO NOTHING`);
      await tx.execute(sql`INSERT INTO ad_destination_targets (ad_id, destination_id)
        SELECT ad_id, ${keepId} FROM ad_destination_targets WHERE destination_id = ${dupId}
        ON CONFLICT DO NOTHING`);

      await tx.execute(sql`UPDATE global_destinations k SET usage_count = k.usage_count + d.usage_count, seller_count = k.seller_count + d.seller_count
        FROM global_destinations d WHERE k.id = ${keepId} AND d.id = ${dupId}`);
    }

    // Sellers' embedded lists: swap duplicate ids for the survivor and drop repeats.
    const sellers = await tx.select({ id: users.id, sellerInfo: users.sellerInfo }).from(users).where(sql`${users.sellerInfo} -> 'destination' IS NOT NULL`);
    for (const s of sellers) {
      const info = (s.sellerInfo ?? {}) as Record<string, any>;
      if (!Array.isArray(info.destination)) continue;
      const seen = new Set<string>();
      const next = info.destination
        .map((e: any) => ({ ...e, destinationId: remap.get(e?.destinationId) ?? e?.destinationId }))
        .filter((e: any) => e.destinationId && !seen.has(e.destinationId) && seen.add(e.destinationId));
      if (JSON.stringify(next) !== JSON.stringify(info.destination)) {
        await tx.update(users).set({ sellerInfo: { ...info, destination: next } as any }).where(sql`${users.id} = ${s.id}`);
      }
    }

    // Link rows of the duplicates cascade away with them.
    for (const dupId of remap.keys()) await tx.execute(sql`DELETE FROM global_destinations WHERE id = ${dupId}`);
  });
  console.log(`Merged ${remap.size} duplicate destinations.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
