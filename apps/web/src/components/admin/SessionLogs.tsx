/**
 * Session Logs Component
 *
 * Displays detailed session logging information in admin panel
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { SessionInfo } from '@/lib/analytics/types';
import { getCountryFlag } from '@/lib/analytics/geolocation';

interface SessionLogsProps {
  timeRange: number; // hours
}

export function SessionLogs({ timeRange }: SessionLogsProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const res = await fetch(`/api/analytics/sessions?hours=${timeRange}&limit=200`);
        if (!res.ok) throw new Error('Failed to fetch sessions');

        const data = await res.json();
        setSessions(data.sessions || []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [timeRange]);

  const toggleExpanded = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const formatDuration = (durationSeconds?: number): string => {
    if (!durationSeconds) return 'Active';

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;

    if (minutes === 0) return `${seconds}s`;
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (device?: string) => {
    switch (device) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getDeviceLabel = (session: SessionInfo): string => {
    const parts: string[] = [];

    if (session.deviceVendor && session.deviceModel) {
      parts.push(`${session.deviceVendor} ${session.deviceModel}`);
    } else if (session.device) {
      parts.push(session.device.charAt(0).toUpperCase() + session.device.slice(1));
    }

    if (session.browser) {
      const browserStr = session.browserVersion
        ? `${session.browser} ${session.browserVersion}`
        : session.browser;
      parts.push(browserStr);
    }

    if (session.os) {
      const osStr = session.osVersion ? `${session.os} ${session.osVersion}` : session.os;
      parts.push(osStr);
    }

    return parts.join(' • ') || 'Unknown Device';
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
        <p className="text-slate-400">Loading session logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
        <p className="text-slate-400">No sessions found in this time range</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Session Logs
            <span className="ml-3 text-sm text-slate-400">({sessions.length} sessions)</span>
          </h2>
        </div>

        {/* Sessions Table */}
        <div className="space-y-2">
          {sessions.map((session) => {
            const isExpanded = expandedSessions.has(session.id);

            return (
              <div
                key={session.id}
                className="bg-slate-900/50 rounded-lg border border-slate-700/50 overflow-hidden"
              >
                {/* Session Summary Row */}
                <button
                  onClick={() => toggleExpanded(session.id)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-700/30 transition-colors text-left"
                >
                  {/* Expand Icon */}
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {/* Start Time */}
                  <div className="flex items-center gap-2 text-sm min-w-[140px]">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300">{formatDateTime(session.startTime)}</span>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 text-sm min-w-[80px]">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">{formatDuration(session.duration)}</span>
                  </div>

                  {/* Pages */}
                  <div className="flex items-center gap-2 text-sm min-w-[60px]">
                    <span className="text-slate-400">{session.pageCount} pages</span>
                  </div>

                  {/* Device */}
                  <div className="flex items-center gap-2 text-sm flex-1">
                    <div className="text-purple-400">{getDeviceIcon(session.device)}</div>
                    <span className="text-slate-300 truncate">{getDeviceLabel(session)}</span>
                  </div>

                  {/* User Role */}
                  {session.userRole && (
                    <div className="flex items-center gap-2 text-sm min-w-[140px]">
                      <span className="text-indigo-400">👤</span>
                      <span className="text-slate-300 capitalize">{session.userRole.replace('-', ' ')}</span>
                    </div>
                  )}

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm min-w-[180px]">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-300">
                      {session.city && session.country
                        ? `${session.city}, ${getCountryFlag(session.countryCode || '')} ${session.country}`
                        : session.country
                        ? `${getCountryFlag(session.countryCode || '')} ${session.country}`
                        : 'Unknown'}
                    </span>
                  </div>

                  {/* IP */}
                  <div className="text-sm text-slate-500 min-w-[120px] text-right font-mono">
                    {session.ip}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-700/50 bg-slate-900/30">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {/* Session Details */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                          Session Details
                        </h4>
                        <dl className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-slate-400">Session ID:</dt>
                            <dd className="text-slate-300 font-mono text-xs">{session.id.substring(0, 16)}...</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-400">Start Time:</dt>
                            <dd className="text-slate-300">{new Date(session.startTime).toLocaleString()}</dd>
                          </div>
                          {session.endTime && (
                            <div className="flex justify-between">
                              <dt className="text-slate-400">End Time:</dt>
                              <dd className="text-slate-300">{new Date(session.endTime).toLocaleString()}</dd>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <dt className="text-slate-400">Duration:</dt>
                            <dd className="text-slate-300">{formatDuration(session.duration)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-slate-400">Pages Viewed:</dt>
                            <dd className="text-slate-300">{session.pageCount}</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Location Details */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                          Location & Network
                        </h4>
                        <dl className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-slate-400">IP Address:</dt>
                            <dd className="text-slate-300 font-mono">{session.ip}</dd>
                          </div>
                          {session.city && (
                            <div className="flex justify-between">
                              <dt className="text-slate-400">City:</dt>
                              <dd className="text-slate-300">{session.city}</dd>
                            </div>
                          )}
                          {session.country && (
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Country:</dt>
                              <dd className="text-slate-300">
                                {getCountryFlag(session.countryCode || '')} {session.country}
                              </dd>
                            </div>
                          )}
                          {session.latitude && session.longitude && (
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Coordinates:</dt>
                              <dd className="text-slate-300 font-mono text-xs">
                                {session.latitude.toFixed(4)}, {session.longitude.toFixed(4)}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Device Details */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                          Device Information
                        </h4>
                        <dl className="space-y-1.5 text-sm">
                          {session.userRole && (
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Viewing As:</dt>
                              <dd className="text-indigo-300 capitalize font-medium">{session.userRole.replace('-', ' ')}</dd>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <dt className="text-slate-400">Type:</dt>
                            <dd className="text-slate-300 capitalize">{session.device || 'Unknown'}</dd>
                          </div>
                          {session.deviceVendor && (
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Vendor:</dt>
                              <dd className="text-slate-300">{session.deviceVendor}</dd>
                            </div>
                          )}
                          {session.deviceModel && (
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Model:</dt>
                              <dd className="text-slate-300">{session.deviceModel}</dd>
                            </div>
                          )}
                          {session.browser && (
                            <div className="flex justify-between">
                              <dt className="text-slate-400">Browser:</dt>
                              <dd className="text-slate-300">
                                {session.browser} {session.browserVersion || ''}
                              </dd>
                            </div>
                          )}
                          {session.os && (
                            <div className="flex justify-between">
                              <dt className="text-slate-400">OS:</dt>
                              <dd className="text-slate-300">
                                {session.os} {session.osVersion || ''}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Navigation Details */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                          Navigation
                        </h4>
                        <dl className="space-y-1.5 text-sm">
                          <div>
                            <dt className="text-slate-400 mb-1">Landing Page:</dt>
                            <dd className="text-slate-300 font-mono text-xs bg-slate-800/50 px-2 py-1 rounded">
                              {session.landingPage}
                            </dd>
                          </div>
                          {session.exitPage && (
                            <div>
                              <dt className="text-slate-400 mb-1">Exit Page:</dt>
                              <dd className="text-slate-300 font-mono text-xs bg-slate-800/50 px-2 py-1 rounded">
                                {session.exitPage}
                              </dd>
                            </div>
                          )}
                          {session.referrer && (
                            <div>
                              <dt className="text-slate-400 mb-1">Referrer:</dt>
                              <dd className="text-blue-400 font-mono text-xs break-all">
                                <a
                                  href={session.referrer}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline inline-flex items-center gap-1"
                                >
                                  {session.referrer.substring(0, 50)}
                                  {session.referrer.length > 50 && '...'}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
