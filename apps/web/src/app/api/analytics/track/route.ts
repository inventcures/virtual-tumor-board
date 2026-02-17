/**
 * Analytics Tracking API
 * 
 * POST /api/analytics/track
 * Receives page view data from middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsStore, generateId } from '@/lib/analytics/store';
import { persistentStore, getTodayDate } from '@/lib/analytics/db';
import { getGeoLocation } from '@/lib/analytics/geolocation';
import { parseUserAgent } from '@/lib/analytics/user-agent';
import { VisitorInfo, SessionInfo, PageView } from '@/lib/analytics/types';

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
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  // Device info (from middleware user-agent parsing)
  device?: 'mobile' | 'tablet' | 'desktop';
  deviceVendor?: string;
  deviceModel?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  engine?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: TrackingData = await request.json();

    // Debug logging for admin paths
    if (data.path?.includes('admin')) {
      console.log('[Analytics Track] Admin path detected:', data.path, {
        visitorId: data.visitorId,
        sessionId: data.sessionId,
        timestamp: data.timestamp,
      });
    }

    if (!data.visitorId || !data.path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get or update visitor
    let visitor = await analyticsStore.getVisitor(data.visitorId);
    const now = new Date().toISOString();

    // Use device info from middleware (already parsed) or parse here as fallback
    const uaInfo = data.device
      ? {
          device: data.device,
          deviceVendor: data.deviceVendor,
          deviceModel: data.deviceModel,
          browser: data.browser,
          browserVersion: data.browserVersion,
          os: data.os,
          osVersion: data.osVersion,
          engine: data.engine,
        }
      : parseUserAgent(data.userAgent);

    // Get geolocation if not provided by Vercel headers
    let geo = {
      city: data.city,
      country: data.country,
      countryCode: data.countryCode,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    };

    // Always attempt geolocation lookup if we don't have city/country AND have a valid IP
    const needsGeoLookup = !geo.city && data.ip && data.ip !== '127.0.0.1' && !data.ip.startsWith('192.168.');

    console.log('[Analytics Track] Geo check:', {
      ip: data.ip,
      hasCity: !!geo.city,
      hasCountry: !!geo.country,
      needsGeoLookup,
      path: data.path,
    });

    if (needsGeoLookup) {
      try {
        console.log('[Analytics] Looking up geolocation for IP:', data.ip);
        const geoData = await getGeoLocation(data.ip);
        console.log('[Analytics] Geolocation API result:', {
          city: geoData.city,
          country: geoData.country,
          ip: geoData.ip,
        });

        geo = {
          city: geoData.city,
          country: geoData.country,
          countryCode: geoData.countryCode,
          latitude: geoData.latitude,
          longitude: geoData.longitude,
          timezone: geoData.timezone,
        };
      } catch (e) {
        console.error('[Analytics] Geolocation lookup FAILED:', e instanceof Error ? e.message : e);
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
        countryCode: geo.countryCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: geo.timezone,
        userAgent: data.userAgent,
        device: uaInfo.device,
        deviceVendor: uaInfo.deviceVendor,
        deviceModel: uaInfo.deviceModel,
        browser: uaInfo.browser,
        browserVersion: uaInfo.browserVersion,
        os: uaInfo.os,
        osVersion: uaInfo.osVersion,
        engine: uaInfo.engine,
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

    // Get or create session
    let session = await analyticsStore.getSession(data.sessionId);

    if (!session) {
      // Create new session
      session = {
        id: data.sessionId,
        visitorId: data.visitorId,
        startTime: now,
        lastActivityTime: now,
        pageCount: 1,
        ip: data.ip || '127.0.0.1',
        city: geo.city,
        country: geo.country,
        countryCode: geo.countryCode,
        latitude: geo.latitude,
        longitude: geo.longitude,
        device: uaInfo.device,
        deviceVendor: uaInfo.deviceVendor,
        deviceModel: uaInfo.deviceModel,
        browser: uaInfo.browser,
        browserVersion: uaInfo.browserVersion,
        os: uaInfo.os,
        osVersion: uaInfo.osVersion,
        landingPage: data.path,
        referrer: data.referrer,
      };
    } else {
      // Update existing session
      session.lastActivityTime = now;
      session.pageCount++;
    }

    await analyticsStore.upsertSession(session);

    // Log page view
    const pageView: PageView = {
      id: generateId(),
      timestamp: data.timestamp || now,
      visitorId: data.visitorId,
      path: data.path,
      sessionId: data.sessionId,
      pageInSession: session.pageCount,
      country: geo.country,
      city: geo.city,
    };

    await analyticsStore.logPageView(pageView);

    // Also persist to PostgreSQL if available (async, don't wait)
    persistentStore.upsertVisitor(visitor).catch(() => {});
    persistentStore.upsertSession(session).catch(() => {});
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
