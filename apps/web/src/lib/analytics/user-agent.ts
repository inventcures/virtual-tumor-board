/**
 * User Agent Parsing Utilities
 *
 * Extracts detailed device, browser, and OS information from user agent strings.
 */

import UAParser from 'ua-parser-js';

export interface ParsedUserAgent {
  device: 'mobile' | 'tablet' | 'desktop';
  deviceVendor?: string;
  deviceModel?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  engine?: string;
}

/**
 * Parse user agent string into structured device/browser/OS info
 */
export function parseUserAgent(userAgentString?: string): ParsedUserAgent {
  if (!userAgentString) {
    return { device: 'desktop' };
  }

  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  // Determine device type
  let device: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (result.device.type === 'mobile') {
    device = 'mobile';
  } else if (result.device.type === 'tablet') {
    device = 'tablet';
  }

  return {
    device,
    deviceVendor: result.device.vendor || undefined,
    deviceModel: result.device.model || undefined,
    browser: result.browser.name || undefined,
    browserVersion: result.browser.version || undefined,
    os: result.os.name || undefined,
    osVersion: result.os.version || undefined,
    engine: result.engine.name || undefined,
  };
}

/**
 * Format device info into human-readable string
 */
export function formatDeviceInfo(parsed: ParsedUserAgent): string {
  const parts: string[] = [];

  if (parsed.deviceVendor && parsed.deviceModel) {
    parts.push(`${parsed.deviceVendor} ${parsed.deviceModel}`);
  } else if (parsed.device) {
    parts.push(parsed.device.charAt(0).toUpperCase() + parsed.device.slice(1));
  }

  if (parsed.browser) {
    const browserStr = parsed.browserVersion
      ? `${parsed.browser} ${parsed.browserVersion}`
      : parsed.browser;
    parts.push(browserStr);
  }

  if (parsed.os) {
    const osStr = parsed.osVersion ? `${parsed.os} ${parsed.osVersion}` : parsed.os;
    parts.push(osStr);
  }

  return parts.join(' • ') || 'Unknown Device';
}
