/**
 * Persistent Analytics Storage
 * 
 * Uses PostgreSQL on Railway for production.
 * Falls back to in-memory for development.
 * 
 * Railway provides DATABASE_URL automatically when you add Postgres.
 * 
 * Schema is auto-created on first connection.
 * 
 * NOTE: This module is SERVER-ONLY. Do not import from client components.
 */

import 'server-only';

import { 
  VisitorInfo, 
  PageView, 
  FeatureEvent, 
  AnalyticsSummary,
  RealTimeStats,
  FeatureType 
} from './types';

// ============================================================================
// Database Connection
// ============================================================================

let db: PostgresDB | null = null;
let initPromise: Promise<void> | null = null;

interface PostgresDB {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

async function getDB(): Promise<PostgresDB | null> {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.log('[Analytics DB] No DATABASE_URL, using in-memory store');
    return null;
  }
  
  if (db) return db;
  
  if (!initPromise) {
    initPromise = initDatabase(dbUrl);
  }
  
  await initPromise;
  return db;
}

async function initDatabase(dbUrl: string): Promise<void> {
  try {
    // Dynamic import to avoid bundling issues
    const { Pool } = await import('pg');
    
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes('railway') ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
    });
    
    // Test connection
    await pool.query('SELECT 1');
    console.log('[Analytics DB] Connected to PostgreSQL');
    
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_visitors (
        id TEXT PRIMARY KEY,
        first_seen TIMESTAMP NOT NULL,
        last_seen TIMESTAMP NOT NULL,
        visit_count INTEGER DEFAULT 1,
        ip TEXT,
        city TEXT,
        region TEXT,
        country TEXT,
        country_code TEXT,
        latitude REAL,
        longitude REAL,
        timezone TEXT,
        user_agent TEXT,
        device TEXT,
        browser TEXT,
        os TEXT,
        referrer TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_pageviews (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        visitor_id TEXT NOT NULL,
        path TEXT NOT NULL,
        session_id TEXT,
        page_in_session INTEGER DEFAULT 1,
        load_time_ms INTEGER,
        country TEXT,
        city TEXT
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        visitor_id TEXT NOT NULL,
        session_id TEXT,
        feature TEXT NOT NULL,
        action TEXT NOT NULL,
        metadata JSONB,
        duration_ms INTEGER,
        success BOOLEAN DEFAULT true,
        error_message TEXT
      )
    `);
    
    // Create indexes for common queries
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pageviews_timestamp ON analytics_pageviews(timestamp DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pageviews_visitor ON analytics_pageviews(visitor_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON analytics_events(timestamp DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_feature ON analytics_events(feature)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pageviews_path ON analytics_pageviews(path)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_visitor ON analytics_events(visitor_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_visitors_country ON analytics_visitors(country)`);
    
    // Create daily aggregates table for faster historical queries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_daily_stats (
        date DATE PRIMARY KEY,
        page_views INTEGER DEFAULT 0,
        unique_visitors INTEGER DEFAULT 0,
        new_visitors INTEGER DEFAULT 0,
        sessions INTEGER DEFAULT 0,
        bounce_count INTEGER DEFAULT 0,
        countries JSONB DEFAULT '{}',
        cities JSONB DEFAULT '{}',
        pages JSONB DEFAULT '{}',
        features JSONB DEFAULT '{}',
        devices JSONB DEFAULT '{}',
        referrers JSONB DEFAULT '{}'
      )
    `);
    
    console.log('[Analytics DB] Tables created/verified');
    
    db = {
      query: async (sql: string, params?: unknown[]) => {
        const result = await pool.query(sql, params);
        return { rows: result.rows };
      }
    };
    
  } catch (error) {
    console.error('[Analytics DB] Failed to connect:', error);
    db = null;
  }
}

// ============================================================================
// Persistent Store Implementation
// ============================================================================

export const persistentStore = {
  /**
   * Save or update a visitor
   */
  async upsertVisitor(visitor: VisitorInfo): Promise<void> {
    const database = await getDB();
    if (!database) return;
    
    try {
      await database.query(`
        INSERT INTO analytics_visitors (
          id, first_seen, last_seen, visit_count, ip, city, region, country, country_code,
          latitude, longitude, timezone, user_agent, device, browser, os, referrer,
          utm_source, utm_medium, utm_campaign
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (id) DO UPDATE SET
          last_seen = EXCLUDED.last_seen,
          visit_count = analytics_visitors.visit_count + 1,
          city = COALESCE(EXCLUDED.city, analytics_visitors.city),
          country = COALESCE(EXCLUDED.country, analytics_visitors.country),
          latitude = COALESCE(EXCLUDED.latitude, analytics_visitors.latitude),
          longitude = COALESCE(EXCLUDED.longitude, analytics_visitors.longitude)
      `, [
        visitor.id, visitor.firstSeen, visitor.lastSeen, visitor.visitCount,
        visitor.ip, visitor.city, visitor.region, visitor.country, visitor.countryCode,
        visitor.latitude, visitor.longitude, visitor.timezone, visitor.userAgent,
        visitor.device, visitor.browser, visitor.os, visitor.referrer,
        visitor.utmSource, visitor.utmMedium, visitor.utmCampaign
      ]);
    } catch (e) {
      console.error('[Analytics DB] Failed to upsert visitor:', e);
    }
  },

  /**
   * Log a page view
   */
  async logPageView(pv: PageView): Promise<void> {
    const database = await getDB();
    if (!database) return;
    
    try {
      await database.query(`
        INSERT INTO analytics_pageviews (
          id, timestamp, visitor_id, path, session_id, page_in_session, load_time_ms, country, city
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        pv.id, pv.timestamp, pv.visitorId, pv.path, pv.sessionId,
        pv.pageInSession, pv.loadTimeMs, pv.country, pv.city
      ]);
    } catch (e) {
      console.error('[Analytics DB] Failed to log page view:', e);
    }
  },

  /**
   * Log a feature event
   */
  async logFeatureEvent(event: FeatureEvent): Promise<void> {
    const database = await getDB();
    if (!database) return;
    
    try {
      await database.query(`
        INSERT INTO analytics_events (
          id, timestamp, visitor_id, session_id, feature, action, metadata, duration_ms, success, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        event.id, event.timestamp, event.visitorId, event.sessionId,
        event.feature, event.action, JSON.stringify(event.metadata || {}),
        event.durationMs, event.success, event.errorMessage
      ]);
    } catch (e) {
      console.error('[Analytics DB] Failed to log feature event:', e);
    }
  },

  /**
   * Update daily aggregates (call periodically or on page view)
   */
  async updateDailyStats(date: string): Promise<void> {
    const database = await getDB();
    if (!database) return;

    try {
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;

      const { rows } = await database.query(`
        WITH pv_base AS (
          SELECT visitor_id, session_id, path, country, city
          FROM analytics_pageviews
          WHERE timestamp >= $1 AND timestamp <= $2
        ),
        pv_stats AS (
          SELECT
            COUNT(*) as page_views,
            COUNT(DISTINCT visitor_id) as unique_visitors,
            COUNT(DISTINCT session_id) as sessions
          FROM pv_base
        ),
        new_visitors AS (
          SELECT COUNT(*) as count FROM analytics_visitors WHERE DATE(first_seen) = $3
        ),
        countries_agg AS (
          SELECT COALESCE(json_agg(r), '[]'::json) as data FROM (
            SELECT country, COUNT(*) as count FROM pv_base
            WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 20
          ) r
        ),
        cities_agg AS (
          SELECT COALESCE(json_agg(r), '[]'::json) as data FROM (
            SELECT city, country, COUNT(*) as count FROM pv_base
            WHERE city IS NOT NULL GROUP BY city, country ORDER BY count DESC LIMIT 20
          ) r
        ),
        pages_agg AS (
          SELECT COALESCE(json_agg(r), '[]'::json) as data FROM (
            SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_id) as unique_views
            FROM pv_base GROUP BY path ORDER BY views DESC LIMIT 20
          ) r
        ),
        features_agg AS (
          SELECT COALESCE(json_agg(r), '[]'::json) as data FROM (
            SELECT feature, COUNT(*) as count,
              SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)::float * 100 as success_rate
            FROM analytics_events WHERE timestamp >= $1 AND timestamp <= $2 GROUP BY feature
          ) r
        ),
        bounce_stats AS (
          SELECT COUNT(*) as bounce_count FROM (
            SELECT session_id FROM pv_base GROUP BY session_id HAVING COUNT(*) = 1
          ) sub
        )
        SELECT
          pv_stats.page_views, pv_stats.unique_visitors, pv_stats.sessions,
          new_visitors.count as new_visitors,
          bounce_stats.bounce_count,
          countries_agg.data as countries,
          cities_agg.data as cities,
          pages_agg.data as pages,
          features_agg.data as features
        FROM pv_stats, new_visitors, countries_agg, cities_agg, pages_agg, features_agg, bounce_stats
      `, [startOfDay, endOfDay, date]);

      const stats = rows[0];

      await database.query(`
        INSERT INTO analytics_daily_stats (
          date, page_views, unique_visitors, new_visitors, sessions, bounce_count,
          countries, cities, pages, features
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (date) DO UPDATE SET
          page_views = EXCLUDED.page_views,
          unique_visitors = EXCLUDED.unique_visitors,
          new_visitors = EXCLUDED.new_visitors,
          sessions = EXCLUDED.sessions,
          bounce_count = EXCLUDED.bounce_count,
          countries = EXCLUDED.countries,
          cities = EXCLUDED.cities,
          pages = EXCLUDED.pages,
          features = EXCLUDED.features
      `, [
        date,
        stats?.page_views || 0,
        stats?.unique_visitors || 0,
        stats?.new_visitors || 0,
        stats?.sessions || 0,
        stats?.bounce_count || 0,
        JSON.stringify(stats?.countries || []),
        JSON.stringify(stats?.cities || []),
        JSON.stringify(stats?.pages || []),
        JSON.stringify(stats?.features || [])
      ]);

    } catch (e) {
      console.error('[Analytics DB] Failed to update daily stats:', e);
    }
  },

  /**
   * Get historical daily stats
   */
  async getDailyStats(days: number): Promise<Array<{
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    newVisitors: number;
    bounceRate: number;
  }>> {
    const database = await getDB();
    if (!database) return [];
    
    try {
      const { rows } = await database.query(`
        SELECT
          date,
          page_views,
          unique_visitors,
          new_visitors,
          sessions,
          bounce_count
        FROM analytics_daily_stats
        WHERE date >= CURRENT_DATE - ($1 || ' days')::INTERVAL
        ORDER BY date DESC
      `, [days]);
      
      return rows.map(row => ({
        date: String(row.date).substring(0, 10),
        pageViews: Number(row.page_views) || 0,
        uniqueVisitors: Number(row.unique_visitors) || 0,
        newVisitors: Number(row.new_visitors) || 0,
        bounceRate: row.sessions ? (Number(row.bounce_count) / Number(row.sessions)) * 100 : 0,
      }));
    } catch (e) {
      console.error('[Analytics DB] Failed to get daily stats:', e);
      return [];
    }
  },

  /**
   * Get total stats since beginning
   */
  async getTotalStats(): Promise<{
    totalPageViews: number;
    totalVisitors: number;
    totalSessions: number;
    oldestDate: string | null;
  }> {
    const database = await getDB();
    if (!database) {
      return { totalPageViews: 0, totalVisitors: 0, totalSessions: 0, oldestDate: null };
    }
    
    try {
      const { rows: pvRows } = await database.query(`
        SELECT COUNT(*) as total, COUNT(DISTINCT session_id) as sessions, MIN(timestamp) as oldest
        FROM analytics_pageviews
      `);
      
      const { rows: visitorRows } = await database.query(`
        SELECT COUNT(*) as total FROM analytics_visitors
      `);
      
      return {
        totalPageViews: Number(pvRows[0]?.total) || 0,
        totalVisitors: Number(visitorRows[0]?.total) || 0,
        totalSessions: Number(pvRows[0]?.sessions) || 0,
        oldestDate: pvRows[0]?.oldest ? String(pvRows[0].oldest) : null,
      };
    } catch (e) {
      console.error('[Analytics DB] Failed to get total stats:', e);
      return { totalPageViews: 0, totalVisitors: 0, totalSessions: 0, oldestDate: null };
    }
  },

  /**
   * Prune old data (keep last N days)
   */
  async pruneOldData(keepDays: number): Promise<number> {
    const database = await getDB();
    if (!database) return 0;
    
    try {
      const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString();
      
      const { rows: pvResult } = await database.query(`
        DELETE FROM analytics_pageviews WHERE timestamp < $1
      `, [cutoff]);
      
      const { rows: evResult } = await database.query(`
        DELETE FROM analytics_events WHERE timestamp < $1
      `, [cutoff]);
      
      // Keep visitors but update their data
      console.log(`[Analytics DB] Pruned data older than ${keepDays} days`);
      
      return 0; // pg doesn't return rowCount easily
    } catch (e) {
      console.error('[Analytics DB] Failed to prune data:', e);
      return 0;
    }
  },

  /**
   * Check if database is available
   */
  async isAvailable(): Promise<boolean> {
    const database = await getDB();
    return database !== null;
  }
};

// ============================================================================
// Helper to get today's date in YYYY-MM-DD format
// ============================================================================

export function getTodayDate(): string {
  return new Date().toISOString().substring(0, 10);
}
