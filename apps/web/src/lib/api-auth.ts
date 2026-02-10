import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that a request is authenticated via the site access token cookie.
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function verifyApiAuth(request: NextRequest): NextResponse | null {
  const siteAccessToken = process.env.SITE_ACCESS_TOKEN;
  if (!siteAccessToken) {
    return null;
  }

  const authCookie = request.cookies.get('vtb_auth_v2')?.value;
  if (authCookie === siteAccessToken) {
    return null;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${siteAccessToken}`) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
