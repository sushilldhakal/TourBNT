import { NextRequest, NextResponse } from 'next/server';
import type { PlaceHit } from '@/lib/places';

interface NominatimAddress {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
}

interface NominatimRow {
    display_name?: string;
    lat?: string;
    lon?: string;
    name?: string;
    address?: NominatimAddress;
}

/** City, region, and country search through OpenStreetMap Nominatim. No Google key. */
export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return NextResponse.json([]);

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('q', q);

    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'Accept-Language': 'en',
            'User-Agent': 'TourBNT/1.0 (destination search)',
        },
        cache: 'no-store',
    });
    if (!response.ok) return NextResponse.json([]);

    const rows = (await response.json()) as NominatimRow[];
    const places: PlaceHit[] = rows.flatMap((row) => {
        const lat = Number(row.lat);
        const lng = Number(row.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
        const address = row.address ?? {};
        const city = address.city || address.town || address.village || address.municipality || row.name || '';
        return [{
            label: row.display_name || city,
            name: row.name || city,
            city,
            region: address.state || '',
            country: address.country || '',
            lat,
            lng,
        }];
    });

    return NextResponse.json(places);
}
