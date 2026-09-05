/**
 * SPA shell detector.
 *
 * An SPA shell means /llms.txt is returning the site's generic frontend
 * application shell instead of the requested Markdown file.
 *
 * Detection strategy:
 * 1. Compare /llms.txt response with a random nonexistent path response.
 * 2. If both return essentially the same HTML, it's an SPA catch-all.
 * 3. Also check for framework markers as supporting evidence.
 */

import * as cheerio from 'cheerio';
import type { DetectionResult, FetchResult } from '@/types/audit';

// Framework markers — supporting evidence, never sole criterion
const FRAMEWORK_MARKERS = [
  '#root',              // React
  '#__next',            // Next.js
  '#app',               // Vue.js
  '#__nuxt',            // Nuxt.js
  '.svelte-',           // Svelte/SvelteKit
  '#__docusaurus',      // Docusaurus
  'ng-app',             // Angular
  'data-reactroot',     // React
  'data-react-helmet',  // React Helmet
];

/**
 * Generate a random impossible path for SPA detection.
 */
function generateProbePath(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `/__llms_checker_probe_${rand}`;
}

/**
 * Normalize HTML for comparison — strips whitespace, scripts, styles.
 */
function normalizeHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script').remove();
  $('style').remove();
  $('link[rel="stylesheet"]').remove();
  // Remove dynamic content like nonces, timestamps
  $('[data-nonce]').removeAttr('data-nonce');
  return $('html').html()?.replace(/\s+/g, ' ').trim() || '';
}

/**
 * Calculate similarity between two strings (Dice coefficient).
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Use 2-gram approach for efficiency
  const bigrams = (str: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      set.add(str.substring(i, i + 2));
    }
    return set;
  };

  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  let intersection = 0;

  for (const gram of bigramsA) {
    if (bigramsB.has(gram)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Detect whether an HTTP 200 response is an SPA shell.
 *
 * @param llmsTxtBody - The body of the /llms.txt response
 * @param llmsTxtContentType - The content type of the /llms.txt response
 * @param probeResult - The result of fetching a random nonexistent path
 */
export function detectSpaShell(
  llmsTxtBody: string,
  llmsTxtContentType: string | null,
  probeResult: FetchResult
): DetectionResult {
  const reasons: string[] = [];
  let signals = 0;
  let totalWeight = 0;

  // Only relevant if /llms.txt returned HTML
  const isHtml = llmsTxtContentType?.includes('text/html') ?? false;
  if (!isHtml) {
    return { detected: false, confidence: 0, reasons: ['Response is not HTML'] };
  }

  const $ = cheerio.load(llmsTxtBody);

  // Signal 1: Framework markers present (weight: 1 — supporting only)
  for (const marker of FRAMEWORK_MARKERS) {
    if (marker.startsWith('#') || marker.startsWith('.')) {
      if ($(marker).length > 0) {
        signals += 1;
        reasons.push(`Framework marker found: ${marker}`);
        break;
      }
    } else if (marker.startsWith('data-')) {
      if ($(`[${marker}]`).length > 0) {
        signals += 1;
        reasons.push(`Framework data attribute found: ${marker}`);
        break;
      }
    } else if (llmsTxtBody.includes(marker)) {
      signals += 1;
      reasons.push(`Framework marker in source: ${marker}`);
      break;
    }
  }
  totalWeight += 1;

  // Signal 2: Minimal body text (SPA shells often have almost no server-rendered text) (weight: 2)
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  if (bodyText.length < 100) {
    signals += 2;
    reasons.push(`Very little server-rendered text (${bodyText.length} chars)`);
  }
  totalWeight += 2;

  // Signal 3: Compare with probe response (weight: 4 — strongest signal)
  if (probeResult.body && probeResult.status === 200) {
    const normalizedLlms = normalizeHtml(llmsTxtBody);
    const normalizedProbe = normalizeHtml(probeResult.body);

    const sim = similarity(normalizedLlms, normalizedProbe);
    if (sim > 0.85) {
      signals += 4;
      reasons.push(
        `Response is ${Math.round(sim * 100)}% similar to random probe path — strong SPA shell evidence`
      );
    } else if (sim > 0.6) {
      signals += 2;
      reasons.push(
        `Response is ${Math.round(sim * 100)}% similar to random probe path — moderate SPA shell evidence`
      );
    }

    // Also check if both have the same title
    const probeDoc = cheerio.load(probeResult.body);
    const llmsTitle = $('title').text().trim();
    const probeTitle = probeDoc('title').text().trim();
    if (llmsTitle && probeTitle && llmsTitle === probeTitle) {
      signals += 1;
      reasons.push(`Same <title> as random probe: "${llmsTitle}"`);
    }
  }
  totalWeight += 5;

  // Signal 4: Content-type mismatch — HTML returned for a .txt request (weight: 2)
  if (isHtml) {
    signals += 2;
    reasons.push('HTML content-type returned for a .txt file request');
  }
  totalWeight += 2;

  const confidence = totalWeight > 0 ? signals / totalWeight : 0;
  // Require either strong probe similarity or multiple supporting signals
  const detected = confidence >= 0.4;

  return { detected, confidence, reasons };
}

/**
 * Generate a probe URL for SPA detection.
 */
export function getProbeUrl(origin: string): string {
  return `${origin}${generateProbePath()}`;
}
