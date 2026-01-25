/**
 * IP Geolocation Service
 * 
 * Maps IP addresses to city/country using free APIs.
 * Uses multiple providers with fallback for reliability.
 * 
 * Free APIs used:
 * 1. ip-api.com (45 req/min, no key needed)
 * 2. ipapi.co (1000/day free)
 * 3. Vercel headers (when deployed on Vercel)
 */

import { GeoLocation } from './types';

// Cache to avoid repeated lookups
const geoCache = new Map<string, { data: GeoLocation; expires: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get geolocation from IP address
 */
export async function getGeoLocation(ip: string): Promise<GeoLocation> {
  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  // Skip private/local IPs
  if (isPrivateIP(ip)) {
    return { ip, city: 'Local', country: 'Local', countryCode: 'XX' };
  }
  
  // Try providers in order
  let geo: GeoLocation | null = null;
  
  // Provider 1: ip-api.com (free, 45/min)
  try {
    geo = await fetchFromIpApi(ip);
  } catch (e) {
    console.warn('[Geo] ip-api.com failed:', e);
  }
  
  // Provider 2: ipapi.co (free tier)
  if (!geo) {
    try {
      geo = await fetchFromIpApiCo(ip);
    } catch (e) {
      console.warn('[Geo] ipapi.co failed:', e);
    }
  }
  
  // Fallback: Unknown
  if (!geo) {
    geo = { ip, city: 'Unknown', country: 'Unknown', countryCode: 'XX' };
  }
  
  // Cache result
  geoCache.set(ip, { data: geo, expires: Date.now() + CACHE_TTL_MS });
  
  return geo;
}

/**
 * Extract IP from request headers (handles proxies, Vercel, Cloudflare)
 */
export function extractIP(request: Request): string {
  const headers = request.headers;
  
  // Vercel
  const vercelIp = headers.get('x-real-ip') || headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();
  
  // Cloudflare
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;
  
  // Standard proxy headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  
  // Fallback
  return '127.0.0.1';
}

/**
 * Extract geolocation from Vercel headers (faster than API calls)
 * Available when deployed on Vercel
 */
export function extractVercelGeo(request: Request): Partial<GeoLocation> | null {
  const headers = request.headers;
  
  const city = headers.get('x-vercel-ip-city');
  const country = headers.get('x-vercel-ip-country');
  const region = headers.get('x-vercel-ip-country-region');
  const latitude = headers.get('x-vercel-ip-latitude');
  const longitude = headers.get('x-vercel-ip-longitude');
  
  if (!city && !country) return null;
  
  return {
    city: city ? decodeURIComponent(city) : undefined,
    country: country || undefined,
    countryCode: country || undefined,
    region: region || undefined,
    latitude: latitude ? parseFloat(latitude) : undefined,
    longitude: longitude ? parseFloat(longitude) : undefined,
  };
}

// ============================================================================
// Provider Implementations
// ============================================================================

async function fetchFromIpApi(ip: string): Promise<GeoLocation | null> {
  const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp`, {
    // Short timeout to fail fast
    signal: AbortSignal.timeout(3000),
  });
  
  if (!response.ok) return null;
  
  const data = await response.json();
  
  if (data.status === 'fail') return null;
  
  return {
    ip,
    city: data.city,
    region: data.regionName,
    country: data.country,
    countryCode: data.countryCode,
    latitude: data.lat,
    longitude: data.lon,
    timezone: data.timezone,
    isp: data.isp,
  };
}

async function fetchFromIpApiCo(ip: string): Promise<GeoLocation | null> {
  const response = await fetch(`https://ipapi.co/${ip}/json/`, {
    signal: AbortSignal.timeout(3000),
  });
  
  if (!response.ok) return null;
  
  const data = await response.json();
  
  if (data.error) return null;
  
  return {
    ip,
    city: data.city,
    region: data.region,
    country: data.country_name,
    countryCode: data.country_code,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    isp: data.org,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  if (ip.startsWith('10.') ||
      ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') ||
      ip.startsWith('172.19.') || ip.startsWith('172.20.') || ip.startsWith('172.21.') ||
      ip.startsWith('172.22.') || ip.startsWith('172.23.') || ip.startsWith('172.24.') ||
      ip.startsWith('172.25.') || ip.startsWith('172.26.') || ip.startsWith('172.27.') ||
      ip.startsWith('172.28.') || ip.startsWith('172.29.') || ip.startsWith('172.30.') ||
      ip.startsWith('172.31.') ||
      ip.startsWith('192.168.') ||
      ip === '127.0.0.1' ||
      ip === 'localhost' ||
      ip === '::1') {
    return true;
  }
  return false;
}

/**
 * Get country flag emoji from country code
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

/**
 * Format location string
 */
export function formatLocation(geo: Partial<GeoLocation>): string {
  const parts = [];
  if (geo.city) parts.push(geo.city);
  if (geo.region && geo.region !== geo.city) parts.push(geo.region);
  if (geo.country) parts.push(geo.country);
  return parts.join(', ') || 'Unknown';
}
