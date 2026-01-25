/**
 * Imaging Analytics API Endpoint
 * 
 * GET /api/analytics/imaging - Get analytics summary
 * POST /api/analytics/imaging - Log an imaging event
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory store (in production, use a database)
interface ImagingEvent {
  timestamp: string;
  eventId: string;
  eventType: string;
  source: string;
  provider?: string;
  model?: string;
  modality?: string;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  confidence?: number;
  findingsCount?: number;
  maskAreaPercent?: number;
}

const events: ImagingEvent[] = [];
const MAX_EVENTS = 10000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '24', 10);
  const format = searchParams.get('format') || 'json';
  
  // Filter events by time
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString();
  const recentEvents = events.filter(e => e.timestamp >= cutoffStr);
  
  // Calculate statistics
  const total = recentEvents.length;
  const successful = recentEvents.filter(e => e.success);
  const latencies = recentEvents.map(e => e.latencyMs).sort((a, b) => a - b);
  
  // Group by dimensions
  const bySource: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byModality: Record<string, number> = {};
  const byHour: Record<string, number> = {};
  const errorsByType: Record<string, number> = {};
  
  for (const event of recentEvents) {
    bySource[event.source] = (bySource[event.source] || 0) + 1;
    byType[event.eventType] = (byType[event.eventType] || 0) + 1;
    
    if (event.modality) {
      byModality[event.modality] = (byModality[event.modality] || 0) + 1;
    }
    
    const hour = event.timestamp.substring(11, 13);
    byHour[hour] = (byHour[hour] || 0) + 1;
    
    if (!event.success && event.errorMessage) {
      const errorType = event.errorMessage.split(':')[0] || 'Unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    }
  }
  
  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const idx = Math.ceil(arr.length * p / 100) - 1;
    return arr[Math.max(0, idx)];
  };
  
  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  const summary = {
    period: `Last ${hours} hours`,
    periodStart: cutoffStr,
    periodEnd: new Date().toISOString(),
    totalEvents: total,
    successfulEvents: successful.length,
    failedEvents: total - successful.length,
    successRate: total > 0 ? Math.round((successful.length / total) * 1000) / 10 : 0,
    latencyMs: {
      mean: Math.round(mean(latencies)),
      median: Math.round(percentile(latencies, 50)),
      p95: Math.round(percentile(latencies, 95)),
      p99: Math.round(percentile(latencies, 99)),
      min: latencies.length > 0 ? Math.round(Math.min(...latencies)) : 0,
      max: latencies.length > 0 ? Math.round(Math.max(...latencies)) : 0,
    },
    bySource,
    byType,
    byModality,
    byHour: Object.fromEntries(
      Array.from({ length: 24 }, (_, i) => {
        const h = String(i).padStart(2, '0');
        return [h, byHour[h] || 0];
      })
    ),
    errorsByType,
    recentEvents: recentEvents.slice(-50).reverse(),
  };
  
  if (format === 'html') {
    // Return simple HTML dashboard
    const html = generateDashboardHTML(summary);
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
  
  return NextResponse.json(summary);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const event: ImagingEvent = {
      timestamp: new Date().toISOString(),
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: body.eventType || 'unknown',
      source: body.source || 'unknown',
      provider: body.provider,
      model: body.model,
      modality: body.modality,
      latencyMs: body.latencyMs || 0,
      success: body.success ?? true,
      errorMessage: body.errorMessage,
      confidence: body.confidence,
      findingsCount: body.findingsCount,
      maskAreaPercent: body.maskAreaPercent,
    };
    
    events.push(event);
    
    // Keep only recent events
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }
    
    return NextResponse.json({ success: true, eventId: event.eventId });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

function generateDashboardHTML(summary: any): string {
  // Following Saloni's principles:
  // - Clear titles that state the takeaway
  // - Color-blind friendly palette
  // - Plain language
  // - Standalone with context
  
  const colors = {
    primary: '#1E88E5',
    success: '#43A047',
    warning: '#FB8C00',
    error: '#E53935',
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VTB Imaging Analytics</title>
  <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5; color: #333; line-height: 1.6; padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header { 
      background: linear-gradient(135deg, ${colors.primary}, #1565C0);
      color: white; padding: 24px; border-radius: 12px; margin-bottom: 20px;
    }
    header h1 { font-size: 24px; margin-bottom: 4px; }
    header p { opacity: 0.9; font-size: 13px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .metric { background: white; border-radius: 10px; padding: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
    .metric h3 { font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 6px; }
    .metric .value { font-size: 32px; font-weight: 700; color: ${colors.primary}; }
    .metric .unit { font-size: 14px; color: #666; }
    .metric.success .value { color: ${colors.success}; }
    .metric.warning .value { color: ${colors.warning}; }
    .chart { background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
    .chart h2 { font-size: 16px; margin-bottom: 4px; }
    .chart .subtitle { font-size: 12px; color: #666; margin-bottom: 12px; }
    .chart-container { height: 250px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 VTB Imaging Analytics</h1>
      <p>${summary.period} • ${summary.totalEvents.toLocaleString()} events</p>
    </header>
    
    <div class="metrics">
      <div class="metric">
        <h3>Total Events</h3>
        <div class="value">${summary.totalEvents.toLocaleString()}</div>
      </div>
      <div class="metric ${summary.successRate >= 95 ? 'success' : summary.successRate >= 80 ? '' : 'warning'}">
        <h3>Success Rate</h3>
        <div class="value">${summary.successRate}<span class="unit">%</span></div>
      </div>
      <div class="metric">
        <h3>Median Latency</h3>
        <div class="value">${(summary.latencyMs.median / 1000).toFixed(1)}<span class="unit">s</span></div>
      </div>
      <div class="metric">
        <h3>P95 Latency</h3>
        <div class="value">${(summary.latencyMs.p95 / 1000).toFixed(1)}<span class="unit">s</span></div>
      </div>
    </div>
    
    <div class="two-col">
      <div class="chart">
        <h2>Events by Source</h2>
        <p class="subtitle">Which imaging tools are being used</p>
        <div id="source-chart" class="chart-container"></div>
      </div>
      <div class="chart">
        <h2>Requests by Hour (UTC)</h2>
        <p class="subtitle">Usage pattern over the day</p>
        <div id="hourly-chart" class="chart-container"></div>
      </div>
    </div>
  </div>
  
  <script>
    const summary = ${JSON.stringify(summary)};
    
    // Source chart
    const sources = Object.keys(summary.bySource);
    const sourceValues = Object.values(summary.bySource);
    Plotly.newPlot('source-chart', [{
      type: 'bar',
      orientation: 'h',
      y: sources,
      x: sourceValues,
      marker: { color: '#1E88E5' },
    }], {
      margin: { t: 10, b: 30, l: 80, r: 20 },
      xaxis: { title: 'Requests' },
      plot_bgcolor: 'white',
    }, { responsive: true });
    
    // Hourly chart
    const hours = Object.keys(summary.byHour);
    const hourlyValues = Object.values(summary.byHour);
    Plotly.newPlot('hourly-chart', [{
      type: 'bar',
      x: hours.map(h => h + ':00'),
      y: hourlyValues,
      marker: { color: '#1E88E5' },
    }], {
      margin: { t: 10, b: 40, l: 40, r: 20 },
      xaxis: { tickangle: -45 },
      yaxis: { title: 'Requests' },
      plot_bgcolor: 'white',
    }, { responsive: true });
  </script>
</body>
</html>`;
}
