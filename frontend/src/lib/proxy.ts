import { NextRequest, NextResponse } from 'next/server';

/**
 * DispatchHub Next.js API Proxy Engine
 * Transparently proxies API calls from Next.js client/server to the NestJS backend.
 * Eliminates CORS issues, preserves Bearer tokens & X-API-Key, and prevents SSRF.
 */

const BACKEND_BASE_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

// Strict SSRF defense list for backend proxying
const FORBIDDEN_HOSTS = ['169.254.169.254', 'metadata.google.internal', 'metadata'];

export interface ProxyOptions {
  stripPrefix?: string;
  customHeaders?: Record<string, string>;
}

export async function proxyRequest(
  req: NextRequest,
  pathSegments: string[] | string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const path = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
  const targetUrl = new URL(
    `${BACKEND_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  );

  // Preserve search params
  req.nextUrl.searchParams.forEach((val, key) => {
    targetUrl.searchParams.set(key, val);
  });

  // SSRF validation
  if (FORBIDDEN_HOSTS.includes(targetUrl.hostname)) {
    return NextResponse.json(
      { error: 'SSRF Violation: Target host is blocked' },
      { status: 403 }
    );
  }

  // Clone headers
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Avoid forwarding host or hop-by-hop headers
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Forward client metadata
  const clientIp = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
  headers.set('x-forwarded-for', clientIp);
  headers.set('x-forwarded-host', req.headers.get('host') || 'localhost:3000');
  headers.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));

  if (options.customHeaders) {
    Object.entries(options.customHeaders).forEach(([k, v]) => headers.set(k, v));
  }

  // Handle body
  let body: BodyInit | null = null;
  if (!['GET', 'HEAD'].includes(req.method)) {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const text = await req.text();
      body = text.length > 0 ? text : null;
    } else if (contentType.includes('multipart/form-data')) {
      body = await req.formData();
    } else {
      body = await req.arrayBuffer();
    }
  }

  try {
    const backendRes = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
      // @ts-ignore - duplex is needed for node fetch streams in some environments
      duplex: body ? 'half' : undefined,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const data = await backendRes.arrayBuffer();
    return new NextResponse(data, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'Backend Gateway Error',
        message: err.message || 'Failed to reach NestJS backend service on port 4000',
        target: targetUrl.toString(),
      },
      { status: 502 }
    );
  }
}
