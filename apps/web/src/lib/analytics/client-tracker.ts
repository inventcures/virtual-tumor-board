/**
 * Client-side Analytics Tracker
 *
 * Sends user role updates to analytics when role changes
 */

export function trackRoleChange(role: string, visitorId: string) {
  // Send role update to analytics API
  fetch('/api/analytics/role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, visitorId }),
  }).catch(() => {
    // Fail silently - analytics should never break the app
  });
}

export function getVisitorId(): string | null {
  // Read visitor ID from cookie (set by middleware)
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'vtb_visitor_id') {
      return value;
    }
  }
  return null;
}
