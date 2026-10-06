import { and, eq, inArray, or, type SQL } from 'drizzle-orm';
import { businessPartnerDestinations, businessPartners, db } from '../../db';
import type { BusinessPartnerType } from './businessPartnerTypes';

/**
 * Where a business operates: its home destination (`destinationId`) plus any
 * extra ones in `business_partner_destinations`. A guesthouse is one building,
 * so it only ever has its home destination; chains (hotels, restaurants) and
 * services that travel (guides, transport) can cover several.
 */
export const SINGLE_DESTINATION_TYPES: readonly BusinessPartnerType[] = ['guesthouse'];

export const isSingleDestinationType = (type: string): boolean =>
  (SINGLE_DESTINATION_TYPES as readonly string[]).includes(type);

/** SQL condition: the business's home destination or one of its extra destinations is `destinationId`. */
export function servesDestination(destinationId: string): SQL {
  return or(
    eq(businessPartners.destinationId, destinationId),
    inArray(
      businessPartners.id,
      db
        .select({ id: businessPartnerDestinations.businessPartnerId })
        .from(businessPartnerDestinations)
        .where(eq(businessPartnerDestinations.destinationId, destinationId)),
    ),
  ) as SQL;
}

/** Every destination id each of these businesses covers (home + extras). */
export async function destinationIdsFor(partners: { id: string; destinationId: string | null }[]): Promise<Map<string, string[]>> {
  const byPartner = new Map<string, Set<string>>();
  for (const partner of partners) {
    byPartner.set(partner.id, new Set(partner.destinationId ? [partner.destinationId] : []));
  }
  if (partners.length > 0) {
    const rows = await db
      .select({ partnerId: businessPartnerDestinations.businessPartnerId, destinationId: businessPartnerDestinations.destinationId })
      .from(businessPartnerDestinations)
      .where(inArray(businessPartnerDestinations.businessPartnerId, partners.map((p) => p.id)));
    for (const row of rows) byPartner.get(row.partnerId)?.add(row.destinationId);
  }
  return new Map([...byPartner].map(([id, set]) => [id, [...set]]));
}

export async function partnerServes(partnerId: string, destinationId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: businessPartners.id })
    .from(businessPartners)
    .where(and(eq(businessPartners.id, partnerId), servesDestination(destinationId)))
    .limit(1);
  return Boolean(row);
}

