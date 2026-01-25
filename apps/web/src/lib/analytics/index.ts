/**
 * Analytics Module
 * 
 * Comprehensive analytics for Virtual Tumor Board.
 * Includes visitor tracking, page views, feature usage, and imaging analytics.
 * Follows Saloni Dattani's data visualization principles.
 * 
 * NOTE: For PostgreSQL persistent store, import directly from './db' in server components only.
 */

// Imaging-specific analytics
export {
  getImagingAnalytics,
  ANALYTICS_COLORS,
  generateChartConfig,
  generateMetricCard,
} from './imaging-analytics';

export type {
  ImagingEvent,
  AnalyticsSummary as ImagingAnalyticsSummary,
} from './imaging-analytics';

// General analytics types
export type {
  VisitorInfo,
  PageView,
  FeatureEvent,
  AnalyticsSummary,
  RealTimeStats,
  FeatureType,
  AnalyticsStore,
} from './types';

// In-memory store (for real-time queries) - works on both server and client
export {
  analyticsStore,
  generateId,
  parseUserAgent,
  getStoreStats,
} from './store';

// Geolocation utilities
export {
  getGeoLocation,
  getCountryFlag,
} from './geolocation';

// NOTE: persistentStore and getTodayDate are SERVER-ONLY
// Import directly: import { persistentStore, getTodayDate } from '@/lib/analytics/db';
