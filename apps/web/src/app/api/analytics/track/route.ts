/**
 * Analytics Tracking API
 * 
 * POST /api/analytics/track
 * Receives page view data from middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsStore, generateId, parseUserAgent } from '@/lib/analytics/store';
import { persistentStore, getTodayDate } from '@/lib/analytics/db';
import { getGeoLocation } from '@/lib/analytics/geolocation';
import { VisitorInfo, PageView } from '@/lib/analytics/types';

export const runtime = 'nodejs'; // Need nodejs for geolocation API calls

interface TrackingData {
  visitorId: string;
  sessionId: string;
  path: string;
  timestamp: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export async function POST(request: NextRequest) {
  try {
    const data: TrackingData = await request.json();
    
    if (!data.visitorId || !data.path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get or update visitor
    let visitor = await analyticsStore.getVisitor(data.visitorId);
    const now = new Date().toISOString();
    
    // Parse user agent
    const uaInfo = data.userAgent ? parseUserAgent(data.userAgent) : { device: 'desktop' as const, browser: 'Unknown', os: 'Unknown' };
    
    // Get geolocation if not provided by Vercel headers
    let geo = {
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
    };
    
    if (!geo.city && data.ip && data.ip !== '127.0.0.1') {
      try {
        const geoData = await getGeoLocation(data.ip);
        geo = {
          city: geoData.city,
          country: geoData.country,
          latitude: geoData.latitude,
          longitude: geoData.longitude,
        };
      } catch (e) {
        console.warn('[Analytics] Geolocation lookup failed:', e);
      }
    }
    
    if (visitor) {
      // Update existing visitor
      visitor.lastSeen = now;
      visitor.visitCount++;
      
      // Update geo if we got new data
      if (geo.city) {
        visitor.city = geo.city;
        visitor.country = geo.country;
        visitor.latitude = geo.latitude;
        visitor.longitude = geo.longitude;
      }
    } else {
      // Create new visitor
      visitor = {
        id: data.visitorId,
        firstSeen: now,
        lastSeen: now,
        visitCount: 1,
        ip: data.ip,
        city: geo.city,
        country: geo.country,
        latitude: geo.latitude,
        longitude: geo.longitude,
        userAgent: data.userAgent,
        device: uaInfo.device,
        browser: uaInfo.browser,
        os: uaInfo.os,
        referrer: data.referrer,
      };
      
      // Parse UTM params from referrer
      if (data.referrer) {
        try {
          const url = new URL(data.referrer);
          visitor.utmSource = url.searchParams.get('utm_source') || undefined;
          visitor.utmMedium = url.searchParams.get('utm_medium') || undefined;
          visitor.utmCampaign = url.searchParams.get('utm_campaign') || undefined;
        } catch {
          // Invalid URL, ignore
        }
      }
    }
    
    await analyticsStore.upsertVisitor(visitor);
    
    // Log page view
    const pageView: PageView = {
      id: generateId(),
      timestamp: data.timestamp || now,
      visitorId: data.visitorId,
      path: data.path,
      sessionId: data.sessionId,
      pageInSession: 1, // Would need session tracking for accurate count
      country: geo.country,
      city: geo.city,
    };
    
    await analyticsStore.logPageView(pageView);
    
    // Also persist to PostgreSQL if available (async, don't wait)
    persistentStore.upsertVisitor(visitor).catch(() => {});
    persistentStore.logPageView(pageView).catch(() => {});
    
    // Update daily stats periodically (every 10th request randomly to avoid overhead)
    if (Math.random() < 0.1) {
      persistentStore.updateDailyStats(getTodayDate()).catch(() => {});
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Analytics] Tracking error:', error);
    // Don't return error to client - analytics should fail silently
    return NextResponse.json({ success: true });
  }
}
