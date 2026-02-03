import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    site_access_token_set: !!process.env.SITE_ACCESS_TOKEN,
    site_access_token_length: process.env.SITE_ACCESS_TOKEN?.length || 0,
    admin_token_set: !!process.env.ADMIN_TOKEN,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
