/**
 * SSRF protection — reject internal/private destinations.
 */

import { isIP } from 'node:net';

const PRIVATE_IP_RANGES = [
  /^127\./,                    // 127.0.0.0/8 loopback
  /^10\./,                     // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./,               // 192.168.0.0/16
  /^169\.254\./,               // link-local
  /^0\./,                      // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./, // CGN 100.64.0.0/10
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',      // GCP metadata
  'metadata.google.com',
];

// Cloud metadata IPs
const BLOCKED_IPS = [
  '169.254.169.254',   // AWS/GCP/Azure metadata
  'fd00:ec2::254',     // AWS IMDSv2 IPv6
];

/**
 * Check if a hostname or IP is private / internal.
 * Returns a reason string if blocked, null if safe.
 */
export function checkSsrf(hostname: string): string | null {
  const lower = hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(lower)) {
    return `Blocked hostname: ${lower}`;
  }

  // Check if it's an IP address
  if (isIP(hostname)) {
    // IPv6 loopback
    if (hostname === '::1' || hostname === '::') {
      return `Blocked IPv6 loopback: ${hostname}`;
    }

    // Blocked specific IPs
    if (BLOCKED_IPS.includes(hostname)) {
      return `Blocked metadata IP: ${hostname}`;
    }

    // Private IPv4 ranges
    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(hostname)) {
        return `Blocked private IP: ${hostname}`;
      }
    }
  }

  // Check for IPv6-mapped IPv4 or bracketed notation
  if (hostname.startsWith('[') || hostname.includes('::ffff:')) {
    return `Blocked suspicious IPv6 notation: ${hostname}`;
  }

  return null;
}
