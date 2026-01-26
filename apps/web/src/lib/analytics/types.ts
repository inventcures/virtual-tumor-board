/**
 * Analytics Types for Virtual Tumor Board
 * 
 * Comprehensive tracking for:
 * - Page views and navigation
 * - Feature usage (deliberation, imaging, uploads)
 * - Visitor geolocation
 * - Performance metrics
 */

// ============================================================================
// Visitor & Session Types
// ============================================================================

export interface VisitorInfo {
  id: string;              // Unique visitor ID (cookie-based)
  firstSeen: string;       // ISO timestamp
  lastSeen: string;        // ISO timestamp
  visitCount: number;
  
  // Geolocation (from IP)
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  
  // Device info
  userAgent?: string;
  device?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
  
  // Referrer
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface PageView {
  id: string;
  timestamp: string;
  visitorId: string;
  
  // Page info
  path: string;
  title?: string;
  queryParams?: Record<string, string>;
  
  // Session
  sessionId: string;
  pageInSession: number;
  
  // Performance
  loadTimeMs?: number;
  
  // Geolocation (denormalized for quick queries)
  country?: string;
  city?: string;
}

export interface FeatureEvent {
  id: string;
  timestamp: string;
  visitorId: string;
  sessionId?: string;
  
  // Feature tracking
  feature: FeatureType;
  action: string;
  metadata?: Record<string, unknown>;
  
  // Performance
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
}

export type FeatureType = 
  | 'deliberation'
  | 'imaging_upload'
  | 'imaging_analysis'
  | 'oncoseg'
  | 'document_upload'
  | 'document_extraction'  // MARC-v1 reliability loop extraction
  | 'collaboration'
  | 'case_view'
  | 'demo';

// ============================================================================
// Aggregated Analytics
// ============================================================================

export interface AnalyticsSummary {
  period: string;
  periodStart: string;
  periodEnd: string;
  
  // Traffic
  totalPageViews: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  avgPagesPerSession: number;
  avgSessionDuration: number;
  bounceRate: number;
  
  // Geographic
  topCountries: Array<{ country: string; countryCode: string; count: number }>;
  topCities: Array<{ city: string; country: string; count: number }>;
  visitorLocations: Array<{ lat: number; lng: number; city: string; count: number }>;
  
  // Pages
  topPages: Array<{ path: string; views: number; uniqueViews: number }>;
  
  // Features
  featureUsage: Record<FeatureType, { count: number; successRate: number }>;
  
  // Referrers
  topReferrers: Array<{ referrer: string; count: number }>;
  
  // Devices
  deviceBreakdown: { mobile: number; tablet: number; desktop: number };
  browserBreakdown: Record<string, number>;
  
  // Timeline
  viewsByHour: Record<string, number>;
  viewsByDay: Record<string, number>;
}

// ============================================================================
// Real-time Stats
// ============================================================================

export interface RealTimeStats {
  activeVisitors: number;
  last5MinPageViews: number;
  currentPages: Array<{ path: string; count: number }>;
  recentVisitors: Array<{
    visitorId: string;
    city?: string;
    country?: string;
    currentPage: string;
    lastActive: string;
  }>;
}

// ============================================================================
// Storage Interface
// ============================================================================

export interface AnalyticsStore {
  // Visitors
  getVisitor(id: string): Promise<VisitorInfo | null>;
  upsertVisitor(visitor: VisitorInfo): Promise<void>;
  
  // Page views
  logPageView(pageView: PageView): Promise<void>;
  getPageViews(since: Date, limit?: number): Promise<PageView[]>;
  
  // Feature events
  logFeatureEvent(event: FeatureEvent): Promise<void>;
  getFeatureEvents(since: Date, limit?: number): Promise<FeatureEvent[]>;
  
  // Aggregations
  getSummary(hours: number): Promise<AnalyticsSummary>;
  getRealTimeStats(): Promise<RealTimeStats>;
  
  // Cleanup
  pruneOldData(olderThanDays: number): Promise<number>;
}

// ============================================================================
// Geolocation Types
// ============================================================================

export interface GeoLocation {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
}
