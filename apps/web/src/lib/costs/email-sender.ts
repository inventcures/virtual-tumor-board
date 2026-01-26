/**
 * Email Sender for Cost Reports
 * 
 * Uses Resend API to send cost report emails
 * Recipient: spiff007@gmail.com
 * 
 * Schedule:
 * - Daily: 22:00 IST (16:30 UTC)
 * - Weekly: Sundays 22:00 IST
 * - Monthly: 1st of month 22:00 IST
 */

import { Resend } from 'resend';
import { getCostSummary, generateCostReport } from './cost-tracker';
import { formatCost } from './gemini-pricing';

// ============================================================================
// Configuration
// ============================================================================

const RECIPIENT_EMAIL = 'spiff007@gmail.com';
const SENDER_EMAIL = 'costs@vtb.inventcures.com';  // Configure in Resend
const SENDER_NAME = 'VTB Cost Tracker';

export type ReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

// ============================================================================
// Email Functions
// ============================================================================

/**
 * Get Resend client (lazy initialization)
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Cost Email] RESEND_API_KEY not configured');
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Format date for subject line: YYYY-MM-DD-HH:MM
 */
function formatDateForSubject(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Generate email subject
 * Format: ***** VTB COST-UPDATE[DAILY | WEEKLY | MONTHLY] FROM YYYY-MM-DD-HH:MM TO YYYY-MM-DD-HH:MM
 */
function generateSubject(reportType: ReportType, periodStart: Date, periodEnd: Date): string {
  const fromStr = formatDateForSubject(periodStart);
  const toStr = formatDateForSubject(periodEnd);
  return `***** VTB COST-UPDATE[${reportType}] FROM ${fromStr} TO ${toStr}`;
}

/**
 * Convert markdown report to HTML for email
 */
function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^# (.+)$/gm, '<h1 style="color: #1a1a1a; border-bottom: 2px solid #4f46e5;">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="color: #374151; margin-top: 24px;">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      const isHeader = cells.some(c => c.includes('---'));
      if (isHeader) return '';
      const tag = 'td';
      const cellsHtml = cells.map(c => `<${tag} style="padding: 8px; border: 1px solid #e5e7eb;">${c.trim()}</${tag}>`).join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="margin: 24px 0; border-color: #e5e7eb;">')
    // Italic
    .replace(/\*(.+?)\*/g, '<em style="color: #6b7280;">$1</em>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap tables - find consecutive table rows
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, (match) => {
    return `<table style="border-collapse: collapse; width: 100%; margin: 16px 0;">${match}</table>`;
  });

  // Wrap lists - find consecutive list items
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => {
    return `<ul style="margin: 16px 0;">${match}</ul>`;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1a1a1a; line-height: 1.6;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 0;">
        <h1 style="margin: 0; font-size: 24px; border: none;">🏥 Virtual Tumor Board</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Gemini API Cost Report</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p>${html}</p>
      </div>
      <div style="text-align: center; margin-top: 24px; color: #6b7280; font-size: 12px;">
        <p>This is an automated cost report from Virtual Tumor Board.</p>
        <p>Configure alerts at: <a href="https://vtb.inventcures.com/admin" style="color: #4f46e5;">vtb.inventcures.com/admin</a></p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send a cost report email
 */
export async function sendCostReportEmail(
  reportType: ReportType,
  options: {
    recipientEmail?: string;
    dryRun?: boolean;
  } = {}
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  report?: string;
  subject?: string;
}> {
  const recipient = options.recipientEmail || RECIPIENT_EMAIL;
  
  // Determine hours based on report type
  const hours = reportType === 'DAILY' ? 24 : reportType === 'WEEKLY' ? 168 : 720;
  
  // Get cost summary
  const summary = getCostSummary(hours);
  const report = generateCostReport(hours);
  
  // Generate subject with exact date range
  const periodStart = new Date(summary.periodStart);
  const periodEnd = new Date(summary.periodEnd);
  const subject = generateSubject(reportType, periodStart, periodEnd);
  
  // Dry run - just return the report without sending
  if (options.dryRun) {
    return {
      success: true,
      report,
      subject,
    };
  }
  
  // Get Resend client
  const resend = getResendClient();
  if (!resend) {
    return {
      success: false,
      error: 'RESEND_API_KEY not configured',
      report,
      subject,
    };
  }
  
  try {
    const { data, error } = await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [recipient],
      subject,
      html: markdownToHtml(report),
      text: report,  // Plain text fallback
    });
    
    if (error) {
      console.error('[Cost Email] Send failed:', error);
      return {
        success: false,
        error: error.message,
        report,
        subject,
      };
    }
    
    console.log(`[Cost Email] ${reportType} report sent to ${recipient}, ID: ${data?.id}`);
    
    return {
      success: true,
      messageId: data?.id,
      report,
      subject,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cost Email] Exception:', errorMsg);
    return {
      success: false,
      error: errorMsg,
      report,
      subject,
    };
  }
}

/**
 * Check if it's time to send a scheduled report
 * Uses IST (UTC+5:30) timezone
 */
export function shouldSendReport(now: Date = new Date()): ReportType | null {
  // Convert to IST
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();
  const dayOfWeek = istTime.getUTCDay();  // 0 = Sunday
  const dayOfMonth = istTime.getUTCDate();
  
  // Check if it's 22:00 IST (within 5 minute window)
  if (hour !== 22 || minute >= 5) {
    return null;
  }
  
  // Monthly: 1st of month at 22:00 IST
  if (dayOfMonth === 1) {
    return 'MONTHLY';
  }
  
  // Weekly: Sunday at 22:00 IST
  if (dayOfWeek === 0) {
    return 'WEEKLY';
  }
  
  // Daily: Every day at 22:00 IST
  return 'DAILY';
}

/**
 * Get next scheduled report time (for display)
 */
export function getNextReportTime(): { type: ReportType; time: Date } {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  
  // Find next 22:00 IST
  const istNow = new Date(now.getTime() + istOffset);
  let nextIST = new Date(istNow);
  nextIST.setUTCHours(22, 0, 0, 0);
  
  if (istNow.getUTCHours() >= 22) {
    nextIST.setUTCDate(nextIST.getUTCDate() + 1);
  }
  
  // Convert back to UTC
  const nextUTC = new Date(nextIST.getTime() - istOffset);
  
  // Determine type
  const dayOfWeek = nextIST.getUTCDay();
  const dayOfMonth = nextIST.getUTCDate();
  
  let type: ReportType = 'DAILY';
  if (dayOfMonth === 1) type = 'MONTHLY';
  else if (dayOfWeek === 0) type = 'WEEKLY';
  
  return { type, time: nextUTC };
}
