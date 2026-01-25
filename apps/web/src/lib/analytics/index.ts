/**
 * Analytics Module
 * 
 * Comprehensive analytics for Virtual Tumor Board.
 * Includes visitor tracking, page views, feature usage, and imaging analytics.
 * Follows Saloni Dattani's data visualization principles.
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

// In-memory store (for real-time queries)
export {
  analyticsStore,
  generateId,
  parseUserAgent,
  getStoreStats,
} from './store';

// Persistent store (PostgreSQL for Railway)
export {
  persistentStore,
  getTodayDate,
} from './db';

// Geolocation utilities
export {
  getGeoLocation,
  getCountryFlag,
} from './geolocation';
