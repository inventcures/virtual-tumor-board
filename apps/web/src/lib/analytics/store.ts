/**
 * Analytics Data Store
 * 
 * In-memory store with periodic persistence.
 * For production, replace with Vercel KV, Redis, or database.
 * 
 * Features:
 * - In-memory for fast reads
 * - LRU eviction for memory management
 * - Aggregation caching
 */

import {
  VisitorInfo,
  PageView,
  FeatureEvent,
  AnalyticsSummary,
  RealTimeStats,
  AnalyticsStore,
  FeatureType,
} from './types';

// ============================================================================
// In-Memory Storage
// ============================================================================

const MAX_VISITORS = 10000;
const MAX_PAGE_VIEWS = 50000;
const MAX_FEATURE_EVENTS = 20000;
const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Storage
const visitors = new Map<string, VisitorInfo>();
const pageViews: PageView[] = [];
const featureEvents: FeatureEvent[] = [];

// Aggregation cache
let summaryCache: { data: AnalyticsSummary; expires: number } | null = null;
const SUMMARY_CACHE_TTL = 60 * 1000; // 1 minute

// ============================================================================
// Store Implementation
// ============================================================================

export const analyticsStore: AnalyticsStore = {
  async getVisitor(id: string): Promise<VisitorInfo | null> {
    return visitors.get(id) || null;
  },

  async upsertVisitor(visitor: VisitorInfo): Promise<void> {
    // LRU eviction if needed
    if (visitors.size >= MAX_VISITORS && !visitors.has(visitor.id)) {
      // Remove oldest visitor
      const oldest = [...visitors.entries()]
        .sort((a, b) => a[1].lastSeen.localeCompare(b[1].lastSeen))[0];
      if (oldest) visitors.delete(oldest[0]);
    }
    
    visitors.set(visitor.id, visitor);
  },

  async logPageView(pageView: PageView): Promise<void> {
    // LRU eviction
    if (pageViews.length >= MAX_PAGE_VIEWS) {
      pageViews.splice(0, 1000); // Remove oldest 1000
    }
    
    pageViews.push(pageView);
    
    // Invalidate cache
    summaryCache = null;
  },

  async getPageViews(since: Date, limit?: number): Promise<PageView[]> {
    const sinceStr = since.toISOString();
    const filtered = pageViews.filter(pv => pv.timestamp >= sinceStr);
    
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  },

  async logFeatureEvent(event: FeatureEvent): Promise<void> {
    // LRU eviction
    if (featureEvents.length >= MAX_FEATURE_EVENTS) {
      featureEvents.splice(0, 500);
    }
    
    featureEvents.push(event);
    summaryCache = null;
  },

  async getFeatureEvents(since: Date, limit?: number): Promise<FeatureEvent[]> {
    const sinceStr = since.toISOString();
    const filtered = featureEvents.filter(e => e.timestamp >= sinceStr);
    
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  },

  async getSummary(hours: number): Promise<AnalyticsSummary> {
    // Check cache
    if (summaryCache && summaryCache.expires > Date.now()) {
      return summaryCache.data;
    }
    
    const now = new Date();
    const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const sinceStr = since.toISOString();
    
    // Filter data
    const recentPageViews = pageViews.filter(pv => pv.timestamp >= sinceStr);
    const recentEvents = featureEvents.filter(e => e.timestamp >= sinceStr);
    const recentVisitors = [...visitors.values()].filter(v => v.lastSeen >= sinceStr);
    
    // Calculate unique visitors
    const uniqueVisitorIds = new Set(recentPageViews.map(pv => pv.visitorId));
    const newVisitorIds = new Set(
      recentVisitors.filter(v => v.firstSeen >= sinceStr).map(v => v.id)
    );
    
    // Sessions
    const sessions = new Map<string, PageView[]>();
    for (const pv of recentPageViews) {
      const key = pv.sessionId;
      if (!sessions.has(key)) sessions.set(key, []);
      sessions.get(key)!.push(pv);
    }
    
    // Bounce rate (single page sessions)
    const singlePageSessions = [...sessions.values()].filter(s => s.length === 1).length;
    const bounceRate = sessions.size > 0 ? (singlePageSessions / sessions.size) * 100 : 0;
    
    // Avg pages per session
    const avgPagesPerSession = sessions.size > 0 
      ? recentPageViews.length / sessions.size 
      : 0;
    
    // Top countries
    const countryCount = new Map<string, { country: string; countryCode: string; count: number }>();
    for (const pv of recentPageViews) {
      const visitor = visitors.get(pv.visitorId);
      if (visitor?.country) {
        const key = visitor.countryCode || visitor.country;
        if (!countryCount.has(key)) {
          countryCount.set(key, { country: visitor.country, countryCode: visitor.countryCode || '', count: 0 });
        }
        countryCount.get(key)!.count++;
      }
    }
    const topCountries = [...countryCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Top cities
    const cityCount = new Map<string, { city: string; country: string; count: number }>();
    for (const pv of recentPageViews) {
      const visitor = visitors.get(pv.visitorId);
      if (visitor?.city) {
        const key = `${visitor.city},${visitor.country}`;
        if (!cityCount.has(key)) {
          cityCount.set(key, { city: visitor.city, country: visitor.country || '', count: 0 });
        }
        cityCount.get(key)!.count++;
      }
    }
    const topCities = [...cityCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Visitor locations for map
    const locationCount = new Map<string, { lat: number; lng: number; city: string; count: number }>();
    for (const pv of recentPageViews) {
      const visitor = visitors.get(pv.visitorId);
      if (visitor?.latitude && visitor?.longitude) {
        const key = `${visitor.latitude.toFixed(2)},${visitor.longitude.toFixed(2)}`;
        if (!locationCount.has(key)) {
          locationCount.set(key, { 
            lat: visitor.latitude, 
            lng: visitor.longitude, 
            city: visitor.city || '', 
            count: 0 
          });
        }
        locationCount.get(key)!.count++;
      }
    }
    const visitorLocations = [...locationCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);
    
    // Top pages
    const pageCount = new Map<string, { views: number; visitors: Set<string> }>();
    for (const pv of recentPageViews) {
      if (!pageCount.has(pv.path)) {
        pageCount.set(pv.path, { views: 0, visitors: new Set() });
      }
      const entry = pageCount.get(pv.path)!;
      entry.views++;
      entry.visitors.add(pv.visitorId);
    }
    const topPages = [...pageCount.entries()]
      .map(([path, data]) => ({ path, views: data.views, uniqueViews: data.visitors.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    // Feature usage
    const featureUsage: Record<FeatureType, { count: number; successRate: number }> = {
      deliberation: { count: 0, successRate: 0 },
      imaging_upload: { count: 0, successRate: 0 },
      imaging_analysis: { count: 0, successRate: 0 },
      oncoseg: { count: 0, successRate: 0 },
      document_upload: { count: 0, successRate: 0 },
      collaboration: { count: 0, successRate: 0 },
      case_view: { count: 0, successRate: 0 },
      demo: { count: 0, successRate: 0 },
    };
    
    const featureStats = new Map<FeatureType, { total: number; success: number }>();
    for (const event of recentEvents) {
      if (!featureStats.has(event.feature)) {
        featureStats.set(event.feature, { total: 0, success: 0 });
      }
      const stats = featureStats.get(event.feature)!;
      stats.total++;
      if (event.success) stats.success++;
    }
    
    for (const [feature, stats] of featureStats) {
      featureUsage[feature] = {
        count: stats.total,
        successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      };
    }
    
    // Top referrers
    const referrerCount = new Map<string, number>();
    for (const visitor of recentVisitors) {
      if (visitor.referrer) {
        try {
          const url = new URL(visitor.referrer);
          const domain = url.hostname;
          referrerCount.set(domain, (referrerCount.get(domain) || 0) + 1);
        } catch {
          referrerCount.set(visitor.referrer, (referrerCount.get(visitor.referrer) || 0) + 1);
        }
      }
    }
    const topReferrers = [...referrerCount.entries()]
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Device breakdown
    const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
    for (const visitor of recentVisitors) {
      if (visitor.device) {
        deviceBreakdown[visitor.device]++;
      }
    }
    
    // Browser breakdown
    const browserCount = new Map<string, number>();
    for (const visitor of recentVisitors) {
      if (visitor.browser) {
        browserCount.set(visitor.browser, (browserCount.get(visitor.browser) || 0) + 1);
      }
    }
    const browserBreakdown = Object.fromEntries(browserCount);
    
    // Views by hour
    const viewsByHour: Record<string, number> = {};
    for (const pv of recentPageViews) {
      const hour = pv.timestamp.substring(11, 13);
      viewsByHour[hour] = (viewsByHour[hour] || 0) + 1;
    }
    
    // Views by day
    const viewsByDay: Record<string, number> = {};
    for (const pv of recentPageViews) {
      const day = pv.timestamp.substring(0, 10);
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    }
    
    const summary: AnalyticsSummary = {
      period: `Last ${hours} hours`,
      periodStart: sinceStr,
      periodEnd: now.toISOString(),
      
      totalPageViews: recentPageViews.length,
      uniqueVisitors: uniqueVisitorIds.size,
      newVisitors: newVisitorIds.size,
      returningVisitors: uniqueVisitorIds.size - newVisitorIds.size,
      avgPagesPerSession: Math.round(avgPagesPerSession * 10) / 10,
      avgSessionDuration: 0, // Would need timestamps
      bounceRate: Math.round(bounceRate * 10) / 10,
      
      topCountries,
      topCities,
      visitorLocations,
      topPages,
      featureUsage,
      topReferrers,
      deviceBreakdown,
      browserBreakdown,
      viewsByHour,
      viewsByDay,
    };
    
    // Cache
    summaryCache = { data: summary, expires: Date.now() + SUMMARY_CACHE_TTL };
    
    return summary;
  },

  async getRealTimeStats(): Promise<RealTimeStats> {
    const now = Date.now();
    const fiveMinAgo = new Date(now - ACTIVE_THRESHOLD_MS).toISOString();
    
    // Active visitors (page view in last 5 min)
    const recentPVs = pageViews.filter(pv => pv.timestamp >= fiveMinAgo);
    const activeVisitorIds = new Set(recentPVs.map(pv => pv.visitorId));
    
    // Current pages
    const pageVisitors = new Map<string, Set<string>>();
    for (const pv of recentPVs) {
      if (!pageVisitors.has(pv.path)) {
        pageVisitors.set(pv.path, new Set());
      }
      pageVisitors.get(pv.path)!.add(pv.visitorId);
    }
    const currentPages = [...pageVisitors.entries()]
      .map(([path, vis]) => ({ path, count: vis.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Recent visitors
    const recentVisitors = [...activeVisitorIds]
      .map(id => visitors.get(id))
      .filter((v): v is VisitorInfo => v !== undefined)
      .map(v => {
        const lastPV = recentPVs.filter(pv => pv.visitorId === v.id).pop();
        return {
          visitorId: v.id.substring(0, 8) + '...', // Truncate for privacy
          city: v.city,
          country: v.country,
          currentPage: lastPV?.path || '/',
          lastActive: v.lastSeen,
        };
      })
      .slice(0, 10);
    
    return {
      activeVisitors: activeVisitorIds.size,
      last5MinPageViews: recentPVs.length,
      currentPages,
      recentVisitors,
    };
  },

  async pruneOldData(olderThanDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    
    let pruned = 0;
    
    // Prune page views
    const pvBefore = pageViews.length;
    const newPVs = pageViews.filter(pv => pv.timestamp >= cutoff);
    pageViews.length = 0;
    pageViews.push(...newPVs);
    pruned += pvBefore - pageViews.length;
    
    // Prune feature events
    const evBefore = featureEvents.length;
    const newEvents = featureEvents.filter(e => e.timestamp >= cutoff);
    featureEvents.length = 0;
    featureEvents.push(...newEvents);
    pruned += evBefore - featureEvents.length;
    
    // Prune old visitors
    for (const [id, visitor] of visitors) {
      if (visitor.lastSeen < cutoff) {
        visitors.delete(id);
        pruned++;
      }
    }
    
    return pruned;
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function parseUserAgent(ua: string): { device: 'mobile' | 'tablet' | 'desktop'; browser: string; os: string } {
  let device: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  let browser = 'Unknown';
  let os = 'Unknown';
  
  const uaLower = ua.toLowerCase();
  
  // Device detection
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    device = 'mobile';
  } else if (/ipad|tablet|playbook|silk/i.test(ua)) {
    device = 'tablet';
  }
  
  // Browser detection
  if (uaLower.includes('firefox')) browser = 'Firefox';
  else if (uaLower.includes('edg')) browser = 'Edge';
  else if (uaLower.includes('chrome')) browser = 'Chrome';
  else if (uaLower.includes('safari')) browser = 'Safari';
  else if (uaLower.includes('opera') || uaLower.includes('opr')) browser = 'Opera';
  
  // OS detection
  if (uaLower.includes('windows')) os = 'Windows';
  else if (uaLower.includes('mac os')) os = 'macOS';
  else if (uaLower.includes('linux')) os = 'Linux';
  else if (uaLower.includes('android')) os = 'Android';
  else if (uaLower.includes('iphone') || uaLower.includes('ipad')) os = 'iOS';
  
  return { device, browser, os };
}

// ============================================================================
// Export stats for debugging
// ============================================================================

export function getStoreStats() {
  return {
    visitors: visitors.size,
    pageViews: pageViews.length,
    featureEvents: featureEvents.length,
  };
}
