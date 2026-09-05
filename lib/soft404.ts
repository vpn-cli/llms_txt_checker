/**
 * Soft-404 detector.
 *
 * A soft-404 occurs when the server returns HTTP 200 but the content
 * actually represents a missing/not-found page.
 */

import * as cheerio from 'cheerio';
import type { DetectionResult } from '@/types/audit';

// Patterns in title that suggest a 404 page
const TITLE_404_PATTERNS = [
  /\b404\b/i,
  /page\s*not\s*found/i,
  /not\s*found/i,
  /does\s*not\s*exist/i,
  /doesn[''']t\s*exist/i,
  /couldn[''']t\s*be\s*found/i,
  /could\s*not\s*be\s*found/i,
  /no\s*longer\s*available/i,
  /page\s*missing/i,
];

// Patterns in visible body text that suggest a 404 page
const BODY_404_PATTERNS = [
  /the\s*page\s*you\s*(are\s*looking\s*for|requested)\s*(was\s*not|could\s*not\s*be|doesn[''']t|can[''']t\s*be)\s*found/i,
  /this\s*page\s*(doesn[''']t|does\s*not)\s*exist/i,
  /404\s*[-–—:]\s*(page\s*)?not\s*found/i,
  /we\s*couldn[''']t\s*find\s*(that|the)\s*page/i,
  /sorry[,.]?\s*(the\s*)?page\s*(you\s*(are\s*looking\s*for|requested)\s*)?(was\s*not|could\s*not\s*be)\s*found/i,
  /oops[!.]?\s*(page\s*)?not\s*found/i,
  /the\s*requested\s*url\s*was\s*not\s*found/i,
  /error\s*404/i,
];

/**
 * Detect whether an HTTP 200 response is actually a soft-404.
 */
export function detectSoft404(
  body: string,
  contentType: string | null,
  status: number | null
): DetectionResult {
  const reasons: string[] = [];
  let signals = 0;
  let totalWeight = 0;

  // Only relevant for 200 responses with HTML content
  if (status !== 200) {
    return { detected: false, confidence: 0, reasons: ['Not a 200 response'] };
  }

  const isHtml = contentType?.includes('text/html') ?? false;
  if (!isHtml) {
    return { detected: false, confidence: 0, reasons: ['Not HTML content'] };
  }

  const $ = cheerio.load(body);

  // Signal 1: Title contains 404 indicators (weight: 3)
  const title = $('title').text().trim();
  if (title) {
    for (const pattern of TITLE_404_PATTERNS) {
      if (pattern.test(title)) {
        signals += 3;
        reasons.push(`Title contains 404 indicator: "${title}"`);
        break;
      }
    }
  }
  totalWeight += 3;

  // Signal 2: Body text contains 404 indicators (weight: 3)
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  for (const pattern of BODY_404_PATTERNS) {
    if (pattern.test(bodyText)) {
      signals += 3;
      reasons.push(`Body text contains not-found indicator`);
      break;
    }
  }
  totalWeight += 3;

  // Signal 3: H1 contains 404 indicators (weight: 2)
  const h1Text = $('h1').first().text().trim();
  if (h1Text) {
    for (const pattern of TITLE_404_PATTERNS) {
      if (pattern.test(h1Text)) {
        signals += 2;
        reasons.push(`H1 heading indicates 404: "${h1Text}"`);
        break;
      }
    }
  }
  totalWeight += 2;

  // Signal 4: Meta robots noindex (weight: 1)
  const metaRobots = $('meta[name="robots"]').attr('content') || '';
  if (/noindex/i.test(metaRobots)) {
    signals += 1;
    reasons.push('Page has noindex meta tag');
  }
  totalWeight += 1;

  // Signal 5: Very short body (less than 500 chars) with 404-like content (weight: 1)
  if (bodyText.length < 500 && reasons.length > 0) {
    signals += 1;
    reasons.push(`Very short page content (${bodyText.length} chars)`);
  }
  totalWeight += 1;

  const confidence = totalWeight > 0 ? signals / totalWeight : 0;
  const detected = confidence >= 0.3; // At least one strong signal

  return { detected, confidence, reasons };
}
