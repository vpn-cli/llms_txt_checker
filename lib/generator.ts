import * as cheerio from 'cheerio';
import { safeFetch } from './fetcher';
import { parseMarkdown } from './markdown-parser';
import { validateStructure } from './validator';

const MAX_PAGES = 10;
const SITEMAP_TIMEOUT = 5000;
const PAGE_TIMEOUT = 5000;

const HIGH_VALUE_PATTERNS = [
  /\/about\b/i,
  /\/services\b/i,
  /\/products\b/i,
  /\/solutions\b/i,
  /\/docs\b/i,
  /\/documentation\b/i,
  /\/resources\b/i,
  /\/blog\b/i,
  /\/case-studies\b/i,
  /\/contact\b/i,
];

const LOW_VALUE_PATTERNS = [
  /\/login\b/i,
  /\/signup\b/i,
  /\/account\b/i,
  /\/cart\b/i,
  /\/checkout\b/i,
  /\/search\b/i,
  /\/assets\b/i,
  /\/images\b/i,
  /\/feeds\b/i,
  /utm_/i,
];

interface ExtractedPage {
  url: string;
  title: string;
  description: string;
}

/**
 * Generates an llms.txt draft by safely crawling the site's sitemap.
 */
export async function generateLlmsTxt(domain: string, origin: string): Promise<string | null> {
  const sitemaps = await discoverSitemaps(origin);
  if (sitemaps.length === 0) {
    return null; // Could not find any sitemaps
  }

  const urls = await extractUrlsFromSitemaps(sitemaps);
  if (urls.length === 0) {
    return null;
  }

  const selectedUrls = selectPages(urls, origin);
  const pages = await fetchPageMetadata(selectedUrls);

  if (pages.length === 0) {
    return null;
  }

  const draft = assembleMarkdown(domain, pages);

  // Validate the generated draft
  try {
    const parsed = parseMarkdown(draft);
    const checks = validateStructure(parsed);
    const hasFailures = checks.some((c) => c.status === 'fail');
    if (hasFailures) {
      console.warn(`Generated draft failed validation for ${domain}`);
      return null;
    }
    return draft;
  } catch (err) {
    console.error(`Failed to parse generated draft for ${domain}`, err);
    return null;
  }
}

async function discoverSitemaps(origin: string): Promise<string[]> {
  const sitemaps: string[] = [];
  const robotsRes = await safeFetch(`${origin}/robots.txt`, { timeoutMs: SITEMAP_TIMEOUT });
  
  if (robotsRes.body && robotsRes.status === 200) {
    const lines = robotsRes.body.split('\n');
    for (const line of lines) {
      const match = line.match(/^Sitemap:\s*(.+)$/i);
      if (match && match[1]) {
        sitemaps.push(match[1].trim());
      }
    }
  }

  if (sitemaps.length === 0) {
    sitemaps.push(`${origin}/sitemap.xml`);
  }
  return sitemaps;
}

async function extractUrlsFromSitemaps(sitemaps: string[]): Promise<string[]> {
  const allUrls = new Set<string>();

  // Limit depth to prevent infinite loops, process max 3 sitemaps (index or normal)
  const toProcess = sitemaps.slice(0, 3);
  let processedCount = 0;

  while (toProcess.length > 0 && processedCount < 5) {
    const sitemapUrl = toProcess.shift()!;
    processedCount++;

    const res = await safeFetch(sitemapUrl, { timeoutMs: SITEMAP_TIMEOUT });
    if (res.status === 200 && res.body) {
      const $ = cheerio.load(res.body, { xmlMode: true });

      // If it's a sitemap index, queue the sub-sitemaps
      $('sitemapindex > sitemap > loc').each((_, el) => {
        const loc = $(el).text().trim();
        if (loc) toProcess.push(loc);
      });

      // If it's a urlset, extract urls
      $('urlset > url > loc').each((_, el) => {
        const loc = $(el).text().trim();
        if (loc) allUrls.add(loc);
      });
    }
  }

  return Array.from(allUrls);
}

function selectPages(urls: string[], origin: string): string[] {
  const cleanUrls = urls.filter(u => {
    try {
      const url = new URL(u);
      return url.origin === origin;
    } catch {
      return false;
    }
  });

  const rootUrl = origin + '/';
  const hasRoot = cleanUrls.includes(rootUrl) || cleanUrls.includes(origin);

  const validUrls = cleanUrls.filter(u => {
    if (u === rootUrl || u === origin) return false; // Handled separately
    const isLowValue = LOW_VALUE_PATTERNS.some(p => p.test(u));
    return !isLowValue;
  });

  const highValue: string[] = [];
  const normal: string[] = [];

  for (const u of validUrls) {
    const isHighValue = HIGH_VALUE_PATTERNS.some(p => p.test(u));
    if (isHighValue) {
      highValue.push(u);
    } else {
      normal.push(u);
    }
  }

  const selected: string[] = [];
  if (hasRoot) selected.push(rootUrl);
  
  // Fill with high value first, then normal
  for (const u of highValue) {
    if (selected.length >= MAX_PAGES) break;
    selected.push(u);
  }
  for (const u of normal) {
    if (selected.length >= MAX_PAGES) break;
    selected.push(u);
  }

  return selected;
}

async function fetchPageMetadata(urls: string[]): Promise<ExtractedPage[]> {
  const pages: ExtractedPage[] = [];

  for (const url of urls) {
    const res = await safeFetch(url, { timeoutMs: PAGE_TIMEOUT });
    if (res.status !== 200 || !res.body || !res.contentType?.includes('text/html')) {
      continue;
    }

    const $ = cheerio.load(res.body);
    const title = $('title').first().text().trim();
    const metaDesc = $('meta[name="description"]').attr('content')?.trim();
    const h1 = $('h1').first().text().trim();

    const finalTitle = title || h1 || url;
    const finalDesc = metaDesc || h1 || title || 'No description available.';

    pages.push({
      url: res.finalUrl || url,
      title: finalTitle.replace(/[\n\r]+/g, ' '),
      description: finalDesc.replace(/[\n\r]+/g, ' '),
    });
  }

  return pages;
}

function assembleMarkdown(domain: string, pages: ExtractedPage[]): string {
  let md = `# ${domain}\n\n`;
  md += `> This llms.txt file was auto-generated from publicly accessible metadata.\n\n`;
  md += `## Core Pages\n\n`;

  for (const p of pages) {
    md += `- [${p.title}](${p.url}): ${p.description}\n`;
  }

  return md;
}
