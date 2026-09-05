/**
 * Link crawler — checks extracted URLs for reachability,
 * real HTML content, and meaningful crawler-facing content.
 *
 * Uses p-limit for concurrency control and cheerio for HTML inspection.
 */

import pLimit from 'p-limit';
import * as cheerio from 'cheerio';
import { safeFetch } from './fetcher';
import { evaluateEvidence } from './aeo-evidence';
import { evaluateStatistics } from './aeo-statistics';
import { evaluateQuotations } from './aeo-quotations';
import { evaluateExtractability, ContentExtractabilityInput } from './aeo-extractability';
import { evaluateReadability } from './aeo-readability';
import type { ParsedLink, LinkCheckResult, LinkClassification, AeoScore } from '@/types/audit';

const MAX_LINKS = 50;
const CONCURRENCY = 5;
const LINK_TIMEOUT_MS = 8_000;

function extractHtmlContent(body: string): { meaningful: boolean; reason: string; text: string; htmlMetadata?: Record<string, number | boolean> } {
  const $ = cheerio.load(body);
  
  // Extract structural metadata BEFORE removing elements (except absolute noise)
  const titlePresent = $('title').text().trim().length > 0;
  const h1Count = $('h1').length;
  const h2h3Count = $('h2, h3').length;
  const liCount = $('li').length;
  const tableCount = $('table tr').length; // rows as proxy for table presence/size
  const pCount = $('p').length;

  $('script, style, noscript, nav, footer, header, aside, .cookie-banner').remove();
  
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const textLength = text.length;

  const htmlMetadata = {
    titlePresent,
    h1Count,
    h2h3Count,
    liCount,
    tableCount,
    pCount,
    textLength
  };
  
  const hasBody = $('body').length > 0;
  
  if (!hasBody) {
    return { meaningful: false, reason: 'No <body> element found', text: '', htmlMetadata };
  }
  
  if (textLength < 50 && !titlePresent) {
    return { meaningful: false, reason: 'No meaningful text content (likely an empty shell)', text: '', htmlMetadata };
  }
  
  if (textLength < 50) {
    return { meaningful: false, reason: `Very little text content (${textLength} chars) — likely an SPA shell`, text, htmlMetadata };
  }
  
  return { meaningful: true, reason: 'Page has meaningful text content', text, htmlMetadata };
}

function classifyLink(
  httpStatus: number | null,
  contentType: string | null,
  body: string | null,
  redirected: boolean,
  error: string | null
): { classification: LinkClassification; resolves: boolean; isHtml: boolean; isMarkdown: boolean; hasMeaningful: boolean; aeoInput: ContentExtractabilityInput | null } {
  if (error || httpStatus === null) {
    return { classification: 'BROKEN', resolves: false, isHtml: false, isMarkdown: false, hasMeaningful: false, aeoInput: null };
  }

  if (httpStatus >= 500) {
    return { classification: 'SERVER_ERROR', resolves: false, isHtml: false, isMarkdown: false, hasMeaningful: false, aeoInput: null };
  }

  if (httpStatus >= 400) {
    return { classification: 'BROKEN', resolves: false, isHtml: false, isMarkdown: false, hasMeaningful: false, aeoInput: null };
  }

  const isHtml = contentType?.includes('text/html') ?? false;
  const isMarkdown = (contentType?.includes('text/markdown') || contentType?.includes('text/plain')) ?? false;

  if (!isHtml && !isMarkdown) {
    return { classification: 'OTHER_NON_HTML', resolves: true, isHtml: false, isMarkdown: false, hasMeaningful: false, aeoInput: null };
  }
  
  if (isMarkdown && body) {
    return { 
      classification: 'MARKDOWN_CONTENT', resolves: true, isHtml: false, isMarkdown: true, hasMeaningful: true,
      aeoInput: {
        text: body,
        contentType: 'MARKDOWN_CONTENT'
      }
    };
  }

  if (isHtml && body) {
    const extracted = extractHtmlContent(body);
    if (!extracted.meaningful) {
      return { 
        classification: 'EMPTY_HTML', resolves: true, isHtml: true, isMarkdown: false, hasMeaningful: false,
        aeoInput: { text: extracted.text, contentType: 'EMPTY_HTML', htmlMetadata: extracted.htmlMetadata }
      };
    }
    return { 
      classification: 'HTML_CONTENT', resolves: true, isHtml: true, isMarkdown: false, hasMeaningful: true,
      aeoInput: { text: extracted.text, contentType: 'HTML_CONTENT', htmlMetadata: extracted.htmlMetadata }
    };
  }

  return { classification: isHtml ? 'HTML_CONTENT' : 'MARKDOWN_CONTENT', resolves: true, isHtml, isMarkdown, hasMeaningful: true, aeoInput: null };
}

function calculateAeoScore(input: ContentExtractabilityInput | null): AeoScore | null {
  if (!input || input.contentType === 'EMPTY_HTML' || input.contentType === 'OTHER_NON_HTML') {
    return null;
  }
  
  const evidence = evaluateEvidence(input.text);
  const statistics = evaluateStatistics(input.text);
  const quotations = evaluateQuotations(input.text);
  const extractability = evaluateExtractability(input);
  const readability = evaluateReadability(input.text);
  
  // Total must be accurately summed
  const total = parseFloat((evidence + statistics + quotations + extractability + readability).toFixed(2));
  
  return { evidence, statistics, quotations, extractability, readability, total };
}

async function checkOneLink(link: ParsedLink): Promise<LinkCheckResult> {
  const fetchResult = await safeFetch(link.url, {
    timeoutMs: LINK_TIMEOUT_MS,
  });

  const redirected = fetchResult.finalUrl !== null && fetchResult.finalUrl !== link.url;
  const { classification, resolves, isHtml, isMarkdown, hasMeaningful, aeoInput } = classifyLink(
    fetchResult.status,
    fetchResult.contentType,
    fetchResult.body,
    redirected,
    fetchResult.error
  );

  const aeoScore = calculateAeoScore(aeoInput);

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
    aeoScore,
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
