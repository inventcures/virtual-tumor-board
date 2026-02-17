/**
 * Next.js Middleware for Analytics Tracking
 *
 * Tracks all page visits with:
 * - IP geolocation (city, country, lat/lng)
 * - Device/browser/OS info (parsed from user agent)
 * - Referrer
 * - Session management with duration tracking
 * - Detailed logging for admin panel
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseUserAgent } from './src/lib/analytics/user-agent';
import { extractIP, extractVercelGeo } from './src/lib/analytics/geolocation';

// Paths to skip tracking
const SKIP_PATHS = [
  '/api/',
  '/_next/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
];

// Admin protection
const ADMIN_PATHS = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip static assets and API routes
  if (SKIP_PATHS.some(path => pathname.includes(path))) {
    return NextResponse.next();
  }
  
  // Site-wide auth check (if SITE_ACCESS_TOKEN is set)
  const siteAccessToken = process.env.SITE_ACCESS_TOKEN;
  const tokenParam = request.nextUrl.searchParams.get('token');

  if (siteAccessToken) {
    const authCookie = request.cookies.get('vtb_auth_v2')?.value;

    // Check if valid token is in URL query param OR cookie
    const isAuthenticated = tokenParam === siteAccessToken || authCookie === siteAccessToken;

    if (!isAuthenticated) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Access Restricted</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
            .container { text-align: center; padding: 2rem; }
            h1 { margin: 0 0 1rem 0; }
            p { color: #94a3b8; }
            input { padding: 0.75rem; margin-right: 0.5rem; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; }
            button { padding: 0.75rem 1.5rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; }
            button:hover { background: #4f46e5; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Access Restricted</h1>
            <p>This site is currently private. Please contact the owner for access.</p>
            <p style="font-size: 0.875rem; color: #64748b; margin-top: 2rem;">Add ?token=YOUR_TOKEN to the URL</p>
          </div>
        </body>
        </html>
      `, {
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      });
    }
  }
  
  // Admin auth check
  if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
    const adminToken = request.cookies.get('vtb_admin_token')?.value;
    const envToken = process.env.ADMIN_TOKEN;

    if (envToken && adminToken !== envToken) {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
  
  const response = NextResponse.next();

  // If token is in URL and no cookie exists, set cookie for future visits
  if (siteAccessToken && tokenParam === siteAccessToken) {
    const authCookie = request.cookies.get('vtb_auth_v2')?.value;
    if (!authCookie) {
      response.cookies.set('vtb_auth_v2', siteAccessToken, {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }
  }

  // Get or create visitor ID
  let visitorId = request.cookies.get('vtb_visitor_id')?.value;
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    response.cookies.set('vtb_visitor_id', visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }
  
  // Get or create session ID
  let sessionId = request.cookies.get('vtb_session_id')?.value;
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    response.cookies.set('vtb_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 30, // 30 minutes
    });
  }
  
  // Parse device/browser/OS info from user agent
  const userAgent = request.headers.get('user-agent') || undefined;
  const deviceInfo = parseUserAgent(userAgent);

  // Extract IP address (handles Railway, Vercel, Cloudflare)
  const ip = extractIP(request);

  // Try to get geo from Vercel headers first (faster)
  const vercelGeo = extractVercelGeo(request);

  // Debug logging for admin paths
  if (pathname.includes('admin')) {
    console.log('[Middleware] Admin path detected, will track:', pathname, {
      visitorId,
      sessionId,
      ip,
      hasVercelGeo: !!vercelGeo,
    });
  }

  // Track page view asynchronously (don't block response)
  const trackingData = {
    visitorId,
    sessionId,
    path: pathname,
    timestamp: new Date().toISOString(),
    referrer: request.headers.get('referer') || undefined,
    userAgent,
    // IP and geolocation
    ip,
    city: vercelGeo?.city,
    country: vercelGeo?.country,
    countryCode: vercelGeo?.countryCode,
    latitude: vercelGeo?.latitude,
    longitude: vercelGeo?.longitude,
    timezone: vercelGeo?.timezone,
    // Device/browser/OS info (parsed from user agent)
    ...deviceInfo,
  };
  
  // Fire and forget - send to tracking endpoint
  // Using edge-compatible fetch
  const baseUrl = request.nextUrl.origin;
  fetch(`${baseUrl}/api/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trackingData),
  }).catch(() => {
    // Silently ignore errors - analytics should never break the site
  });
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/).*)',
  ],
};
