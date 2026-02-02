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
            if (ct?.includes('multipart/form-data')) body = await request.formData();
            else body = await request.text();
        }

        const response = await fetch(fullUrl, { method, headers, body });
        const responseData = await response.text();
        const nextResponse = new NextResponse(responseData, {
            status: response.status,
            statusText: response.statusText,
        });

        response.headers.forEach((value, key) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
                nextResponse.headers.set(key, value);
            }
        });
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) nextResponse.headers.set('set-cookie', setCookie);

        return nextResponse;
    } catch (err) {
        console.error('[API Proxy]', err);
        return NextResponse.json({ error: 'Proxy request failed' }, { status: 500 });
    }
}
