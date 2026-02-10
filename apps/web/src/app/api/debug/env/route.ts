import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken) {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('vtb_admin_token')?.value;
    if (authHeader !== `Bearer ${adminToken}` && cookieToken !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.json({
    site_access_token_set: !!process.env.SITE_ACCESS_TOKEN,
    admin_token_set: !!process.env.ADMIN_TOKEN,
    node_env: process.env.NODE_ENV,
    database_url_set: !!process.env.DATABASE_URL,
    anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
    gemini_key_set: !!process.env.GOOGLE_AI_API_KEY,
    resend_key_set: !!process.env.RESEND_API_KEY,
    timestamp: new Date().toISOString(),
  });
}
