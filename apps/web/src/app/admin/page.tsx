"use client";

/**
 * Admin Analytics Dashboard
 * 
 * Shows:
 * - Real-time visitor stats
 * - Geographic distribution with map
 * - Traffic trends
 * - Feature usage
 * - Top pages & referrers
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Users, Globe, TrendingUp, Clock, 
  MapPin, Monitor, Smartphone, Tablet,
  RefreshCw, Download, BarChart3, PieChart,
  Eye, MousePointer, FileText, Brain, Upload
} from 'lucide-react';
import { AnalyticsSummary, RealTimeStats } from '@/lib/analytics/types';
import { getCountryFlag } from '@/lib/analytics/geolocation';

// Refresh intervals
const REALTIME_REFRESH_MS = 10000; // 10 seconds
const SUMMARY_REFRESH_MS = 60000;  // 1 minute

interface StorageStatus {
  memory: { visitors: number; pageViews: number; featureEvents: number };
  database: { 
    available: boolean; 
    totalPageViews?: number;
    totalVisitors?: number;
    message?: string;
  };
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [realtime, setRealtime] = useState<RealTimeStats | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24); // hours
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, realtimeRes, statusRes] = await Promise.all([
        fetch(`/api/analytics/summary?hours=${timeRange}`),
        fetch('/api/analytics/realtime'),
        fetch('/api/analytics/status'),
      ]);
      
      if (!summaryRes.ok || !realtimeRes.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const summaryData = await summaryRes.json();
      const realtimeData = await realtimeRes.json();
      const statusData = statusRes.ok ? await statusRes.json() : null;
      
      setSummary(summaryData);
      setRealtime(realtimeData);
      if (statusData?.storage) setStorageStatus(statusData.storage);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
    
    // Refresh realtime more frequently
    const realtimeInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/analytics/realtime');
        if (res.ok) {
          setRealtime(await res.json());
        }
      } catch {}
    }, REALTIME_REFRESH_MS);
    
    // Refresh summary less frequently
    const summaryInterval = setInterval(fetchData, SUMMARY_REFRESH_MS);
    
    return () => {
      clearInterval(realtimeInterval);
      clearInterval(summaryInterval);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">VTB Analytics Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Virtual Tumor Board - Visitor & Usage Analytics
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Time range selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(parseInt(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              <option value={1}>Last hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={168}>Last 7 days</option>
              <option value={720}>Last 30 days</option>
            </select>
            
            <button
              onClick={fetchData}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => exportToCSV(summary, realtime)}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              title="Export CSV"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Activity className="w-6 h-6 text-emerald-400" />}
            label="Active Now"
            value={realtime?.activeVisitors || 0}
            sublabel="visitors online"
            highlight
          />
          <StatCard
            icon={<Eye className="w-6 h-6 text-blue-400" />}
            label="Page Views"
            value={summary?.totalPageViews || 0}
            sublabel={`in ${summary?.period || 'period'}`}
          />
          <StatCard
            icon={<Users className="w-6 h-6 text-purple-400" />}
            label="Unique Visitors"
            value={summary?.uniqueVisitors || 0}
            sublabel={`${summary?.newVisitors || 0} new`}
          />
          <StatCard
            icon={<MousePointer className="w-6 h-6 text-amber-400" />}
            label="Bounce Rate"
            value={`${summary?.bounceRate || 0}%`}
            sublabel={`${summary?.avgPagesPerSession?.toFixed(1) || 0} pages/session`}
          />
        </div>

        {/* Trend Charts */}
        {summary && (Object.keys(summary.viewsByHour).length > 0 || Object.keys(summary.viewsByDay).length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold">Views by Hour</h2>
              </div>
              <TrendChart 
                data={summary.viewsByHour} 
                label="Hourly Distribution" 
                color="#3B82F6"
              />
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">Views by Day</h2>
              </div>
              <TrendChart 
                data={summary.viewsByDay} 
                label="Daily Trend" 
                color="#10B981"
              />
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Geography */}
          <div className="lg:col-span-2 space-y-6">
            {/* World Map (simplified with list) */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold">Visitor Locations</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Top Countries */}
                <div>
                  <h3 className="text-sm text-slate-400 mb-3">Top Countries</h3>
                  <div className="space-y-2">
                    {summary?.topCountries.slice(0, 8).map((c, i) => (
                      <div key={c.countryCode} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCountryFlag(c.countryCode)}</span>
                          <span className="text-sm text-slate-300">{c.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ 
                                width: `${(c.count / (summary?.topCountries[0]?.count || 1)) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm text-slate-400 w-8 text-right">{c.count}</span>
                        </div>
                      </div>
                    ))}
                    {(!summary?.topCountries || summary.topCountries.length === 0) && (
                      <p className="text-sm text-slate-500">No geographic data yet</p>
                    )}
                  </div>
                </div>
                
                {/* Top Cities */}
                <div>
                  <h3 className="text-sm text-slate-400 mb-3">Top Cities</h3>
                  <div className="space-y-2">
                    {summary?.topCities.slice(0, 8).map((c, i) => (
                      <div key={`${c.city}-${c.country}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-500" />
                          <span className="text-sm text-slate-300">{c.city}</span>
                        </div>
                        <span className="text-sm text-slate-400">{c.count}</span>
                      </div>
                    ))}
                    {(!summary?.topCities || summary.topCities.length === 0) && (
                      <p className="text-sm text-slate-500">No city data yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Pages */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold">Top Pages</h2>
              </div>
              
              <div className="space-y-3">
                {summary?.topPages.map((page, i) => (
                  <div key={page.path} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-slate-500 w-6">{i + 1}.</span>
                      <span className="text-sm text-slate-300 truncate">{page.path}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-400">{page.views} views</span>
                      <span className="text-slate-500">{page.uniqueViews} unique</span>
                    </div>
                  </div>
                ))}
                {(!summary?.topPages || summary.topPages.length === 0) && (
                  <p className="text-sm text-slate-500">No page data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Real-time Activity */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">Live Activity</h2>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              
              <div className="space-y-3">
                {realtime?.recentVisitors.map((v, i) => (
                  <div key={v.visitorId} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 truncate">{v.currentPage}</p>
                      <p className="text-slate-500 text-xs">
                        {v.city && v.country ? `${v.city}, ${v.country}` : 'Unknown location'}
                      </p>
                    </div>
                  </div>
                ))}
                {(!realtime?.recentVisitors || realtime.recentVisitors.length === 0) && (
                  <p className="text-sm text-slate-500">No active visitors</p>
                )}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold">Devices</h2>
              </div>
              
              <div className="space-y-4">
                <DeviceBar
                  icon={<Monitor className="w-4 h-4" />}
                  label="Desktop"
                  count={summary?.deviceBreakdown.desktop || 0}
                  total={
                    (summary?.deviceBreakdown.desktop || 0) +
                    (summary?.deviceBreakdown.tablet || 0) +
                    (summary?.deviceBreakdown.mobile || 0)
                  }
                  color="bg-blue-500"
                />
                <DeviceBar
                  icon={<Smartphone className="w-4 h-4" />}
                  label="Mobile"
                  count={summary?.deviceBreakdown.mobile || 0}
                  total={
                    (summary?.deviceBreakdown.desktop || 0) +
                    (summary?.deviceBreakdown.tablet || 0) +
                    (summary?.deviceBreakdown.mobile || 0)
                  }
                  color="bg-purple-500"
                />
                <DeviceBar
                  icon={<Tablet className="w-4 h-4" />}
                  label="Tablet"
                  count={summary?.deviceBreakdown.tablet || 0}
                  total={
                    (summary?.deviceBreakdown.desktop || 0) +
                    (summary?.deviceBreakdown.tablet || 0) +
                    (summary?.deviceBreakdown.mobile || 0)
                  }
                  color="bg-amber-500"
                />
              </div>
            </div>

            {/* Feature Usage */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-rose-400" />
                <h2 className="text-lg font-semibold">Feature Usage</h2>
              </div>
              
              <div className="space-y-3">
                <FeatureRow
                  icon={<Brain className="w-4 h-4 text-indigo-400" />}
                  label="Deliberation"
                  count={summary?.featureUsage.deliberation?.count || 0}
                  successRate={summary?.featureUsage.deliberation?.successRate || 0}
                />
                <FeatureRow
                  icon={<Upload className="w-4 h-4 text-emerald-400" />}
                  label="Imaging Upload"
                  count={summary?.featureUsage.imaging_upload?.count || 0}
                  successRate={summary?.featureUsage.imaging_upload?.successRate || 0}
                />
                <FeatureRow
                  icon={<Eye className="w-4 h-4 text-blue-400" />}
                  label="Image Analysis"
                  count={summary?.featureUsage.imaging_analysis?.count || 0}
                  successRate={summary?.featureUsage.imaging_analysis?.successRate || 0}
                />
                <FeatureRow
                  icon={<Activity className="w-4 h-4 text-rose-400" />}
                  label="OncoSeg"
                  count={summary?.featureUsage.oncoseg?.count || 0}
                  successRate={summary?.featureUsage.oncoseg?.successRate || 0}
                />
              </div>
            </div>

            {/* Top Referrers */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold">Traffic Sources</h2>
              </div>
              
              <div className="space-y-2">
                {summary?.topReferrers.slice(0, 5).map((r, i) => (
                  <div key={r.referrer} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 truncate max-w-[180px]">{r.referrer || 'Direct'}</span>
                    <span className="text-slate-400">{r.count}</span>
                  </div>
                ))}
                {(!summary?.topReferrers || summary.topReferrers.length === 0) && (
                  <p className="text-sm text-slate-500">Mostly direct traffic</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          {lastUpdated && (
            <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
          )}
          
          {/* Storage Status */}
          {storageStatus && (
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Memory: {storageStatus.memory.pageViews.toLocaleString()} views</span>
              </div>
              {storageStatus.database.available ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>PostgreSQL: {(storageStatus.database.totalPageViews || 0).toLocaleString()} views</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>No DATABASE_URL - using memory only</span>
                </div>
              )}
            </div>
          )}
          
          <p className="mt-2 text-slate-600">
            {storageStatus?.database.available 
              ? 'Data persists across deploys via Railway PostgreSQL.' 
              : 'Data resets on deploy. Set DATABASE_URL for persistence.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function StatCard({ 
  icon, 
  label, 
  value, 
  sublabel, 
  highlight 
}: { 
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel: string;
  highlight?: boolean;
}) {
  return (
    <div className={`
      rounded-xl border p-6
      ${highlight 
        ? 'bg-gradient-to-br from-emerald-900/30 to-slate-800/50 border-emerald-500/30' 
        : 'bg-slate-800/50 border-slate-700'
      }
    `}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{sublabel}</p>
    </div>
  );
}

function DeviceBar({ 
  icon, 
  label, 
  count, 
  total, 
  color 
}: { 
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-slate-300">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <span className="text-sm text-slate-400">{count} ({percent.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function FeatureRow({ 
  icon, 
  label, 
  count, 
  successRate 
}: { 
  icon: React.ReactNode;
  label: string;
  count: number;
  successRate: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">{count}</span>
        <span className={successRate >= 90 ? 'text-emerald-400' : successRate >= 70 ? 'text-amber-400' : 'text-red-400'}>
          {successRate.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Trend Chart Component (Pure SVG, no dependencies)
// ============================================================================

function TrendChart({ 
  data, 
  label,
  color = '#3B82F6'
}: { 
  data: Record<string, number>;
  label: string;
  color?: string;
}) {
  const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
  
  if (entries.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
        No data available
      </div>
    );
  }
  
  const values = entries.map(e => e[1]);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values);
  
  const width = 100;
  const height = 40;
  const padding = 2;
  
  // Generate path for area chart
  const points = entries.map((entry, i) => {
    const x = padding + (i / (entries.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((entry[1] - minValue) / (maxValue - minValue || 1)) * (height - padding * 2);
    return { x, y, value: entry[1], label: entry[0] };
  });
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${height} L ${padding} ${height} Z`;
  
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / values.length;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-sm text-slate-300">{total.toLocaleString()} total</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
        {/* Grid lines */}
        <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
        
        {/* Area fill */}
        <path d={areaPath} fill={color} fillOpacity="0.2" />
        
        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{entries[0]?.[0]}</span>
        <span>Avg: {avg.toFixed(0)}</span>
        <span>{entries[entries.length - 1]?.[0]}</span>
      </div>
    </div>
  );
}

// ============================================================================
// CSV Export Function
// ============================================================================

function exportToCSV(summary: AnalyticsSummary | null, realtime: RealTimeStats | null) {
  if (!summary) return;
  
  const rows: string[][] = [];
  
  // Header
  rows.push(['Virtual Tumor Board Analytics Export']);
  rows.push([`Generated: ${new Date().toISOString()}`]);
  rows.push([`Period: ${summary.period}`]);
  rows.push([]);
  
  // Summary stats
  rows.push(['Summary Statistics']);
  rows.push(['Metric', 'Value']);
  rows.push(['Total Page Views', String(summary.totalPageViews)]);
  rows.push(['Unique Visitors', String(summary.uniqueVisitors)]);
  rows.push(['New Visitors', String(summary.newVisitors)]);
  rows.push(['Returning Visitors', String(summary.returningVisitors)]);
  rows.push(['Bounce Rate', `${summary.bounceRate}%`]);
  rows.push(['Avg Pages/Session', String(summary.avgPagesPerSession)]);
  rows.push([]);
  
  // Top pages
  rows.push(['Top Pages']);
  rows.push(['Path', 'Views', 'Unique Views']);
  summary.topPages.forEach(p => {
    rows.push([p.path, String(p.views), String(p.uniqueViews)]);
  });
  rows.push([]);
  
  // Countries
  rows.push(['Top Countries']);
  rows.push(['Country', 'Code', 'Views']);
  summary.topCountries.forEach(c => {
    rows.push([c.country, c.countryCode, String(c.count)]);
  });
  rows.push([]);
  
  // Cities
  rows.push(['Top Cities']);
  rows.push(['City', 'Country', 'Views']);
  summary.topCities.forEach(c => {
    rows.push([c.city, c.country, String(c.count)]);
  });
  rows.push([]);
  
  // Feature usage
  rows.push(['Feature Usage']);
  rows.push(['Feature', 'Count', 'Success Rate']);
  Object.entries(summary.featureUsage).forEach(([feature, data]) => {
    rows.push([feature, String(data.count), `${data.successRate.toFixed(1)}%`]);
  });
  rows.push([]);
  
  // Devices
  rows.push(['Device Breakdown']);
  rows.push(['Device', 'Count']);
  rows.push(['Desktop', String(summary.deviceBreakdown.desktop)]);
  rows.push(['Mobile', String(summary.deviceBreakdown.mobile)]);
  rows.push(['Tablet', String(summary.deviceBreakdown.tablet)]);
  
  // Convert to CSV string
  const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vtb-analytics-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
