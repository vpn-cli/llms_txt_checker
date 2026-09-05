/**
 * Link crawler — checks extracted URLs for reachability,
 * real HTML content, and meaningful crawler-facing content.
 *
 * Uses p-limit for concurrency control and cheerio for HTML inspection.
 */

import pLimit from 'p-limit';
import * as cheerio from 'cheerio';
import { safeFetch } from './fetcher';
import type { ParsedLink, LinkCheckResult, LinkClassification } from '@/types/audit';

const MAX_LINKS = 50;
const CONCURRENCY = 5;
const LINK_TIMEOUT_MS = 8_000;

/**
 * Check whether an HTML response contains meaningful content for a crawler.
 */
function hasMeaningfulHtml(body: string): { meaningful: boolean; reason: string } {
  const $ = cheerio.load(body);

  // Remove scripts, styles, and nav
  $('script, style, noscript, nav, footer, header').remove();

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const title = $('title').text().trim();

  // Check for document structure
  const hasBody = $('body').length > 0;
  const hasText = bodyText.length > 50;
  const hasTitle = title.length > 0;

  if (!hasBody) {
    return { meaningful: false, reason: 'No <body> element found' };
  }

  if (!hasText && !hasTitle) {
    return { meaningful: false, reason: 'No meaningful text content (likely an empty shell)' };
  }

  if (bodyText.length < 50) {
    return {
      meaningful: false,
      reason: `Very little text content (${bodyText.length} chars) — likely an SPA shell or empty page`,
    };
  }

  return { meaningful: true, reason: 'Page has meaningful text content' };
}

/**
 * Classify a single link check result.
 */
function classifyLink(
  httpStatus: number | null,
  contentType: string | null,
  body: string | null,
  redirected: boolean,
  error: string | null
): { classification: LinkClassification; resolves: boolean; isHtml: boolean; isMarkdown: boolean; hasMeaningful: boolean } {
  if (error || httpStatus === null) {
    return { classification: 'BROKEN', resolves: false, isHtml: false, isMarkdown: false, hasMeaningful: false };
  }

  const resolves = httpStatus < 400;

  if (httpStatus >= 500) {
    return { classification: 'SERVER_ERROR', resolves: false, isHtml: false, isMarkdown: false, hasMeaningful: false };
  }

  if (httpStatus >= 400) {
    return { classification: 'BROKEN', resolves: false, isHtml: false, isMarkdown: false, hasMeaningful: false };
  }

  const isHtml = contentType?.includes('text/html') ?? false;
  const isMarkdown = (contentType?.includes('text/markdown') || contentType?.includes('text/plain')) ?? false;

  if (!isHtml && !isMarkdown) {
    // Non-HTML, non-Markdown resource (PDF, JSON, image, etc.)
    return { classification: 'OTHER_NON_HTML', resolves: true, isHtml: false, isMarkdown: false, hasMeaningful: false };
  }
  
  if (isMarkdown) {
    return { classification: 'MARKDOWN_CONTENT', resolves: true, isHtml: false, isMarkdown: true, hasMeaningful: true };
  }

  // HTML response — check for meaningful content
  if (body) {
    const { meaningful } = hasMeaningfulHtml(body);
    if (!meaningful) {
      return { classification: 'EMPTY_HTML', resolves: true, isHtml: true, isMarkdown: false, hasMeaningful: false };
    }
  }

  return { classification: 'HTML_CONTENT', resolves: true, isHtml: true, isMarkdown: false, hasMeaningful: true };
}

/**
 * Check a single link.
 */
async function checkOneLink(link: ParsedLink): Promise<LinkCheckResult> {
  const fetchResult = await safeFetch(link.url, {
    timeoutMs: LINK_TIMEOUT_MS,
  });

  const redirected = fetchResult.finalUrl !== null && fetchResult.finalUrl !== link.url;
  const { classification, resolves, isHtml, isMarkdown, hasMeaningful } = classifyLink(
    fetchResult.status,
    fetchResult.contentType,
    fetchResult.body,
    redirected,
    fetchResult.error
  );

  return {
    title: link.title,
    url: link.url,
    description: link.description,
    section: link.section,
    status: classification,
    httpStatus: fetchResult.status,
    finalUrl: fetchResult.finalUrl,
    contentType: fetchResult.contentType,
    resolves,
    isHtml,
    isMarkdown,
    hasMeaningfulContent: hasMeaningful,
    error: fetchResult.error,
  };
}

/**
 * Crawl all extracted links with concurrency control.
 * Limits to MAX_LINKS to prevent unbounded crawling.
 */
export async function checkLinks(links: ParsedLink[]): Promise<LinkCheckResult[]> {
  const limit = pLimit(CONCURRENCY);
  const linksToCheck = links.slice(0, MAX_LINKS);

  const results = await Promise.all(
    linksToCheck.map((link) => limit(() => checkOneLink(link)))
  );

  return results;
}
