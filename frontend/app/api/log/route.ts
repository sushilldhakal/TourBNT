import { NextRequest, NextResponse } from 'next/server';

/**
 * Dev-only log endpoint. POST { message, tag? }.
 * Logs to Node (terminal), not browser console.
 */
export async function POST(request: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ ok: false }, { status: 404 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const { message, tag = 'auth' } = body as { message?: string; tag?: string };
        const ts = new Date().toISOString();
        const line = `[${ts}] [${tag}] ${message ?? JSON.stringify(body)}`;
        process.stdout.write(line + '\n');
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
}
