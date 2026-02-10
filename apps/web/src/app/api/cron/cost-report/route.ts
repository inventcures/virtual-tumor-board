/**
 * Cost Report Cron Endpoint
 * 
 * Called by external cron service (Railway cron, Vercel cron, or external)
 * to send scheduled cost report emails.
 * 
 * Schedule (IST = UTC+5:30):
 * - Daily: Every day at 22:00 IST (16:30 UTC)
 * - Weekly: Every Sunday at 22:00 IST
 * - Monthly: 1st of each month at 22:00 IST
 * 
 * Endpoints:
 * - GET /api/cron/cost-report - Auto-detect report type based on current time
 * - GET /api/cron/cost-report?type=DAILY - Force specific report type
 * - GET /api/cron/cost-report?type=WEEKLY
 * - GET /api/cron/cost-report?type=MONTHLY
 * - GET /api/cron/cost-report?dryRun=true - Preview without sending
 * 
 * Security:
 * - Requires CRON_SECRET header to match env variable
 * - Or can be called from localhost/internal
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  sendCostReportEmail, 
  shouldSendReport, 
  getNextReportTime,
  type ReportType,
} from '@/lib/costs';
import { getCostSummary } from '@/lib/costs';

export const runtime = 'nodejs';  // Need Node.js for Resend
export const maxDuration = 30;

/**
 * Verify the request is authorized
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('[Cost Cron] No CRON_SECRET set - rejecting request');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const cronHeader = request.headers.get('x-cron-secret');
  if (cronHeader === cronSecret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const { searchParams } = new URL(request.url);
  const forcedType = searchParams.get('type') as ReportType | null;
  const dryRun = searchParams.get('dryRun') === 'true';
  
  // Determine report type
  let reportType: ReportType | null = forcedType;
  
  if (!reportType) {
    // Auto-detect based on current time
    reportType = shouldSendReport();
    
    if (!reportType) {
      // Not scheduled time, return status info
      const next = getNextReportTime();
      const summary = getCostSummary(24);
      
      return NextResponse.json({
        success: true,
        message: 'No report scheduled for current time',
        currentTime: new Date().toISOString(),
        nextReport: {
          type: next.type,
          time: next.time.toISOString(),
          timeIST: new Date(next.time.getTime() + 5.5 * 60 * 60 * 1000).toISOString().replace('Z', ' IST'),
        },
        currentStats: {
          last24hCalls: summary.totalCalls,
          last24hCost: summary.totalCost,
          last24hCostFormatted: `$${summary.totalCost.toFixed(4)}`,
        },
      });
    }
  }
  
  // Validate report type
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(reportType)) {
    return NextResponse.json(
      { success: false, error: 'Invalid report type. Use DAILY, WEEKLY, or MONTHLY' },
      { status: 400 }
    );
  }
  
  // Send the report
  console.log(`[Cost Cron] Sending ${reportType} report (dryRun: ${dryRun})`);
  
  const result = await sendCostReportEmail(reportType, { dryRun });
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      reportType,
      dryRun,
      subject: result.subject,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
      ...(dryRun && { report: result.report }),
    });
  } else {
    return NextResponse.json({
      success: false,
      reportType,
      error: result.error,
      subject: result.subject,
      ...(dryRun && { report: result.report }),
    }, { status: 500 });
  }
}

/**
 * POST endpoint for manual trigger with custom options
 */
export async function POST(request: NextRequest) {
  // Check authorization
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { type, dryRun = false, recipientEmail } = body;
    
    if (!type || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing report type' },
        { status: 400 }
      );
    }
    
    const result = await sendCostReportEmail(type, { 
      dryRun, 
      recipientEmail,
    });
    
    return NextResponse.json({
      success: result.success,
      reportType: type,
      dryRun,
      subject: result.subject,
      messageId: result.messageId,
      error: result.error,
      ...(dryRun && { report: result.report }),
    }, { status: result.success ? 200 : 500 });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
