import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(request, path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(request, path, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(request, path, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(request, path, 'DELETE');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    return proxyRequest(request, path, 'PATCH');
}

async function proxyRequest(request: NextRequest, pathSegments: string[], method: string) {
    try {
        const path = pathSegments.join('/');
        const url = `${BACKEND_URL}/api/${path}`;
        const searchParams = request.nextUrl.searchParams.toString();
        const fullUrl = searchParams ? `${url}?${searchParams}` : url;

        // Log proxy forwarding in dev (shows in Next.js terminal, not browser console)
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Proxy] ${method} ${request.nextUrl.pathname} → ${fullUrl}`);
        }

        const headers: HeadersInit = {
            'Content-Type': request.headers.get('content-type') || 'application/json',
            Accept: request.headers.get('accept') || 'application/json',
        };
        const authorization = request.headers.get('authorization');
        if (authorization) headers['Authorization'] = authorization;
        const cookie = request.headers.get('cookie');
        if (cookie) headers['Cookie'] = cookie;

        let body: string | FormData | undefined;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const ct = request.headers.get('content-type');
            if (ct?.includes('multipart/form-data')) {
                body = await request.formData();
                // The body is re-encoded with a NEW boundary, so the browser's Content-Type (with the
                // old boundary) must not be forwarded — let fetch generate the matching header.
                // Forwarding it made the server fail with "Unexpected end of form".
                delete (headers as Record<string, string>)['Content-Type'];
            } else {
                body = await request.text();
            }
        }

        const response = await fetch(fullUrl, { method, headers, body });
        const responseData = await response.text();
        const nextResponse = new NextResponse(responseData, {
            status: response.status,
            statusText: response.statusText,
        });

        const skipHeaders = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie']);
        response.headers.forEach((value, key) => {
            if (!skipHeaders.has(key.toLowerCase())) {
                nextResponse.headers.set(key, value);
            }
        });
        // undici hides Set-Cookie from forEach/get(); getSetCookie keeps each cookie intact.
        const setCookies = typeof response.headers.getSetCookie === 'function'
            ? response.headers.getSetCookie()
            : [];
        const cookies = setCookies.length > 0
            ? setCookies
            : [response.headers.get('set-cookie')].filter((value): value is string => !!value);
        for (const cookie of cookies) {
            nextResponse.headers.append('set-cookie', cookie);
        }

        return nextResponse;
    } catch (err) {
        console.error('[API Proxy]', err);
        return NextResponse.json({ error: 'Proxy request failed' }, { status: 500 });
    }
}
