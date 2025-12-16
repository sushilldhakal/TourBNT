import { NextRequest, NextResponse } from 'next/server';

/**
 * API Proxy Route
 * Forwards all /api/* requests to the backend server with proper cookie handling
 */

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

        // Get search params from the original request
        const searchParams = request.nextUrl.searchParams.toString();
        const fullUrl = searchParams ? `${url}?${searchParams}` : url;

        // Debug logging
        console.log('🔄 Proxy Request:', {
            method,
            path,
            fullUrl,
            cookies: request.headers.get('cookie'),
            allHeaders: Object.fromEntries(request.headers.entries())
        });

        // Prepare headers - forward important headers from the original request
        const headers: HeadersInit = {
            'Content-Type': request.headers.get('content-type') || 'application/json',
            'Accept': request.headers.get('accept') || 'application/json',
        };

        // Forward cookies from the request
        const cookies = request.headers.get('cookie');
        if (cookies) {
            headers['Cookie'] = cookies;
            console.log('✅ Forwarding cookies:', cookies);
        } else {
            console.log('❌ No cookies found in request');
        }

        // Forward authorization header if present
        const authorization = request.headers.get('authorization');
        if (authorization) {
            headers['Authorization'] = authorization;
        }

        // Prepare request body for methods that support it
        let body: string | FormData | undefined;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const contentType = request.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                body = await request.text();
            } else if (contentType?.includes('multipart/form-data')) {
                body = await request.formData();
            } else {
                body = await request.text();
            }
        }

        // Make the request to the backend
        const response = await fetch(fullUrl, {
            method,
            headers,
            body,
        });

        // Get response data
        const responseData = await response.text();

        console.log('📤 Backend Response:', {
            status: response.status,
            setCookie: response.headers.get('set-cookie'),
            allHeaders: Object.fromEntries(response.headers.entries())
        });

        // Create the response
        const nextResponse = new NextResponse(responseData, {
            status: response.status,
            statusText: response.statusText,
        });

        // Forward response headers
        response.headers.forEach((value, key) => {
            // Forward most headers, but be careful with some
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
                nextResponse.headers.set(key, value);
            }
        });

        // Forward Set-Cookie headers (important for login/logout)
        const setCookieHeaders = response.headers.get('set-cookie');
        if (setCookieHeaders) {
            console.log('🍪 Forwarding Set-Cookie header:', setCookieHeaders);
            nextResponse.headers.set('set-cookie', setCookieHeaders);
        } else {
            console.log('❌ No Set-Cookie header from backend');
        }

        return nextResponse;
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json(
            { error: 'Proxy request failed' },
            { status: 500 }
        );
    }
}